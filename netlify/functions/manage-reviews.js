// netlify/functions/manage-reviews.js
// Private Reviews Manager API.
// Reviews are stored by Netlify Forms. Replies are stored in GitHub so both
// the website dashboard and Jabari Promoter can use the same review data.

const https = require('https');

const OWNER = process.env.GITHUB_OWNER || 'jabarixai-dev';
const REPO = process.env.GITHUB_REPO || 'Jabari';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const FORM_NAME = 'reviews';
const REPLIES_PATH = 'reviews/replies.json';

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function request(hostname, method, path, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : JSON.stringify(body);
    const req = https.request({
      hostname,
      path,
      method,
      headers: {
        'User-Agent': 'Jabari-Reviews-Manager',
        'Accept': 'application/vnd.github+json',
        ...(hostname === 'api.github.com' ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed = {};
        try { parsed = data ? JSON.parse(data) : {}; } catch (_) { parsed = {}; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function netlify(method, path, token, body) {
  const r = await request('api.netlify.com', method, path, token, body);
  if (r.status < 200 || r.status >= 300) {
    throw new Error(r.body?.message || `Netlify returned HTTP ${r.status}`);
  }
  return r.body;
}

async function github(method, path, token, body) {
  const r = await request('api.github.com', method, path, token, body);
  if (r.status < 200 || r.status >= 300) {
    throw new Error(r.body?.message || `GitHub returned HTTP ${r.status}`);
  }
  return r.body;
}

async function getReviewForm(token, siteId) {
  const forms = await netlify('GET', `/api/v1/sites/${siteId}/forms`, token);
  return (forms || []).find(f => f.name === FORM_NAME) || null;
}

async function getSubmissions(token, formId, state) {
  const suffix = state === 'spam' ? '?state=spam' : '';
  return netlify('GET', `/api/v1/forms/${formId}/submissions${suffix}`, token);
}

async function readReplies(token) {
  try {
    const result = await github(
      'GET',
      `/repos/${OWNER}/${REPO}/contents/${REPLIES_PATH}?ref=${encodeURIComponent(BRANCH)}`,
      token
    );
    const raw = Buffer.from(String(result.content || '').replace(/\n/g, ''), 'base64').toString('utf8');
    const replies = JSON.parse(raw || '{}');
    return { replies: replies && typeof replies === 'object' && !Array.isArray(replies) ? replies : {}, sha: result.sha };
  } catch (err) {
    // A replies file does not exist until the first reply is created.
    if (String(err.message || '').includes('Not Found')) return { replies: {}, sha: null };
    throw err;
  }
}

async function saveReplies(replies, sha, token, message) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(replies, null, 2) + '\n', 'utf8').toString('base64'),
    branch: BRANCH
  };
  if (sha) body.sha = sha;
  return github('PUT', `/repos/${OWNER}/${REPO}/contents/${REPLIES_PATH}`, token, body);
}

function mapSubmission(s, status, replies) {
  return {
    id: s.id,
    data: s.data || {},
    created_at: s.created_at,
    status,
    reply: replies[s.id]?.text || '',
    replyUpdatedAt: replies[s.id]?.updatedAt || ''
  };
}

exports.handler = async event => {
  const body = event.body ? (() => { try { return JSON.parse(event.body); } catch (_) { return {}; } })() : {};
  const passcode = body.passcode || event.queryStringParameters?.passcode || '';
  const expected = process.env.BLOG_PASSCODE;

  if (!expected || passcode !== expected) return json(401, { error: 'Incorrect passcode.' });

  const netlifyToken = process.env.NETLIFY_ACCESS_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  const githubToken = process.env.GITHUB_TOKEN;
  if (!netlifyToken || !siteId) return json(500, { error: 'Netlify Forms is not configured.' });
  if (!githubToken) return json(500, { error: 'GitHub is not configured.' });

  try {
    const form = await getReviewForm(netlifyToken, siteId);
    if (!form) return json(200, { items: [] });

    const { replies } = await readReplies(githubToken);

    if (event.httpMethod === 'GET') {
      const [verified, spam] = await Promise.all([
        getSubmissions(netlifyToken, form.id, 'verified'),
        getSubmissions(netlifyToken, form.id, 'spam')
      ]);
      const items = [
        ...(verified || []).map(s => mapSubmission(s, 'approved', replies)),
        ...(spam || []).map(s => mapSubmission(s, 'hidden', replies))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return json(200, { items });
    }

    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

    const action = body.action;
    const id = String(body.id || '').trim();
    if (!id) return json(400, { error: 'Missing review ID.' });

    if (action === 'delete') {
      const result = await netlify('DELETE', `/api/v1/submissions/${encodeURIComponent(id)}`, netlifyToken);
      const current = await readReplies(githubToken);
      if (current.replies[id]) {
        delete current.replies[id];
        await saveReplies(current.replies, current.sha, githubToken, `Remove reply for deleted review ${id}`);
      }
      return json(200, { ok: true, deleted: true });
    }

    if (action === 'hide') {
      await netlify('PUT', `/api/v1/submissions/${encodeURIComponent(id)}/spam`, netlifyToken);
      return json(200, { ok: true, status: 'hidden' });
    }

    if (action === 'approve') {
      await netlify('PUT', `/api/v1/submissions/${encodeURIComponent(id)}/ham`, netlifyToken);
      return json(200, { ok: true, status: 'approved' });
    }

    if (action === 'reply') {
      const text = String(body.reply || '').trim();
      if (!text) return json(400, { error: 'Reply cannot be empty.' });
      if (text.length > 2000) return json(400, { error: 'Reply is too long.' });

      const current = await readReplies(githubToken);
      current.replies[id] = {
        text,
        author: 'Jabari',
        updatedAt: new Date().toISOString()
      };
      await saveReplies(current.replies, current.sha, githubToken, `Update reply for review ${id}`);
      return json(200, { ok: true, reply: current.replies[id] });
    }

    if (action === 'delete-reply') {
      const current = await readReplies(githubToken);
      if (current.replies[id]) {
        delete current.replies[id];
        await saveReplies(current.replies, current.sha, githubToken, `Delete reply for review ${id}`);
      }
      return json(200, { ok: true, deleted: true });
    }

    return json(400, { error: 'Unknown action.' });
  } catch (err) {
    return json(500, { error: err.message || 'Could not manage reviews.' });
  }
};
