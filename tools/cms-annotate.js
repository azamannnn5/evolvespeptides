// Tags every editable text, link, image and alt in the site with data-cms keys and writes cms/defaults.json.
// Re-runnable: it first removes its own earlier output. Markup is otherwise left byte-identical.
// Usage: node tools/cms-annotate.js <site-folder>
const fs = require('fs'), path = require('path');
let cheerio;
try { cheerio = require('cheerio'); } catch (e) { cheerio = require(process.env.CHEERIO_PATH || 'cheerio'); }
const OUT = path.resolve(process.argv[2] || '.');
const INLINE = new Set(['a','b','strong','em','i','u','mark','br','span','small','sup','sub','del','ins','code','s','abbr']);
const SKIP_TAGS = new Set(['script','style','svg','select','option','textarea','noscript','template','head','title','meta','link','input']);
const SKIP_SEL = '#product-grid,#shop-grid,#related-grid,#cart-root,#pager,#f-cat,#f-price,#shop-title,#shop-desc,#crumb-cur,#shop-count,.crumbs,.sizes,.pdp-gallery,.pdp-price,.stock,.sku,.buy,.cms-skip,#cart-count';
const CMS_ATTRS = ['data-cms','data-cms-tn','data-cms-href','data-cms-src','data-cms-alt','data-cms-ph','data-cms-kind','data-pcms'];

function walkFiles(dir, base = '') {
  let r = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','admin','cms','tools','images','data','sql','supabase'].includes(f.name) && !base) { if (f.name !== 'product') continue; }
    const rel = base ? base + '/' + f.name : f.name;
    if (f.isDirectory()) { if (f.name === 'product') r = r.concat(walkFiles(path.join(dir, f.name), 'product')); }
    else if (f.name.endsWith('.html')) r.push(rel);
  }
  return r;
}
function stripPrior(html) {
  html = html.replace(/<script src="(\.\.\/)?cms\/cms-(config|loader|data)\.js"><\/script>\n?/g, '');
  html = html.replace(/ data-(cms|cms-tn|cms-href|cms-src|cms-alt|cms-ph|cms-kind|pcms)="[^"]*"/g, '');
  return html;
}
const PAGE_NAMES = { index:'Home', shop:'Shop', cart:'Cart', account:'Account', contact:'Contact', faq:'FAQ', about:'About', affiliates:'Affiliates', wholesale:'Wholesale', 'coa-lookup':'COA lookup', 'test-results':'Test results', 'why-choose-us':'Why choose us', 'our-guarantee':'Our guarantee', privacy:'Privacy policy', returns:'Returns and refunds', 'shipping-policy':'Shipping policy', terms:'Terms and conditions', waiver:'Waiver agreement', '404':'Page not found (404)' };
const GROUPS = { index:'Main pages', shop:'Main pages', about:'Main pages', contact:'Main pages', faq:'Main pages', 'why-choose-us':'Main pages', 'our-guarantee':'Main pages', wholesale:'Main pages', affiliates:'Main pages', 'coa-lookup':'Main pages', 'test-results':'Main pages', privacy:'Policies and legal', returns:'Policies and legal', 'shipping-policy':'Policies and legal', terms:'Policies and legal', waiver:'Policies and legal', cart:'Account and cart pages', account:'Account and cart pages', '404':'Other' };

