// netlify/functions/verify-payment.js
//
// Server-side payment verification for the JABARI shop.
//
// Flow:
//   1. Buyer pays via Paystack Inline checkout on the client.
//   2. On success, the browser is sent to #download?ref=<reference>&product=<slug>,
//      which calls this function: /.netlify/functions/verify-payment?reference=...&product=...
//   3. This function asks Paystack DIRECTLY (server-to-server, using the secret key)
//      whether that reference was really paid, and for how much.
//   4. Only if Paystack confirms success AND the amount matches the product's
//      real price does this function return the file. Nothing here trusts the
//      browser's own claim that payment succeeded — that would be spoofable.
//
// Required Netlify environment variable:
//   PAYSTACK_SECRET_KEY  — from Paystack Dashboard -> Settings -> API Keys & Webhooks
//   (Never put the secret key in the frontend/index.html — only here.)

const https = require('https');
const fs = require('fs');
const path = require('path');

// Product catalog — must match the SHOP_PRODUCTS list in index.html.
// priceKobo = price in kobo (₦1 = 100 kobo), used to confirm the buyer paid
// the correct amount and not a tampered/lower one.
const PRODUCTS = {
  'x-growth-playbook': {
    title: 'The X Growth Playbook',
    priceKobo: 150000, // ₦1,500
    file: 'the-x-growth-playbook.pdf',
    contentType: 'application/pdf'
  },
  'herbal-remedy-bible': {
    title: 'The Herbal Remedy Bible',
    priceKobo: 500000, // ₦5,000
    file: 'the-herbal-remedy-bible.pdf',
    contentType: 'application/pdf'
  }
};

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
      res.on('data', (chunk) => { data += chunk; });
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
    return { statusCode: 400, body: 'Missing reference or product' };
  }

  const productInfo = PRODUCTS[product];
  if (!productInfo) {
    return { statusCode: 400, body: 'Unknown product' };
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    // Misconfiguration on the site owner's side, not the buyer's.
    return { statusCode: 500, body: 'Payments are not configured on this site yet' };
  }

  let result;
  try {
    result = await verifyWithPaystack(reference, secretKey);
  } catch (err) {
    return { statusCode: 502, body: 'Could not reach Paystack to verify payment' };
  }

  if (!result || result.status !== true || !result.data) {
    return { statusCode: 402, body: 'Payment verification failed' };
  }

  const { status: txStatus, amount, currency } = result.data;

  if (txStatus !== 'success') {
    return { statusCode: 402, body: 'Payment not completed' };
  }

  if (currency !== 'NGN' || amount !== productInfo.priceKobo) {
    return { statusCode: 402, body: 'Payment amount does not match product price' };
  }

  // Payment confirmed genuine and correct — release the file.
  let fileBuffer;
  try {
    const filePath = path.join(__dirname, 'files', productInfo.file);
    fileBuffer = fs.readFileSync(filePath);
  } catch (err) {
    return { statusCode: 500, body: 'Product file missing on server' };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': productInfo.contentType,
      'Content-Disposition': `attachment; filename="${productInfo.file}"`,
      'Cache-Control': 'no-store'
    },
    body: fileBuffer.toString('base64'),
    isBase64Encoded: true
  };
};
