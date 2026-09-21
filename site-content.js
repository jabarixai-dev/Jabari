const https = require('https');

function request(options, body = '') {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function json(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
    body: JSON.stringify(payload)
  };
}

function cleanContent(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid content');
  const home = input.home || {};
  const about = input.about || {};
  const services = Array.isArray(about.services) ? about.services : [];
  return {
    home: {
      name: String(home.name || 'JABARI').trim().slice(0, 80),
      tagline: String(home.tagline || '').trim().slice(0, 180),
      intro: String(home.intro || '').trim().slice(0, 500),
      ticker: Array.isArray(home.ticker) ? home.ticker.map(x => String(x).trim().slice(0, 50)).filter(Boolean).slice(0, 12) : []
    },
    about: {
      eyebrow: String(about.eyebrow || 'About · Services').trim().slice(0, 80),
      heading: String(about.heading || 'Jabari').trim().slice(0, 100),
      role: String(about.role || '').trim().slice(0, 180),
      bio: String(about.bio || '').trim().slice(0, 800),
      services: services.slice(0, 6).map(item => ({
        title: String(item?.title || '').trim().slice(0, 100),
        description: String(item?.description || '').trim().slice(0, 500)
      })).filter(item => item.title && item.description)
    }
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' }, { 'Cache-Control': 'no-store' });
  }

  const expected = process.env.SITE_ADMIN_PASSCODE || process.env.BLOG_PASSCODE;
  if (!expected) return json(500, { error: 'Site editor passcode is not configured' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (_) { return json(400, { error: 'Invalid JSON' }); }

  if (!payload.passcode || payload.passcode !== expected) {
    return json(401, { error: 'Incorrect passcode' });
  }

  let content;
  try { content = cleanContent(payload.content); }
  catch (err) { return json(400, { error: err.message }); }

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;
  const path = process.env.SITE_CONTENT_PATH || 'content/site-content.json';

  if (!owner || !repo || !token) {
    return json(500, { error: 'GitHub site-content storage is not configured yet' });
  }

  const apiBase = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Jabari-Website-Editor'
  };

  try {
    const current = await request({ hostname: 'api.github.com', path: apiBase + `?ref=${encodeURIComponent(branch)}`, method: 'GET', headers: authHeaders });
    let sha = null;
    if (current.status === 200) {
      try { sha = JSON.parse(current.body).sha || null; } catch (_) {}
    } else if (current.status !== 404) {
      return json(502, { error: 'Could not read the current website content from GitHub' });
    }

    const fileBody = JSON.stringify(content, null, 2) + '\n';
    const body = JSON.stringify({
      message: `Update website content via Jabari`,
      content: Buffer.from(fileBody, 'utf8').toString('base64'),
      branch,
      ...(sha ? { sha } : {})
    });

    const saved = await request({
      hostname: 'api.github.com', path: apiBase, method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, body);

    if (saved.status < 200 || saved.status >= 300) {
      return json(502, { error: 'GitHub could not save the website content', detail: saved.body.slice(0, 300) });
    }

    return json(200, { ok: true, content, message: 'Saved. Netlify will deploy the update from GitHub.' }, { 'Cache-Control': 'no-store' });
  } catch (err) {
    return json(500, { error: 'Unexpected error saving website content' });
  }
};
