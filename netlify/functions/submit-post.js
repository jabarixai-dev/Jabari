// netlify/functions/submit-post.js
// Create or edit a Blog post stored in the Netlify Forms system.
// Required environment variables:
//   BLOG_PASSCODE
//   NETLIFY_ACCESS_TOKEN (required for edits)
//   NETLIFY_SITE_ID (required for edits)

const https = require('https');

function request(host, path, method, headers, body = '') {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: host, path, method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function postForm(host, path, formBody) {
  return request(host, path, 'POST', {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(formBody)
  }, formBody);
}

async function deleteSubmission(id, token) {
  return request('api.netlify.com', `/api/v1/submissions/${encodeURIComponent(id)}`, 'DELETE', {
    Authorization: `Bearer ${token}`
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (_) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { passcode, title, content, imageUrl = '', videoUrl = '', mediaPath = '', date = '', submissionId = '' } = payload;
  const expected = process.env.BLOG_PASSCODE;

  if (!expected) return { statusCode: 500, body: 'Blog passcode is not configured on the server yet' };
  if (!passcode || passcode !== expected) return { statusCode: 401, body: 'Incorrect passcode' };
  if (!title || !content) return { statusCode: 400, body: 'Title and content are required' };

  const host = event.headers.host || 'jabari-org.netlify.app';
  const formBody = [
    ['form-name', 'blog-posts'],
    ['title', title],
    ['content', content],
    ['image', imageUrl],
    ['video', videoUrl],
    ['media-path', mediaPath],
    ['post-date', date]
  ].map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v || '')}`).join('&');

  try {
    const result = await postForm(host, '/', formBody);
    if (result.status < 200 || result.status >= 400) {
      return { statusCode: 502, body: `Could not save post (status ${result.status})` };
    }

    // Editing is implemented as create-new-then-delete-old. This avoids losing
    // the old post if the new submission cannot be created.
    if (submissionId) {
      const token = process.env.NETLIFY_ACCESS_TOKEN;
      if (!token) return { statusCode: 500, body: 'NETLIFY_ACCESS_TOKEN is required to edit posts' };
      const deleted = await deleteSubmission(submissionId, token);
      if (deleted.status < 200 || deleted.status >= 300) {
        return { statusCode: 502, body: 'Updated post was created, but the old version could not be deleted' };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (_) {
    return { statusCode: 500, body: 'Unexpected error saving post' };
  }
};