const defaults = [], seen = new Map(), pagesInfo = [];
function normPath(v, depth) { // make a stored path root-relative
  if (!v || /^(https?:|mailto:|tel:|#|\/|data:|javascript:)/i.test(v)) return v;
  let s = v; for (let i = 0; i < depth && s.startsWith('../'); i++) s = s.slice(3); return s;
}
function normHtml(h, depth) { return depth ? h.replace(/(href|src)="\.\.\//g, '$1="') : h; }
const decode = raw => cheerio.load('<p>' + raw + '</p>')('p').text();
function squash(s) { return s.replace(/\s+/g, ' ').trim(); }

let tplBuy = null, tplWait = null, tplIn = null, tplOut = null;

for (const rel of walkFiles(OUT)) {
  const file = path.join(OUT, rel);
  let html = stripPrior(fs.readFileSync(file, 'utf8'));
  const depth = rel.includes('/') ? 1 : 0, root = depth ? '../' : '';
  const isPdp = rel.startsWith('product/');
  const pageKey = isPdp ? 'product' : rel.replace(/\.html$/, '');
  const pageName = isPdp ? 'Product pages (shared parts)' : (PAGE_NAMES[pageKey] || pageKey);
  const $ = cheerio.load(html, { _useHtmlParser2: true, withStartIndices: true, withEndIndices: true, decodeEntities: false });
  const ins = []; // {pos, text}
  const add = (el, attrs) => ins.push({ pos: el.startIndex + 1 + el.name.length, text: attrs });
  const esc = s => s.replace(/"/g, '&quot;');

  const title = squash($('title').first().text()); const md = $('meta[name="description"]').attr('content') || '';
  pagesInfo.push({ file: rel, title, description: md, name: isPdp ? null : pageName, group: isPdp ? 'Product pages' : (GROUPS[pageKey] || 'Other') });

  const main = $('main').first();
  const counters = {};
  const keyFor = (region, kind, section, val) => {
    if (region) { // shared parts: key by content so pages with a slightly different structure still share the field
      const h = require('crypto').createHash('md5').update(kind + '|' + String(val)).digest('hex').slice(0, 6);
      const ck = `shared.${region}.${kind}.${h}`; counters[ck] = (counters[ck] || 0) + 1; return counters[ck] > 1 ? `${ck}-${counters[ck]}` : ck;
    }
    const base = `${pageKey}.${section}`; const ck = base + '|' + kind; counters[ck] = (counters[ck] || 0) + 1; return `${base}.${kind}${counters[ck]}`;
  };
  function regionOf($el) {
    if ($el.closest('.age-gate').length) return 'agegate';
    if ($el.closest('.topbar').length) return 'topbar';
    if ($el.closest('header').length) return 'header';
    if ($el.closest('.search-overlay').length) return 'search';
    if ($el.closest('footer .stats').length) return 'stats';
    if ($el.closest('footer .news').length) return 'news';
    if ($el.closest('footer').length) return 'footer';
    if (isPdp) {
      if ($el.closest('.why-title,.why-band').length) return 'why';
      if ($el.closest('.pdp').length || $el.closest('.related').length) return 'pdp';
    }
    return null;
  }
  function sectionOf(el) { // top-level child of main -> label
    let cur = el; while (cur.parent && cur.parent !== main[0]) cur = cur.parent;
    if (!cur.parent) return { idx: 0, label: 'Page' };
    const kids = main.children().toArray(); const idx = kids.indexOf(cur) + 1;
    const h = $(cur).is('h1,h2,h3') ? $(cur) : $(cur).find('h1,h2,h3').first();
    const lbl = h.length ? squash(h.text()).slice(0, 48) : (cur.attribs && cur.attribs.class ? cur.attribs.class.split(' ')[0] : cur.name);
    return { idx, label: `Section ${idx}: ${lbl}` };
  }
  const skipNodes = new Set(); if (isPdp) $('.accordion details').each((i, d) => { if (/^(Description|Chemical Information)$/i.test(squash($(d).find('summary').first().text()))) skipNodes.add($(d).find('.acc-body')[0]); });
  const inSkip = el => { for (let n = el; n; n = n.parent) if (skipNodes.has(n)) return true; return false; };
  const skipped = el => inSkip(el) || $(el).is(SKIP_SEL) || $(el).closest(SKIP_SEL).length > 0 || SKIP_TAGS.has(el.name);
  const labelOf = (el, txt) => `${el.name === 'a' ? 'Link' : /^h\d$/.test(el.name) ? 'Heading' : el.name === 'li' ? 'List item' : el.name === 'button' ? 'Button' : 'Text'}: ${squash(txt).slice(0, 60)}`;

  function record(key, kind, el, value, label, region, sec) {
    if (seen.has(key)) { const d = seen.get(key); if (!d.pages.includes(rel)) d.pages.push(rel); return; }
    const d = { key, kind, page: region ? (region === 'why' || region === 'pdp' ? 'Product pages (shared parts)' : 'Header, footer and shared parts') : pageName, group: region ? 'Shared' : (isPdp ? 'Product pages' : (GROUPS[pageKey] || 'Other')), section: region ? { agegate:'Researcher gate', topbar:'Top bar', header:'Header and menu', search:'Search overlay', stats:'Stats band', news:'Newsletter band', footer:'Footer', why:'Why choose us band', pdp:'Product page shared text' }[region] : sec.label, label, value, shared: !!region, pages: [rel] };
    seen.set(key, d); defaults.push(d);
  }
  function hasOnlyInline(el) {
    let ok = true; (function w(n) { for (const c of n.children || []) { if (c.type === 'tag') { if (!INLINE.has(c.name)) ok = false; else w(c); } } })(el); return ok;
  }
  function directText(el) { return (el.children || []).filter(c => c.type === 'text' && c.data.trim()); }
  function visit(el) {
    if (el.type !== 'tag' || skipped(el)) return;
    const $el = $(el), region = regionOf($el), sec = region ? null : sectionOf(el);
    const text = squash(decode($el.text()));
    // images
    if (el.name === 'img') {
      const s = el.attribs.src; if (s != null) { const k = keyFor(region, 'i', sec && sec.idx, normPath(s, depth)); record(k, 'image', el, normPath(s, depth), 'Image: ' + (el.attribs.alt || normPath(s, depth).split('/').pop()), region, sec); add(el, ` data-cms-src="${k}"`); }
      if (el.attribs.alt) { const k = keyFor(region, 'a', sec && sec.idx, el.attribs.alt); record(k, 'alt', el, decode(el.attribs.alt), 'Image description: ' + el.attribs.alt.slice(0, 50), region, sec); add(el, ` data-cms-alt="${k}"`); }
      return;
    }
    // placeholder on inputs handled elsewhere
    const kidsT = (el.children || []).filter(c => c.type === 'tag'); const wrapA = INLINE.has(el.name) === false && kidsT.length === 1 && kidsT[0].name === 'a' && !directText(el).length;
    const isField = !wrapA && text && !['html','body','main','header','footer','section','article','nav','ul','ol','form','table','tbody','thead','tr','div'].includes(el.name) ? hasOnlyInline(el) : (el.name === 'div' && text && hasOnlyInline(el) && directText(el).length);
    if (isField && !(el.name === 'a' && false)) {
      const hasKids = (el.children || []).some(c => c.type === 'tag');
      const kind = hasKids ? 'html' : 'text';
      const val = kind === 'html' ? normHtml($el.html(), depth) : decode($el.html());
      const k = keyFor(region, kind === 'html' ? 'h' : 't', sec && sec.idx, val);
      record(k, kind, el, val, labelOf(el, text), region, sec); add(el, ` data-cms="${k}" data-cms-kind="${kind}"`);
      if (el.name === 'a' && el.attribs.href != null) { const lk = keyFor(region, 'l', sec && sec.idx, normPath(el.attribs.href, depth) + '|' + text); record(lk, 'link', el, normPath(el.attribs.href, depth), 'Link address: ' + text.slice(0, 50), region, sec); add(el, ` data-cms-href="${lk}"`); }
      return;
    }
    if (el.name === 'a' && el.attribs.href != null) { const lk = keyFor(region, 'l', sec && sec.idx, normPath(el.attribs.href, depth) + '|' + text); record(lk, 'link', el, normPath(el.attribs.href, depth), 'Link address: ' + (text.slice(0, 50) || el.attribs['aria-label'] || 'icon link'), region, sec); add(el, ` data-cms-href="${lk}"`); }
    // mixed: direct text next to svg or blocks -> text-node fields
    const dts = directText(el);
    if (dts.length && !['html','body','main','div','section','ul','ol','table','tbody','tr','form'].includes(el.name) || (dts.length && el.name === 'div')) {
      const parts = [];
      dts.forEach(t => { const idx = el.children.indexOf(t); const k = keyFor(region, 'n', sec && sec.idx, decode(t.data.trim())); record(k, 'tn', el, decode(t.data.trim()), 'Text: ' + squash(decode(t.data)).slice(0, 60), region, sec); parts.push(`${k}:${idx}`); });
      add(el, ` data-cms-tn="${parts.join(',')}"`);
    }
    if (el.name === 'button' && false) return;
    for (const c of el.children || []) visit(c);
  }
  // input placeholders
  $('input[placeholder]').each((_, el) => { if (skipped(el)) return; const $el = $(el), region = regionOf($el), sec = region ? null : sectionOf(el); const k = keyFor(region, 'p', sec && sec.idx, el.attribs.placeholder); record(k, 'placeholder', el, el.attribs.placeholder, 'Field hint: ' + el.attribs.placeholder.slice(0, 50), region, sec); add(el, ` data-cms-ph="${k}"`); });
  // walk body
  visit($('body')[0]);

  // product-specific hooks
  if (isPdp) {
    const g = (sel, attr) => { const e = $(sel).first(); if (e.length) add(e[0], ` data-pcms="${attr}"`); };
    g('.pdp-info h1', 'name'); g('.pdp-price', 'price'); g('.stock', 'stock'); g('.sku', 'sku'); g('#pdp-main-img', 'image'); g('.buy', 'buy');
    const det = $('.accordion details'); if (det.length) { add($(det[0]).find('.acc-body')[0], ` data-pcms="desc"`); }
    det.each((i, d) => { if (/Chemical Information/i.test($(d).find('summary').first().text())) add($(d).find('.acc-body')[0], ` data-pcms="chem"`); });
    if (!tplBuy && $('.buy').length) tplBuy = $.html($('.buy').first());
    if (!tplWait && $('.waitlist').length) tplWait = $.html($('.waitlist').first());
    if (!tplIn && $('.stock.in').length) tplIn = $.html($('.stock.in').first());
    if (!tplOut && $('.stock.out').length) tplOut = $.html($('.stock.out').first());
  }
  // apply insertions from the end
  ins.sort((a, b) => b.pos - a.pos);
  // multiple attrs on one element share the same pos; keep stable order
  let out = html; for (const i of ins) out = out.slice(0, i.pos) + i.text + out.slice(i.pos);
  // script tags
  out = out.replace('</head>', `<script src="${root}cms/cms-config.js"></script>\n<script src="${root}cms/cms-loader.js"></script>\n</head>`);
  out = out.replace(/(<script src="(\.\.\/)?catalog\.js"><\/script>\n?)/, `$1<script src="${root}cms/cms-data.js"></script>\n`);
  fs.writeFileSync(file, out);
}
// templates for stock toggling and defaults file
const strip = s => (s || '').replace(/ data-pcms="[^"]*"/g, '');
fs.writeFileSync(path.join(OUT, 'cms/cms-templates.json'), JSON.stringify({ buy: strip(tplBuy), waitlist: strip(tplWait), stockIn: strip(tplIn), stockOut: strip(tplOut) }));
fs.writeFileSync(path.join(OUT, 'cms/defaults.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), pages: pagesInfo, fields: defaults }, null, 1));
console.log('fields', defaults.length, 'shared', defaults.filter(d => d.shared).length, 'pages', pagesInfo.length);
const tpl = JSON.parse(fs.readFileSync(path.join(OUT, 'cms/cms-templates.json'), 'utf8'));
fs.writeFileSync(path.join(OUT, 'cms/cms-data.js'), '// Generated by tools/cms-annotate.js. Runs after catalog.js and before main.js.\nwindow.CMS_TPL=' + JSON.stringify(tpl) + ';\nif(window.CMS&&window.CMS.patchData)window.CMS.patchData();\n');
