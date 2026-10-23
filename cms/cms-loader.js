/* Public loader. Applies the owner's saved changes (from the database) on top of the original page.
   If the database is not configured or not reachable, it changes nothing. */
(function () {
  'use strict';
  var C = window.CMS_CONFIG || {};
  var CMS = window.CMS = { snap: null, ready: false };
  var CACHE = 'cms_snap_v1';
  var configured = !!(C.url && C.anonKey);
  var me = document.currentScript, base = '';
  try { base = new URL('..', me.src).href; } catch (e) { base = location.href.replace(/[^\/]*$/, ''); }
  CMS.base = base;
  var page = location.href.split('#')[0].split('?')[0].slice(base.length) || 'index.html';
  if (/\/$/.test(page)) page += 'index.html';
  CMS.page = page;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} return null; }
  function api(path) { return C.url.replace(/\/$/, '') + path; }
  function hdr(x) { x.setRequestHeader('apikey', C.anonKey); x.setRequestHeader('Authorization', 'Bearer ' + C.anonKey); }

  // ---- 1. cache first, sync fetch only on a visitor's very first visit ----
  var cached = ls(CACHE), snap = null;
  if (cached) { try { snap = JSON.parse(cached); } catch (e) { snap = null; } }
  if (!snap && configured) {
    try {
      var x = new XMLHttpRequest(); x.open('GET', api('/rest/v1/snapshot?id=eq.1&select=data'), false); hdr(x); x.send();
      if (x.status === 200) { var r = JSON.parse(x.responseText); if (r && r[0]) { snap = r[0].data; ls(CACHE, JSON.stringify(snap)); } }
    } catch (e) {}
  }
  CMS.snap = snap;
  var S0 = function () { return (CMS.snap && CMS.snap.settings) || {}; };
  var usedSig = sig(snap);
  function sig(s) { if (!s) return ''; return JSON.stringify([s.products || {}, s.settings || {}, !!s.has_coupons]); }

  // ---- 2. early redirects ----
  (function () {
    var list = (S0().redirects || {}).list; if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
      var f = String(list[i].from || '').replace(/^\/+/, '').replace(/^\.\//, ''), t = list[i].to;
      if (f && t && (f === page || f === page.replace(/\.html$/, ''))) { CMS.redirecting = true; location.replace(/^(https?:|\/)/.test(t) ? t : base + t); return; }
    }
  })();

  function root() { return document.body ? (document.body.getAttribute('data-root') || '') : (page.indexOf('/') > -1 ? '../' : ''); }
  function fixPath(v) { if (v == null) return v; v = String(v); if (/^(https?:|mailto:|tel:|#|\/|data:|javascript:|\?)/i.test(v) || v === '') return v; return root() + v.replace(/^\.\//, ''); }
  function fixHtml(h) { return String(h).replace(/(href|src)="(?!https?:|mailto:|tel:|#|\/|data:)([^"]*)"/g, function (m, a, b) { return a + '="' + root() + b + '"'; }); }
  function num(v) { if (v === '' || v == null) return null; var n = Number(v); return isNaN(n) ? null : n; }

  // ---- 3. runtime data patch (runs after catalog.js, before main.js) ----
  CMS.patchData = function () {
    var s = CMS.snap; if (!s) return;
    var P = s.products || {}, set = s.settings || {};
    var cat = window.CATALOG; if (!cat) return;
    var before = {}; cat.forEach(function (p) { (p.site_categories || []).forEach(function (c) { before[c] = (before[c] || 0) + 1; }); });
    var pop = (window.POP || []).slice(), hidden = {};
    for (var i = 0; i < cat.length; i++) {
      var p = cat[i], o = P[p.id]; if (!o) continue;
      if (o.name != null && o.name !== '') p.name = o.name;
      if (o.price != null && o.price !== '') p.price = Number(o.price);
      if (Object.prototype.hasOwnProperty.call(o, 'was')) p.was = num(o.was);
      if (typeof o.in_stock === 'boolean') p.in_stock = o.in_stock;
      if (o.image) { p.image = o.image; p.images = [o.image].concat((p.images || []).slice(1)); }
      if (o.sku) p.sku = o.sku;
      if (o.subcategory) p.subcategory = o.subcategory;
      if (o.site_categories && o.site_categories.length) p.site_categories = o.site_categories;
      if (o.max_qty) p.max_qty = Number(o.max_qty);
      if (o.discount != null) p.discount = o.discount;
      if (o.hidden) hidden[p.id] = true;
    }
    if (Object.keys(hidden).length) window.CATALOG = cat = cat.filter(function (p) { return !hidden[p.id]; });
    // order in lists
    var any = false; for (var k in P) if (P[k] && P[k].sort != null && P[k].sort !== '') any = true;
    if (any) {
      var key = function (id) { var o = P[id]; if (o && o.sort != null && o.sort !== '') return Number(o.sort); var ix = pop.indexOf(id); return ix < 0 ? 9999 : ix; };
      window.POP = pop.map(function (id, ix) { return { id: id, k: key(id), ix: ix }; }).sort(function (a, b) { return a.k - b.k || a.ix - b.ix; }).map(function (x) { return x.id; });
      cat.forEach(function (p) { if (window.POP.indexOf(p.id) < 0) window.POP.push(p.id); });
    }
    // category counts shown in the shop filter
    if (window.SITE_CATEGORIES) {
      var after = {}; cat.forEach(function (p) { (p.site_categories || []).forEach(function (c) { after[c] = (after[c] || 0) + 1; }); });
      window.SITE_CATEGORIES.forEach(function (c) { c.count = c.count + ((after[c.slug] || 0) - (before[c.slug] || 0)); });
    }
    // home best sellers
    var byId = function (id) { for (var j = 0; j < cat.length; j++) if (cat[j].id === id) return cat[j]; };
    var feat = set.home && set.home.featured;
    var src = (feat && feat.length) ? feat : (window.PRODUCTS || []).map(function (x) { return x.id; });
    if ((feat && feat.length) || window.PRODUCTS) {
      window.PRODUCTS = src.map(byId).filter(Boolean).map(function (p) { return { id: p.id, name: p.name, price: p.price, was: p.was, image: p.image }; });
    }
    // cart settings
    var sh = set.shop || {};
    window.CMS_SHIP = {};
    ['free_over', 'standard', 'two_day', 'overnight'].forEach(function (k) { if (sh[k] !== undefined && sh[k] !== '' && sh[k] !== null) window.CMS_SHIP[k] = Number(sh[k]); });
    CMS.steps = (sh.discount_steps || []).map(function (x) { return { min: Number(x.min), pct: Number(x.pct) }; }).filter(function (x) { return x.min > 0 && x.pct > 0; }).sort(function (a, b) { return a.min - b.min; });
    CMS.hasCoupons = !!s.has_coupons;
    CMS.forms = set.forms || {};
  };
  // tier discount for a product at a quantity
  CMS.unit = function (p, qty) {
    var steps = CMS.steps || [];
    if (p && p.discount === 'none') steps = [];
    else if (p && p.discount && p.discount.length) steps = p.discount.map(function (x) { return { min: Number(x.min), pct: Number(x.pct) }; }).sort(function (a, b) { return a.min - b.min; });
    var pct = 0; steps.forEach(function (st) { if (qty >= st.min) pct = st.pct; });
    return pct ? Math.round(p.price * (100 - pct)) / 100 : p.price;
  };
  CMS.rpc = function (name, body) {
    return fetch(api('/rest/v1/rpc/' + name), { method: 'POST', headers: { apikey: C.anonKey, Authorization: 'Bearer ' + C.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); });
  };
  CMS.validateCoupon = function (code, subtotal) { return CMS.rpc('validate_coupon', { p_code: code, p_subtotal: subtotal }); };

  // ---- 4. DOM application ----
  var origStore = new WeakMap();
  function remember(el, name, getter) { var o = origStore.get(el); if (!o) { o = {}; origStore.set(el, o); } if (!(name in o)) o[name] = getter(); return o[name]; }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function applyContent(content) {
    content = content || {};
    qa('[data-cms]').forEach(function (el) {
      var k = el.getAttribute('data-cms'), kind = el.getAttribute('data-cms-kind');
      var orig = remember(el, 'c', function () { return kind === 'html' ? el.innerHTML : el.textContent; });
      var has = Object.prototype.hasOwnProperty.call(content, k), v = has ? content[k] : orig;
      if (kind === 'html') { var nv = has ? fixHtml(v) : orig; if (el.innerHTML !== nv) el.innerHTML = nv; } else if (el.textContent !== v) el.textContent = v;
    });
    qa('[data-cms-tn]').forEach(function (el) {
      el.getAttribute('data-cms-tn').split(',').forEach(function (pair) {
        var ix = pair.lastIndexOf(':'), k = pair.slice(0, ix), n = el.childNodes[Number(pair.slice(ix + 1))]; if (!n || n.nodeType !== 3) return;
        var orig = remember(n, 'tn', function () { return n.nodeValue; });
        var has = Object.prototype.hasOwnProperty.call(content, k);
        var lead = (orig.match(/^\s*/) || [''])[0], trail = (orig.match(/\s*$/) || [''])[0];
        n.nodeValue = has ? lead + content[k] + trail : orig;
      });
    });
    [['data-cms-href', 'href'], ['data-cms-src', 'src'], ['data-cms-alt', 'alt'], ['data-cms-ph', 'placeholder']].forEach(function (m) {
      qa('[' + m[0] + ']').forEach(function (el) {
        var k = el.getAttribute(m[0]), orig = remember(el, m[1], function () { return el.getAttribute(m[1]); });
        var has = Object.prototype.hasOwnProperty.call(content, k);
        var v = has ? (m[1] === 'href' || m[1] === 'src' ? fixPath(content[k]) : content[k]) : orig;
        if (v == null) return; if (el.getAttribute(m[1]) !== v) el.setAttribute(m[1], v);
        if (m[1] === 'src' && el.hasAttribute('srcset')) el.removeAttribute('srcset');
      });
    });
  }

  function pid() { var b = document.getElementById('add-btn'); if (b) return +b.getAttribute('data-id'); var r = document.getElementById('related-grid'); return r ? +r.getAttribute('data-pid') : 0; }
  function money(n) { return '$' + Number(n).toFixed(2); }
  function applyProductPage(s) {
    var id = pid(); if (!id) return; var o = (s.products || {})[id]; if (!o) return;
    var T = window.CMS_TPL || {};
    if (o.hidden) { location.replace(base + 'shop.html'); return; }
    var q = function (a) { return document.querySelector('[data-pcms="' + a + '"]'); };
    var el;
    if (o.name && (el = q('name'))) { el.textContent = o.name; var im = q('image'); if (im) im.alt = o.name; }
    var cur = (window.CATALOG || []).filter(function (p) { return p.id === id; })[0];
    if ((el = q('price')) && (o.price != null && o.price !== '' || Object.prototype.hasOwnProperty.call(o, 'was'))) {
      var price = cur ? cur.price : Number(o.price), was = cur ? cur.was : num(o.was);
      if (was) { el.className = 'pdp-price'; el.innerHTML = '<del>' + money(was) + '</del><ins>' + money(price) + '</ins>'; } else { el.className = 'pdp-price plain'; el.innerHTML = '<ins>' + money(price) + '</ins>'; }
    }
    if (o.sku && (el = q('sku'))) el.textContent = 'SKU: ' + o.sku;
    if (o.image && (el = q('image'))) { el.src = fixPath(o.image); var th = document.querySelector('.pdp-thumbs button'); if (th) { th.setAttribute('data-src', fixPath(o.image)); var ti = th.querySelector('img'); if (ti) ti.src = fixPath(o.image); } }
    if (o.desc_html != null && (el = q('desc'))) el.innerHTML = fixHtml(o.desc_html);
    if (o.chem_html != null && (el = q('chem'))) el.innerHTML = fixHtml(o.chem_html);
    if (typeof o.in_stock === 'boolean') {
      var st = q('stock'), buy = q('buy'), wl = document.querySelector('.pdp-info .waitlist');
      if (o.in_stock && st && st.className.indexOf('out') > -1 && T.stockIn) {
        st.outerHTML = T.stockIn.replace('<div', '<div data-pcms="stock"');
        if (wl && T.buy) wl.outerHTML = T.buy.replace('<div', '<div data-pcms="buy"');
        else if (!buy && T.buy) { var anchor = q('stock'); if (anchor) anchor.insertAdjacentHTML('afterend', T.buy.replace('<div', '<div data-pcms="buy"')); }
        var bt = document.getElementById('add-btn'); if (bt) bt.setAttribute('data-id', id);
        rebindBuy();
      } else if (!o.in_stock && st && st.className.indexOf('in') > -1 && T.stockOut) {
        st.outerHTML = T.stockOut.replace('<div', '<div data-pcms="stock"');
        var b2 = q('buy'); if (b2 && T.waitlist) b2.outerHTML = T.waitlist; bindForms();
      }
    }
    if (o.max_qty) { var qt = document.getElementById('qty'); if (qt) qt.setAttribute('max', o.max_qty); }
    // quantity discount table
    var steps = CMS.steps || []; if (cur && cur.discount === 'none') steps = []; else if (cur && cur.discount && cur.discount.length) steps = cur.discount;
    var old = document.querySelector('.cms-tiers'); if (old) old.parentNode.removeChild(old);
    if (steps.length && (el = q('price'))) {
      var rows = steps.map(function (x) { return '<li>' + x.min + '+ : ' + x.pct + '% off</li>'; }).join('');
      el.insertAdjacentHTML('afterend', '<ul class="cms-tiers" style="margin:0 0 12px;padding-left:18px;font-size:14px">' + rows + '</ul>');
    }
  }
  // Re-attach the quantity and add-to-cart handlers when the buy block was swapped in
  function rebindBuy() {
    var add = document.getElementById('add-btn'), qty = document.getElementById('qty'); if (!add || add.__cms) return; add.__cms = 1;
    Array.prototype.forEach.call(document.querySelectorAll('.qty [data-q]'), function (b) { b.addEventListener('click', function () { qty.value = Math.max(1, (+qty.value || 1) + +b.getAttribute('data-q')); }); });
    add.addEventListener('click', function () {
      try { var c = JSON.parse(localStorage.getItem('pst_cart')) || [], id = +add.getAttribute('data-id'), q = Math.max(1, +qty.value || 1), f = c.filter(function (i) { return i.id === id; })[0]; if (f) f.qty += q; else c.push({ id: id, qty: q }); localStorage.setItem('pst_cart', JSON.stringify(c)); var n = c.reduce(function (s, i) { return s + i.qty; }, 0), ce = document.getElementById('cart-count'); if (ce) ce.textContent = n; } catch (e) {}
      var o = add.textContent; add.textContent = 'Added to cart'; setTimeout(function () { add.textContent = o; }, 1200);
    });
  }

  function meta(sel, create, attr, val) { var m = document.querySelector(sel); if (!m && create) { m = document.createElement(create.tag); Object.keys(create.attrs).forEach(function (k) { m.setAttribute(k, create.attrs[k]); }); document.head.appendChild(m); } if (m) m.setAttribute(attr, val); }
  function applySeo(set) {
    var site = set.site || {}, pg = ((set.pages_seo || {})[page]) || {};
    var title = pg.title || null, desc = pg.description || site.description || null;
    if (title) document.title = title;
    if (desc) { meta('meta[name="description"]', { tag: 'meta', attrs: { name: 'description' } }, 'content', desc); meta('meta[property="og:description"]', { tag: 'meta', attrs: { property: 'og:description' } }, 'content', desc); }
    if (title) meta('meta[property="og:title"]', { tag: 'meta', attrs: { property: 'og:title' } }, 'content', title);
    if (site.name) meta('meta[property="og:site_name"]', { tag: 'meta', attrs: { property: 'og:site_name' } }, 'content', site.name);
    if (site.share_image) meta('meta[property="og:image"]', { tag: 'meta', attrs: { property: 'og:image' } }, 'content', /^https?:/.test(site.share_image) ? site.share_image : base + site.share_image);
    if (site.favicon) { var l = document.querySelector('link[rel~="icon"]'); if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); } l.href = /^https?:/.test(site.favicon) ? site.favicon : base + site.favicon; }
    if (site.noindex || pg.noindex) meta('meta[name="robots"]', { tag: 'meta', attrs: { name: 'robots' } }, 'content', 'noindex, nofollow');
  }
  function applyLook(set) {
    var look = set.look || {}; if (look.vars) Object.keys(look.vars).forEach(function (k) { if (look.vars[k]) document.documentElement.style.setProperty(k, look.vars[k]); });
    if (look.font) {
      var f = String(look.font).replace(/[^A-Za-z0-9 ]/g, '');
      if (f && !document.getElementById('cms-font')) { var l = document.createElement('link'); l.id = 'cms-font'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':wght@300;400;500;600;700&display=swap'; document.head.appendChild(l); }
      document.documentElement.style.setProperty('--font', '"' + f + '", "Helvetica Neue", Helvetica, Arial, sans-serif');
    }
    if (look.css) { var st = document.getElementById('cms-css') || document.createElement('style'); st.id = 'cms-css'; st.textContent = look.css; document.head.appendChild(st); }
  }
  function inject(html, where) {
    var d = document.createElement('div'); d.innerHTML = html;
    Array.prototype.slice.call(d.childNodes).forEach(function (n) {
      if (n.nodeName === 'SCRIPT') { var s = document.createElement('script'); Array.prototype.forEach.call(n.attributes, function (a) { s.setAttribute(a.name, a.value); }); s.text = n.text; (where === 'head' ? document.head : document.body).appendChild(s); }
      else (where === 'head' ? document.head : document.body).appendChild(n);
    });
  }
  function applyTracking(set) {
    var t = set.tracking || {}; if (CMS._tracked) return; CMS._tracked = 1;
    if (t.ga_id && /^[A-Za-z0-9-]+$/.test(t.ga_id)) { var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + t.ga_id; document.head.appendChild(s); window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); }; gtag('js', new Date()); gtag('config', t.ga_id); }
    if (t.pixel_id && /^[0-9]+$/.test(t.pixel_id)) { !function (f, b, e, v, n, t2, s2) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t2 = b.createElement(e); t2.async = !0; t2.src = v; s2 = b.getElementsByTagName(e)[0]; s2.parentNode.insertBefore(t2, s2); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js'); fbq('init', t.pixel_id); fbq('track', 'PageView'); }
    if (t.head_html) inject(t.head_html, 'head');
    if (t.body_html) inject(t.body_html, 'body');
  }
  function applyBanner(set) {
    var b = set.banner || {}, old = document.getElementById('cms-banner'); if (old) old.parentNode.removeChild(old);
    if (!b.on || !b.text) return;
    var d = document.createElement('div'); d.id = 'cms-banner'; d.style.cssText = 'text-align:center;padding:10px 16px;font-size:14px;line-height:1.4;background:' + (b.bg || '#230f33') + ';color:' + (b.color || '#fff');
    if (b.link) { var a = document.createElement('a'); a.href = fixPath(b.link); a.style.color = 'inherit'; a.style.textDecoration = 'underline'; a.textContent = b.text; d.appendChild(a); } else d.textContent = b.text;
    document.body.insertBefore(d, document.body.firstChild);
  }
  function applyPopup(set) {
    var p = set.popup || {}; if (!p.on || document.getElementById('cms-popup')) return;
    var pages = p.pages || 'all'; if (pages !== 'all') { var arr = String(pages).split(/[\s,]+/).filter(Boolean); if (arr.indexOf(page) < 0) return; }
    var seen = Number(ls('cms_popup_seen') || 0), hours = Number(p.repeat_hours || 0);
    if (seen && (hours <= 0 || Date.now() - seen < hours * 3600000)) return;
    setTimeout(function () {
      if (document.getElementById('age-gate') && document.getElementById('age-gate').classList.contains('is-open')) return;
      var w = document.createElement('div'); w.id = 'cms-popup'; w.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
      var box = document.createElement('div'); box.style.cssText = 'background:#fff;color:#333;max-width:440px;width:100%;padding:28px;border-radius:8px;position:relative;text-align:center;max-height:90vh;overflow:auto';
      var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.textContent = '×'; x.style.cssText = 'position:absolute;top:8px;right:12px;border:0;background:none;font-size:26px;cursor:pointer;line-height:1';
      box.appendChild(x);
      if (p.image) { var im = document.createElement('img'); im.src = fixPath(p.image); im.alt = ''; im.style.cssText = 'max-width:100%;margin:0 auto 14px'; box.appendChild(im); }
      if (p.title) { var h = document.createElement('h3'); h.textContent = p.title; h.style.margin = '0 0 10px'; box.appendChild(h); }
      if (p.text) { var t = document.createElement('p'); t.textContent = p.text; t.style.margin = '0 0 16px'; box.appendChild(t); }
      if (p.button_text) { var a = document.createElement('a'); a.href = fixPath(p.button_link || '#'); a.textContent = p.button_text; a.style.cssText = 'display:inline-block;padding:10px 22px;background:#230f33;color:#fff;border-radius:4px'; box.appendChild(a); }
      w.appendChild(box); document.body.appendChild(w);
      var close = function () { if (w.parentNode) w.parentNode.removeChild(w); ls('cms_popup_seen', String(Date.now())); };
      x.addEventListener('click', close); w.addEventListener('click', function (e) { if (e.target === w) close(); });
    }, Math.max(0, Number(p.delay || 0)) * 1000);
  }
  function sha(str) { var enc = new TextEncoder().encode(str); return crypto.subtle.digest('SHA-256', enc).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); }
  function applyMaintenance(set) {
    var m = set.maintenance || {}; if (!m.on || CMS._maint) return; CMS._maint = 1;
    var show = function () { document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:sans-serif"><div><h1 style="margin:0 0 12px"></h1><p style="margin:0"></p></div></div>'; document.body.querySelector('h1').textContent = m.title || ''; document.body.querySelector('p').textContent = m.message || ''; document.body.style.visibility = 'visible'; };
    var q = (location.search.match(/[?&]preview=([^&]+)/) || [])[1];
    document.body.style.visibility = 'hidden';
    var done = function (ok) { if (ok) document.body.style.visibility = 'visible'; else show(); };
    if (!m.bypass_hash || !window.crypto || !crypto.subtle) return done(false);
    if (ls('cms_bypass') === m.bypass_hash) return done(true);
    if (q) { sha(decodeURIComponent(q)).then(function (h) { if (h === m.bypass_hash) { ls('cms_bypass', h); done(true); } else done(false); }); } else done(false);
  }
  function bindForms() {
    var F = (CMS.forms) || {};
    qa('#news-form,#contact-form,form.waitlist').forEach(function (f) {
      if (f.__cms) return; f.__cms = 1;
      f.addEventListener('submit', function () {
        if (!configured) return;
        var kind = f.id === 'contact-form' ? 'contact' : (f.id === 'news-form' ? 'newsletter' : 'waitlist');
        var get = function (sel) { var e = f.querySelector(sel); return e ? e.value : ''; };
        var email = get('input[type=email]'), name = get('input[name=name],input[name=your-name]'), subj = get('input[name=subject]'), body = get('textarea');
        var extra = { page: page }; if (kind === 'waitlist') { var id = pid(); extra.product_id = id; var h1 = document.querySelector('[data-pcms="name"]'); if (h1) extra.product = h1.textContent; }
        var msgEl = f.parentNode.querySelector('.cms-form-msg') || (function () { var p = document.createElement('p'); p.className = 'cms-form-msg'; p.style.cssText = 'margin:8px 0 0;font-size:14px'; f.parentNode.insertBefore(p, f.nextSibling); return p; })();
        CMS.rpc('submit_message', { p_kind: kind, p_name: name, p_email: email, p_subject: subj, p_body: body, p_extra: extra }).then(function () { msgEl.textContent = F.success || ''; }).catch(function () { msgEl.textContent = F.error || ''; });
      }, true);
    });
  }
  CMS.bindForms = bindForms;

  function applyAll() {
    var s = CMS.snap; if (!s) return;
    applyContent(s.content);
    applyProductPage(s);
    var set = s.settings || {};
    applySeo(set); applyLook(set); applyBanner(set); applyPopup(set); applyTracking(set); applyMaintenance(set);
    var qt = document.getElementById('qty'); var o = (s.products || {})[pid()]; if (qt && o && o.max_qty) qt.setAttribute('max', o.max_qty);
  }
  CMS.apply = applyAll;

  function start() {
    if (CMS.redirecting || !document.body) return;
    CMS.ready = true; applyAll(); bindForms();
    // 5. refresh quietly; reload once if data (not text) changed
    if (!configured) return;
    fetch(api('/rest/v1/snapshot?id=eq.1&select=data'), { headers: { apikey: C.anonKey, Authorization: 'Bearer ' + C.anonKey } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (r) {
      if (!r || !r[0]) return; var ns = r[0].data; ls(CACHE, JSON.stringify(ns));
      var changedData = sig(ns) !== usedSig;
      CMS.snap = ns;
      if (changedData) { if (ss('cms_reloaded') !== String(ns.v)) { ss('cms_reloaded', String(ns.v)); location.reload(); return; } }
      applyAll();
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
