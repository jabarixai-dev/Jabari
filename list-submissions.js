// netlify/functions/list-submissions.js
//
// Reads back submissions from a Netlify Form (either "reviews" or "blog-posts")
// using the Netlify Management API, so the public site can display them.
//
// Required Netlify environment variables:
//   NETLIFY_ACCESS_TOKEN — a Personal Access Token
//     (User settings -> Applications -> New access token)
//   NETLIFY_SITE_ID — this site's Site ID
//     (Site configuration -> General -> Site details -> Site ID)
//
// Usage: /.netlify/functions/list-submissions?form=reviews
//        /.netlify/functions/list-submissions?form=blog-posts

const https = require('https');

const ALLOWED_FORMS = ['reviews', 'blog-posts'];

function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.netlify.com',
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || '[]') });
        } catch (err) {
          reject(new Error('Could not parse Netlify API response'));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

exports.handler = async (event) => {
  const formName = (event.queryStringParameters || {}).form;

  if (!formName || !ALLOWED_FORMS.includes(formName)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid or missing form parameter' })
    };
  }

  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  // Not configured yet — return an empty list rather than an error, so the
  // page still renders cleanly (with "no reviews/posts yet") before setup.
  if (!token || !siteId) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ items: [], notConfigured: true })
    };
  }

  try {
    const formsRes = await apiGet(`/api/v1/sites/${siteId}/forms`, token);
    if (formsRes.status !== 200) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not list forms' }) };
    }

    const form = (formsRes.body || []).find((f) => f.name === formName);
    if (!form) {
      // Form hasn't been created yet (no deploy with it detected, or zero
      // submissions so far) — not an error, just nothing to show yet.
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ items: [] })
      };
    }

    const subsRes = await apiGet(`/api/v1/forms/${form.id}/submissions`, token);
    if (subsRes.status !== 200) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not fetch submissions' }) };
    }

    const items = (subsRes.body || [])
      .map((s) => ({ data: s.data || {}, created_at: s.created_at }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ items })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error' }) };
  }
};
