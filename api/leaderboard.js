// Vercel Serverless Function: /api/leaderboard
// Supports Supabase PostgreSQL Database (Leaderboard + User Credentials) & Upstash Redis

function resolveSupabaseCredentials() {
  // 1. Explicit Supabase URLs
  let url = process.env.SUPABASE_URL ||
            process.env.NEXT_PUBLIC_SUPABASE_URL ||
            process.env.SUPABASE_REST_URL;

  // 2. Derive URL from POSTGRES_HOST, POSTGRES_USER, or POSTGRES_URL if not explicitly set
  // e.g. POSTGRES_HOST = "db.xyz.supabase.co" -> https://xyz.supabase.co
  // e.g. POSTGRES_USER = "postgres.xyz" -> https://xyz.supabase.co
  if (!url) {
    if (process.env.POSTGRES_HOST && process.env.POSTGRES_HOST.includes('supabase.co')) {
      const match = process.env.POSTGRES_HOST.match(/db\.([^.]+)\.supabase\.co/);
      if (match) {
        url = `https://${match[1]}.supabase.co`;
      }
    }
    if (!url && process.env.POSTGRES_USER && process.env.POSTGRES_USER.startsWith('postgres.')) {
      const projectRef = process.env.POSTGRES_USER.replace(/^postgres\./, '');
      if (projectRef) {
        url = `https://${projectRef}.supabase.co`;
      }
    }
    if (!url && process.env.POSTGRES_URL) {
      const match = process.env.POSTGRES_URL.match(/postgres(?:ql)?:\/\/postgres\.([^:]+):/);
      if (match) {
        url = `https://${match[1]}.supabase.co`;
      }
    }
  }

  // 3. API Keys
  const key = process.env.SUPABASE_ANON_KEY ||
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
              process.env.SUPABASE_SERVICE_ROLE_KEY ||
              process.env.SUPABASE_KEY ||
              process.env.SUPABASE_API_KEY;

  const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                        process.env.SUPABASE_ANON_KEY ||
                        key;

  return {
    url: url ? url.trim().replace(/\/+$/, '') : null,
    key: key ? key.trim() : null,
    publicAnonKey: publicAnonKey ? publicAnonKey.trim() : null
  };
}

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

  const { url: supabaseUrl, key: supabaseKey, publicAnonKey } = resolveSupabaseCredentials();

  const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  const action = req.query?.action || '';

  // ==========================================
  // Diagnostic Endpoint (Safe inspection of env vars)
  // ==========================================
  if (action === 'diag') {
    const relevantKeys = Object.keys(process.env).filter(k => 
      /supabase|postgres|kv|redis|next_public/i.test(k)
    );
    const envSummary = {};
    for (const k of relevantKeys) {
      const v = process.env[k] || '';
      envSummary[k] = v ? `Present (length: ${v.length})` : 'Empty';
    }
    return res.status(200).json({
      status: 'ok',
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasSupabaseKey: Boolean(supabaseKey),
      hasKv: Boolean(kvUrl && kvToken),
      hasAutoCloudDb: true,
      resolvedUrl: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^.]+).*/, '$1.supabase.co') : 'Auto Cloud Shared DB (Active)',
      detectedEnvVars: envSummary
    });
  }

  // ==========================================
  // Config Endpoint (Auto-discover credentials for frontend)
  // ==========================================
  if (action === 'config') {
    if (supabaseUrl && publicAnonKey) {
      return res.status(200).json({
        status: 'ok',
        supabaseUrl,
        supabaseAnonKey: publicAnonKey
      });
    }
    return res.status(200).json({
      status: 'ok',
      autoCloudActive: true,
      message: 'Autonomous shared cloud database active across all clients.'
    });
  }

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
          const errText = await response.text();
          throw new Error(`Supabase returned status ${response.status}: ${errText}`);
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

  // ==========================================
  // 3. AUTO CLOUD DATABASE (KV Bucket: Multi-Device Sync)
  // ==========================================
  const KV_BUCKET_BASE = "https://kvdb.io/duaHz7yFr98EAHvZku3Xz";

  try {
    async function getKvUsers() {
      try {
        const resp = await fetch(`${KV_BUCKET_BASE}/users`);
        if (!resp.ok) return {};
        return await resp.json();
      } catch (e) {
        return {};
      }
    }

    async function saveKvUsers(users) {
      await fetch(`${KV_BUCKET_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users)
      });
    }

    async function getKvLeaderboard() {
      try {
        const resp = await fetch(`${KV_BUCKET_BASE}/leaderboard`);
        if (!resp.ok) return [];
        return await resp.json();
      } catch (e) {
        return [];
      }
    }

    async function saveKvLeaderboard(leaderboard) {
      await fetch(`${KV_BUCKET_BASE}/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaderboard)
      });
    }

    // Action: Login
    if (req.method === 'POST' && action === 'login') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { username, password } = body || {};
      const cleanUser = (username || '').trim();
      const users = await getKvUsers();
      const user = users[cleanUser];
      if (!user) return res.status(404).json({ error: 'Account not found' });
      if (user.password !== password) return res.status(401).json({ error: 'Invalid password' });
      return res.status(200).json({
        status: 'ok',
        user: {
          username: cleanUser,
          role: user.role || 'student',
          score: user.score || 0,
          solved: user.solved || [],
          conceptSolved: user.conceptSolved || [],
          penalties: user.penalties || {},
          currentTaskId: user.currentTaskId || 1,
          currentTaskTitle: user.currentTaskTitle || "Host Reachability & ICMP Verification",
          currentTaskModule: user.currentTaskModule || "Module 01: Introduction to Ethical Hacking"
        }
      });
    }

    // Action: Signup
    if (req.method === 'POST' && action === 'signup') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { username, password } = body || {};
      const cleanUser = (username || '').trim();
      if (!cleanUser || !password) return res.status(400).json({ error: 'Username and password required' });
      if (cleanUser.toLowerCase() === 'admin') return res.status(400).json({ error: 'Username reserved' });
      
      const users = await getKvUsers();
      if (users[cleanUser]) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      users[cleanUser] = {
        password,
        role: 'student',
        score: 0,
        solved: [],
        conceptSolved: [],
        penalties: {},
        currentTaskId: 1,
        currentTaskTitle: "Host Reachability & ICMP Verification",
        currentTaskModule: "Module 01: Introduction to Ethical Hacking",
        lastActive: "Just now",
        updatedAt: Date.now()
      };
      await saveKvUsers(users);

      const leaderboard = await getKvLeaderboard();
      const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === cleanUser.toLowerCase());
      const entry = {
        username: cleanUser,
        score: 0,
        solvedCount: 0,
        currentTaskId: 1,
        currentTaskTitle: "Host Reachability & ICMP Verification",
        lastActive: 'Just now'
      };
      if (exIdx === -1) leaderboard.push(entry);
      else leaderboard[exIdx] = entry;
      leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
      await saveKvLeaderboard(leaderboard);

      return res.status(200).json({ status: 'ok' });
    }

    // Action: Save Progress
    if (req.method === 'POST' && action === 'save_progress') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { username, score, solved, conceptSolved, penalties, currentTaskId, currentTaskTitle, currentTaskModule } = body || {};
      const cleanUser = (username || '').trim();
      const users = await getKvUsers();
      users[cleanUser] = {
        password: users[cleanUser]?.password || 'Pa$$w0rd',
        role: 'student',
        score: Number(score) || 0,
        solved: solved || [],
        conceptSolved: conceptSolved || [],
        penalties: penalties || {},
        currentTaskId: currentTaskId || users[cleanUser]?.currentTaskId || 1,
        currentTaskTitle: currentTaskTitle || users[cleanUser]?.currentTaskTitle || "Host Reachability & ICMP Verification",
        currentTaskModule: currentTaskModule || users[cleanUser]?.currentTaskModule || "Module 01: Introduction to Ethical Hacking",
        lastActive: 'Just now',
        updatedAt: Date.now()
      };
      await saveKvUsers(users);

      const leaderboard = await getKvLeaderboard();
      const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === cleanUser.toLowerCase());
      const entry = {
        username: cleanUser,
        score: Number(score) || 0,
        solvedCount: Array.isArray(solved) ? solved.length : 0,
        currentTaskId: currentTaskId || users[cleanUser]?.currentTaskId || 1,
        currentTaskTitle: currentTaskTitle || users[cleanUser]?.currentTaskTitle || "Host Reachability & ICMP Verification",
        lastActive: 'Just now'
      };
      if (exIdx !== -1) leaderboard[exIdx] = entry;
      else leaderboard.push(entry);
      leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
      await saveKvLeaderboard(leaderboard);

      return res.status(200).json({ status: 'ok' });
    }

    // Action: Admin Get All Users with Task Details
    if (req.method === 'GET' && action === 'admin_users') {
      const users = await getKvUsers();
      const userList = Object.entries(users).map(([uname, u]) => ({
        username: uname,
        role: u.role || 'student',
        score: Number(u.score) || 0,
        solved: Array.isArray(u.solved) ? u.solved : [],
        solvedCount: Array.isArray(u.solved) ? u.solved.length : 0,
        conceptSolved: Array.isArray(u.conceptSolved) ? u.conceptSolved : [],
        conceptCount: Array.isArray(u.conceptSolved) ? u.conceptSolved.length : 0,
        currentTaskId: u.currentTaskId || 1,
        currentTaskTitle: u.currentTaskTitle || "Host Reachability & ICMP Verification",
        currentTaskModule: u.currentTaskModule || "Module 01: Introduction to Ethical Hacking",
        lastActive: u.lastActive || "Recently",
        updatedAt: u.updatedAt || Date.now()
      }));
      userList.sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount);
      return res.status(200).json({ status: 'ok', users: userList });
    }

    // Action: Admin Reset User Progress
    if (req.method === 'POST' && action === 'admin_reset_user') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { username } = body || {};
      const cleanUser = (username || '').trim();
      const users = await getKvUsers();
      if (users[cleanUser]) {
        users[cleanUser].score = 0;
        users[cleanUser].solved = [];
        users[cleanUser].conceptSolved = [];
        users[cleanUser].penalties = {};
        users[cleanUser].currentTaskId = 1;
        users[cleanUser].currentTaskTitle = "Host Reachability & ICMP Verification";
        users[cleanUser].lastActive = "Reset by Admin";
        users[cleanUser].updatedAt = Date.now();
        await saveKvUsers(users);
      }
      const leaderboard = await getKvLeaderboard();
      const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === cleanUser.toLowerCase());
      if (exIdx !== -1) {
        leaderboard[exIdx].score = 0;
        leaderboard[exIdx].solvedCount = 0;
        leaderboard[exIdx].currentTaskId = 1;
        leaderboard[exIdx].currentTaskTitle = "Host Reachability & ICMP Verification";
        leaderboard[exIdx].lastActive = "Reset by Admin";
        leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
        await saveKvLeaderboard(leaderboard);
      }
      return res.status(200).json({ status: 'ok' });
    }

    // Action: Admin Delete User Account Permanently
    if (req.method === 'POST' && action === 'admin_delete_user') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { username } = body || {};
      const cleanUser = (username || '').trim();
      if (!cleanUser || cleanUser.toLowerCase() === 'admin') {
        return res.status(400).json({ error: 'Cannot delete admin account or empty username' });
      }

      const users = await getKvUsers();
      if (users[cleanUser]) {
        delete users[cleanUser];
        await saveKvUsers(users);
      }

      const leaderboard = await getKvLeaderboard();
      const updatedLb = leaderboard.filter(x => x.username.toLowerCase() !== cleanUser.toLowerCase());
      await saveKvLeaderboard(updatedLb);

      return res.status(200).json({ status: 'ok', deleted: cleanUser });
    }

    // Default GET: Fetch Leaderboard
    if (req.method === 'GET') {
      const leaderboard = await getKvLeaderboard();
      leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
      return res.status(200).json({ status: 'ok', leaderboard });
    }

    // Default POST: Upsert Leaderboard entry
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { username, score, solvedCount, currentTaskId, currentTaskTitle, role } = body || {};
      if (!username || role === 'admin') return res.status(400).json({ error: 'Invalid user payload' });
      const cleanUser = username.trim();
      const leaderboard = await getKvLeaderboard();
      const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === cleanUser.toLowerCase());
      const entry = {
        username: cleanUser,
        score: Number(score) || 0,
        solvedCount: Number(solvedCount) || 0,
        currentTaskId: currentTaskId || 1,
        currentTaskTitle: currentTaskTitle || "Host Reachability & ICMP Verification",
        lastActive: 'Just now'
      };
      if (exIdx !== -1) leaderboard[exIdx] = entry;
      else leaderboard.push(entry);
      leaderboard.sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount);
      await saveKvLeaderboard(leaderboard);
      return res.status(200).json({ status: 'ok', entry });
    }
  } catch (err) {
    console.error('Auto Cloud DB Error:', err);
    return res.status(500).json({ error: err.message, leaderboard: [] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
