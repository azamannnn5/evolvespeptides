/* Admin core: state, staging, save, field components, layout, router, search. No build step. */
(function () {
  'use strict';
  var A = window.ADMIN = { views: {}, nav: [], settingsDefs: {} };
  var $ = A.$ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = A.$$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = A.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  A.clone = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  A.money = function (n) { return n == null || n === '' ? '' : '$' + Number(n).toFixed(2); };

  /* ---------- state ---------- */
  var S = A.S = { sb: null, user: null, role: null, defaults: null, fmap: {}, saved: { content: {}, settings: {}, products: {} }, staged: { content: {}, settings: {}, products: {} }, ready: false, focus: null };
  A.cfg = window.CMS_CONFIG || {};
  A.configured = !!(A.cfg.url && A.cfg.anonKey);
  var RANK = { owner: 4, admin: 3, editor: 2, viewer: 1 };
  A.can = function (min) { return (RANK[S.role] || 0) >= RANK[min]; };
  A.catalog = function () { return window.CATALOG || []; };
  A.prod = function (id) { return A.catalog().filter(function (p) { return p.id === +id; })[0]; };

  /* ---------- toast + modal ---------- */
  A.toast = function (msg, err) { var t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, err ? 6000 : 2600); };
  A.modal = function (html, onMount) {
    var bg = document.createElement('div'); bg.className = 'modal-bg'; bg.innerHTML = '<div class="modal">' + html + '</div>'; document.body.appendChild(bg);
    var close = function () { bg.remove(); }; bg.addEventListener('mousedown', function (e) { if (e.target === bg) close(); });
    if (onMount) onMount(bg.firstChild, close); return close;
  };
  A.confirm = function (text, yes) { A.modal('<p>' + esc(text) + '</p><div class="row" style="justify-content:flex-end"><button class="btn" data-x>Cancel</button><button class="btn pri" data-y>Yes</button></div>', function (m, close) { $('[data-x]', m).onclick = close; $('[data-y]', m).onclick = function () { close(); yes(); }; }); };

  /* ---------- staged changes ---------- */
  A.count = function () { return Object.keys(S.staged.content).length + Object.keys(S.staged.settings).length + Object.keys(S.staged.products).length; };
  A.updateBar = function () {
    var n = A.count(), bar = $('#savebar'); if (!bar) return; bar.classList.toggle('on', n > 0);
    $('#savemsg').textContent = n + ' unsaved change' + (n === 1 ? '' : 's') + '. Nothing is live until you press Save.';
  };
  window.addEventListener('beforeunload', function (e) { if (A.count() > 0) { e.preventDefault(); e.returnValue = ''; } });
  A.effContent = function (key) { if (key in S.staged.content) return S.staged.content[key]; if (key in S.saved.content) return S.saved.content[key]; return undefined; };
  A.hasOverride = function (key) { var v = A.effContent(key); return v !== undefined && v !== null; };
  A.stageContent = function (key, val) {
    var d = S.fmap[key]; var orig = d ? d.value : undefined;
    if (val === null || val === orig) { if (key in S.saved.content) S.staged.content[key] = null; else delete S.staged.content[key]; }
    else S.staged.content[key] = val;
    A.updateBar();
  };
  A.getSet = function (g) { if (g in S.staged.settings) return S.staged.settings[g]; return S.saved.settings[g] || {}; };
  A.setSet = function (g, fn) { var cur = A.clone(A.getSet(g)) || {}; fn(cur); S.staged.settings[g] = cur; if (JSON.stringify(cur) === JSON.stringify(S.saved.settings[g] || {})) delete S.staged.settings[g]; A.updateBar(); };
  A.getProd = function (id) { if (id in S.staged.products) return S.staged.products[id] || {}; return S.saved.products[id] || {}; };
  A.setProd = function (id, fn) { var cur = A.clone(A.getProd(id)) || {}; fn(cur); Object.keys(cur).forEach(function (k) { if (cur[k] === undefined) delete cur[k]; }); var saved = S.saved.products[id]; if (!Object.keys(cur).length) { if (saved) S.staged.products[id] = null; else delete S.staged.products[id]; } else if (JSON.stringify(cur) === JSON.stringify(saved || null)) delete S.staged.products[id]; else S.staged.products[id] = cur; A.updateBar(); };
  A.discard = function () { S.staged = { content: {}, settings: {}, products: {} }; A.updateBar(); A.route(); };

  A.sb = function () { return S.sb; };
  A.explain = function (error) {
    var m = (error && (error.message || error.msg)) || String(error); var c = error && error.code;
    if (c === '42P01' || c === 'PGRST205' || /relation .* does not exist|schema cache/i.test(m)) return 'The database tables are missing. Run sql/schema.sql in the Supabase SQL editor first.';
    if (c === '42501' || /row-level security|permission denied/i.test(m)) return 'Your role does not allow this change.';
    return m;
  };
  A.loadSaved = async function () {
    var r = await Promise.all([S.sb.from('content_overrides').select('key,value'), S.sb.from('settings').select('group_key,data'), S.sb.from('product_overrides').select('product_id,data')]);
    for (var i = 0; i < r.length; i++) if (r[i].error) throw r[i].error;
    S.saved.content = {}; r[0].data.forEach(function (x) { S.saved.content[x.key] = x.value; });
    S.saved.settings = {}; r[1].data.forEach(function (x) { S.saved.settings[x.group_key] = x.data; });
    S.saved.products = {}; r[2].data.forEach(function (x) { S.saved.products[x.product_id] = x.data; });
  };
  A.save = async function () {
    var st = S.staged, uid = S.user && S.user.id, btn = $('#savebtn'); if (btn) btn.disabled = true;
    try {
      var up = [], del = [];
      Object.keys(st.content).forEach(function (k) { if (st.content[k] === null) del.push(k); else up.push({ key: k, value: st.content[k], kind: (S.fmap[k] || {}).kind || null, page: (S.fmap[k] || {}).page || null, updated_by: uid, updated_at: new Date().toISOString() }); });
      var res;
      if (up.length) { res = await S.sb.from('content_overrides').upsert(up, { onConflict: 'key' }); if (res.error) throw res.error; }
      if (del.length) { res = await S.sb.from('content_overrides').delete().in('key', del); if (res.error) throw res.error; }
      var sets = Object.keys(st.settings).map(function (g) { return { group_key: g, data: st.settings[g], updated_by: uid, updated_at: new Date().toISOString() }; });
      if (sets.length) { res = await S.sb.from('settings').upsert(sets, { onConflict: 'group_key' }); if (res.error) throw res.error; }
      var pu = [], pd = [];
      Object.keys(st.products).forEach(function (id) { if (st.products[id] === null) pd.push(+id); else pu.push({ product_id: +id, data: st.products[id], updated_by: uid, updated_at: new Date().toISOString() }); });
      if (pu.length) { res = await S.sb.from('product_overrides').upsert(pu, { onConflict: 'product_id' }); if (res.error) throw res.error; }
      if (pd.length) { res = await S.sb.from('product_overrides').delete().in('product_id', pd); if (res.error) throw res.error; }
      var n = A.count(); S.staged = { content: {}, settings: {}, products: {} };
      await A.loadSaved(); A.updateBar(); A.toast('Saved and published (' + n + ' change' + (n === 1 ? '' : 's') + ')'); A.route();
    } catch (e) { A.toast(A.explain(e), true); }
    if (btn) btn.disabled = false;
  };

  /* ---------- image + rich text + field components ---------- */
  var siteImages = null;
  A.siteImages = function () {
    if (siteImages) return siteImages; var seen = {}, out = [];
    (S.defaults ? S.defaults.fields : []).forEach(function (f) { if (f.kind === 'image' && !seen[f.value]) { seen[f.value] = 1; out.push({ url: f.value, name: f.value.split('/').pop() }); } });
    A.catalog().forEach(function (p) { (p.images || [p.image]).forEach(function (u) { if (u && !seen[u]) { seen[u] = 1; out.push({ url: u, name: u.split('/').pop() }); } }); });
    return (siteImages = out);
  };
  A.imgSrc = function (u) { return /^(https?:|data:|\/)/.test(u || '') ? u : '../' + (u || ''); };
  A.pickImage = function (done) {
    A.modal('<h3 style="margin-top:0">Choose an image</h3><div class="tabs"><button class="on" data-t="up">Uploads</button><button data-t="site">Images already on the site</button><button data-t="url">Web address</button></div><div id="pk"></div>', function (m, close) {
      var mount = function (tab) {
        $$('.tabs button', m).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-t') === tab); }); var box = $('#pk', m);
        if (tab === 'url') { box.innerHTML = '<p class="muted small">Paste the full address of an image (starts with https://).</p><div class="row"><input type="url" id="pkurl" placeholder="https://"><button class="btn pri" id="pkok">Use</button></div>'; $('#pkok', m).onclick = function () { var v = $('#pkurl', m).value.trim(); if (v) { close(); done(v); } }; return; }
        if (tab === 'site') { var q = '<input type="search" placeholder="Filter by file name" id="pkq"><div class="picker" id="pkg"></div>'; box.innerHTML = q; var draw = function () { var f = ($('#pkq', m).value || '').toLowerCase(); $('#pkg', m).innerHTML = A.siteImages().filter(function (i) { return !f || i.name.toLowerCase().indexOf(f) > -1; }).slice(0, 120).map(function (i) { return '<button data-u="' + esc(i.url) + '"><img loading="lazy" src="' + esc(A.imgSrc(i.url)) + '" alt=""><small>' + esc(i.name) + '</small></button>'; }).join(''); }; $('#pkq', m).oninput = draw; draw(); $('#pkg', m).onclick = function (e) { var b = e.target.closest('button'); if (b) { close(); done(b.getAttribute('data-u')); } }; return; }
        box.innerHTML = '<div class="row"><label class="btn pri">Upload new image<input type="file" accept="image/*" id="pkf" hidden></label><span class="muted small">Uploads are public.</span></div><div class="picker" id="pkg">Loading...</div>';
        $('#pkf', m).onchange = async function (e) { var f = e.target.files[0]; if (!f) return; var r = await A.upload(f); if (r) { close(); done(r.url); } };
        S.sb.from('media').select('*').order('created_at', { ascending: false }).limit(120).then(function (r) { $('#pkg', m).innerHTML = (r.data || []).map(function (i) { return '<button data-u="' + esc(i.url) + '"><img src="' + esc(i.url) + '" alt=""><small>' + esc(i.path.split('/').pop()) + '</small></button>'; }).join('') || '<p class="muted">No uploads yet.</p>'; });
        $('#pkg', m).onclick = function (e) { var b = e.target.closest('button'); if (b) { close(); done(b.getAttribute('data-u')); } };
      };
      $$('.tabs button', m).forEach(function (b) { b.onclick = function () { mount(b.getAttribute('data-t')); }; }); mount('up');
    });
  };
  A.upload = async function (file) {
    if (!A.can('editor')) { A.toast('Your role cannot upload.', true); return null; }
    var path = 'uploads/' + Date.now() + '-' + file.name.replace(/[^A-Za-z0-9._-]/g, '_');
    var r = await S.sb.storage.from('site-media').upload(path, file, { upsert: false, contentType: file.type });
    if (r.error) { A.toast(A.explain(r.error), true); return null; }
    var url = S.sb.storage.from('site-media').getPublicUrl(path).data.publicUrl;
    var ins = await S.sb.from('media').insert({ path: path, url: url, size: file.size, created_by: S.user.id }).select().single();
    if (ins.error) { A.toast(A.explain(ins.error), true); return null; } A.toast('Uploaded'); return ins.data;
  };

  // rich text editor (visual by default, advanced HTML on request)
  A.rte = function (html, onChange, ro) {
    var w = document.createElement('div'); w.className = 'rte';
    w.innerHTML = '<div class="bar"><button type="button" data-c="bold"><b>B</b></button><button type="button" data-c="italic"><i>I</i></button><button type="button" data-c="link">Link</button><button type="button" data-c="unlink">Remove link</button><button type="button" data-c="clear">Clear formatting</button><button type="button" data-c="html" style="margin-left:auto">Advanced HTML</button></div><div class="ed" contenteditable="' + (ro ? 'false' : 'true') + '"></div><textarea class="code" style="display:none;border:0;border-radius:0 0 8px 8px"></textarea>';
    var ed = $('.ed', w), ta = $('textarea', w); ed.innerHTML = html; ta.value = html; ta.disabled = !!ro;
    ed.addEventListener('input', function () { ta.value = ed.innerHTML; onChange(ed.innerHTML); });
    ta.addEventListener('input', function () { ed.innerHTML = ta.value; onChange(ta.value); });
    w.addEventListener('mousedown', function (e) { if (e.target.closest('.bar button')) e.preventDefault(); });
    w.addEventListener('click', function (e) {
      var b = e.target.closest('.bar button'); if (!b || ro) return; var c = b.getAttribute('data-c');
      if (c === 'html') { var show = ta.style.display === 'none'; ta.style.display = show ? 'block' : 'none'; ed.style.display = show ? 'none' : 'block'; b.textContent = show ? 'Visual editor' : 'Advanced HTML'; if (!show) ed.innerHTML = ta.value; return; }
      ed.focus();
      if (c === 'link') { var u = prompt('Link address'); if (u) document.execCommand('createLink', false, u); }
      else if (c === 'clear') document.execCommand('removeFormat'); else document.execCommand(c);
      ta.value = ed.innerHTML; onChange(ed.innerHTML);
    });
    return w;
  };

  var KIND_LABEL = { text: 'Text', html: 'Text', link: 'Link', image: 'Image', alt: 'Text', placeholder: 'Text', tn: 'Text', setting: 'Setting', code: 'Code', price: 'Price' };
  var KIND_CLASS = { text: 'text', html: 'html', link: 'link', image: 'image', alt: 'alt', placeholder: 'text', tn: 'text', setting: 'setting', code: 'code', price: 'price' };
  A.kindChip = function (k, label) { return '<span class="kind ' + (KIND_CLASS[k] || 'text') + '">' + (label || (k === 'alt' ? 'Image text' : KIND_LABEL[k] || k)) + '</span>'; };
  function plain(h) { var d = document.createElement('div'); d.innerHTML = h; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  A.plain = plain;

  // one site content field
  A.fieldRow = function (d, opts) {
    opts = opts || {}; var ro = !A.can('editor');
    var row = document.createElement('div'); row.className = 'field'; row.setAttribute('data-fk', d.key);
    var cur = A.effContent(d.key); var has = cur !== undefined && cur !== null; var val = has ? cur : d.value;
    var render = function () {
      var edited = A.hasOverride(d.key); row.classList.toggle('edited', edited);
      var o = $('.orig', row); o.innerHTML = edited ? 'Original: ' + esc(plain(d.value).slice(0, 160) || d.value.slice(0, 160)) + ' <button type="button" class="link" data-reset>Reset to original</button>' : '';
      var rs = $('[data-reset]', row); if (rs) rs.onclick = function () { A.stageContent(d.key, null); val = d.value; mount(); render(); };
    };
    var mount = function () {
      var box = $('.in', row); box.innerHTML = '';
      var onc = function (v) { A.stageContent(d.key, v); render(); };
      if (d.kind === 'html') box.appendChild(A.rte(val, onc, ro));
      else if (d.kind === 'image') {
        box.innerHTML = '<div class="imgrow"><img alt="" src="' + esc(A.imgSrc(val)) + '"><div style="flex:1"><input type="text" value="' + esc(val) + '"' + (ro ? ' disabled' : '') + '><div class="row" style="margin-top:6px"><button type="button" class="btn sm" data-pick' + (ro ? ' disabled' : '') + '>Choose image</button></div></div></div>';
        var inp = $('input', box), im = $('img', box); inp.oninput = function () { im.src = A.imgSrc(inp.value); onc(inp.value); };
        $('[data-pick]', box).onclick = function () { A.pickImage(function (u) { inp.value = u; im.src = A.imgSrc(u); onc(u); }); };
      } else {
        var long = (d.value || '').length > 90 || /\n/.test(d.value || ''); var el = document.createElement(long ? 'textarea' : 'input'); if (!long) el.type = d.kind === 'link' ? 'text' : 'text'; el.value = val; el.disabled = ro; el.oninput = function () { onc(el.value); }; box.appendChild(el);
      }
    };
    row.innerHTML = '<div class="lab">' + A.kindChip(d.kind) + '<span>' + esc(opts.label || d.label) + '</span></div><div class="in"></div>' + (opts.help ? '<div class="help">' + esc(opts.help) + '</div>' : '') + '<div class="orig"></div>';
    mount(); render(); return row;
  };

  // generic settings field (declarative)
  // def: {k, label, type: text|number|bool|select|color|textarea|code|image|date|list, help, orig, options}
  A.setField = function (group, def, opts) {
    opts = opts || {}; var ro = !(opts.min ? A.can(opts.min) : A.can('admin'));
    var row = document.createElement('div'); row.className = 'field'; row.setAttribute('data-sk', group + '.' + def.k);
    var st = opts.store || { get: function (k) { return A.getSet(group)[k]; }, put: function (k, v) { A.setSet(group, function (o) { if (v === '' || v === undefined || v === null) delete o[k]; else o[k] = v; }); }, del: function (k) { A.setSet(group, function (o) { delete o[k]; }); } };
    var get = function () { return st.get(def.k); };
    var refresh = function () { var v = get(); var ed = v !== undefined && v !== '' && v !== null && !(def.type === 'bool' && v === false && def.orig === false); row.classList.toggle('edited', ed); var rb = $('[data-reset]', row); if (rb) rb.style.display = ed ? '' : 'none'; };
    var set = function (v) { st.put(def.k, v); refresh(); };
    var cur = get(); var inner = '';
    var kind = def.kind ? def.kind : def.type === 'code' ? 'code' : (def.type === 'image' ? 'image' : (def.type === 'number' && /price|fee|\$/.test(def.label.toLowerCase()) ? 'price' : 'setting'));
    row.innerHTML = '<div class="lab">' + A.kindChip(kind) + '<span>' + esc(def.label) + '</span></div><div class="in"></div>' + (def.help ? '<div class="help">' + esc(def.help) + '</div>' : '') + (def.orig !== undefined && def.orig !== '' ? '<div class="orig">Original: ' + esc(String(def.orig)) + ' <button type="button" class="link" data-reset>Reset to original</button></div>' : '');
    var box = $('.in', row), el;
    if (def.type === 'bool') { box.innerHTML = '<label class="row"><input type="checkbox" style="width:auto"> <span>' + esc(def.yes || 'On') + '</span></label>'; el = $('input', box); el.checked = cur === undefined ? !!def.orig : !!cur; el.onchange = function () { if (el.checked === !!def.orig) { st.del(def.k); refresh(); } else set(el.checked); }; }
    else if (def.type === 'select') { box.innerHTML = '<select>' + def.options.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>'; el = $('select', box); el.value = cur === undefined ? (def.def || '') : cur; el.onchange = function () { set(el.value); }; }
    else if (def.type === 'textarea' || def.type === 'code') { box.innerHTML = '<textarea class="' + (def.type === 'code' ? 'code' : '') + '"></textarea>'; el = $('textarea', box); el.value = cur === undefined ? '' : cur; el.oninput = function () { set(el.value); }; }
    else if (def.type === 'color') { box.innerHTML = '<div class="row"><input type="color" style="width:52px;height:38px;padding:2px"><input type="text" placeholder="' + esc(def.orig || '#000000') + '" style="flex:1"></div>'; var cc = $('input[type=color]', box), ct = $('input[type=text]', box); ct.value = cur || ''; cc.value = /^#[0-9a-f]{6}$/i.test(cur || def.orig || '') ? (cur || def.orig) : '#000000'; cc.oninput = function () { ct.value = cc.value; set(cc.value); }; ct.oninput = function () { if (/^#[0-9a-f]{6}$/i.test(ct.value)) cc.value = ct.value; set(ct.value.trim()); }; el = ct; }
    else if (def.type === 'image') { box.innerHTML = '<div class="imgrow"><img alt="" style="display:' + (cur ? 'block' : 'none') + '" src="' + esc(cur ? A.imgSrc(cur) : '') + '"><div style="flex:1"><input type="text"><div class="row" style="margin-top:6px"><button type="button" class="btn sm" data-pick>Choose image</button></div></div></div>'; el = $('input', box); var im2 = $('img', box); el.value = cur || ''; el.oninput = function () { im2.src = A.imgSrc(el.value); im2.style.display = el.value ? 'block' : 'none'; set(el.value); }; $('[data-pick]', box).onclick = function () { A.pickImage(function (u) { el.value = u; el.oninput(); }); }; }
    else { box.innerHTML = '<input type="' + (def.type === 'number' ? 'number' : (def.type === 'date' ? 'datetime-local' : 'text')) + '"' + (def.type === 'number' ? ' step="any"' : '') + ' placeholder="' + esc(def.orig !== undefined ? def.orig : (def.ph || '')) + '">'; el = $('input', box); el.value = cur === undefined ? '' : cur; el.oninput = function () { set(def.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value); }; }
    if (ro) $$('input,select,textarea,button[data-pick]', row).forEach(function (x) { x.disabled = true; });
    var rs = $('[data-reset]', row); if (rs) rs.onclick = function () { st.del(def.k); A.route(); };
    refresh(); return row;
  };
  A.lockNote = function (min) { return A.can(min) ? '' : '<div class="msg warn">Your role (' + esc(S.role) + ') can only look at this screen. Ask the owner to change your role to edit it.</div>'; };

  /* ---------- navigation + layout ---------- */
  A.NAV = [
    { g: 'Dashboard', items: [['dashboard', 'Dashboard']] },
    { g: 'Content', items: [['content/pages', 'Pages'], ['content/shared/header', 'Header and menu'], ['content/shared/footer', 'Footer'], ['content/shared/other', 'Other shared parts'], ['content/media', 'Images and files']] },
    { g: 'Shop', items: [['shop/products', 'All products'], ['shop/quick', 'Quick price and stock list'], ['shop/order', 'Order in lists'], ['shop/shared-text', 'Text shared by all product pages'], ['shop/featured', 'Home page featured products'], ['shop/discounts', 'Bulk or quantity discounts'], ['shop/shipping', 'Shipping and cart fees'], ['shop/coupons', 'Promo codes']] },
    { g: 'Promotions', items: [['promo/banner', 'Top banner'], ['promo/popup', 'Pop-up message']] },
    { g: 'Customers', items: [['customers/inbox', 'Messages inbox'], ['customers/forms', 'Form and cart texts']] },
    { g: 'Site', items: [['site/seo', 'Search and sharing'], ['site/look', 'Look and feel'], ['site/tracking', 'Tracking and code'], ['site/redirects', 'Redirects'], ['site/maintenance', 'Maintenance mode']] },
    { g: 'Admin', items: [['admin/history', 'Activity and undo'], ['admin/backup', 'Backup and restore'], ['admin/team', 'Team'], ['admin/help', 'Help and guide']] }
  ];
  A.titleOf = function (path) { var t = null; A.NAV.forEach(function (g) { g.items.forEach(function (i) { if (path === i[0] || path.indexOf(i[0] + '/') === 0) t = { g: g.g, t: i[1], p: i[0] }; }); }); return t; };
  A.go = function (p) { location.hash = '#/' + p; };
  A.layout = function () {
    var nav = A.NAV.map(function (g) { return '<h6>' + g.g + '</h6>' + g.items.map(function (i) { return '<a class="nav" href="#/' + i[0] + '" data-p="' + i[0] + '">' + esc(i[1]) + (i[0] === 'customers/inbox' ? ' <span class="badge" id="inboxbadge" style="display:none"></span>' : '') + '</a>'; }).join(''); }).join('');
    $('#app').innerHTML = '<div class="shell"><aside class="side" id="side"><div class="brand">Site admin</div>' + nav + '</aside><div class="main"><div class="top"><button class="btn menu" id="menubtn">Menu</button><div class="gsearch"><input type="search" id="gs" placeholder="Search everything (press / )" autocomplete="off"><div class="gresults" id="gr" style="display:none"></div></div><div class="who"><span class="em">' + esc(S.user.email) + '</span><span class="pill">' + esc(S.role) + '</span><a href="../index.html" target="_blank">View site</a><button class="btn sm" id="logout">Sign out</button></div></div><div class="content" id="view"></div></div></div><div class="savebar" id="savebar"><span id="savemsg"></span><button class="btn" id="discardbtn">Discard</button><button class="btn pri" id="savebtn">Save and publish</button></div>';
    $('#menubtn').onclick = function () { $('#side').classList.toggle('open'); };
    $('#logout').onclick = async function () { if (A.count() && !confirm('You have unsaved changes. Sign out anyway?')) return; await S.sb.auth.signOut(); location.reload(); };
    $('#savebtn').onclick = A.save; $('#discardbtn').onclick = function () { A.confirm('Throw away all unsaved changes?', A.discard); };
    A.initSearch(); A.updateBar();
    S.sb.from('messages').select('id', { count: 'exact', head: true }).eq('status', 'new').then(function (r) { var b = $('#inboxbadge'); if (b && r.count) { b.textContent = r.count; b.style.display = ''; } });
  };
  A.route = function () {
    var p = (location.hash || '#/dashboard').replace(/^#\//, '') || 'dashboard'; var view = $('#view'); if (!view) return;
    var info = A.titleOf(p); $$('.side a.nav').forEach(function (a) { a.classList.toggle('on', info && a.getAttribute('data-p') === info.p); }); $('#side').classList.remove('open');
    var key = Object.keys(A.views).filter(function (k) { return p === k || p.indexOf(k + '/') === 0; }).sort(function (a, b) { return b.length - a.length; })[0];
    var args = key ? p.slice(key.length).replace(/^\//, '') : '';
    view.innerHTML = ''; var crumbs = '<div class="crumbs"><a href="#/dashboard">Admin</a>' + (info && info.g !== 'Dashboard' ? ' / ' + esc(info.g) + ' / <a href="#/' + info.p + '">' + esc(info.t) + '</a>' : '') + '<span id="crumbx"></span></div>';
    var box = document.createElement('div'); view.appendChild(box); box.innerHTML = crumbs;
    var body = document.createElement('div'); box.appendChild(body); A.crumb = function (t) { $('#crumbx').innerHTML = ' / ' + esc(t); };
    try { var r = key ? A.views[key](body, args) : (body.innerHTML = '<h1 class="title">Not found</h1><p>That screen does not exist.</p>'); if (r && r.then) r.catch(function (e) { body.innerHTML += '<div class="msg err">' + esc(A.explain(e)) + '</div>'; }); }
    catch (e) { body.innerHTML = '<div class="msg err">' + esc(A.explain(e)) + '</div>'; console.error(e); }
    window.scrollTo(0, 0); setTimeout(A.applyFocus, 60);
  };
  A.head = function (title, note) { return '<h1 class="title">' + esc(title) + '</h1>' + (note ? '<div class="note">' + note + '</div>' : ''); };
  A.focusField = function (sel) { S.focus = sel; };
  A.applyFocus = function () {
    if (!S.focus) return; var el = $(S.focus); S.focus = null; if (!el) return;
    var d = el.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('hl'); setTimeout(function () { el.classList.remove('hl'); }, 2600);
  };

  /* ---------- global search ---------- */
  A.initSearch = function () {
    var inp = $('#gs'), box = $('#gr'), items = [], idx = -1, idxBuilt = null;
    var build = function () {
      if (idxBuilt) return idxBuilt; var out = [];
      A.NAV.forEach(function (g) { g.items.forEach(function (i) { out.push({ grp: 'Menu', t: i[1], s: g.g, go: i[0], k: (i[1] + ' ' + g.g).toLowerCase() }); }); });
      Object.keys(A.settingsDefs).forEach(function (sec) { (A.settingsDefs[sec].fields || []).forEach(function (f) { out.push({ grp: 'Settings', t: f.label, s: A.settingsDefs[sec].title, go: A.settingsDefs[sec].route, focus: '[data-sk="' + (A.settingsDefs[sec].group + '.' + f.k) + '"]', k: (f.label + ' ' + A.settingsDefs[sec].title + ' ' + (f.help || '')).toLowerCase() }); }); });
      ((S.defaults && S.defaults.pages) || []).forEach(function (p) { if (p.name) out.push({ grp: 'Pages', t: p.name, s: p.file, go: 'content/page/' + p.file, k: (p.name + ' ' + p.file + ' ' + p.title).toLowerCase() }); });
      A.catalog().forEach(function (p) { out.push({ grp: 'Products', t: p.name, s: p.sku + ' · ' + A.money(p.price), go: 'shop/product/' + p.id, k: (p.name + ' ' + p.sku + ' ' + p.group).toLowerCase() }); });
      ((S.defaults && S.defaults.fields) || []).forEach(function (f) { var txt = f.kind === 'html' ? plain(f.value) : f.value; out.push({ grp: f.kind === 'link' ? 'Links' : f.kind === 'image' ? 'Images' : 'Page text', t: (txt || f.label).slice(0, 90), s: f.page + ' · ' + f.section, go: f.shared ? (f.key.indexOf('shared.pdp') === 0 || f.key.indexOf('shared.why') === 0 ? 'shop/shared-text' : 'content/shared/' + (f.key.indexOf('shared.header') === 0 || f.key.indexOf('shared.topbar') === 0 ? 'header' : f.key.indexOf('shared.footer') === 0 ? 'footer' : 'other')) : 'content/page/' + f.pages[0], focus: '[data-fk="' + f.key + '"]', k: (txt + ' ' + f.label + ' ' + f.page).toLowerCase() }); });
      (S.coupons || []).forEach(function (c) { out.push({ grp: 'Promo codes', t: c.code, s: c.type, go: 'shop/coupons', k: c.code.toLowerCase() }); });
      return (idxBuilt = out);
    };
    A.resetSearch = function () { idxBuilt = null; };
    var run = function () {
      var q = inp.value.trim().toLowerCase(); if (q.length < 2) { box.style.display = 'none'; return; }
      var words = q.split(/\s+/); var hits = build().filter(function (x) { return words.every(function (w) { return x.k.indexOf(w) > -1; }); }); var by = {}; hits.forEach(function (h) { (by[h.grp] = by[h.grp] || []).push(h); });
      items = []; var html = ''; ['Menu', 'Settings', 'Pages', 'Products', 'Promo codes', 'Page text', 'Links', 'Images'].forEach(function (g) { if (!by[g]) return; html += '<h6>' + g + '</h6>'; by[g].slice(0, 6).forEach(function (h) { items.push(h); html += '<a class="it" data-i="' + (items.length - 1) + '"><b>' + esc(h.t) + '</b><small>' + esc(h.s) + '</small></a>'; }); });
      box.innerHTML = html || '<div class="it muted">Nothing found</div>'; box.style.display = 'block'; idx = -1;
    };
    var pick = function (h) { box.style.display = 'none'; inp.value = ''; inp.blur(); if (h.focus) A.focusField(h.focus); var target = '#/' + h.go; if (location.hash === target) A.route(); else location.hash = target; };
    inp.oninput = run; inp.onfocus = run;
    inp.onkeydown = function (e) { var els = $$('.it[data-i]', box); if (e.key === 'ArrowDown') { idx = Math.min(els.length - 1, idx + 1); } else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); } else if (e.key === 'Enter') { if (items[Math.max(0, idx)]) pick(items[Math.max(0, idx)]); return; } else if (e.key === 'Escape') { box.style.display = 'none'; inp.blur(); return; } else return; e.preventDefault(); els.forEach(function (x, i) { x.classList.toggle('on', i === idx); }); if (els[idx]) els[idx].scrollIntoView({ block: 'nearest' }); };
    box.onmousedown = function (e) { var a = e.target.closest('[data-i]'); if (a) { e.preventDefault(); pick(items[+a.getAttribute('data-i')]); } };
    document.addEventListener('click', function (e) { if (!e.target.closest('.gsearch')) box.style.display = 'none'; });
    document.addEventListener('keydown', function (e) { if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); inp.focus(); } });
  };
})();
