/* Renders every page from the JSON files in /content.
   You never need to edit this file: use /admin instead. */
(function () {
  'use strict';

  var ICONS = {
    whatsapp: '<svg viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="#ffffff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="#2AABEE"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24"><rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#7a1c1c"/><path d="M10 9l5.5 3L10 15z" fill="#ff2a2a"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="#E1306C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#E1306C" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1877F2"/><path d="M13.5 21v-7h2.4l.4-3h-2.8V9.3c0-.9.3-1.4 1.5-1.4h1.4V5.2c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6V11H8.5v3h2.3v7z" fill="#fff"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2"/><path d="M7 10h2.2v7H7zM8.1 6.8a1.3 1.3 0 110 2.6 1.3 1.3 0 010-2.6zM11 10h2.1v1c.4-.7 1.2-1.2 2.3-1.2 2.2 0 2.6 1.4 2.6 3.3V17h-2.2v-3.4c0-.8 0-1.8-1.1-1.8s-1.3.9-1.3 1.8V17H11z" fill="#fff"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>'
  };

  var LABELS = {
    whatsapp: 'WhatsApp', x: 'X', telegram: 'Telegram', youtube: 'YouTube',
    instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
    email: 'Email', link: 'Link'
  };

  /* ---------- helpers ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function byId(id) { return document.getElementById(id); }

  function arr(v) { return Array.isArray(v) ? v : []; }

  function safeUrl(u) {
    u = String(u == null ? '' : u).trim();
    if (!u) return '#';
    if (/^(javascript|data|vbscript):/i.test(u)) return '#';
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^[\/#.?]/.test(u)) return u;
    if (/^[\w-]+\.html([?#].*)?$/.test(u)) return u;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$|\?|#)/i.test(u)) return 'https://' + u;
    return '#';
  }

  function isExternal(u) { return /^https?:/i.test(u); }

  function link(a, url) {
    var href = safeUrl(url);
    a.setAttribute('href', href);
    if (isExternal(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
    return a;
  }

  function loadJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' → ' + r.status);
      return r.json();
    });
  }

  function setTheme(t) {
    if (!t) return;
    var map = { background: '--bg', card: '--card', border: '--border', gold: '--gold', text: '--cream', accent: '--red' };
    var root = document.documentElement;
    Object.keys(map).forEach(function (k) {
      if (t[k] && /^#[0-9a-f]{3,8}$/i.test(String(t[k]).trim())) {
        root.style.setProperty(map[k], String(t[k]).trim());
      }
    });
  }

  function brandNode(text, showDot) {
    var frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode(text || ''));
    if (showDot !== false) frag.appendChild(el('i', null, '.'));
    return frag;
  }

  /* ---------- shared page chrome ---------- */

  function renderChrome(s, pageTitle) {
    setTheme(s.theme);
    var brand = s.brand || s.name || 'Site';
    document.title = pageTitle ? pageTitle + ' · ' + (s.site_title || brand) : (s.site_title || brand);

    if (s.meta_description) {
      var m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
      m.content = s.meta_description;
    }

    var logo = byId('logo');
    if (logo) { logo.textContent = ''; logo.appendChild(brandNode(brand, s.show_dot)); logo.setAttribute('href', '/'); }

    var home = byId('home-link');
    if (home) { home.textContent = s.home_label || 'HOME'; home.setAttribute('href', '/'); }

    var ticker = byId('ticker');
    var track = byId('ticker-track');
    var items = arr(s.ticker).filter(Boolean);
    if (ticker && track) {
      if (!items.length) { ticker.hidden = true; }
      else {
        ticker.hidden = false;
        track.textContent = '';
        var half = document.createDocumentFragment();
        for (var r = 0; r < 4; r++) {
          items.forEach(function (t) {
            half.appendChild(el('span', null, String(t).toUpperCase()));
            half.appendChild(el('span', 'dot', '·'));
          });
        }
        track.appendChild(half.cloneNode(true));
        track.appendChild(half);
      }
    }

    var footer = byId('footer');
    if (footer) {
      var f = arr(s.footer).filter(Boolean);
      footer.textContent = f.join(' · ').toUpperCase();
      footer.hidden = !f.length;
    }
  }

  /* ---------- home ---------- */

  function renderHome(s) {
    renderChrome(s);

    var avatar = byId('avatar');
    if (avatar) {
      avatar.textContent = '';
      if (s.profile_image) {
        var img = document.createElement('img');
        img.alt = s.name || 'Profile photo';
        img.onerror = function () {
          var fb = el('div', 'fallback', (s.name || s.brand || '?').charAt(0).toUpperCase());
          if (img.parentNode) img.parentNode.replaceChild(fb, img);
        };
        img.src = s.profile_image;
        avatar.appendChild(img);
      } else {
        avatar.appendChild(el('div', 'fallback', (s.name || s.brand || '?').charAt(0).toUpperCase()));
      }
    }

    var name = byId('name');
    if (name) { name.textContent = ''; name.appendChild(brandNode(s.name || s.brand, s.show_dot)); }

    var roles = byId('roles');
    if (roles) {
      var r = arr(s.roles).filter(Boolean);
      roles.textContent = r.join(' · ');
      roles.hidden = !r.length;
    }

    var socials = byId('socials');
    if (socials) {
      socials.textContent = '';
      arr(s.socials).forEach(function (item) {
        if (!item || !item.url) return;
        var key = ICONS[item.platform] ? item.platform : 'link';
        var a = el('a');
        a.setAttribute('aria-label', LABELS[key] || 'Link');
        a.innerHTML = ICONS[key]; // icons are fixed strings defined above, never user content
        link(a, item.url);
        socials.appendChild(a);
      });
      socials.hidden = !socials.children.length;
    }

    var links = byId('links');
    if (links) {
      links.textContent = '';
      arr(s.buttons).forEach(function (b) {
        if (!b || !b.label) return;
        var a = el('a', 'btn' + (b.highlight ? ' primary' : ''), b.label);
        link(a, b.url);
        links.appendChild(a);
      });
      links.hidden = !links.children.length;
    }
  }

  /* ---------- shop ---------- */

  function fmtPrice(p) {
    if (p.price_ngn !== undefined && p.price_ngn !== null && p.price_ngn !== '') {
      var n = Number(p.price_ngn);
      if (!isNaN(n)) return n === 0 ? 'Free' : '₦' + n.toLocaleString('en-NG');
    }
    return p.price || '';
  }

  function visibleReviews(data) {
    return arr(data && data.items).filter(function (r) { return r && r.text && r.visible !== false; });
  }

  function ratingStats(data) {
    var out = {};
    visibleReviews(data).forEach(function (r) {
      var n = Number(r.rating);
      if (!r.product || !(n > 0)) return;
      var o = out[r.product] || (out[r.product] = { sum: 0, count: 0 });
      o.sum += n;
      o.count++;
    });
    return out;
  }

  function whatsappFor(s, productTitle) {
    var wa = arr(s.socials).filter(function (x) { return x && x.platform === 'whatsapp' && x.url; })[0];
    if (!wa) return '#';
    var url = safeUrl(wa.url);
    if (/wa\.me|whatsapp\.com/i.test(url)) {
      var text = "Hi, I'm interested in: " + productTitle;
      return url + (url.indexOf('?') === -1 ? '?' : '&') + 'text=' + encodeURIComponent(text);
    }
    return url;
  }

  function renderShop(data, s, reviews) {
    renderChrome(s, data.page_title || 'Shop');
    byId('page-title').textContent = data.page_title || 'Shop';
    var intro = byId('page-intro');
    intro.textContent = data.intro || '';
    intro.hidden = !data.intro;

    var stats = ratingStats(reviews);
    var grid = byId('grid');
    var empty = byId('empty');
    grid.textContent = '';
    var items = arr(data.items).filter(function (p) { return p && p.title && p.hidden !== true; });
    empty.hidden = items.length > 0;
    grid.hidden = items.length === 0;

    items.forEach(function (p) {
      var card = el('article', 'card');
      var pageHref = p.id && /^[a-z0-9-]+$/.test(p.id) ? '/p/' + p.id + '/' : '';
      if (p.image) {
        var img = document.createElement('img');
        img.className = 'thumb';
        img.loading = 'lazy';
        img.alt = p.title;
        img.onerror = function () { img.style.visibility = 'hidden'; };
        img.src = p.image;
        if (pageHref) {
          var imgLink = el('a', 'plain');
          imgLink.setAttribute('href', pageHref);
          imgLink.appendChild(img);
          card.appendChild(imgLink);
        } else {
          card.appendChild(img);
        }
      }
      if (p.badge) card.appendChild(el('span', 'badge', p.badge));
      var body = el('div', 'body');
      var h3 = el('h3');
      if (pageHref) {
        var tl = el('a', 'plain', p.title);
        tl.setAttribute('href', pageHref);
        h3.appendChild(tl);
      } else {
        h3.textContent = p.title;
      }
      body.appendChild(h3);
      var price = fmtPrice(p);
      if (price) body.appendChild(el('div', 'price', price));

      var st = p.id ? stats[p.id] : null;
      if (st) {
        var rate = el('a', 'rate', '★ ' + (st.sum / st.count).toFixed(1) + ' (' + st.count + (st.count === 1 ? ' review' : ' reviews') + ')');
        rate.setAttribute('href', '/reviews.html?product=' + encodeURIComponent(p.id));
        body.appendChild(rate);
      }

      if (p.description) body.appendChild(el('p', 'desc', p.description));
      var available = p.available !== false;
      var buy = el('a', 'buy' + (available ? '' : ' off'), available ? (p.buy_label || 'Buy now') : 'Sold out');
      if (available) link(buy, p.buy_link || whatsappFor(s, p.title));
      body.appendChild(buy);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  /* ---------- reviews ---------- */

  function stars(n) {
    n = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    var wrap = el('div', 'stars');
    wrap.setAttribute('aria-label', n + ' out of 5 stars');
    wrap.appendChild(document.createTextNode('★'.repeat(n)));
    if (n < 5) wrap.appendChild(el('span', 'off', '★'.repeat(5 - n)));
    return wrap;
  }

  function fmtDate(d) {
    var t = Date.parse(d);
    if (isNaN(t)) return '';
    return new Date(t).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function sortReviews(list) {
    return list.map(function (r, i) { return { r: r, i: i, t: Date.parse(r.date) }; })
      .sort(function (a, b) {
        var ta = isNaN(a.t) ? -Infinity : a.t, tb = isNaN(b.t) ? -Infinity : b.t;
        if (ta === tb) return a.i - b.i;
        return tb - ta;
      })
      .map(function (x) { return x.r; });
  }

  function option(value, label) {
    var o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    return o;
  }

  function renderReviews(data, s, shop) {
    renderChrome(s, data.page_title || 'Reviews');
    byId('page-title').textContent = data.page_title || 'Reviews';
    var intro = byId('page-intro');
    intro.textContent = data.intro || '';
    intro.hidden = !data.intro;

    var products = arr(shop && shop.items).filter(function (p) { return p && p.id && p.title && p.hidden !== true; });
    var titleOf = {};
    products.forEach(function (p) { titleOf[p.id] = p.title; });

    var all = sortReviews(visibleReviews(data));
    var grid = byId('grid');
    var empty = byId('empty');
    var summary = byId('summary');
    var filter = byId('filter');
    var filterWrap = byId('filter-wrap');
    var pick = byId('product-select');
    var emptyDefault = empty.textContent;

    var wanted = '';
    var m = /[?&]product=([^&]+)/.exec(location.search);
    if (m) { try { wanted = decodeURIComponent(m[1]); } catch (e) { wanted = ''; } }

    // product dropdowns (review filter + the "which product" box in the form)
    if (products.length) {
      products.forEach(function (p) {
        filter.appendChild(option(p.id, p.title));
        pick.appendChild(option(p.title, p.title));
      });
      filterWrap.hidden = false;
      if (titleOf[wanted]) {
        filter.value = wanted;
        pick.value = titleOf[wanted];
      }
    } else {
      pick.hidden = true;
      pick.required = false;
    }

    function draw() {
      var id = filter.value;
      var list = id ? all.filter(function (r) { return r.product === id; }) : all;
      grid.textContent = '';
      summary.hidden = true;
      empty.textContent = id ? 'No reviews for this product yet.' : emptyDefault;
      empty.hidden = list.length > 0;
      grid.hidden = list.length === 0;

      var rated = list.filter(function (r) { return Number(r.rating) > 0; });
      if (rated.length) {
        var avg = rated.reduce(function (a, r) { return a + Number(r.rating); }, 0) / rated.length;
        summary.textContent = '';
        summary.appendChild(document.createTextNode('★ ' + avg.toFixed(1)));
        summary.appendChild(el('small', null, ' ' + list.length + (list.length === 1 ? ' review' : ' reviews')));
        summary.hidden = false;
      }

      list.forEach(function (r) {
        var card = el('article', 'card review');
        var body = el('div', 'body');
        if (Number(r.rating) > 0) body.appendChild(stars(r.rating));
        if (r.product && titleOf[r.product]) body.appendChild(el('div', 'tag mono', titleOf[r.product]));
        body.appendChild(el('p', 'text', r.text));
        var who = el('div', 'who');
        who.appendChild(el('b', null, r.name || 'Anonymous'));
        var extra = [r.role, fmtDate(r.date)].filter(Boolean).join(' · ');
        if (extra) { who.appendChild(el('br')); who.appendChild(document.createTextNode(extra)); }
        body.appendChild(who);
        card.appendChild(body);
        grid.appendChild(card);
      });
    }

    filter.addEventListener('change', draw);
    draw();

    var form = byId('review-form-wrap');
    if (form) form.hidden = data.show_form === false;
    if (/[?&]sent=1/.test(location.search)) {
      var n = byId('sent-notice');
      if (n) n.hidden = false;
    }
  }

  /* ---------- single product page (/p/<id>/) ---------- */

  function renderProduct(shop, s, reviews, id) {
    var p = arr(shop && shop.items).filter(function (x) { return x && x.id === id && x.hidden !== true; })[0];
    var box = byId('product');
    if (!p) {
      renderChrome(s, 'Product');
      box.hidden = true;
      byId('reviews-section').hidden = true;
      byId('gone').hidden = false;
      return;
    }
    renderChrome(s, p.title);

    byId('p-title').textContent = p.title;
    byId('p-price').textContent = fmtPrice(p);
    var desc = byId('p-desc');
    desc.textContent = p.description || '';
    desc.hidden = !p.description;

    var wrap = byId('p-image-wrap');
    var img = byId('p-image');
    if (p.image) {
      img.hidden = false;
      img.alt = p.title;
      img.onerror = function () { wrap.hidden = true; };
      if (img.getAttribute('src') !== p.image) img.src = p.image;
      wrap.hidden = false;
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) wrap.hidden = true;
    } else {
      wrap.hidden = true;
    }
    var badge = byId('p-badge');
    badge.textContent = p.badge || '';
    badge.hidden = !p.badge;

    var st = ratingStats(reviews)[p.id];
    var rate = byId('p-rate');
    if (st) {
      rate.textContent = '★ ' + (st.sum / st.count).toFixed(1) + ' (' + st.count + (st.count === 1 ? ' review' : ' reviews') + ')';
      rate.hidden = false;
    }

    var available = p.available !== false;
    var buy = byId('p-buy');
    buy.textContent = available ? (p.buy_label || 'Buy now') : 'Sold out';
    buy.className = 'buy' + (available ? '' : ' off');
    if (available) link(buy, p.buy_link || whatsappFor(s, p.title));

    var share = byId('p-share');
    share.addEventListener('click', function () {
      var url = location.origin + location.pathname;
      if (navigator.share) {
        navigator.share({ title: p.title, url: url }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          share.textContent = 'Link copied ✓';
          setTimeout(function () { share.textContent = 'Share this product'; }, 2000);
        });
      } else {
        window.prompt('Copy this link:', url);
      }
    });

    // reviews for this product
    var list = sortReviews(visibleReviews(reviews).filter(function (r) { return r.product === p.id; }));
    var grid = byId('grid');
    var empty = byId('empty');
    var summary = byId('summary');
    grid.textContent = '';
    empty.hidden = list.length > 0;
    grid.hidden = list.length === 0;
    var rated = list.filter(function (r) { return Number(r.rating) > 0; });
    if (rated.length) {
      var avg = rated.reduce(function (a, r) { return a + Number(r.rating); }, 0) / rated.length;
      summary.textContent = '';
      summary.appendChild(document.createTextNode('★ ' + avg.toFixed(1)));
      summary.appendChild(el('small', null, ' ' + list.length + (list.length === 1 ? ' review' : ' reviews')));
      summary.hidden = false;
    }
    list.forEach(function (r) {
      var card = el('article', 'card review');
      var body = el('div', 'body');
      if (Number(r.rating) > 0) body.appendChild(stars(r.rating));
      body.appendChild(el('p', 'text', r.text));
      var who = el('div', 'who');
      who.appendChild(el('b', null, r.name || 'Anonymous'));
      var extra = [r.role, fmtDate(r.date)].filter(Boolean).join(' · ');
      if (extra) { who.appendChild(el('br')); who.appendChild(document.createTextNode(extra)); }
      body.appendChild(who);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  /* ---------- boot ---------- */

  function fail(err) {
    var m = byId('load-error');
    if (m) { m.hidden = false; m.textContent = 'Could not load the page content. Please refresh.'; }
    if (window.console) console.error(err);
  }

  var page = document.body.getAttribute('data-page');
  var settingsP = loadJSON('/content/settings.json');
  function optional(p) { return p.catch(function () { return null; }); }

  if (page === 'home') {
    settingsP.then(renderHome).catch(fail);
  } else if (page === 'shop') {
    Promise.all([loadJSON('/content/products.json'), settingsP, optional(loadJSON('/content/reviews.json'))])
      .then(function (r) { renderShop(r[0], r[1], r[2]); }).catch(fail);
  } else if (page === 'product') {
    var pid = document.body.getAttribute('data-product-id') || '';
    Promise.all([loadJSON('/content/products.json'), settingsP, optional(loadJSON('/content/reviews.json'))])
      .then(function (r) { renderProduct(r[0], r[1], r[2], pid); }).catch(fail);
  } else if (page === 'reviews') {
    Promise.all([loadJSON('/content/reviews.json'), settingsP, optional(loadJSON('/content/products.json'))])
      .then(function (r) { renderReviews(r[0], r[1], r[2]); }).catch(fail);
  }
})();
