// netlify/functions/manage-shop.js
//
// Private Shop Manager API.
// Uses the same BLOG_PASSCODE/GitHub credentials as the existing admin tools.
// Product catalog: shop/products.json
// Uploaded PDFs: shop/files/<unique-name>.pdf

const https = require('https');

const OWNER = process.env.GITHUB_OWNER || 'jabarixai-dev';
const REPO = process.env.GITHUB_REPO || 'Jabari';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function githubRequest(method, apiPath, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : JSON.stringify(body);

    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        'User-Agent': 'Jabari-Shop-Manager',
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = {};
        try { parsed = data ? JSON.parse(data) : {}; } catch (_) {}
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          reject(new Error(parsed.message || `GitHub returned HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getCatalog(token) {
  const result = await githubRequest(
    'GET',
    `/repos/${OWNER}/${REPO}/contents/shop/products.json?ref=${encodeURIComponent(BRANCH)}`,
    token
  );

  const raw = Buffer.from(result.content.replace(/\n/g, ''), 'base64').toString('utf8');
  const products = JSON.parse(raw);

  if (!Array.isArray(products)) {
    throw new Error('Shop catalog is invalid.');
  }

  return { products, sha: result.sha };
}

async function saveCatalog(products, sha, token, message) {
  const content = JSON.stringify(products, null, 2) + '\n';

  return githubRequest(
    'PUT',
    `/repos/${OWNER}/${REPO}/contents/shop/products.json`,
    token,
    {
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha,
      branch: BRANCH
    }
  );
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function uniqueSlug(title, products, currentSlug) {
  const base = slugify(title) || 'product';
  let slug = base;
  let n = 2;

  while (products.some(p => p.slug === slug && p.slug !== currentSlug)) {
    slug = `${base}-${n++}`;
  }

  return slug;
}

function uniquePdfName(originalName) {
  const base = String(originalName || 'product.pdf')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const stem = base.toLowerCase().endsWith('.pdf')
    ? base.slice(0, -4)
    : base;

  return `${slugify(stem) || 'product'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.pdf`;
}

exports.handler = async (event) => {
  const passcode = event.queryStringParameters?.passcode || '';

  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (_) {
      return json(400, { error: 'Invalid JSON request.' });
    }
  }

  const suppliedPasscode = body.passcode || passcode;
  const expectedPasscode = process.env.BLOG_PASSCODE;

  if (!expectedPasscode || suppliedPasscode !== expectedPasscode) {
    return json(401, { error: 'Incorrect passcode.' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return json(500, { error: 'GitHub is not configured on this site.' });
  }

  try {
    if (event.httpMethod === 'GET') {
      const { products } = await getCatalog(token);
      return json(200, { products });
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method not allowed.' });
    }

    const action = body.action;

    if (action === 'upload') {
      const filename = String(body.filename || '');
      const contentBase64 = String(body.contentBase64 || '');

      if (!filename.toLowerCase().endsWith('.pdf')) {
        return json(400, { error: 'Only PDF files are allowed.' });
      }

      if (!contentBase64) {
        return json(400, { error: 'No PDF content received.' });
      }

      // Keep the server-side limit at 10 MB.
      if (Buffer.byteLength(contentBase64, 'utf8') > 14 * 1024 * 1024) {
        return json(400, { error: 'PDF is too large.' });
      }

      const safeName = uniquePdfName(filename);

      await githubRequest(
        'PUT',
        `/repos/${OWNER}/${REPO}/contents/shop/files/${encodeURIComponent(safeName)}`,
        token,
        {
          message: `Add shop product PDF: ${safeName}`,
          content: contentBase64,
          branch: BRANCH
        }
      );

      return json(200, {
        ok: true,
        file: safeName
      });
    }

    const { products, sha } = await getCatalog(token);

    if (action === 'save') {
      const title = String(body.title || '').trim();
      const desc = String(body.desc || '').trim();
      const priceNaira = Number(body.priceNaira);
      const active = body.active !== false;
      const currentSlug = String(body.slug || '').trim();
      const uploadedFile = body.file ? String(body.file).trim() : '';

      if (!title || !desc || !Number.isFinite(priceNaira) || priceNaira <= 0) {
        return json(400, { error: 'Title, description and valid price are required.' });
      }

      const priceKobo = Math.round(priceNaira * 100);
      const slug = uniqueSlug(title, products, currentSlug);

      if (currentSlug) {
        const index = products.findIndex(p => p.slug === currentSlug);
        if (index === -1) {
          return json(404, { error: 'Product not found.' });
        }

        const old = products[index];
        products[index] = {
          ...old,
          slug,
          title,
          desc,
          priceNaira: Math.round(priceNaira),
          priceKobo,
          file: uploadedFile || old.file,
          contentType: 'application/pdf',
          active
        };
      } else {
        if (!uploadedFile) {
          return json(400, { error: 'A PDF is required for a new product.' });
        }

        products.push({
          slug,
          title,
          desc,
          priceNaira: Math.round(priceNaira),
          priceKobo,
          file: uploadedFile,
          contentType: 'application/pdf',
          active
        });
      }

      await saveCatalog(
        products,
        sha,
        token,
        currentSlug ? `Update shop product: ${slug}` : `Add shop product: ${slug}`
      );

      return json(200, { ok: true, products });
    }

    if (action === 'toggle') {
      const slug = String(body.slug || '').trim();
      const product = products.find(p => p.slug === slug);

      if (!product) return json(404, { error: 'Product not found.' });

      product.active = product.active === false;
      await saveCatalog(products, sha, token, `${product.active ? 'Activate' : 'Deactivate'} shop product: ${slug}`);

      return json(200, { ok: true, products });
    }

    if (action === 'delete') {
      const slug = String(body.slug || '').trim();
      const index = products.findIndex(p => p.slug === slug);

      if (index === -1) return json(404, { error: 'Product not found.' });

      products.splice(index, 1);
      await saveCatalog(products, sha, token, `Delete shop product: ${slug}`);

      return json(200, { ok: true, products });
    }

    return json(400, { error: 'Unknown shop action.' });
  } catch (err) {
    console.error('Shop manager error:', err);
    return json(500, { error: err.message || 'Shop manager failed.' });
  }
};
