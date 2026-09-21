// netlify/functions/upload-blog-media.js
// Accepts a client-compressed Blog image/video (max 700 KB) and stores it
// in the existing GitHub website repository. The GitHub token stays server-side.

const https = require('https');
const MAX_BYTES = 700 * 1024;

function githubRequest(path, method, token, body) {
  return new Promise((resolve, reject) => {
    const raw = body ? JSON.stringify(body) : '';
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Jabari-Website',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(raw)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({status: res.statusCode, body: data}));
    });
    req.on('error', reject);
    if(raw) req.write(raw);
    req.end();
  });
}

function safeName(name, mime) {
  const base = String(name || 'blog-media')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'blog-media';
  const ext = mime === 'image/webp' ? 'webp'
    : mime === 'image/jpeg' ? 'jpg'
    : mime === 'image/png' ? 'png'
    : mime === 'video/webm' ? 'webm'
    : '';
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext || 'bin'}`;
}

exports.handler = async event => {
  if(event.httpMethod !== 'POST') return {statusCode:405, body:'Method not allowed'};

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (_) { return {statusCode:400, body:'Invalid JSON'}; }

  const passcode = payload.passcode;
  if(!process.env.BLOG_PASSCODE) return {statusCode:500, body:'Blog passcode is not configured on the server yet'};
  if(!passcode || passcode !== process.env.BLOG_PASSCODE) return {statusCode:401, body:'Incorrect passcode'};

  const mime = String(payload.mimeType || '').toLowerCase();
  const data = String(payload.data || '');
  const allowed = ['image/webp','image/jpeg','image/png','video/webm'];
  if(!allowed.includes(mime)) return {statusCode:400, body:'Unsupported compressed media type'};
  if(!data) return {statusCode:400, body:'No media data received'};

  let buffer;
  try { buffer = Buffer.from(data, 'base64'); }
  catch (_) { return {statusCode:400, body:'Invalid media data'}; }

  if(buffer.length > MAX_BYTES) {
    return {statusCode:413, body:'Compressed media is still larger than 700 KB'};
  }

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;
  if(!owner || !repo || !token) {
    return {statusCode:500, body:'GitHub media storage is not configured yet'};
  }

  const fileName = safeName(payload.fileName, mime);
  const path = `blog-media/${fileName}`;

  try {
    const result = await githubRequest(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
      'PUT',
      token,
      {
        message: `Add blog media: ${fileName}`,
        content: buffer.toString('base64'),
        branch
      }
    );

    if(result.status < 200 || result.status >= 300) {
      return {statusCode:502, body:'GitHub could not store the media'};
    }

    const publicUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path}`;
    return {
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        ok:true,
        url:publicUrl,
        path,
        type:mime.startsWith('video/') ? 'video' : 'image',
        size:buffer.length
      })
    };
  } catch (_) {
    return {statusCode:500, body:'Unexpected error storing media'};
  }
};
