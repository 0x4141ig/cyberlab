// Vercel Serverless Function: /api/leaderboard
// Supports Supabase PostgreSQL Database (Leaderboard + User Credentials) & Upstash Redis
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  const action = req.query?.action || '';

  // ==========================================
  // 1. SUPABASE DATABASE (Primary)
  // ==========================================
  if (supabaseUrl && supabaseKey) {
    try {
      const cleanBaseUrl = supabaseUrl.replace(/\/+$/, '');
      const headers = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      };

      // Action: User Login
      if (req.method === 'POST' && action === 'login') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { username, password } = body || {};
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password required' });
        }

        const userRes = await fetch(
          `${cleanBaseUrl}/rest/v1/lab_users?username=eq.${encodeURIComponent(username.trim())}&select=*`,
          { headers }
        );
        const rows = await userRes.json();
        if (!Array.isArray(rows) || rows.length === 0) {
          return res.status(404).json({ error: 'Account not found' });
        }

        const row = rows[0];
        if (row.password !== password) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        return res.status(200).json({
          status: 'ok',
          user: {
            username: row.username,
            role: row.role || 'student',
            score: Number(row.score) || 0,
            solved: Array.isArray(row.solved) ? row.solved : [],
            conceptSolved: Array.isArray(row.concept_solved) ? row.concept_solved : [],
            penalties: typeof row.penalties === 'object' && row.penalties !== null ? row.penalties : {}
          }
        });
      }

      // Action: User Signup
      if (req.method === 'POST' && action === 'signup') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { username, password } = body || {};
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password required' });
        }
        if (username.toLowerCase() === 'admin') {
          return res.status(400).json({ error: 'Username reserved' });
        }

        const cleanUser = username.trim();
        const nowIso = new Date().toISOString();

        // Insert into lab_users
        const insertRes = await fetch(`${cleanBaseUrl}/rest/v1/lab_users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            username: cleanUser,
            password,
            role: 'student',
            score: 0,
            solved: [],
            concept_solved: [],
            penalties: {},
            created_at: nowIso,
            updated_at: nowIso
          })
        });

        if (!insertRes.ok) {
          const errText = await insertRes.text();
          return res.status(400).json({ error: errText });
        }

        // Insert into leaderboard
        await fetch(`${cleanBaseUrl}/rest/v1/leaderboard`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            username: cleanUser,
            score: 0,
            solved_count: 0,
            last_active: 'Just now',
            updated_at: nowIso
          })
        });

        return res.status(200).json({ status: 'ok' });
      }

      // Action: Save Progress
      if (req.method === 'POST' && action === 'save_progress') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { username, score, solved, conceptSolved, penalties } = body || {};
        if (!username) {
          return res.status(400).json({ error: 'Username required' });
        }

        const cleanUser = username.trim();
        const nowIso = new Date().toISOString();

        await fetch(`${cleanBaseUrl}/rest/v1/lab_users?username=eq.${encodeURIComponent(cleanUser)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            score: Number(score) || 0,
            solved: Array.isArray(solved) ? solved : [],
            concept_solved: Array.isArray(conceptSolved) ? conceptSolved : [],
            penalties: typeof penalties === 'object' && penalties !== null ? penalties : {},
            updated_at: nowIso
          })
        });

        await fetch(`${cleanBaseUrl}/rest/v1/leaderboard`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            username: cleanUser,
            score: Number(score) || 0,
            solved_count: Array.isArray(solved) ? solved.length : 0,
            last_active: 'Just now',
            updated_at: nowIso
          })
        });

        return res.status(200).json({ status: 'ok' });
      }

      // Default GET: Fetch Leaderboard
      if (req.method === 'GET') {
        const response = await fetch(
          `${cleanBaseUrl}/rest/v1/leaderboard?select=username,score,solved_count,last_active&order=score.desc,solved_count.desc`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Supabase returned status ${response.status}`);
        }

        const data = await response.json();
        const list = (data || []).map((row) => ({
          username: row.username,
          score: Number(row.score) || 0,
          solvedCount: Number(row.solved_count) || 0,
          lastActive: row.last_active || 'Just now'
        }));

        return res.status(200).json({ status: 'ok', leaderboard: list });
      }

      // Default POST: Upsert Leaderboard entry
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { username, score, solvedCount, role } = body || {};

        if (!username || role === 'admin') {
          return res.status(400).json({ error: 'Invalid user payload' });
        }

        const cleanUsername = username.trim();

        const response = await fetch(`${cleanBaseUrl}/rest/v1/leaderboard`, {
          method: 'POST',
          headers: {
            ...headers,
            Prefer: 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            username: cleanUsername,
            score: Number(score) || 0,
            solved_count: Number(solvedCount) || 0,
            last_active: 'Just now',
            updated_at: new Date().toISOString()
          })
        });

        if (!response.ok) {
          throw new Error(`Supabase upsert error: ${response.status}`);
        }

        return res.status(200).json({ status: 'ok' });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error('Supabase API Error:', err);
      return res.status(500).json({ error: err.message, leaderboard: [] });
    }
  }

  // ==========================================
  // 2. UPSTASH / VERCEL KV REDIS (Alternative)
  // ==========================================
  if (kvUrl && kvToken) {
    try {
      if (req.method === 'GET') {
        const response = await fetch(`${kvUrl}/hgetall/ceh_leaderboard`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });

        if (!response.ok) {
          throw new Error(`KV returned status ${response.status}`);
        }

        const data = await response.json();
        const raw = data.result || {};

        const list = [];
        if (Array.isArray(raw)) {
          for (let i = 0; i < raw.length; i += 2) {
            try {
              const item = typeof raw[i + 1] === 'string' ? JSON.parse(raw[i + 1]) : raw[i + 1];
              if (item && item.username) list.push(item);
            } catch (e) {}
          }
        } else {
          for (const val of Object.values(raw)) {
            try {
              const item = typeof val === 'string' ? JSON.parse(val) : val;
              if (item && item.username) list.push(item);
            } catch (e) {}
          }
        }

        list.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
        return res.status(200).json({ status: 'ok', leaderboard: list });
      }

      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { username, score, solvedCount, role } = body || {};

        if (!username || role === 'admin') {
          return res.status(400).json({ error: 'Invalid user payload' });
        }

        const entry = {
          username: username.trim(),
          score: Number(score) || 0,
          solvedCount: Number(solvedCount) || 0,
          lastActive: 'Just now',
          updatedAt: Date.now()
        };

        const cleanKey = username.trim().toLowerCase();

        await fetch(`${kvUrl}/hset/ceh_leaderboard`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${kvToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([cleanKey, JSON.stringify(entry)])
        });

        return res.status(200).json({ status: 'ok', entry });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error('KV Error:', err);
      return res.status(500).json({ error: err.message, leaderboard: [] });
    }
  }

  // Fallback if not yet linked
  return res.status(200).json({
    status: 'unconfigured',
    message: 'Please connect Supabase or Upstash Redis in your Vercel Project settings.',
    leaderboard: []
  });
}
