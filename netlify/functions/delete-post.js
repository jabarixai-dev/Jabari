// netlify/functions/delete-post.js
// Deletes a Blog post submission after server-side passcode validation.
// Required: BLOG_PASSCODE, NETLIFY_ACCESS_TOKEN

const https = require('https');

function request(path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.netlify.com',
      path,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (_) { return { statusCode: 400, body: 'Invalid JSON' }; }

  if (!process.env.BLOG_PASSCODE) return { statusCode: 500, body: 'Blog passcode is not configured on the server yet' };
  if (!payload.passcode || payload.passcode !== process.env.BLOG_PASSCODE) return { statusCode: 401, body: 'Incorrect passcode' };
  if (!payload.submissionId) return { statusCode: 400, body: 'Submission ID is required' };
  if (!process.env.NETLIFY_ACCESS_TOKEN) return { statusCode: 500, body: 'NETLIFY_ACCESS_TOKEN is not configured' };

  try {
    const result = await request(`/api/v1/submissions/${encodeURIComponent(payload.submissionId)}`, process.env.NETLIFY_ACCESS_TOKEN);
    if (result.status >= 200 && result.status < 300) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    return { statusCode: 502, body: 'Could not delete the post (status ' + result.status + ')' };
  } catch (_) {
    return { statusCode: 500, body: 'Unexpected error deleting post' };
  }
};
