// netlify/functions/verify-payment.js
//
// Server-side payment verification for the JABARI shop.
//
// Product information comes from the GitHub-backed shop/products.json
// so the frontend and payment verification use the same catalog.
//
// Required Netlify environment variable:
//   PAYSTACK_SECRET_KEY
//
// Never put the Paystack secret key in index.html.

const https = require('https');
const fs = require('fs');
const path = require('path');

const SHOP_CATALOG_URL =
  `https://raw.githubusercontent.com/${process.env.GITHUB_OWNER || 'jabarixai-dev'}/${process.env.GITHUB_REPO || 'Jabari'}/${process.env.GITHUB_BRANCH || 'main'}/shop/products.json`;

function loadShopCatalog() {
  return new Promise((resolve, reject) => {
    https.get(SHOP_CATALOG_URL, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(
            new Error(`Shop catalog returned HTTP ${res.statusCode}`)
          );
          return;
        }

        try {
          const products = JSON.parse(data);

          if (!Array.isArray(products)) {
            throw new Error('Invalid shop catalog');
          }

          resolve(products);
        } catch (err) {
          reject(new Error('Could not parse shop catalog'));
        }
      });
    }).on('error', reject);
  });
}

function verifyWithPaystack(reference, secretKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      path: `/transaction/verify/${encodeURIComponent(reference)}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Could not parse Paystack response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

exports.handler = async (event) => {
  const { reference, product } = event.queryStringParameters || {};

  if (!reference || !product) {
    return {
      statusCode: 400,
      body: 'Missing reference or product'
    };
  }

  // Load the same product catalog used by the public Shop.
  let products;

  try {
    products = await loadShopCatalog();
  } catch (err) {
    console.error('Shop catalog error:', err);

    return {
      statusCode: 502,
      body: 'Could not load shop catalog'
    };
  }

  // Only active products can be purchased/downloaded.
  const productInfo = products.find(
    (item) =>
      item &&
      item.slug === product &&
      item.active !== false
  );

  if (!productInfo) {
    return {
      statusCode: 400,
      body: 'Unknown or inactive product'
    };
  }

  // Validate the catalog entry before using it.
  if (
    typeof productInfo.priceKobo !== 'number' ||
    !Number.isFinite(productInfo.priceKobo) ||
    productInfo.priceKobo <= 0 ||
    typeof productInfo.file !== 'string' ||
    !productInfo.file
  ) {
    return {
      statusCode: 500,
      body: 'Product configuration is invalid'
    };
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    return {
      statusCode: 500,
      body: 'Payments are not configured on this site yet'
    };
  }

  // Ask Paystack directly whether this transaction actually succeeded.
  let result;

  try {
    result = await verifyWithPaystack(reference, secretKey);
  } catch (err) {
    return {
      statusCode: 502,
      body: 'Could not reach Paystack to verify payment'
    };
  }

  if (!result || result.status !== true || !result.data) {
    return {
      statusCode: 402,
      body: 'Payment verification failed'
    };
  }

  const {
    status: txStatus,
    amount,
    currency
  } = result.data;

  if (txStatus !== 'success') {
    return {
      statusCode: 402,
      body: 'Payment not completed'
    };
  }

  // The actual Paystack amount must match the current catalog price.
  if (
    currency !== 'NGN' ||
    amount !== productInfo.priceKobo
  ) {
    return {
      statusCode: 402,
      body: 'Payment amount does not match product price'
    };
  }

  // Prevent a catalog filename from escaping the product-files directory.
  const safeFileName = path.basename(productInfo.file);

  if (safeFileName !== productInfo.file) {
    return {
      statusCode: 500,
      body: 'Invalid product file path'
    };
  }

  // Payment is genuine and the amount is correct.
  // Keep the existing PDF location unchanged.
  let fileBuffer;

  try {
    const filePath = path.join(
      __dirname,
      'files',
      safeFileName
    );

    fileBuffer = fs.readFileSync(filePath);
  } catch (err) {
    return {
      statusCode: 500,
      body: 'Product file missing on server'
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type':
        productInfo.contentType || 'application/pdf',

      'Content-Disposition':
        `attachment; filename="${safeFileName}"`,

      'Cache-Control': 'no-store'
    },

    body: fileBuffer.toString('base64'),
    isBase64Encoded: true
  };
};
