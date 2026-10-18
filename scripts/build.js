#!/usr/bin/env node
/* Runs on every Netlify deploy (see netlify.toml).
   Creates one shareable page per product at /p/<product-id>/ with the
   preview tags Facebook, WhatsApp and X need (picture, title, price).
   No packages required. */
'use strict';

var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

var siteUrl = String(process.env.URL || process.env.SITE_URL || '').replace(/\/+$/, '');

function abs(u) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return siteUrl ? siteUrl + '/' + String(u).replace(/^\/+/, '') : '';
}

function money(p) {
  if (p.price_ngn !== undefined && p.price_ngn !== null && p.price_ngn !== '') {
    var n = Number(p.price_ngn);
    if (!isNaN(n)) return n === 0 ? 'Free' : '₦' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return p.price || '';
}

var settings = readJSON('content/settings.json');
var shop = readJSON('content/products.json');
var tpl = fs.readFileSync(path.join(__dirname, 'product.template.html'), 'utf8');

var outDir = path.join(root, 'p');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'index.html'),
  '<!DOCTYPE html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/shop.html"><a href="/shop.html">Shop</a>'
);

var brand = settings.brand || settings.name || 'Shop';
var seen = {};
var made = 0;

(Array.isArray(shop.items) ? shop.items : []).forEach(function (p) {
  if (!p || !p.title || p.hidden === true) return;
  var id = String(p.id || '');
  // The id becomes a folder name, so only plain safe characters are allowed.
  if (!/^[a-z0-9-]+$/.test(id)) {
    console.warn('[build] skipped "' + p.title + '": Product ID must be lowercase letters, numbers and dashes.');
    return;
  }
  if (seen[id]) {
    console.warn('[build] skipped duplicate Product ID "' + id + '"');
    return;
  }
  seen[id] = true;

  var desc = String(p.description || '').replace(/\s+/g, ' ').trim();
  var descMeta = (desc || (p.title + ' by ' + brand)).slice(0, 200);
  var url = siteUrl ? siteUrl + '/p/' + id : '';
  var img = abs(p.image) || abs(settings.profile_image);
  var price = money(p);
  var amount = Number(p.price_ngn);

  var map = {
    PAGE_TITLE: esc(p.title + ' · ' + (settings.site_title || brand)),
    DESC_META: esc(descMeta),
    CANONICAL: url ? '<link rel="canonical" href="' + esc(url) + '">' : '',
    OG_URL: url ? '<meta property="og:url" content="' + esc(url) + '">' : '',
    OG_IMAGE: img ? '<meta property="og:image" content="' + esc(img) + '">' : '',
    OG_PRICE: amount > 0
      ? '<meta property="product:price:amount" content="' + esc(amount) + '"><meta property="product:price:currency" content="NGN">'
      : '',
    BRAND: esc(brand),
    TITLE: esc(p.title),
    ID: esc(id),
    PRICE: esc(price),
    DESC: esc(desc),
    BADGE: esc(p.badge || ''),
    BADGE_HIDDEN: p.badge ? '' : ' hidden',
    BUY_LABEL: esc(p.available === false ? 'Sold out' : (p.buy_label || 'Buy now')),
    IMG: p.image ? '<img class="p-image" id="p-image" src="' + esc(p.image) + '" alt="' + esc(p.title) + '">' : '<img class="p-image" id="p-image" alt="" hidden>',
    WRAP_HIDDEN: p.image ? '' : ' hidden'
  };

  var html = tpl.replace(/\{\{(\w+)\}\}/g, function (_, k) { return map[k] == null ? '' : map[k]; });
  fs.mkdirSync(path.join(outDir, id), { recursive: true });
  fs.writeFileSync(path.join(outDir, id, 'index.html'), html);
  made++;
});

console.log('[build] created ' + made + ' product page' + (made === 1 ? '' : 's') + (siteUrl ? ' for ' + siteUrl : ' (no site URL set, so preview image tags are omitted)'));
