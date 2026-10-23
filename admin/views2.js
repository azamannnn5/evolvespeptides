/* Admin screens, part 2: shop settings, promotions, customers, site, admin. */
(function () {
  'use strict';
  var A = window.ADMIN, $ = A.$, $$ = A.$$, esc = A.esc, S = A.S, V = A.views;

  // declarative settings screen
  function screen(route, group, title, note, fields, min) {
    A.settingsDefs[route] = { title: title, route: route, group: group, fields: fields };
    V[route] = function (el) {
      el.innerHTML = A.head(title, note) + A.lockNote(min || 'admin') + '<div id="sf"></div>';
      var box = $('#sf', el); fields.forEach(function (f) { box.appendChild(A.setField(group, f, { min: min || 'admin' })); });
    };
  }

  /* ---------- shop settings ---------- */
  screen('shop/shipping', 'shop', 'Shipping and cart fees', 'These numbers are used in the cart. Leave a box empty to keep the original. Changes go live when you press Save and publish.', [
    { k: 'free_over', label: 'Free standard shipping on orders over ($)', type: 'number', orig: 200 },
    { k: 'standard', label: 'Standard Shipping fee ($)', type: 'number', orig: 14.9 },
    { k: 'two_day', label: 'Two-Day Shipping fee ($)', type: 'number', orig: 25.9 },
    { k: 'overnight', label: 'Overnight Shipping fee ($)', type: 'number', orig: 52.9 }
  ]);
  V['shop/discounts'] = function (el) {
    var ro = !A.can('admin');
    el.innerHTML = A.head('Bulk or quantity discounts', 'Give a percent off when a customer buys many units of the same product. The product page and the cart use these steps. A single product can have its own steps, or none, on its product screen.') + A.lockNote('admin') + '<div class="card"><div id="ds"></div><div class="row" style="margin-top:10px"><button class="btn" id="da"' + (ro ? ' disabled' : '') + '>Add step</button></div></div><div class="msg info">No steps means no discount. This is how the site works now.</div>';
    var get = function () { return (A.getSet('shop').discount_steps || []).slice(); };
    var put = function (arr) { A.setSet('shop', function (o) { if (arr.length) o.discount_steps = arr; else delete o.discount_steps; }); };
    var draw = function () { var st = get(); $('#ds', el).innerHTML = st.map(function (s, i) { return '<div class="row" style="margin-bottom:8px"><input type="number" min="1" value="' + s.min + '" data-i="' + i + '" data-f="min" style="width:110px"' + (ro ? ' disabled' : '') + '> or more units: <input type="number" min="1" max="100" value="' + s.pct + '" data-i="' + i + '" data-f="pct" style="width:90px"' + (ro ? ' disabled' : '') + '> % off <button class="btn sm bad" data-rm="' + i + '"' + (ro ? ' disabled' : '') + '>Remove</button></div>'; }).join('') || '<p class="muted">No steps.</p>'; };
    draw();
    $('#ds', el).oninput = function (e) { var i = e.target.getAttribute('data-i'); if (i == null) return; var st = get(); st[+i][e.target.getAttribute('data-f')] = Number(e.target.value); put(st); };
    $('#ds', el).onclick = function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; var st = get(); st.splice(+b.getAttribute('data-rm'), 1); put(st); draw(); };
    $('#da', el).onclick = function () { var st = get(); st.push({ min: 5, pct: 5 }); put(st); draw(); };
  };

  /* ---------- promo codes (saved immediately) ---------- */
  V['shop/coupons'] = async function (el) {
    var ro = !A.can('admin');
    el.innerHTML = A.head('Promo codes', 'Codes are checked by the database when a customer enters one in the cart. <b>Codes save immediately</b> (they do not wait for the Save bar). The coupon box only appears in the cart while at least one code is active.') + A.lockNote('admin') + '<div class="card" id="cl">Loading...</div><div class="card"><h3>Add or change a code</h3><div id="cf"></div></div>';
    var rows = [];
    var load = async function () { var r = await S.sb.from('coupons').select('*').order('created_at', { ascending: false }); if (r.error) { $('#cl', el).innerHTML = '<div class="msg err">' + esc(A.explain(r.error)) + '</div>'; return; } rows = r.data; S.coupons = rows; A.resetSearch && A.resetSearch(); draw(); };
    var fmt = function (c) { return c.type === 'percent' ? c.amount + '% off' : c.type === 'fixed' ? A.money(c.amount) + ' off' : 'Free shipping'; };
    var draw = function () { $('#cl', el).innerHTML = rows.map(function (c) { return '<div class="list-item"><div class="grow"><b>' + esc(c.code) + '</b> <span class="tag ' + (c.active ? 'ok' : '') + '">' + (c.active ? 'active' : 'off') + '</span><div class="small muted">' + fmt(c) + (c.min_order > 0 ? ' · min order ' + A.money(c.min_order) : '') + (c.usage_limit ? ' · used ' + c.used_count + ' of ' + c.usage_limit : '') + (c.ends_at ? ' · ends ' + new Date(c.ends_at).toLocaleDateString() : '') + (c.note ? ' · ' + esc(c.note) : '') + '</div></div><button class="btn sm" data-e="' + c.id + '"' + (ro ? ' disabled' : '') + '>Edit</button><button class="btn sm bad" data-d="' + c.id + '"' + (ro ? ' disabled' : '') + '>Delete</button></div>'; }).join('') || '<p class="muted">No promo codes yet.</p>'; };
    var local = function (iso) { if (!iso) return ''; var d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
    var form = function (c) {
      c = c || { type: 'percent', amount: 10, min_order: 0, active: true };
      $('#cf', el).innerHTML = '<div class="grid"><div><label>Code</label><input type="text" id="c_code" value="' + esc(c.code || '') + '"></div><div><label>Type</label><select id="c_type"><option value="percent">Percent off</option><option value="fixed">Amount off ($)</option><option value="free_shipping">Free shipping</option></select></div><div><label>Amount (% or $)</label><input type="number" step="any" id="c_amount" value="' + (c.amount || 0) + '"></div><div><label>Minimum order ($)</label><input type="number" step="any" id="c_min" value="' + (c.min_order || 0) + '"></div><div><label>Starts</label><input type="datetime-local" id="c_start" value="' + local(c.starts_at) + '"></div><div><label>Ends</label><input type="datetime-local" id="c_end" value="' + local(c.ends_at) + '"></div><div><label>Usage limit (empty = unlimited)</label><input type="number" id="c_lim" value="' + (c.usage_limit || '') + '"></div><div><label>Note (only you see it)</label><input type="text" id="c_note" value="' + esc(c.note || '') + '"></div></div><label class="row" style="margin:10px 0"><input type="checkbox" id="c_act" style="width:auto"' + (c.active ? ' checked' : '') + '> Active</label><div class="row"><button class="btn pri" id="c_save"' + (ro ? ' disabled' : '') + '>Save code now</button><button class="btn" id="c_new">Clear form</button></div><div class="small muted" style="margin-top:8px">Usage counts are not updated automatically because the cart has no real checkout yet.</div>';
      $('#c_type', el).value = c.type;
      $('#c_new', el).onclick = function () { form(null); };
      $('#c_save', el).onclick = async function () { var code = $('#c_code', el).value.trim().toUpperCase(); if (!code) return A.toast('Enter a code', true); var rec = { code: code, type: $('#c_type', el).value, amount: Number($('#c_amount', el).value || 0), min_order: Number($('#c_min', el).value || 0), starts_at: $('#c_start', el).value ? new Date($('#c_start', el).value).toISOString() : null, ends_at: $('#c_end', el).value ? new Date($('#c_end', el).value).toISOString() : null, usage_limit: $('#c_lim', el).value ? Number($('#c_lim', el).value) : null, active: $('#c_act', el).checked, note: $('#c_note', el).value }; if (c.id) rec.id = c.id; var r = await S.sb.from('coupons').upsert(rec, { onConflict: c.id ? 'id' : 'code' }); if (r.error) return A.toast(A.explain(r.error), true); A.toast('Saved (live now)'); form(null); load(); };
    };
    form(null); await load();
    $('#cl', el).onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.getAttribute('data-e')) { form(rows.filter(function (x) { return x.id === b.getAttribute('data-e'); })[0]); window.scrollTo(0, document.body.scrollHeight); } else if (b.getAttribute('data-d')) A.confirm('Delete this promo code?', async function () { var r = await S.sb.from('coupons').delete().eq('id', b.getAttribute('data-d')); A.toast(r.error ? A.explain(r.error) : 'Deleted', !!r.error); load(); }); };
  };

  /* ---------- promotions ---------- */
  screen('promo/banner', 'banner', 'Top banner', 'A thin message bar at the very top of every page. Turn it on, write the text, pick colours. It goes live after you press Save and publish.', [
    { k: 'on', label: 'Show the banner', type: 'bool', yes: 'Banner is on', orig: false },
    { k: 'text', label: 'Banner text', type: 'text' },
    { k: 'link', label: 'Banner link (optional)', type: 'text', help: 'For example shop.html or https://...' },
    { k: 'bg', label: 'Background colour', type: 'color', orig: '#230f33' },
    { k: 'color', label: 'Text colour', type: 'color', orig: '#ffffff' }
  ]);
  screen('promo/popup', 'popup', 'Pop-up message', 'A message that opens on top of the page. Choose when it shows and how long before it shows again to the same visitor.', [
    { k: 'on', label: 'Show the pop-up', type: 'bool', yes: 'Pop-up is on', orig: false },
    { k: 'title', label: 'Title', type: 'text' },
    { k: 'text', label: 'Message', type: 'textarea' },
    { k: 'image', label: 'Picture (optional)', type: 'image' },
    { k: 'button_text', label: 'Button text', type: 'text' },
    { k: 'button_link', label: 'Button link', type: 'text' },
    { k: 'delay', label: 'Show after (seconds)', type: 'number', orig: 0 },
    { k: 'repeat_hours', label: 'Show again after (hours)', type: 'number', help: 'Empty or 0 means it shows only once per visitor.' },
    { k: 'pages', label: 'Which pages', type: 'text', help: 'Type all, or page file names separated by commas, for example index.html, shop.html', ph: 'all' }
  ]);

  /* ---------- customers ---------- */
  V['customers/inbox'] = async function (el) {
    var ro = !A.can('editor'), filter = 'all', rows = [];
    el.innerHTML = A.head('Messages inbox', 'Messages from the newsletter box and the waitlist forms arrive here. Change the status, reply by email or delete. <b>These save immediately.</b>') + A.lockNote('editor') + '<div class="row" style="margin-bottom:12px"><select id="mf" style="max-width:200px"><option value="all">All</option><option value="new">New</option><option value="read">Read</option><option value="done">Done</option><option value="spam">Spam</option></select><input type="search" id="mq" placeholder="Search" style="max-width:280px"></div><div class="card" id="ml">Loading...</div>';
    var load = async function () { var r = await S.sb.from('messages').select('*').order('created_at', { ascending: false }).limit(500); if (r.error) { $('#ml', el).innerHTML = '<div class="msg err">' + esc(A.explain(r.error)) + '</div>'; return; } rows = r.data; draw(); };
    var draw = function () {
      var f = $('#mf', el).value, q = $('#mq', el).value.toLowerCase();
      var list = rows.filter(function (m) { return (f === 'all' || m.status === f) && (!q || (m.name + ' ' + m.email + ' ' + m.subject + ' ' + m.body).toLowerCase().indexOf(q) > -1); });
      $('#ml', el).innerHTML = list.map(function (m) { var ex = m.extra && m.extra.product ? ' · ' + esc(m.extra.product) : ''; return '<div class="list-item" data-id="' + m.id + '"><div class="grow"><b>' + esc(m.name || m.email) + '</b> <span class="tag">' + esc(m.kind) + '</span> <span class="tag ' + (m.status === 'new' ? 'edited' : '') + '">' + m.status + '</span><div class="small muted">' + esc(m.email) + ex + ' · ' + new Date(m.created_at).toLocaleString() + '</div>' + (m.subject ? '<div><b>' + esc(m.subject) + '</b></div>' : '') + (m.body ? '<div class="small">' + esc(m.body.slice(0, 220)) + '</div>' : '') + '</div><div class="row">' + ['read', 'done', 'spam'].map(function (s) { return '<button class="btn sm" data-s="' + s + '"' + (ro ? ' disabled' : '') + '>' + s + '</button>'; }).join('') + '<a class="btn sm" href="mailto:' + esc(m.email) + '?subject=' + encodeURIComponent('Re: ' + (m.subject || '')) + '">Reply</a><button class="btn sm bad" data-del="1"' + (ro ? ' disabled' : '') + '>Delete</button></div></div>'; }).join('') || '<p class="muted">No messages.</p>';
    };
    $('#mf', el).onchange = draw; $('#mq', el).oninput = draw;
    $('#ml', el).onclick = async function (e) { var b = e.target.closest('button'); if (!b) return; var row = b.closest('[data-id]'), id = row.getAttribute('data-id');
      if (b.getAttribute('data-s')) { var r = await S.sb.from('messages').update({ status: b.getAttribute('data-s') }).eq('id', id); if (r.error) return A.toast(A.explain(r.error), true); load(); }
      else A.confirm('Delete this message for good?', async function () { var r = await S.sb.from('messages').delete().eq('id', id); if (r.error) return A.toast(A.explain(r.error), true); load(); }); };
    load();
  };
  screen('customers/forms', 'forms', 'Form and cart texts', 'Words shown after a visitor sends the newsletter or waitlist form, and the small texts of the cart coupon box. Leave empty to show nothing (or the plain default for the coupon messages).', [
    { k: 'success', label: 'Message after a form is sent', type: 'text', help: 'Shown under the newsletter and waitlist forms. Empty means nothing is shown.' },
    { k: 'error', label: 'Message when a form fails', type: 'text' },
    { k: 'coupon_button', label: 'Cart: apply coupon button', type: 'text', ph: 'Apply coupon' },
    { k: 'coupon_ok', label: 'Cart: coupon accepted message', type: 'text' },
    { k: 'coupon_bad', label: 'Cart: coupon not valid message', type: 'text', ph: 'This coupon is not valid.' },
    { k: 'discount_label', label: 'Cart: discount line name', type: 'text', ph: 'Discount' }
  ], 'editor');

  /* ---------- site ---------- */
  A.settingsDefs['site/seo'] = { title: 'Search and sharing', route: 'site/seo', group: 'site', fields: [
    { k: 'name', label: 'Site name' }, { k: 'description', label: 'Default description for search engines' }, { k: 'share_image', label: 'Sharing image' }, { k: 'favicon', label: 'Favicon (small browser icon)' }, { k: 'noindex', label: 'Hide the whole site from search engines (noindex)' }] };
  V['site/seo'] = function (el) {
    var ro = !A.can('admin');
    el.innerHTML = A.head('Search and sharing', 'Titles and descriptions that search engines and social networks show. <b>Honest note:</b> these are applied with JavaScript when a page loads, which Google reads, but simple crawlers and link previews may still see the original tags.') + A.lockNote('admin') + '<div id="sf"></div><h3 style="margin-top:24px">Per page title and description</h3><input type="search" id="pq" placeholder="Search pages" style="max-width:300px;margin-bottom:10px"><div id="pp"></div>';
    var box = $('#sf', el);
    [{ k: 'name', label: 'Site name', type: 'text', orig: S.defaults.pages[0] ? '' : '' }, { k: 'description', label: 'Default description for search engines', type: 'textarea', help: 'Used for pages that have no description of their own below.' }, { k: 'share_image', label: 'Sharing image', type: 'image', help: 'Shown when the site is shared on social networks.' }, { k: 'favicon', label: 'Favicon (small browser icon)', type: 'image' }, { k: 'noindex', label: 'Hide the whole site from search engines (noindex)', type: 'bool', yes: 'Hidden from search engines. Turn this on while testing.', orig: false }].forEach(function (f) { box.appendChild(A.setField('site', f, { min: 'admin' })); });
    var draw = function () {
      var q = $('#pq', el).value.toLowerCase(), cur = A.getSet('pages_seo');
      $('#pp', el).innerHTML = S.defaults.pages.filter(function (p) { return !q || (p.file + ' ' + p.title + ' ' + (p.name || '')).toLowerCase().indexOf(q) > -1; }).slice(0, q ? 200 : 30).map(function (p) { var o = cur[p.file] || {}; return '<div class="card" data-f="' + esc(p.file) + '"><b>' + esc(p.name || p.file) + '</b> <span class="small muted">' + esc(p.file) + '</span><label class="small muted" style="display:block;margin-top:8px">Title</label><input type="text" data-k="title" value="' + esc(o.title || '') + '" placeholder="' + esc(p.title) + '"' + (ro ? ' disabled' : '') + '><label class="small muted" style="display:block;margin-top:8px">Description</label><textarea data-k="description" style="min-height:60px" placeholder="' + esc(p.description) + '"' + (ro ? ' disabled' : '') + '>' + esc(o.description || '') + '</textarea><label class="row" style="margin-top:6px"><input type="checkbox" data-k="noindex" style="width:auto"' + (o.noindex ? ' checked' : '') + (ro ? ' disabled' : '') + '> Hide this page from search engines</label></div>'; }).join('') + (q ? '' : '<p class="muted small">Showing the first 30 pages. Use the search box to find others (including product pages).</p>');
    };
    draw(); $('#pq', el).oninput = draw;
    var chg = function (e) { var card = e.target.closest('[data-f]'), k = e.target.getAttribute('data-k'); if (!card || !k) return; var f = card.getAttribute('data-f'); A.setSet('pages_seo', function (o) { var rec = o[f] || {}; var v = e.target.type === 'checkbox' ? (e.target.checked || undefined) : e.target.value.trim(); if (v === '' || v === undefined) delete rec[k]; else rec[k] = v; if (Object.keys(rec).length) o[f] = rec; else delete o[f]; }); };
    $('#pp', el).addEventListener('input', chg); $('#pp', el).addEventListener('change', chg);
  };

  screen('site/look', 'look', 'Look and feel', 'Brand colours, the font and your own CSS. Colours use the site’s colour settings, so every page follows. Empty boxes keep the original.', [
    { k: 'vars.--purple', label: 'Main dark colour', type: 'color', orig: '#230f33' }
  ]);
  // custom handling for nested vars: rebuild the screen with proper stores
  V['site/look'] = function (el) {
    var VARS = [['--purple', 'Main dark colour (header, buttons)', '#230f33'], ['--purple-2', 'Second dark colour', '#3a2052'], ['--purple-3', 'Light accent colour', '#715588'], ['--text', 'Body text colour', '#535557'], ['--red', 'Sale and warning red', '#cf2929'], ['--green', 'In stock green', '#009245'], ['--line', 'Border and line colour', '#ececec']];
    A.settingsDefs['site/look'] = { title: 'Look and feel', route: 'site/look', group: 'look', fields: VARS.map(function (v) { return { k: 'vars.' + v[0], label: v[1] }; }).concat([{ k: 'font', label: 'Font (Google font name)' }, { k: 'css', label: 'Custom CSS' }]) };
    el.innerHTML = A.head('Look and feel', 'Brand colours, the font and your own CSS. Colours use the site’s colour settings, so every page follows. Empty boxes keep the original.') + A.lockNote('admin') + '<div id="sf"></div>';
    var box = $('#sf', el);
    var store = { get: function (k) { var vv = A.getSet('look').vars || {}; return vv[k.replace('vars.', '')]; }, put: function (k, v) { A.setSet('look', function (o) { o.vars = o.vars || {}; if (v === '' || v == null) delete o.vars[k.replace('vars.', '')]; else o.vars[k.replace('vars.', '')] = v; if (!Object.keys(o.vars).length) delete o.vars; }); }, del: function (k) { store.put(k, ''); } };
    VARS.forEach(function (v) { box.appendChild(A.setField('look', { k: 'vars.' + v[0], label: v[1], type: 'color', orig: v[2] }, { store: store, min: 'admin' })); });
    box.appendChild(A.setField('look', { k: 'font', label: 'Font (Google font name)', type: 'text', orig: 'Outfit', help: 'For example Inter or Poppins. It must be a font name from fonts.google.com.' }, { min: 'admin' }));
    box.appendChild(A.setField('look', { k: 'css', label: 'Custom CSS', type: 'code', help: 'Advanced. Added to every page. A mistake here can break the look, but Reset removes it.' }, { min: 'admin' }));
  };
  screen('site/tracking', 'tracking', 'Tracking and code', 'Analytics and your own code snippets. Only paste code you trust. Code runs on every public page after you press Save and publish.', [
    { k: 'ga_id', label: 'Google Analytics ID', type: 'text', ph: 'G-XXXXXXXXXX' },
    { k: 'pixel_id', label: 'Facebook pixel ID', type: 'text', ph: 'numbers only' },
    { k: 'head_html', label: 'Code for the head of every page', type: 'code', help: 'Advanced. For example a verification meta tag or another script.' },
    { k: 'body_html', label: 'Code at the end of every page', type: 'code', help: 'Advanced. For example a chat widget script.' }
  ]);
  V['site/redirects'] = function (el) {
    var ro = !A.can('admin');
    el.innerHTML = A.head('Redirects', 'Send visitors from one page to another. To hide a page, redirect it to the home page or the shop. Use page file names such as <code>about.html</code> or <code>product/glp-3-rt-5-mg.html</code>.') + A.lockNote('admin') + '<div class="card"><div id="rl"></div><div class="row" style="margin-top:10px"><button class="btn" id="ra"' + (ro ? ' disabled' : '') + '>Add redirect</button></div></div>';
    var get = function () { return (A.getSet('redirects').list || []).slice(); };
    var put = function (l) { A.setSet('redirects', function (o) { if (l.length) o.list = l; else delete o.list; }); };
    var draw = function () { $('#rl', el).innerHTML = get().map(function (r, i) { return '<div class="row" style="margin-bottom:8px"><input type="text" data-i="' + i + '" data-f="from" value="' + esc(r.from) + '" placeholder="From page" style="flex:1;min-width:180px"' + (ro ? ' disabled' : '') + '> to <input type="text" data-i="' + i + '" data-f="to" value="' + esc(r.to) + '" placeholder="To page or address" style="flex:1;min-width:180px"' + (ro ? ' disabled' : '') + '><button class="btn sm bad" data-rm="' + i + '"' + (ro ? ' disabled' : '') + '>Remove</button></div>'; }).join('') || '<p class="muted">No redirects.</p>'; };
    draw(); $('#rl', el).oninput = function (e) { var i = e.target.getAttribute('data-i'); if (i == null) return; var l = get(); l[+i][e.target.getAttribute('data-f')] = e.target.value.trim(); put(l); };
    $('#rl', el).onclick = function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; var l = get(); l.splice(+b.getAttribute('data-rm'), 1); put(l); draw(); };
    $('#ra', el).onclick = function () { var l = get(); l.push({ from: '', to: '' }); put(l); draw(); };
  };
  V['site/maintenance'] = function (el) {
    A.settingsDefs['site/maintenance'] = { title: 'Maintenance mode', route: 'site/maintenance', group: 'maintenance', fields: [{ k: 'on', label: 'Maintenance mode' }, { k: 'title', label: 'Maintenance title' }, { k: 'message', label: 'Maintenance message' }, { k: 'preview', label: 'Preview key' }] };
    el.innerHTML = A.head('Maintenance mode', 'Shows a message instead of the site. You can still look at the site by opening it once with your preview key. Turn it on, press Save and publish. <b>Honest note:</b> this is a light lock done in the browser, not a security wall.') + A.lockNote('admin') + '<div id="sf"></div>';
    var box = $('#sf', el);
    box.appendChild(A.setField('maintenance', { k: 'on', label: 'Maintenance mode', type: 'bool', yes: 'The site shows the maintenance message', orig: false }, { min: 'admin' }));
    box.appendChild(A.setField('maintenance', { k: 'title', label: 'Title', type: 'text' }, { min: 'admin' }));
    box.appendChild(A.setField('maintenance', { k: 'message', label: 'Message', type: 'textarea' }, { min: 'admin' }));
    var pk = document.createElement('div'); pk.className = 'field'; pk.setAttribute('data-sk', 'maintenance.preview');
    pk.innerHTML = '<div class="lab">' + A.kindChip('setting') + '<span>Preview key</span></div><input type="text" id="pkey" placeholder="Type a secret word" ' + (A.can('admin') ? '' : 'disabled') + '><div class="help">Open <b>the site address with ?preview=YOURKEY</b> at the end once on your device to look at the real site while maintenance is on. Only a scrambled version of the key is stored. ' + (A.getSet('maintenance').bypass_hash ? 'A key is set.' : 'No key is set yet.') + '</div>';
    box.appendChild(pk);
    $('#pkey', pk).oninput = async function () { var v = this.value.trim(); var h = ''; if (v) { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)); h = Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); } A.setSet('maintenance', function (o) { if (h) o.bypass_hash = h; else delete o.bypass_hash; }); };
  };

  /* ---------- admin ---------- */
  V['admin/history'] = async function (el) {
    el.innerHTML = A.head('Activity and undo', 'Every change with who made it and when. Press Restore to bring an older value back. It is staged first, so you can check it and then press Save and publish.') + '<div class="card" id="hl">Loading...</div>';
    var r = await S.sb.from('history').select('*').order('id', { ascending: false }).limit(200); if (r.error) { $('#hl', el).innerHTML = '<div class="msg err">' + esc(A.explain(r.error)) + '</div>'; return; }
    var short = function (v) { return v == null ? '(nothing)' : esc(JSON.stringify(v, null, 1).slice(0, 600)); };
    $('#hl', el).innerHTML = r.data.map(function (h) { var can = A.can('editor') && ['content_overrides', 'settings', 'product_overrides'].indexOf(h.table_name) > -1; return '<div class="list-item" style="align-items:flex-start"><div class="grow"><b>' + esc(h.action) + '</b> ' + esc(h.table_name) + ' <span class="muted">' + esc(h.record_key || '') + '</span><div class="small muted">' + esc(h.by_email || 'unknown') + ' · ' + new Date(h.at).toLocaleString() + '</div><details><summary class="small">Before and after</summary><div class="diff"><pre>' + short(h.old_value) + '</pre><pre>' + short(h.new_value) + '</pre></div></details></div>' + (can ? '<button class="btn sm" data-h="' + h.id + '">Restore the before</button>' : '') + '</div>'; }).join('') || '<p class="muted">No activity yet.</p>';
    $('#hl', el).onclick = function (e) { var b = e.target.closest('[data-h]'); if (!b) return; var h = r.data.filter(function (x) { return String(x.id) === b.getAttribute('data-h'); })[0], o = h.old_value;
      if (h.table_name === 'content_overrides') A.stageContent(h.record_key, o ? o.value : null);
      else if (h.table_name === 'settings') { S.staged.settings[h.record_key] = o ? o.data : {}; A.updateBar(); }
      else if (h.table_name === 'product_overrides') { S.staged.products[h.record_key] = o ? o.data : null; if (!o && !S.saved.products[h.record_key]) delete S.staged.products[h.record_key]; A.updateBar(); }
      A.toast('Restored as a staged change. Press Save and publish to make it live.'); };
  };
  V['admin/backup'] = function (el) {
    el.innerHTML = A.head('Backup and restore', 'Download everything you have changed as one file. Loading a backup brings its values in as staged changes, so nothing goes live until you press Save and publish.') + '<div class="card"><h3>Download</h3><button class="btn pri" id="bd">Download backup</button><p class="small muted">Includes text, link and image edits, settings, product edits and promo codes. Messages are not included.</p></div><div class="card"><h3>Load a backup</h3><input type="file" accept="application/json" id="bf"' + (A.can('editor') ? '' : ' disabled') + '><p class="small muted">Promo codes in a backup file are for safekeeping. Add them again by hand on the promo codes screen.</p></div>';
    $('#bd', el).onclick = async function () { var c = await S.sb.from('coupons').select('*'); var data = { app: 'site-admin', version: 1, saved_at: new Date().toISOString(), content: S.saved.content, settings: S.saved.settings, products: S.saved.products, coupons: c.data || [] }; var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })); a.download = 'site-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); };
    $('#bf', el).onchange = function (e) { var f = e.target.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { try { var d = JSON.parse(rd.result); if (d.app !== 'site-admin') throw new Error('This is not a backup from this admin.');
      var n = 0; var keys = {}; Object.keys(S.saved.content).concat(Object.keys(d.content || {})).forEach(function (k) { keys[k] = 1; }); Object.keys(keys).forEach(function (k) { if (k in (d.content || {})) S.staged.content[k] = d.content[k]; else S.staged.content[k] = null; n++; });
      Object.keys(d.settings || {}).forEach(function (g) { S.staged.settings[g] = d.settings[g]; n++; }); Object.keys(S.saved.settings).forEach(function (g) { if (!(g in (d.settings || {}))) { S.staged.settings[g] = {}; n++; } });
      Object.keys(d.products || {}).forEach(function (id) { S.staged.products[id] = d.products[id]; n++; }); Object.keys(S.saved.products).forEach(function (id) { if (!(id in (d.products || {}))) { S.staged.products[id] = null; n++; } });
      Object.keys(S.staged.content).forEach(function (k) { if (S.staged.content[k] === null && !(k in S.saved.content)) delete S.staged.content[k]; });
      A.updateBar(); A.toast('Backup loaded as staged changes. Review them, then press Save and publish.'); } catch (x) { A.toast(x.message || 'Could not read that file', true); } }; rd.readAsText(f); };
  };
  V['admin/team'] = async function (el) {
    var owner = A.can('owner');
    el.innerHTML = A.head('Team', 'Who can sign in to this admin. <b>Owner</b>: everything including the team. <b>Admin</b>: everything except the team. <b>Editor</b>: pages, products, images and inbox. <b>Viewer</b>: look only.') + (owner ? '' : '<div class="msg warn">Only the owner can change the team.</div>') + '<div class="card" id="tl">Loading...</div>' + (owner ? '<div class="card"><h3>Add a team member</h3><p class="small muted">First create their login in Supabase: Authentication, Users, Add user. Then type the same email here.</p><div class="row"><input type="email" id="te" placeholder="email@example.com" style="max-width:300px"><select id="tr" style="max-width:160px"><option>editor</option><option>admin</option><option>viewer</option><option>owner</option></select><button class="btn pri" id="ta">Add</button></div></div>' : '');
    var load = async function () { var r = await S.sb.from('admin_users').select('*').order('created_at'); if (r.error) { $('#tl', el).innerHTML = '<div class="msg err">' + esc(A.explain(r.error)) + '</div>'; return; } $('#tl', el).innerHTML = r.data.map(function (u) { return '<div class="list-item"><div class="grow"><b>' + esc(u.email) + '</b></div><select data-u="' + u.user_id + '"' + (owner && u.user_id !== S.user.id ? '' : ' disabled') + '>' + ['owner', 'admin', 'editor', 'viewer'].map(function (x) { return '<option' + (x === u.role ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' + (owner && u.user_id !== S.user.id ? '<button class="btn sm bad" data-rm="' + u.user_id + '">Remove</button>' : '') + '</div>'; }).join(''); };
    await load();
    $('#tl', el).onchange = async function (e) { var u = e.target.getAttribute('data-u'); if (!u) return; var r = await S.sb.from('admin_users').update({ role: e.target.value }).eq('user_id', u); A.toast(r.error ? A.explain(r.error) : 'Role changed (saved now)', !!r.error); };
    $('#tl', el).onclick = function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; A.confirm('Remove this person from the admin? Their login stays but they lose access.', async function () { var r = await S.sb.from('admin_users').delete().eq('user_id', b.getAttribute('data-rm')); A.toast(r.error ? A.explain(r.error) : 'Removed', !!r.error); load(); }); };
    if (owner) $('#ta', el).onclick = async function () { var r = await S.sb.rpc('add_team_member', { p_email: $('#te', el).value, p_role: $('#tr', el).value }); if (r.error) return A.toast(A.explain(r.error), true); A.toast('Added'); $('#te', el).value = ''; load(); };
  };
  V['admin/help'] = function (el) {
    el.innerHTML = A.head('Help and guide', 'The basics, in plain words.') +
      '<div class="card"><h3>How saving works</h3><p>When you change something, a dark bar appears at the bottom: "3 unsaved changes. Nothing is live until you press Save." Press <b>Save and publish</b> to make it live. Press <b>Discard</b> to throw the changes away. Promo codes, inbox actions, team changes and image uploads save at once and say so on screen.</p></div>' +
      '<div class="card"><h3>What the coloured labels mean</h3><p>' + A.kindChip('text') + ' words on the page. ' + A.kindChip('link') + ' where a link goes. ' + A.kindChip('image') + ' a picture. ' + A.kindChip('setting') + ' a switch or number. ' + A.kindChip('price') + ' a price or fee. ' + A.kindChip('code') + ' advanced code.</p></div>' +
      '<div class="card"><h3>Where things live</h3><p><b>Content</b>: the words, links and pictures of each page. The header, menu and footer are shared by every page, so one change updates all of them. <b>Shop</b>: products, prices, stock, discounts, shipping and promo codes. <b>Promotions</b>: the top banner and the pop-up. <b>Customers</b>: messages. <b>Site</b>: search and sharing, colours, tracking, redirects and maintenance mode. <b>Admin</b>: activity, backup and team.</p></div>' +
      '<div class="card"><h3>Good to know</h3><p>Grey "Original" text shows what the site had before you changed it. <b>Reset to original</b> brings it back. The site keeps working with its original content if the database is ever unreachable. Press / to search everything: menus, settings, pages, products, promo codes and the real text on the pages. Search results open the exact box and highlight it.</p><p>Roles: owners can do everything, admins everything except the team, editors change content, products, images and the inbox, viewers can only look.</p></div>' +
      '<div class="card"><h3>Limits</h3><p>Search engine titles and descriptions are applied by JavaScript. The cart has no real checkout, so promo code usage counts are not updated automatically. Visitors see changes within a moment: new visitors straight away, returning visitors on their next visit (the page refreshes itself once if prices or settings changed).</p></div>';
  };
})();
