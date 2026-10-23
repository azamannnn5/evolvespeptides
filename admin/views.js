/* Admin screens, part 1: dashboard, pages, shared parts, media, products, shop lists. */
(function () {
  'use strict';
  var A = window.ADMIN, $ = A.$, $$ = A.$$, esc = A.esc, S = A.S, V = A.views;

  var fields = function () { return S.defaults.fields; };
  var edited = function (list) { return list.filter(function (f) { return A.hasOverride(f.key); }).length; };
  var pageFields = function (file) { return fields().filter(function (f) { return !f.shared && f.pages[0] === file; }); };

  /* ---------- dashboard ---------- */
  V['dashboard'] = async function (el) {
    var P = S.saved.products, ov = Object.keys(S.saved.content).length, hid = Object.keys(P).filter(function (k) { return P[k].hidden; }).length;
    var set = S.saved.settings, on = function (g) { return set[g] && set[g].on; };
    var r = await Promise.all([S.sb.from('messages').select('id', { count: 'exact', head: true }).eq('status', 'new'), S.sb.from('coupons').select('id', { count: 'exact', head: true }).eq('active', true), S.sb.from('history').select('*').order('id', { ascending: false }).limit(8)]);
    var stat = function (n, l, p) { return '<a class="stat" href="#/' + p + '" style="color:inherit;text-decoration:none"><b>' + n + '</b><span>' + l + '</span></a>'; };
    var pill = function (b) { return b ? '<span class="tag ok">On</span>' : '<span class="tag">Off</span>'; };
    el.innerHTML = A.head('Dashboard', 'A quick look at your site. Everything you change here goes live only after you press Save and publish.') +
      '<div class="grid">' + stat(ov, 'text, link and image edits', 'content/pages') + stat(Object.keys(P).length, 'products edited (' + hid + ' hidden)', 'shop/products') + stat(r[0].count || 0, 'new messages', 'customers/inbox') + stat(r[1].count || 0, 'active promo codes', 'shop/coupons') + '</div>' +
      '<div class="card" style="margin-top:16px"><h3>Site status</h3><div class="list-item"><div class="grow">Top banner</div>' + pill(on('banner')) + '</div><div class="list-item"><div class="grow">Pop-up message</div>' + pill(on('popup')) + '</div><div class="list-item"><div class="grow">Maintenance mode</div>' + pill(on('maintenance')) + '</div><div class="list-item"><div class="grow">Hidden from search engines (noindex)</div>' + pill(set.site && set.site.noindex) + '</div></div>' +
      '<div class="card"><h3>Quick links</h3><div class="row"><a class="btn" href="#/content/pages">Edit pages</a><a class="btn" href="#/shop/products">Products</a><a class="btn" href="#/shop/quick">Prices and stock</a><a class="btn" href="#/promo/banner">Banner</a><a class="btn" href="#/customers/inbox">Inbox</a><a class="btn" href="#/admin/help">Help</a></div></div>' +
      '<div class="card"><h3>Recent activity</h3>' + ((r[2].data || []).map(function (h) { return '<div class="list-item"><div class="grow"><b>' + esc(h.action) + '</b> ' + esc(h.table_name) + ' <span class="muted">' + esc(h.record_key || '') + '</span><div class="small muted">' + esc(h.by_email || 'unknown') + ' · ' + new Date(h.at).toLocaleString() + '</div></div></div>'; }).join('') || '<p class="muted">No changes yet.</p>') + '<p><a href="#/admin/history">See all activity</a></p></div>';
  };

  /* ---------- pages ---------- */
  V['content/pages'] = function (el) {
    var groups = {}; S.defaults.pages.forEach(function (p) { if (!p.name) return; (groups[p.group] = groups[p.group] || []).push(p); });
    var order = ['Main pages', 'Policies and legal', 'Account and cart pages', 'Other'];
    el.innerHTML = A.head('Pages', 'Pick a page to change its text, links and images. Header, menu and footer are shared by every page, so they have their own screens.') +
      order.filter(function (g) { return groups[g]; }).map(function (g) {
        return '<div class="card"><h3>' + g + '</h3>' + groups[g].map(function (p) { var f = pageFields(p.file), e = edited(f); return '<div class="list-item"><div class="grow"><a href="#/content/page/' + esc(p.file) + '"><b>' + esc(p.name) + '</b></a><div class="small muted">' + esc(p.file) + ' · ' + f.length + ' editable items</div></div>' + (e ? '<span class="tag edited">' + e + ' edited</span>' : '') + '<a class="btn sm" href="#/content/page/' + esc(p.file) + '">Edit</a></div>'; }).join('') + '</div>';
      }).join('') + '<div class="card"><h3>Product pages</h3><p class="muted">There are ' + A.catalog().length + ' product pages. Product details are under <a href="#/shop/products">Shop</a>. Text shared by all of them is under <a href="#/shop/shared-text">Text shared by all product pages</a>.</p></div>';
  };

  function fieldList(el, list, opts) {
    opts = opts || {}; var secs = [], map = {}; list.forEach(function (f) { if (!map[f.section]) { map[f.section] = { name: f.section, items: [] }; secs.push(map[f.section]); } map[f.section].items.push(f); });
    var wrap = document.createElement('div'); var ro = !A.can('editor');
    secs.forEach(function (s, i) {
      var d = document.createElement('details'); d.className = 'sec'; d.open = i === 0 && secs.length < 6; d.innerHTML = '<summary><span>' + esc(s.name) + '</span><span class="muted small">' + s.items.length + ' items</span></summary><div class="body"></div>';
      var b = $('.body', d); s.items.forEach(function (f) { b.appendChild(A.fieldRow(f)); }); wrap.appendChild(d);
    });
    var filter = function (q) {
      q = q.toLowerCase(); var shown = 0;
      $$('.field', wrap).forEach(function (r) { var f = S.fmap[r.getAttribute('data-fk')]; var cur = A.effContent(f.key); var hay = (f.label + ' ' + A.plain(f.value) + ' ' + A.plain(cur == null ? '' : cur)).toLowerCase(); var ok = !q || hay.indexOf(q) > -1; r.style.display = ok ? '' : 'none'; if (ok) shown++; });
      $$('details.sec', wrap).forEach(function (d) { var any = $$('.field', d).some(function (r) { return r.style.display !== 'none'; }); d.style.display = any ? '' : 'none'; if (q && any) d.open = true; });
      $('#fcount', el).textContent = (q ? shown + ' of ' : '') + list.length;
    };
    return { node: wrap, filter: filter, ro: ro };
  }

  V['content/page'] = function (el, file) {
    var info = S.defaults.pages.filter(function (p) { return p.file === file; })[0];
    if (!info) { el.innerHTML = A.head('Page not found'); return; } A.crumb(info.name || file);
    var list = pageFields(file);
    el.innerHTML = A.head(info.name, 'Change the text, links and images of this page. The boxes follow the same order as the live page. Edited fields are marked in yellow. Saving makes the change live for visitors.') + A.lockNote('editor') +
      '<div class="row sp" style="margin-bottom:12px"><div class="row"><input type="search" id="pq" placeholder="Search inside this page" style="width:260px"><span class="muted small"><b id="fcount">' + list.length + '</b> editable items</span></div><div class="row"><a class="btn" target="_blank" href="../' + esc(file) + '">View live page</a><button class="btn bad" id="rp">Reset page</button></div></div><div id="fl"></div>';
    var L = fieldList(el, list); $('#fl', el).appendChild(L.node);
    $('#pq', el).oninput = function () { L.filter(this.value); };
    $('#rp', el).onclick = function () { if (!A.can('editor')) return; A.confirm('Reset every field on this page back to the original? (Staged until you press Save.)', function () { list.forEach(function (f) { if (A.hasOverride(f.key)) A.stageContent(f.key, null); }); A.route(); }); };
    if (!list.length) $('#fl', el).innerHTML = '<p class="muted">This page has no editable items.</p>';
  };

  function sharedView(title, note, regions, backTo) {
    return function (el) {
      var list = fields().filter(function (f) { return f.shared && regions.indexOf(f.key.split('.')[1]) > -1; });
      el.innerHTML = A.head(title, note) + A.lockNote('editor') + '<div class="row" style="margin-bottom:12px"><input type="search" id="pq" placeholder="Search here" style="width:260px"><span class="muted small"><b id="fcount">' + list.length + '</b> editable items</span></div><div id="fl"></div>';
      var L = fieldList(el, list); $('#fl', el).appendChild(L.node); $('#pq', el).oninput = function () { L.filter(this.value); };
    };
  }
  V['content/shared/header'] = sharedView('Header and menu', 'These are shared by every page: the top bar, logo and menu links. One change updates the whole site.', ['topbar', 'header', 'search']);
  V['content/shared/footer'] = sharedView('Footer', 'The footer, link columns, social links, stats band, newsletter box and legal text are shared by every page. One change updates the whole site.', ['footer', 'stats', 'news']);
  V['content/shared/other'] = sharedView('Other shared parts', 'The researcher verification pop-up that visitors see when they first arrive.', ['agegate']);
  V['shop/shared-text'] = sharedView('Text shared by all product pages', 'This text appears on every product page (the notice, warning, shipping tab and the Why Choose Us band). One change updates all product pages.', ['pdp', 'why']);

  /* ---------- media ---------- */
  V['content/media'] = async function (el) {
    el.innerHTML = A.head('Images and files', 'Upload pictures here, then pick them when you edit an image field. Uploaded files are public. Copy the address to use it anywhere.') + A.lockNote('editor') + '<div class="row" style="margin-bottom:14px"><label class="btn pri">Upload image<input type="file" accept="image/*" id="mf" hidden></label></div><div id="ml">Loading...</div>';
    var draw = async function () {
      var r = await S.sb.from('media').select('*').order('created_at', { ascending: false }); if (r.error) { $('#ml', el).innerHTML = '<div class="msg err">' + esc(A.explain(r.error)) + '</div>'; return; }
      $('#ml', el).innerHTML = r.data.map(function (m) { return '<div class="card"><div class="imgrow"><img src="' + esc(m.url) + '" alt=""><div style="flex:1"><b>' + esc(m.path.split('/').pop()) + '</b><div class="small muted">' + Math.round((m.size || 0) / 1024) + ' KB</div><input type="text" readonly value="' + esc(m.url) + '" style="margin:6px 0"><div class="row"><input type="text" data-alt="' + m.id + '" value="' + esc(m.alt || '') + '" placeholder="Image description (alt text)" style="flex:1"><button class="btn sm" data-saveAlt="' + m.id + '">Save text</button><button class="btn sm" data-copy="' + esc(m.url) + '">Copy address</button><button class="btn sm bad" data-del="' + m.id + '">Delete</button></div></div></div></div>'; }).join('') || '<p class="muted">No uploads yet.</p>';
      $$('[data-copy]', el).forEach(function (b) { b.onclick = function () { navigator.clipboard && navigator.clipboard.writeText(b.getAttribute('data-copy')); A.toast('Address copied'); }; });
      $$('[data-saveAlt]', el).forEach(function (b) { b.onclick = async function () { var id = b.getAttribute('data-saveAlt'); var x = await S.sb.from('media').update({ alt: $('[data-alt="' + id + '"]', el).value }).eq('id', id); A.toast(x.error ? A.explain(x.error) : 'Saved (saved immediately)', !!x.error); }; });
      $$('[data-del]', el).forEach(function (b) { b.onclick = function () { A.confirm('Delete this file? Pages using it will show a broken image.', async function () { var id = b.getAttribute('data-del'); var m = r.data.filter(function (x) { return x.id === id; })[0]; await S.sb.storage.from('site-media').remove([m.path]); var x = await S.sb.from('media').delete().eq('id', id); A.toast(x.error ? A.explain(x.error) : 'Deleted', !!x.error); draw(); }); }; });
    };
    $('#mf', el).onchange = async function (e) { if (e.target.files[0]) { await A.upload(e.target.files[0]); draw(); } }; draw();
  };

  /* ---------- products ---------- */
  var origOrder = function () { return (window.POP || []).slice(); };
  V['shop/products'] = function (el) {
    var cat = A.catalog(); var filter = 'all';
    el.innerHTML = A.head('All products', 'Click a product to change its name, price, stock, picture, text or to hide it. Product changes go live when you press Save and publish.') + A.lockNote('editor') +
      '<div class="row" style="margin-bottom:12px"><input type="search" id="pq" placeholder="Search by name or SKU" style="max-width:320px"><select id="pf" style="max-width:200px"><option value="all">All products</option><option value="edited">Edited</option><option value="hidden">Hidden</option><option value="out">Out of stock</option></select><span class="muted small" id="pc"></span></div><div class="card" id="pl"></div>';
    var draw = function () {
      var q = $('#pq', el).value.toLowerCase(), f = $('#pf', el).value;
      var rows = cat.filter(function (p) { var o = A.getProd(p.id), has = Object.keys(o).length > 0; var instock = o.in_stock === undefined ? p.in_stock : o.in_stock; if (f === 'edited' && !has) return false; if (f === 'hidden' && !o.hidden) return false; if (f === 'out' && instock) return false; return !q || (p.name + ' ' + p.sku + ' ' + p.group).toLowerCase().indexOf(q) > -1; });
      $('#pc', el).textContent = rows.length + ' of ' + cat.length;
      $('#pl', el).innerHTML = rows.map(function (p) { var o = A.getProd(p.id), has = Object.keys(o).length > 0, price = o.price != null && o.price !== '' ? o.price : p.price, instock = o.in_stock === undefined ? p.in_stock : o.in_stock; return '<div class="list-item"><img src="' + esc(A.imgSrc(o.image || p.image)) + '" alt="" style="width:46px;height:46px;object-fit:contain;border:1px solid var(--line);border-radius:6px"><div class="grow"><a href="#/shop/product/' + p.id + '"><b>' + esc(o.name || p.name) + '</b></a><div class="small muted">' + esc(o.sku || p.sku) + ' · ' + A.money(price) + '</div></div>' + (has ? '<span class="tag edited">edited</span>' : '') + (o.hidden ? '<span class="tag hidden">hidden</span>' : '') + (!instock ? '<span class="tag">out of stock</span>' : '') + '<a class="btn sm" href="#/shop/product/' + p.id + '">Edit</a></div>'; }).join('') || '<p class="muted">No products match.</p>';
    };
    $('#pq', el).oninput = draw; $('#pf', el).onchange = draw; draw();
  };

  var origHtmlCache = {};
  async function origProductHtml(p) {
    if (origHtmlCache[p.id]) return origHtmlCache[p.id];
    var out = { desc: '', chem: '' };
    try { var t = await (await fetch('../product/' + p.slug + '.html')).text(); var d = new DOMParser().parseFromString(t, 'text/html'); var a = d.querySelector('[data-pcms="desc"]'), c = d.querySelector('[data-pcms="chem"]'); if (a) out.desc = a.innerHTML.replace(/(href|src)="\.\.\//g, '$1="'); if (c) out.chem = c.innerHTML.replace(/(href|src)="\.\.\//g, '$1="'); } catch (e) {}
    return (origHtmlCache[p.id] = out);
  }
  A.productStore = function (id) {
    return {
      get: function (k) { var o = A.getProd(id); if (k === 'in_stock') return o.in_stock === undefined ? undefined : (o.in_stock ? '1' : '0'); return o[k]; },
      put: function (k, v) { A.setProd(id, function (o) { if (k === 'in_stock') { if (v === '' || v == null) delete o[k]; else o[k] = v === '1'; } else if (v === '' || v == null) delete o[k]; else o[k] = v; }); },
      del: function (k) { A.setProd(id, function (o) { delete o[k]; }); }
    };
  };
  V['shop/product'] = async function (el, id) {
    var p = A.prod(id); if (!p) { el.innerHTML = A.head('Product not found'); return; } A.crumb(p.name);
    var st = A.productStore(p.id), ro = !A.can('editor'); var o0 = A.getProd(p.id);
    el.innerHTML = A.head(p.name, 'Change this product. Grey "Original" text shows what the site has now. Leave a box empty to keep the original. Product pages and shop cards update after you press Save and publish.') + A.lockNote('editor') +
      '<div class="row" style="margin-bottom:14px"><a class="btn" target="_blank" href="../product/' + esc(p.slug) + '.html">View live page</a><button class="btn bad" id="rp">Reset this product</button><a class="btn" href="#/shop/products">Back to all products</a></div><div id="pf"></div>';
    var box = $('#pf', el), add = function (d) { var n = A.setField('prod', d, { store: st, min: 'editor' }); n.setAttribute('data-pk', p.id + '.' + d.k); box.appendChild(n); return n; };
    add({ k: 'name', label: 'Product name', type: 'text', kind: 'text', orig: p.name });
    add({ k: 'price', label: 'Price ($)', type: 'number', orig: p.price });
    // sale (compare-at) price with a "no sale price" switch
    var wasRow = document.createElement('div'); wasRow.className = 'field'; wasRow.setAttribute('data-pk', p.id + '.was');
    var drawWas = function () { var o = A.getProd(p.id), has = Object.prototype.hasOwnProperty.call(o, 'was'); wasRow.classList.toggle('edited', has); wasRow.innerHTML = '<div class="lab">' + A.kindChip('price') + '<span>Old price shown crossed out (sale price)</span></div><div class="row"><input type="number" step="any" style="max-width:180px" id="wv" ' + (o.was === null || ro ? 'disabled' : '') + ' placeholder="' + (p.was || '') + '" value="' + (o.was != null ? o.was : '') + '"><label class="row"><input type="checkbox" id="wn" style="width:auto" ' + (o.was === null ? 'checked' : '') + (ro ? ' disabled' : '') + '> No sale price</label></div><div class="help">The price above is what customers pay. This is only the crossed out old price.</div>' + (p.was ? '<div class="orig">Original: ' + A.money(p.was) + '</div>' : '<div class="orig">Original: none</div>') + (has ? ' <button class="link" id="wr">Reset to original</button>' : ''); $('#wv', wasRow).oninput = function () { A.setProd(p.id, function (o) { if (this.value === '') delete o.was; else o.was = Number(this.value); }.bind(this)); wasRow.classList.add('edited'); }; $('#wn', wasRow).onchange = function () { var c = this.checked; A.setProd(p.id, function (o) { if (c) o.was = null; else delete o.was; }); drawWas(); }; var wr = $('#wr', wasRow); if (wr) wr.onclick = function () { A.setProd(p.id, function (o) { delete o.was; }); drawWas(); }; };
    drawWas(); box.appendChild(wasRow);
    add({ k: 'in_stock', label: 'Stock', type: 'select', options: [['', 'As on the site now (' + (p.in_stock ? 'In stock' : 'Out of stock') + ')'], ['1', 'In stock'], ['0', 'Out of stock']], help: 'Out of stock shows the waitlist form instead of Add to cart.' });
    add({ k: 'hidden', label: 'Hide this product', type: 'bool', yes: 'Hidden. It disappears from the shop and its page sends visitors to the shop.', orig: false });
    add({ k: 'max_qty', label: 'Maximum quantity per order', type: 'number', help: 'Leave empty for no limit.' });
    add({ k: 'sku', label: 'SKU', type: 'text', kind: 'text', orig: p.sku });
    add({ k: 'image', label: 'Main picture', type: 'image', orig: p.image });
    var subs = (window.SUBCATEGORIES || []).map(function (s) { return [s.slug, s.name]; }); add({ k: 'subcategory', label: 'Group in the shop', type: 'select', options: [['', 'As on the site now'], ].concat(subs), help: 'Controls which shop filter group this product appears in.' });
    // categories
    var cr = document.createElement('div'); cr.className = 'field'; cr.setAttribute('data-pk', p.id + '.site_categories');
    var drawCat = function () { var o = A.getProd(p.id), cur = o.site_categories || p.site_categories; cr.classList.toggle('edited', !!o.site_categories); cr.innerHTML = '<div class="lab">' + A.kindChip('setting') + '<span>Shop categories</span></div><div class="row">' + (window.SITE_CATEGORIES || []).map(function (c) { return '<label class="row"><input type="checkbox" style="width:auto" data-c="' + c.slug + '" ' + (cur.indexOf(c.slug) > -1 ? 'checked' : '') + (ro ? ' disabled' : '') + '> ' + esc(c.name) + '</label>'; }).join('') + '</div>'; $$('input', cr).forEach(function (i) { i.onchange = function () { var sel = $$('input:checked', cr).map(function (x) { return x.getAttribute('data-c'); }); A.setProd(p.id, function (o) { if (JSON.stringify(sel.slice().sort()) === JSON.stringify(p.site_categories.slice().sort())) delete o.site_categories; else o.site_categories = sel; }); cr.classList.toggle('edited', !!A.getProd(p.id).site_categories); }; }); }; drawCat(); box.appendChild(cr);
    // per-product discount
    var dr = document.createElement('div'); dr.className = 'field'; dr.setAttribute('data-pk', p.id + '.discount');
    var drawDisc = function () { var o = A.getProd(p.id), mode = o.discount === 'none' ? 'none' : (Array.isArray(o.discount) ? 'custom' : 'default'); dr.classList.toggle('edited', mode !== 'default');
      dr.innerHTML = '<div class="lab">' + A.kindChip('price') + '<span>Quantity discount</span></div><select id="dm"' + (ro ? ' disabled' : '') + '><option value="default">Use the site-wide steps</option><option value="none">No discount for this product</option><option value="custom">Custom steps for this product</option></select><div id="ds" style="margin-top:8px"></div>'; $('#dm', dr).value = mode;
      var steps = Array.isArray(o.discount) ? o.discount : []; var ds = $('#ds', dr); if (mode === 'custom') { ds.innerHTML = steps.map(function (s, i) { return '<div class="row" style="margin-bottom:6px"><input type="number" min="1" value="' + s.min + '" data-i="' + i + '" data-f="min" style="width:110px"> or more units: <input type="number" min="1" max="100" value="' + s.pct + '" data-i="' + i + '" data-f="pct" style="width:90px"> % off <button class="btn sm bad" data-rm="' + i + '">Remove</button></div>'; }).join('') + '<button class="btn sm" id="da">Add step</button>'; $$('input', ds).forEach(function (i) { i.oninput = function () { A.setProd(p.id, function (o) { o.discount[+i.getAttribute('data-i')][i.getAttribute('data-f')] = Number(i.value); }); }; }); $$('[data-rm]', ds).forEach(function (b) { b.onclick = function () { A.setProd(p.id, function (o) { o.discount.splice(+b.getAttribute('data-rm'), 1); if (!o.discount.length) delete o.discount; }); drawDisc(); }; }); $('#da', ds).onclick = function () { A.setProd(p.id, function (o) { o.discount = (Array.isArray(o.discount) ? o.discount : []).concat([{ min: 5, pct: 5 }]); }); drawDisc(); }; }
      $('#dm', dr).onchange = function () { var v = this.value; A.setProd(p.id, function (o) { if (v === 'default') delete o.discount; else if (v === 'none') o.discount = 'none'; else o.discount = [{ min: 5, pct: 5 }]; }); drawDisc(); }; }; drawDisc(); box.appendChild(dr);
    // rich text from the product page
    var orig = await origProductHtml(p);
    [['desc_html', 'Description (tab on the product page)', orig.desc], ['chem_html', 'Chemical Information (tab on the product page)', orig.chem]].forEach(function (x) {
      var r = document.createElement('div'); r.className = 'field'; r.setAttribute('data-pk', p.id + '.' + x[0]);
      var draw = function () { var o = A.getProd(p.id), has = o[x[0]] != null; r.classList.toggle('edited', has); r.innerHTML = '<div class="lab">' + A.kindChip('html') + '<span>' + x[1] + '</span></div><div class="in"></div><div class="orig">' + (has ? 'Original text kept. <button class="link" data-r>Reset to original</button>' : (x[2] ? '' : 'This product has no text here on the live site.')) + '</div>'; $('.in', r).appendChild(A.rte(has ? o[x[0]] : x[2], function (v) { A.setProd(p.id, function (o) { if (v === x[2]) delete o[x[0]]; else o[x[0]] = v; }); r.classList.toggle('edited', A.getProd(p.id)[x[0]] != null); }, ro)); var rb = $('[data-r]', r); if (rb) rb.onclick = function () { A.setProd(p.id, function (o) { delete o[x[0]]; }); draw(); }; };
      draw(); box.appendChild(r);
    });
    $('#rp', el).onclick = function () { A.confirm('Reset every change on this product? (Staged until you press Save.)', function () { A.setProd(p.id, function (o) { Object.keys(o).forEach(function (k) { delete o[k]; }); }); A.route(); }); };
  };

  /* quick price and stock list */
  V['shop/quick'] = function (el) {
    var cat = A.catalog(), ro = !A.can('editor');
    el.innerHTML = A.head('Quick price and stock list', 'Change prices, sale prices and stock for many products at once. Changes are staged until you press Save and publish.') + A.lockNote('editor') + '<div class="row" style="margin-bottom:10px"><input type="search" id="pq" placeholder="Search by name or SKU" style="max-width:320px"></div><div class="card" id="ql"></div>';
    var draw = function () {
      var q = $('#pq', el).value.toLowerCase(), list = cat.filter(function (p) { return !q || (p.name + ' ' + p.sku).toLowerCase().indexOf(q) > -1; });
      $('#ql', el).innerHTML = '<div class="qrow head"><div>Product</div><div>Price</div><div>Old price</div><div>Stock</div><div>Hidden</div></div>' + list.map(function (p) { var o = A.getProd(p.id), stock = o.in_stock === undefined ? '' : (o.in_stock ? '1' : '0');
        return '<div class="qrow" data-id="' + p.id + '"><div><a href="#/shop/product/' + p.id + '">' + esc(o.name || p.name) + '</a><div class="small muted">' + esc(p.sku) + '</div></div><input type="number" step="any" data-f="price" placeholder="' + p.price + '" value="' + (o.price != null ? o.price : '') + '"' + (ro ? ' disabled' : '') + '><input type="number" step="any" data-f="was" placeholder="' + (p.was || '') + '" value="' + (o.was != null ? o.was : '') + '"' + (ro ? ' disabled' : '') + '><select data-f="in_stock"' + (ro ? ' disabled' : '') + '><option value="">As is (' + (p.in_stock ? 'in' : 'out') + ')</option><option value="1"' + (stock === '1' ? ' selected' : '') + '>In stock</option><option value="0"' + (stock === '0' ? ' selected' : '') + '>Out of stock</option></select><label><input type="checkbox" data-f="hidden" style="width:auto"' + (o.hidden ? ' checked' : '') + (ro ? ' disabled' : '') + '> hide</label></div>'; }).join('');
    };
    draw(); $('#pq', el).oninput = draw;
    var onch = function (e) { var t = e.target, row = t.closest('.qrow'); if (!row || !t.getAttribute('data-f')) return; var id = +row.getAttribute('data-id'), f = t.getAttribute('data-f'); A.setProd(id, function (o) { if (f === 'hidden') { if (t.checked) o.hidden = true; else delete o.hidden; } else if (f === 'in_stock') { if (t.value === '') delete o.in_stock; else o.in_stock = t.value === '1'; } else if (t.value === '') delete o[f]; else o[f] = Number(t.value); }); };
    $('#ql', el).addEventListener('input', onch); $('#ql', el).addEventListener('change', onch);
  };

  /* order in lists */
  V['shop/order'] = function (el) {
    var cat = A.catalog(), ro = !A.can('editor'); var o0 = origOrder();
    var effOrder = function () { var P = function (id) { return A.getProd(id); }; var key = function (id) { var o = P(id); if (o.sort != null && o.sort !== '') return Number(o.sort); var i = o0.indexOf(id); return i < 0 ? 9999 : i; }; return o0.map(function (id, ix) { return { id: id, k: key(id), ix: ix }; }).filter(function (x) { return A.prod(x.id); }).sort(function (a, b) { return a.k - b.k || a.ix - b.ix; }).map(function (x) { return x.id; }); };
    var apply = function (ids) { var same = ids.every(function (id, i) { return o0.filter(function (x) { return A.prod(x); })[i] === id; }); ids.forEach(function (id, i) { A.setProd(id, function (o) { if (same) delete o.sort; else o.sort = i; }); }); };
    el.innerHTML = A.head('Order in lists', 'This sets the order products appear in the shop and in "Popular" sorting. Move a product up or down, or to the top. Changes are staged until you press Save and publish.') + A.lockNote('editor') + '<div class="card" id="ol"></div>';
    var draw = function () { var ids = effOrder(); $('#ol', el).innerHTML = ids.map(function (id, i) { var p = A.prod(id); return '<div class="list-item"><span class="muted" style="width:32px">' + (i + 1) + '</span><div class="grow">' + esc(A.getProd(id).name || p.name) + '</div><button class="btn sm" data-a="top" data-i="' + i + '"' + (ro ? ' disabled' : '') + '>Top</button><button class="btn sm" data-a="up" data-i="' + i + '"' + (ro ? ' disabled' : '') + '>Up</button><button class="btn sm" data-a="down" data-i="' + i + '"' + (ro ? ' disabled' : '') + '>Down</button></div>'; }).join(''); };
    draw(); $('#ol', el).onclick = function (e) { var b = e.target.closest('button'); if (!b) return; var ids = effOrder(), i = +b.getAttribute('data-i'), a = b.getAttribute('data-a'); var x = ids.splice(i, 1)[0]; ids.splice(a === 'top' ? 0 : a === 'up' ? Math.max(0, i - 1) : Math.min(ids.length, i + 1), 0, x); apply(ids); draw(); };
  };

  /* featured products on the home page */
  V['shop/featured'] = function (el) {
    var ro = !A.can('admin'); var orig = (window.PRODUCTS || []).map(function (x) { return x.id; });
    var cur = function () { var f = A.getSet('home').featured; return f && f.length ? f.slice() : orig.slice(); };
    el.innerHTML = A.head('Home page featured products', 'Choose which products appear in "Best Sellers" on the home page and put them in order. Changes go live when you press Save and publish.') + A.lockNote('admin') + '<div class="card"><div id="fl"></div><div class="row" style="margin-top:12px"><select id="fa" style="max-width:360px"></select><button class="btn" id="fadd"' + (ro ? ' disabled' : '') + '>Add product</button><button class="link" id="frs">Reset to original</button></div></div>';
    var save = function (ids) { A.setSet('home', function (o) { if (JSON.stringify(ids) === JSON.stringify(orig)) delete o.featured; else o.featured = ids; }); draw(); };
    var draw = function () { var ids = cur(); $('#fl', el).innerHTML = ids.map(function (id, i) { var p = A.prod(id); return p ? '<div class="list-item"><img src="' + esc(A.imgSrc(p.image)) + '" alt="" style="width:44px;height:44px;object-fit:contain"><div class="grow">' + esc(A.getProd(id).name || p.name) + '</div><button class="btn sm" data-a="up" data-i="' + i + '"' + (ro ? ' disabled' : '') + '>Up</button><button class="btn sm" data-a="down" data-i="' + i + '"' + (ro ? ' disabled' : '') + '>Down</button><button class="btn sm bad" data-a="rm" data-i="' + i + '"' + (ro ? ' disabled' : '') + '>Remove</button></div>' : ''; }).join('') || '<p class="muted">Nothing selected.</p>'; $('#fa', el).innerHTML = A.catalog().filter(function (p) { return ids.indexOf(p.id) < 0; }).map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join(''); };
    draw();
    $('#fl', el).onclick = function (e) { var b = e.target.closest('button'); if (!b) return; var ids = cur(), i = +b.getAttribute('data-i'), a = b.getAttribute('data-a'); if (a === 'rm') ids.splice(i, 1); else { var j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= ids.length) return; var t = ids[i]; ids[i] = ids[j]; ids[j] = t; } save(ids); };
    $('#fadd', el).onclick = function () { var v = +$('#fa', el).value; if (v) { var ids = cur(); ids.push(v); save(ids); } };
    $('#frs', el).onclick = function () { A.setSet('home', function (o) { delete o.featured; }); draw(); };
  };
})();
