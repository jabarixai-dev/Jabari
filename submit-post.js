// netlify/functions/submit-post.js
//
// Publishes a blog post. The passcode is checked server-side (never in the
// browser), so it can't be read from page source the way client-side
// validation could be. On success, this relays the post into Netlify's
// native Forms system (same storage used for Reviews) by performing the
// same POST a real HTML form submission would make.
//
// Required Netlify environment variable:
//   BLOG_PASSCODE — any passcode you choose, set in Netlify's dashboard.

const https = require('https');

function postForm(host, path, formBody) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formBody)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(formBody);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { passcode, title, content } = payload;
  const expected = process.env.BLOG_PASSCODE;

  if (!expected) {
    return { statusCode: 500, body: 'Blog passcode is not configured on the server yet' };
  }
  if (!passcode || passcode !== expected) {
    return { statusCode: 401, body: 'Incorrect passcode' };
  }
  if (!title || !content) {
    return { statusCode: 400, body: 'Title and content are required' };
  }

  const host = event.headers.host || 'jabari-org.netlify.app';
  const formBody = `form-name=blog-posts&title=${encodeURIComponent(title)}&content=${encodeURIComponent(content)}`;

  try {
    const result = await postForm(host, '/', formBody);
    if (result.status >= 200 && result.status < 400) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }
    return { statusCode: 502, body: 'Could not save post (status ' + result.status + ')' };
  } catch (err) {
    return { statusCode: 500, body: 'Unexpected error saving post' };
  }
};
