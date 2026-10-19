// Vercel Serverless Function: /api/leaderboard
// Manages shared class CTF leaderboard scores via Vercel KV (Redis)
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  // If Vercel KV is not connected yet, fall back gracefully
  if (!kvUrl || !kvToken) {
    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'kv_unlinked',
        message: 'Vercel KV not yet connected in Storage tab. Showing local scores.',
        leaderboard: []
      });
    }
    return res.status(200).json({ status: 'kv_unlinked' });
  }

  try {
    // GET: Return all students' scores sorted by score descending
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

      // Sort: highest score first, then most solved tasks
      list.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));

      return res.status(200).json({ status: 'ok', leaderboard: list });
    }

    // POST: Submit/Update a student's score
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

      // Store in Redis hash 'ceh_leaderboard'
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
    console.error('Leaderboard API Error:', err);
    return res.status(500).json({ error: err.message, leaderboard: [] });
  }
}
