const fs=require('fs'),path=require('path');
const OUT=process.argv[2];
const cat=JSON.parse(fs.readFileSync(path.join(OUT,'data/catalog.json'),'utf8'));
const P=cat.products;
const BRAND='Evolve Peptides', EMAIL='support@evolvepeptides.com', YEAR=2026;
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const money=n=>'$'+Number(n).toFixed(2);
const write=(f,s)=>{fs.mkdirSync(path.dirname(path.join(OUT,f)),{recursive:true});fs.writeFileSync(path.join(OUT,f),s);};
const FA=(vb,d,cls='')=>`<svg aria-hidden="true" viewBox="${vb}" class="${cls}"><path d="${d}"/></svg>`;
const I={
 truck:FA('0 0 640 512','M624 352h-16V243.9c0-12.7-5.1-24.9-14.1-33.9L494 110.1c-9-9-21.2-14.1-33.9-14.1H416V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48v320c0 26.5 21.5 48 48 48h16c0 53 43 96 96 96s96-43 96-96h128c0 53 43 96 96 96s96-43 96-96h48c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zM160 464c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm320 0c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm80-208H416V144h44.1l99.9 99.9V256z'),
 commentAlt:FA('0 0 512 512','M448 0H64C28.7 0 0 28.7 0 64v288c0 35.3 28.7 64 64 64h96v84c0 7.1 5.8 12 12 12 2.4 0 4.9-.7 7.1-2.4L304 416h144c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64zm16 352c0 8.8-7.2 16-16 16H288l-12.8 9.6L208 428v-60H64c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16h384c8.8 0 16 7.2 16 16v288z'),
 checkCircle:FA('0 0 512 512','M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z'),
 eye:FA('0 0 576 512','M288 144a110.94 110.94 0 0 0-31.24 5 55.4 55.4 0 0 1 7.24 27 56 56 0 0 1-56 56 55.4 55.4 0 0 1-27-7.24A111.71 111.71 0 1 0 288 144zm284.52 97.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400c-98.65 0-189.09-55-237.93-144C98.91 167 189.34 112 288 112s189.09 55 237.93 144C477.1 345 386.66 400 288 400z'),
 dollar:FA('0 0 288 512','M209.2 233.4l-108-31.6C88.7 198.2 80 186.5 80 173.5c0-16.3 13.2-29.5 29.5-29.5h66.3c12.2 0 24.2 3.7 34.2 10.5 6.1 4.1 14.3 3.1 19.5-2l34.8-34c7.1-6.9 6.1-18.4-1.8-24.5C238 74.8 207.4 64.1 176 64V16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v48h-2.5C45.8 64-5.4 118.7.5 183.6c4.2 46.1 39.4 83.6 83.8 96.6l102.5 30c12.5 3.7 21.2 15.3 21.2 28.3 0 16.3-13.2 29.5-29.5 29.5h-66.3C100 368 88 364.3 78 357.5c-6.1-4.1-14.3-3.1-19.5 2l-34.8 34c-7.1 6.9-6.1 18.4 1.8 24.5 24.5 19.2 55.1 29.9 86.5 30v48c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-48.2c46.6-.9 90.3-28.6 105.7-72.7 21.5-61.6-14.6-124.8-72.5-141.7z'),
 flag:FA('0 0 512 512','M32 0C14.3 0 0 14.3 0 32v464c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V32C64 14.3 49.7 0 32 0zm64 64v256c64-28 128-20 192 4s128 28 192-4V76c-64 28-128 24-192 0S160 36 96 64z'),
 envelope:FA('0 0 512 512','M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm0 48v40.805c-22.422 18.259-58.168 46.651-134.587 106.49-16.841 13.247-50.201 45.072-73.413 44.701-23.208.375-56.579-31.459-73.413-44.701C106.18 199.465 70.425 171.067 48 152.805V112h416zM48 400V214.398c22.914 18.251 55.409 43.862 104.938 82.646 21.857 17.205 60.134 55.186 103.062 54.955 42.717.231 80.509-37.199 103.053-54.947 49.528-38.783 82.032-64.401 104.947-82.653V400H48z'),
 pin:FA('0 0 384 512','M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z'),
 fb:`<svg viewBox="0 0 24 24"><path d="M17.152 7.77131H13.354V5.2804C13.354 4.34494 13.974 4.12685 14.4107 4.12685C14.8464 4.12685 17.0909 4.12685 17.0909 4.12685V0.0144069L13.3997 0C9.30217 0 8.3697 3.06719 8.3697 5.03001V7.77131H6V12.0089H8.3697C8.3697 17.4473 8.3697 24 8.3697 24H13.354C13.354 24 13.354 17.3827 13.354 12.0089H16.7173L17.152 7.77131Z"/></svg>`,
 ig:`<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 4 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7C8.3 24 8.7 24 12 24s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z"/></svg>`,
 search:`<svg viewBox="0 0 24 24"><circle stroke="currentColor" stroke-width="2.2" fill="none" cx="11" cy="11" r="10"/><path d="M20.0152578,17.8888876 L23.5507917,21.4244215 C24.1365782,22.010208 24.1365782,22.9599554 23.5507917,23.5457419 C22.9650053,24.1315283 22.0152578,24.1315283 21.4294714,23.5457419 L17.8939375,20.010208 C17.3081511,19.4244215 17.3081511,18.4746741 17.8939375,17.8888876 C18.4797239,17.3031012 19.4294714,17.3031012 20.0152578,17.8888876 Z" fill="currentColor" stroke="none"/></svg>`,
 user:`<svg viewBox="0 0 24 24"><path d="M8.68220488,13 L5.8,13 C4.7,11.6 4,9.9 4,8 C4,3.6 7.6,0 12,0 C16.4,0 20,3.6 20,8 C20,9.9 19.3,11.6 18.2,13 L15.3177951,13 C16.9344907,11.9250785 18,10.0869708 18,8 C18,4.6862915 15.3137085,2 12,2 C8.6862915,2 6,4.6862915 6,8 C6,10.0869708 7.06550934,11.9250785 8.68220488,13 Z"/><path d="M18,14 L6,14 C2.7,14 0,16.7 0,20 L0,23 C0,23.6 0.4,24 1,24 L23,24 C23.6,24 24,23.6 24,23 L24,20 C24,16.7 21.3,14 18,14 Z M22,22 L2,22 L2,20 C2,17.8 3.8,16 6,16 L18,16 C20.2,16 22,17.8 22,20 L22,22 Z"/></svg>`,
 bag:`<svg viewBox="0 0 24 24"><path d="M21,3h-4.4C15.8,1.2,14,0,12,0S8.2,1.2,7.4,3H3C2.4,3,2,3.4,2,4v19c0,0.6,0.4,1,1,1h18c0.6,0,1-0.4,1-1V4 C22,3.4,21.6,3,21,3z M12,1c1.5,0,2.8,0.8,3.4,2H8.6C9.2,1.8,10.5,1,12,1z M20,22H4v-4h16V22z M20,17H4V5h3v4h1V5h8v4h1V5h3V17z"/></svg>`,
 heart:`<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z"/></svg>`,
 info:FA('0 0 512 512','M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z'),
 warn:FA('0 0 576 512','M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.951 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z')
};
const ST={ // line icons used by the site's own sections
 flask:'<path d="M10 2v6.5L4.5 18a2.4 2.4 0 0 0 2.1 3.5h10.8a2.4 2.4 0 0 0 2.1-3.5L14 8.5V2"/><path d="M8 2h8"/><path d="M7 15h10"/>',
 shield:'<path d="M12 3l7 3v5c0 4.4-3 8.4-7 9.5C8 19.4 5 15.4 5 11V6l7-3z"/><path d="M9 11.5l2 2 4-4.5"/>',
 truck:'<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18.5" r="1.8"/><circle cx="17" cy="18.5" r="1.8"/>',
 flag:'<path d="M4 21V4"/><path d="M4 5h14l-3 3.5L18 12H4"/>',
 chat:'<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1.1L3 21l1.6-5.3A8.5 8.5 0 1 1 21 12z"/><path d="M8.5 10.5h7"/><path d="M8.5 13.5h4.5"/>',
 doc:'<path d="M6 2h9l4 4v16H6z"/><path d="M15 2v4h4"/><path d="M9 12h7"/><path d="M9 16h7"/><path d="M9 8h3"/>',
 bars:'<path d="M4 19h16"/><path d="M6 19V9"/><path d="M10 19V5"/><path d="M14 19v-8"/><path d="M18 19V7"/>',
 dots:'<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.4"/><circle cx="14.5" cy="14.5" r="1.8"/><circle cx="14" cy="8" r="1"/>',
 sun:'<path d="M12 3v4"/><path d="M5.6 5.6l2.8 2.8"/><path d="M18.4 5.6l-2.8 2.8"/><path d="M3 12h4"/><path d="M17 12h4"/><circle cx="12" cy="15" r="4.5"/>',
 pb:'<rect x="4" y="4" width="16" height="16" rx="2.5"/><text x="12" y="15.5" text-anchor="middle" font-size="8.5" stroke="none" fill="currentColor" font-family="inherit" font-weight="600">Pb</text>'
};
const ic=k=>`<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ST[k]}</svg></div>`;
const NAV=[['Home','index.html'],['Shop','shop.html'],['Affiliates','affiliates.html'],['Wholesale','wholesale.html'],['Contact','contact.html'],['Why Us?','why-choose-us.html']];
const LOGO='images/site/Evolve-Peptides-Logo-Final-1.png';

function statsAndNews(r){return `
<section class="stats"><div class="in">
  <div class="item"><span class="num">86%</span><span class="lab">of orders</span><p>Reached our customers within 24-48 hours of them placing them (Mondays – Fridays).</p></div>
  <div class="item"><span class="num">91%</span><span class="lab">of our customers</span><p>When asked, said that they prefer our level of service over other brands they’ve researched. We surveyed over 800 out of our 6000+ customers.</p></div>
  <div class="item"><span class="num">79%</span><span class="lab">of our customers</span><p>Have made at least one repeat purchase – a testiment to our quality and excellent service.</p></div>
</div></section>
<section class="news"><div class="in">
  <div class="a"><h4>Sign up for <u>10% off</u> your first order!</h4><p class="sub">Get exclusive loyalty offers, news, restocks, and new peptide launches.</p></div>
  <div class="b"><form id="news-form"><input type="email" placeholder="Your email address" required><button type="submit">Join</button></form><small id="news-msg">We care about your online privacy. Read our <a href="${r}privacy.html">Privacy Policy</a>.</small></div>
</div></section>`;}

function layout({title,desc,body,root='',current='',bodyClass=''}){
 const r=root;
 const nav=NAV.map(([l,h])=>`<li${current===h?' class="current-menu-item"':''}><a href="${r}${h}">${l}</a></li>`).join('');
 return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc||'US-lyophilized research peptides, independently tested by third-party laboratories.')}">
<link rel="icon" href="${r}images/site/Evolve-Peptides-Site-Icon-512-300x300.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${r}style.css">
</head>
<body class="${bodyClass}" data-root="${r}">

<div class="age-gate" id="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
  <div class="age-gate__box">
    <div class="site-logo"><img src="${r}${LOGO}" alt="Evolve Peptides"></div>
    <h2 id="age-gate-title">Researcher verification</h2>
    <p class="age-gate__sub">Access is restricted to qualified researchers and laboratories for in vitro and laboratory use. Please confirm before continuing.</p>
    <label class="age-gate__label" for="age-type">What type of researcher are you?</label>
    <select id="age-type"><option value="">Select your researcher type…</option><option>Independent / private laboratory researcher</option><option>Academic / university researcher</option><option>Biotech or pharmaceutical professional</option><option>Contract research organization (CRO)</option></select>
    <label class="age-gate__check"><input type="checkbox" class="age-chk"> <span>I am at least 21 years of age.</span></label>
    <label class="age-gate__check"><input type="checkbox" class="age-chk"> <span>I confirm I am a qualified researcher purchasing for in vitro / laboratory research only, not for human or veterinary use.</span></label>
    <label class="age-gate__check"><input type="checkbox" class="age-chk"> <span>I have read and accept the <a href="${r}terms.html"><u>Terms of Sale</u></a> and <a href="${r}privacy.html"><u>Privacy Policy</u></a>.</span></label>
    <button class="btn-gate primary" id="age-yes" type="button" disabled>Enter site</button>
    <a class="btn-gate" href="https://www.google.com">Leave (I do not qualify)</a><p class="age-gate__ver">Please select your researcher type and confirm every box to continue.</p><p class="age-gate__ver">Attestation v1.2 · Verified by Attestly</p>
  </div>
</div>

<div class="topbar"><div class="in">
  <span class="t-left"><b>BUY 2, GET 1 FREE</b> | 3rd peptide free</span>
  <span class="t-mid">${I.truck} Free same-day shipping on orders over $200!</span>
  <a class="t-right" href="mailto:${EMAIL}">${I.commentAlt} ${EMAIL}</a>
</div></div>

<header class="site-header"><div class="in">
  <a class="site-logo" href="${r}index.html"><img src="${r}${LOGO}" alt="Evolve Peptides" width="200"></a>
  <nav class="main-nav" id="main-nav" aria-label="Primary"><ul>${nav}</ul></nav>
  <div class="header-icons">
    <a href="#" aria-label="Search" id="search-open">${I.search}</a>
    <a href="${r}account.html" aria-label="Account">${I.user}</a>
    <a href="${r}cart.html" aria-label="Cart" id="cart-link">${I.bag}<span class="cart-count" id="cart-count">0</span></a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  </div>
</div></header>

<div class="search-overlay" id="search-overlay" hidden>
  <form class="search-box" action="${r}shop.html" method="get"><input type="search" name="q" id="search-input" placeholder="type to search.." autocomplete="off"></form>
</div>

<main>
${body}
</main>

<footer>
${statsAndNews(r)}
<div class="site-footer">
  <div class="footer-top">
    <div class="footer-brand">
      <a class="site-logo" href="${r}index.html"><img src="${r}${LOGO}" alt="Evolve Peptides"></a>
      <p>Precision-grade peptides, proudly lyophilized in the USA. We combine rigorous analytical testing with streamlined domestic logistics to provide researchers with uncompromising quality and industry-leading delivery speeds.</p>
      <ul class="footer-contact"><li>${I.envelope}<a href="mailto:${EMAIL}">${EMAIL}</a></li><li>${I.pin}<span>5830 E 2nd St, Casper, WY 82609</span></li></ul>
      <div class="socials"><a href="#" aria-label="Facebook">${I.fb}</a><a href="#" aria-label="Instagram">${I.ig}</a></div>
    </div>
    <div class="footer-cols">
      <div class="row">
        <div><h4>Shop Peptides</h4><ul>
          <li><a href="${r}shop.html?q=glp-3">GLP-3 RT</a></li><li><a href="${r}shop.html?q=glp-2">GLP-2 TZ</a></li><li><a href="${r}shop.html?q=bpc-157">BPC-157</a></li><li><a href="${r}shop.html?q=glow">GLOW</a></li><li><a href="${r}shop.html?q=reconstitution">Reconstitution Solution</a></li></ul></div>
        <div><h4>Support</h4><ul>
          <li><a href="${r}privacy.html">Privacy Policy</a></li><li><a href="${r}shipping-policy.html">Shipping Policy</a></li><li><a href="${r}returns.html">Returns &amp; Refunds</a></li><li><a href="${r}terms.html">Terms &amp; Conditions</a></li><li><a href="${r}waiver.html">Waiver Agreement</a></li></ul></div>
        <div><h4>About Us</h4><ul>
          <li><a href="${r}our-guarantee.html">Our Guarantee</a></li><li><a href="${r}about.html">About Us</a></li><li><a href="${r}contact.html">Contact</a></li><li><a href="${r}faq.html">FAQs</a></li><li><a href="${r}coa-lookup.html">COA Lookup</a></li></ul></div>
      </div>
      <p class="copy">&copy; Evolve Peptides ${YEAR}. All rights reserved.</p>
    </div>
  </div>
  <div class="footer-legal">
    <p>Evolve Peptides is a chemical supplier. Evolve Peptides is not a compounding pharmacy or chemical compounding facility as defined under 503A of the Federal Food, Drug, and Cosmetic act. Evolve Peptides is not an outsourcing facility as defined under 503B of the Federal Food, Drug, and Cosmetic act.</p>
    <p>Evolve Peptides provides products strictly for research purposes only. Our products are not intended for human consumption, medical, or therapeutic applications. None of our products should be mistaken for or substituted as prescription drugs. We are not a licensed pharmacy and do not dispense any prescription medications.</p>
    <p>The US Food and Drug Administration has not evaluated the claims made on this website, and neither our statements nor products are designed to diagnose, treat, cure, or prevent any medical conditions or diseases.</p>
  </div>
</div>
</footer>

<script src="${r}products.js"></script>
<script src="${r}catalog.js"></script>
<script src="${r}main.js"></script>
</body>
</html>
`;}
/* ---------- LIVE CONTENT (verbatim from evolvepeptides.com, saved in data/) ---------- */
const LD=JSON.parse(fs.readFileSync(path.join(OUT,'data/evolve-descriptions.json'),'utf8'));
const LTAB={};LD.tab.forEach(t=>LTAB[t.id]=t.s);
const LP=JSON.parse(fs.readFileSync(path.join(OUT,'data/evolve-pages.json'),'utf8'));
const LCOA=JSON.parse(fs.readFileSync(path.join(OUT,'data/evolve-coa.json'),'utf8'));
const LCOAD=JSON.parse(fs.readFileSync(path.join(OUT,'data/evolve-coa-data.json'),'utf8'));
const cfDecode=hex=>{const k=parseInt(hex.slice(0,2),16);let o='';for(let i=2;i<hex.length;i+=2)o+=String.fromCharCode(parseInt(hex.slice(i,i+2),16)^k);return o;};
const PAGEMAP={'':'index.html','shop':'shop.html','contact':'contact.html','why-choose-us':'why-choose-us.html','about':'about.html','our-guarantee':'our-guarantee.html','shipping-policy':'shipping-policy.html','returns-refunds':'returns.html','privacy-policy':'privacy.html','terms-conditions':'terms.html','waiver-agreement':'waiver.html','wholesale-peptides':'wholesale.html','coa-lookup':'coa-lookup.html','test-results':'test-results.html','frequently-asked-questions':'faq.html','peptide-affiliate-program':'affiliates.html','my-account':'account.html','cart':'cart.html'};
const mapHref=(h,r)=>{
  let m=h.match(/^https?:\/\/(?:www\.)?evolvepeptides\.com(\/[^#?]*)?([?#].*)?$/i);
  if(!m) return h;
  let p=(m[1]||'/').replace(/^\/|\/$/g,'');
  if(p.startsWith('product-category/')) return r+'shop.html?cat='+p.split('/')[1];
  if(p.startsWith('product/')) return r+'product/'+p.split('/')[1]+'.html';
  if(p in PAGEMAP) return r+PAGEMAP[p];
  return h;
};
const clean=(html,r='')=>String(html||'')
  .replace(/<a href=(["'])\/cdn-cgi\/l\/email-protection#([0-9a-f]+)\1>[^<]*(?:<span>[^<]*<\/span>)?<\/a>/g,(_,q,hex)=>{const e=cfDecode(hex);return `<a href="mailto:${e}">${e}</a>`})
  .replace(/<a href=(["'])([^"']*)\1/g,(m0,q,h)=>`<a href="${mapHref(h,r)}"`)
  .replace(/\s*\n\s*/g,' ');

/* ---------- HOME ---------- */
const home=`
<section class="hero"><div class="in">
  <div class="l">
    <h1><mark>US-Lyophilized</mark> Research Peptides, Verified 5x by American Third-Party Laboratories</h1>
    <p>Science-driven formulations, lyophilized under strict conditions in the USA. Always third-party tested for purity, quantity, sterility, endotoxins, and heavy metals.</p>
    <ul class="hero-list">
      <li>${I.flag} Lyophilized in the USA under strict conditions</li>
      <li>${I.checkCircle} Independently verified by various third-party labs</li>
      <li>${I.truck} Rapid and discreet same-day shipping (before 1 PM EST)</li>
    </ul>
    <div class="hero-btns"><a class="btn btn-primary" href="shop.html?cat=peptides">Shop Peptides</a><a class="btn btn-outline" href="coa-lookup.html">COA Lookup</a></div>
  </div>
  <div class="r"><img src="images/site/hero-image-2-1024x768.png" alt="Peptide vials" width="1024" height="768"></div>
</div></section>

<section class="tiles"><div class="in">
  <div class="tile">${I.checkCircle}<h3>Potency &amp; Purity Guaranteed</h3><p>Our peptides are lyophilized right here in the US, to exact specifications. Strictly no compromises.</p></div>
  <div class="tile">${I.eye}<h3>Verified by Independent Labs</h3><p>Verified by Chromate, Janoshik, and MZ Biolabs. Use our COA Lookup tool to verify your batch.</p></div>
  <div class="tile">${I.commentAlt.replace('commentAlt','')}<h3>Dedicated End-to-End Support</h3><p>We're here for you every step of the way. Our goal is your research success.</p></div>
  <div class="tile">${I.dollar}<h3>100% Satisfaction Guaranteed</h3><p>Not happy with your order? We'll make it right.</p></div>
</div></section>

<section class="best"><h2>Best Sellers</h2>
  <div class="product-grid" id="product-grid"></div>
  <div class="load-more-wrap"><a class="btn btn-outline" href="shop.html" id="load-more">LOAD MORE</a></div>
</section>

<section class="evo-std"><div class="in">
  <h2>The standard behind every vial</h2>
  <p class="sub">The numbers we hold ourselves to, on every order.</p>
  <div class="grid">
    <div class="card">${ic('flask')}<h3>Rigorous Third-Party Testing</h3><p>Purity, sterility, endotoxins, and heavy metals. Four independent tests on every batch.</p><div class="st"><b>&gt;99%</b><span>purity, verified on every batch</span></div></div>
    <div class="card">${ic('shield')}<h3>200% Money-Back Guarantee</h3><p>Test our product. If purity doesn't match the label, we refund 200%. No questions asked.</p><div class="st"><b>200%</b><span>refunded if the label is wrong</span></div></div>
    <div class="card">${ic('truck')}<h3>Rapid Same-Day Shipping</h3><p>Orders before 1 PM EST ship the same day, tracked, from right here in the USA.</p><div class="st"><b>Same day</b><span>for orders placed before 1 PM EST, Mon to Fri</span></div></div>
    <div class="card">${ic('flag')}<h3>Lyophilized in the USA</h3><p>Made under strict conditions by GMP and ISO 9001:2015 manufacturers. No compromises.</p><div class="st"><b>100%</b><span>US made, US shipped</span></div></div>
    <div class="card">${ic('chat')}<h3>We Respond in Minutes, Not Days</h3><p>Real humans who know the catalog, here for your total research success.</p><div class="st"><b>91%</b><span>of 800+ surveyed prefer our support over other suppliers</span></div></div>
    <div class="card">${ic('doc')}<h3>COA on Every Batch</h3><p>A lot-matched Certificate of Analysis for every product, retrievable by batch number.</p><div class="st"><b>24/7</b><span>self-serve COA lookup</span></div></div>
  </div>
</div></section>

<section class="evo-gnt"><div class="in">
  <h2>Every batch faces four independent tests<br>before it is ever offered for sale</h2>
  <p class="sub">Most suppliers ship on a purity number alone. Every Evolve batch is third-party tested four separate ways, and if any test fails, that batch never ships.</p>
  <div class="grid">
    <div class="card">${ic('bars')}<h3>Purity (HPLC)</h3><p>Liquid chromatography confirms over 99% purity and quantifies exactly what the label claims. Measured, never assumed.</p></div>
    <div class="card">${ic('dots')}<h3>Sterility</h3><p>A clean purity reading is not proof of sterility. Every batch is screened separately for living microbial contamination.</p></div>
    <div class="card">${ic('sun')}<h3>Endotoxins (LAL)</h3><p>Bacterial endotoxins are heat-stable and invisible to purity testing. LAL screening catches what a chromatogram cannot see.</p></div>
    <div class="card">${ic('pb')}<h3>Heavy Metals</h3><p>Lead, arsenic, mercury, and cadmium can ride along from raw materials. We screen every batch, not on request.</p></div>
  </div>
  <div class="coa"><div class="tx"><h3>Read the report yourself</h3><p>Every batch ships with a Certificate of Analysis. Enter the batch number from your vial and pull the lab report in seconds.</p></div><a class="btn" href="coa-lookup.html">Look up your COA</a></div>
  <p class="ft">Third-party verified. Every batch, no exceptions. For research use only.</p>
</div></section>`;
write('index.html',layout({title:BRAND+' | Research Peptides',body:home,current:'index.html'}));

/* ---------- SHOP ---------- */
const filterIcon='<svg viewBox="0 0 24 24"><path d="M3 6h18M6 12h12M10 18h4"/></svg>';
const shop=`
<div class="shop">
  <nav class="breadcrumb"><a href="index.html">Home</a><span>·</span><span id="crumb-cur">Peptides</span></nav>
  <h1 id="shop-title">Peptides</h1>
  <p class="desc" id="shop-desc">Our Peptide collection features a diverse range of research peptides, each with specific applications in research.</p>
  <div class="sep"></div>
  <div class="subchips" id="subchips" hidden></div>
  <div class="loop-header">
    <span class="count" id="shop-count"></span>
    <div class="inline"><span class="lbl">SHOW</span><span id="pp-list"><button data-pp="40" class="on">40</button><button data-pp="80">80</button><button data-pp="160">160</button></span></div>
    <div class="inline"><span class="lbl">VIEW</span><span><button data-cols="2">2</button><button data-cols="3">3</button><button data-cols="4" class="on">4</button></span></div>
    <label class="sort"><select id="shop-sort"><option value="pop">Sort by popularity</option><option value="new">Sort by latest</option><option value="asc">Sort by price: low to high</option><option value="desc">Sort by price: high to low</option></select></label>
    <button class="filter-btn" id="filter-toggle" type="button">${filterIcon} FILTER</button>
  </div>
  <div class="shop-filters" id="shop-filters" hidden>
    <div class="f-reset"><a href="shop.html">RESET FILTERS</a></div>
    <div><h4>Categories</h4><div id="f-cat"></div></div>
    <div><h4>Price</h4><div id="f-price"></div></div>
  </div>
  <div class="product-grid shop-grid" id="shop-grid"></div>
  <div class="pager" id="pager"></div>
</div>`;
write('shop.html',layout({title:'Shop Peptides | '+BRAND,body:shop,current:'shop.html'}));

/* ---------- PRODUCT PAGES ---------- */
const catName={peptides:'Peptides',capsules:'Capsules','research-accessories':'Research Accessories'};
function chemRows(c){ if(!c) return ''; const m=[['Contents',c.contents],['Notes',c.notes],['Chemical Formula',c.chemical_formula],['PubChem CID',c.pubchem],['CAS Number',c.cas],['Molecular Weight',c.molecular_weight],['Storage',c.storage],['Purity',c.purity]];
 return '<table class="spec">'+m.filter(x=>x[1]).map(([k,v])=>`<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')+'</table>';}
const groupMap={}; cat.groups.forEach(g=>groupMap[g.name]=g);
const numv=s=>parseFloat(String(s).replace(/[^0-9.]/g,''))||0;
P.forEach(p=>{
 const g=groupMap[p.group]; const sizes=(g&&g.sizes||[]).slice(); sizes.sort((a,b)=>numv(a.size)-numv(b.size));
 const sizeHtml=sizes.length>1?`<div class="sizes">${sizes.map(s=>{const sp=P.find(x=>x.id===s.id);return `<a class="size-pill${s.id===p.id?' on':''}${s.in_stock?'':' out'}" href="${sp.slug}.html">${esc(s.size)}</a>`}).join('')}</div>`:'';
 const cc=p.site_categories.includes('capsules')?'capsules':p.site_categories.includes('research-accessories')?'research-accessories':'peptides';
 const imgs=p.images&&p.images.length?p.images:[p.image];
 const price=p.on_sale?`<del>${money(p.regular_price)}</del><ins>${money(p.price)}</ins>`:`<ins>${money(p.price)}</ins>`;
 const LX=LD.P[p.slug]||{};const dHtml=LX.desc?clean(LTAB[LX.desc],'../'):'';const cHtml=LX.chem?clean(LTAB[LX.chem],'../'):'';const sHtml=LX.ship?clean(LTAB[LX.ship],'../'):'';const lotHtml=LX.lot?clean(LTAB[LX.lot],'../'):'';
 const body=`
<div class="pdp-wrap">
  <div class="pdp">
    <div class="pdp-gallery">
      <div class="pdp-main"><img id="pdp-main-img" src="../${imgs[0]}" alt="${esc(p.name)}"></div>
      ${imgs.length>1?`<div class="pdp-thumbs">${imgs.map((s,i)=>`<button type="button" class="${i?'':'on'}" data-src="../${s}"><img src="../${s}" alt="${esc(p.name)} image ${i+1}" loading="lazy"></button>`).join('')}</div>`:''}
    </div>
    <div class="pdp-info">
      <div class="crumbs"><a href="../index.html">Home</a><span class="sep">&rsaquo;</span><a href="../shop.html?cat=${cc}">${catName[cc]}</a></div>
      <h1>${esc(p.name)}</h1>
      <div class="pdp-price${p.on_sale?'':' plain'}">${price}</div>
      ${sizeHtml}
      <div class="stock ${p.in_stock?'in':'out'}">${p.in_stock?'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg> In stock':'Out of stock'}</div>
      <div class="notice"><b>${I.info} Need Larger Quantities?</b><p>Contact us at <a href="mailto:wholesale@evolvepeptides.com">wholesale@evolvepeptides.com</a> for even greater savings on bulk orders!</p></div>
      ${lotHtml?`<div class="checks">${lotHtml}</div>`:''}
      ${p.in_stock?`<div class="buy"><div class="qty"><button type="button" data-q="-1">&minus;</button><input id="qty" type="number" min="1" value="1"><button type="button" data-q="1">+</button></div><button class="add-btn" id="add-btn" data-id="${p.id}" type="button">Add to cart</button><a class="wishlist-link" href="#">${I.heart.replace('<svg','<svg').replace('class="','class="')} Add to wishlist</a></div>`
       :`<form class="waitlist card-form"><span class="xwh-heading">Join Waitlist</span><span class="xwh-sub">Enter your email address to be notified when this item is back in stock.</span><input type="email" placeholder="Your email address" required><button class="add-btn" type="submit">Join Waitlist</button></form>`}
      <div class="warn"><i>${I.warn}</i><p>Product is provided as a lyophilized powder in a sterile glass vial. All researchers are assumed to acquire all necessary supplies to conduct their research, such as <a href="../shop.html?q=reconstitution">reconstitution solution</a> and alcohol pads to maintain sterility.</p></div>
      <p class="ships">Ships same-day if ordered before 12 PM EST. Estimated delivery: <b>2 - 5 days</b></p>
      <div class="sku">SKU: ${esc(p.sku)}</div>
      <div class="accordion">
        <details open><summary>Description</summary><div class="acc-body">${dHtml?`<div class="desc-toggle" data-collapsed="1">${dHtml}</div><button type="button" class="read-more">Read more</button>`:''}</div></details>
        ${cHtml?`<details><summary>Chemical Information</summary><div class="acc-body">${cHtml}</div></details>`:''}
        ${sHtml?`<details><summary>Shipping Information</summary><div class="acc-body">${sHtml}</div></details>`:''}
      </div>
    </div>
  </div>
  <h2 class="why-title"><span style="font-weight:300">Why</span> <b>Choose Us?</b></h2>
  <div class="why-band"><div class="in">
    <div>${I.flag}<b>Lyophilized in Texas – 99%+ Purity Guaranteed</b><p>Our peptides are proudly lyophilized right here in the US, to exact specifications. Strictly no compromises.</p></div>
    <div>${I.eye.replace('<svg','<svg')}<b>Rigorously Third-Party Tested, Always</b><p>Every product page includes independent lab test results for every peptide we sell.</p></div>
    <div>${I.commentAlt}<b>We Respond in Minutes, Not Days</b><p>We take pride in providing excellent support – we're here for your total research success.</p></div>
    <div>${I.dollar}<b>200% Money-Back Guarantee</b><p>Test our product – if purity doesn't match the label, we refund 200%. No questions asked.</p></div>
  </div></div>
  <section class="related"><h2>Related products</h2><div class="product-grid" id="related-grid" data-pid="${p.id}"></div></section>
</div>`;
 write('product/'+p.slug+'.html',layout({title:(LD.P[p.slug]||{}).title||p.name,body,root:'../',current:'shop.html'}));
});
/* ---------- CART ---------- */
write('cart.html',layout({title:'Cart - Evolve Peptides',body:`<div class="cart-page"><h1>Cart</h1><div id="cart-root"></div></div>`,current:'cart.html'}));

/* ---------- MY ACCOUNT ---------- */
write('account.html',layout({title:LP['my-account'].title,body:`<div class="compact"><h1>My Account</h1>
<p>Please sign up or log in before checking out.</p>
<div class="acct-cols">
<form class="acct-form" onsubmit="return false"><h2>Login</h2>
<p><label>Username or email address&nbsp;<span class="req">*</span></label><input type="text" name="username" autocomplete="username"></p>
<p><label>Password&nbsp;<span class="req">*</span></label><input type="password" name="password" autocomplete="current-password"></p>
<p><label class="chk"><input type="checkbox" name="rememberme"> Remember me</label></p>
<p><button type="submit" class="btn btn-primary">Log in</button></p>
<p><a href="#">Lost your password?</a></p></form>
<form class="acct-form" onsubmit="return false"><h2>Register</h2>
<p><label>Email address&nbsp;<span class="req">*</span></label><input type="email" name="email" autocomplete="email"></p>
<p>A link to set a new password will be sent to your email address.</p>
<p>Your personal data will be used to support your experience throughout this website, to manage access to your account, and for other purposes described in our <a href="privacy.html">privacy policy</a>.</p>
<p><button type="submit" class="btn btn-primary">Register</button></p></form>
</div></div>`,current:'account.html'}));

/* ---------- COMPACT TEXT PAGES (verbatim live content) ---------- */
const compact=(file,key,h1)=>write(file,layout({title:LP[key].title,body:`<div class="compact"><h1>${h1}</h1>${clean(LP[key].html)}</div>`,current:file}));
compact('about.html','about','About us');
compact('our-guarantee.html','our-guarantee','Our Guarantee');
compact('shipping-policy.html','shipping-policy','Shipping Policy');
compact('returns.html','returns-refunds','Returns &amp; Refunds');
compact('privacy.html','privacy-policy','Privacy Policy');
compact('terms.html','terms-conditions','Terms &amp; Conditions');
compact('waiver.html','waiver-agreement','Waiver Agreement');

/* ---------- WHY CHOOSE US ---------- */
{
  const S=LP['why-choose-us'].html.split('<section>').slice(1).map(x=>x.split('</section>')[0]);
  const lb=S[0].match(/<h3>(.*?)<\/h3><h3>([\s\S]*?)<\/h3>/);
  const ps=[...S[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m=>m[1]);
  const h2=S[1].match(/<h2>([\s\S]*?)<\/h2>/)[1];
  const lb2=S[2].match(/<h3>(.*?)<\/h3><h3>([\s\S]*?)<\/h3>/);
  const body=`<section class="wcu-top"><h3 class="wcu-label">${lb[1]}</h3><h3 class="wcu-lead">${clean(lb[2])}</h3></section>
<section class="wcu-photos"><div class="wcu-img1"><img src="images/site/research-lab-frozen-specimens-1024x683.jpg" alt=""></div><div class="wcu-box">${ps.map(p=>`<p>${p}</p>`).join('')}</div><div class="wcu-img2"><img src="images/site/scientist-at-work.jpg" alt="scientist-at-work-researching"></div><h2 class="wcu-big">${h2}</h2></section>
<section class="wcu-top"><h3 class="wcu-label">${lb2[1]}</h3><h3 class="wcu-lead">${clean(lb2[2])}</h3></section>
<section class="wcu-text">${clean(S[3])}</section>`;
  write('why-choose-us.html',layout({title:LP['why-choose-us'].title,body:`<div class="wcu">${body}</div>`,current:'why-choose-us.html'}));
}

/* ---------- CONTACT ---------- */
{
  const html=clean(LP['contact'].html).replace(/^[\s\S]*?<section>/,'').replace(/<\/section>[\s\S]*$/,'');
  const h2=html.match(/<h2>([\s\S]*?)<\/h2>/)[1];
  const cols=[...html.matchAll(/<h3>([\s\S]*?)<\/h3>((?:<p>[\s\S]*?<\/p>)+?)(?=<h3>|$)/g)].map(m=>`<div class="contact-col"><h3>${m[1]}</h3>${m[2]}</div>`).join('');
  write('contact.html',layout({title:LP['contact'].title,body:`<section class="contact"><h2>${h2}</h2><div class="contact-cols">${cols}</div></section>`,current:'contact.html'}));
}

/* ---------- FAQ ---------- */
{
  const H=clean(LP['frequently-asked-questions'].html);
  const head=H.match(/<h2><b>([\s\S]*?)<\/b><\/h2>/)[1];
  const intro=H.match(/<\/h2>(<p>[\s\S]*?<\/p>)<h5>/)[1];
  const items=H.split('<h5>').slice(1).map((seg,i)=>{const m=seg.match(/^<a href=["']["']>([\s\S]*?)<\/a><\/h5>([\s\S]*)$/);return m?`<details class="faq"${i===0?' open':''}><summary>${m[1]}</summary><div class="acc-body">${m[2]}</div></details>`:''}).join('');
  write('faq.html',layout({title:LP['frequently-asked-questions'].title,body:`<section class="faq-page"><div class="faq-intro"><h2>${head}</h2>${intro}</div><div class="faq-list">${items}</div></section>`,current:'faq.html'}));
}

/* ---------- WHOLESALE ---------- */
{
  let W=clean(LP['wholesale-peptides'].html).replace(/<img src='https:\/\/[^']*\/(your-Label-1024x1024\.jpg)' alt=''>/g,'<img src="images/site/$1" alt="">');
  W=W.replace(/(<h1>[\s\S]*?<\/p>)(<img [^>]*>)(<h2>)/,'<div class="ws-hero"><div>$1</div>$2</div>$3');
  write('wholesale.html',layout({title:LP['wholesale-peptides'].title,body:`<div class="long-page wholesale"><h1 class="pg-title">${LP['wholesale-peptides'].title}</h1>${W}</div>`,current:'wholesale.html'}));
}

/* ---------- AFFILIATES (live widget with its own styles) ---------- */
{
  const LA=JSON.parse(fs.readFileSync(path.join(OUT,'data/evolve-affiliates.json'),'utf8'));
  write('affiliates.html',layout({title:LP['peptide-affiliate-program'].title,body:`<style>${LA.styles.join('\n')}</style>${clean(LA.html)}`,current:'affiliates.html'}));
}

/* ---------- TEST RESULTS ---------- */
{
  const H=clean(LP['test-results'].html).replace(/<img src='https:\/\/[^']*\/([^'\/]+)' alt=''>/g,(m,f)=>`<img src="images/site/${f}" alt="">`);
  const cards=[...H.matchAll(/<h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><figure>([\s\S]*?)<\/figure>/g)].map(m=>`<div class="tr-card"><h3>${m[1]}</h3><p>${m[2]}</p><figure>${m[3]}</figure></div>`).join('');
  const foot=H.match(/<\/figure>(<p>[^]*?<\/p>)\s*$/);
  write('test-results.html',layout({title:LP['test-results'].title,body:`<div class="compact wide"><h1>Test Results</h1><div class="tr-grid">${cards}</div>${foot?foot[1]:''}</div>`,current:'test-results.html'}));
}

/* ---------- COA LOOKUP (widget copied from live page) ---------- */
{
  const inner=LCOA.inner;
  const style=(inner.match(/<style[\s\S]*?<\/style>/)||[''])[0];
  const wrap=inner.match(/<div class="evo-coa">[\s\S]*?<\/div><\/div>(?=\s*<script)/)||inner.match(/<div class="evo-coa">[\s\S]*<\/div><\/div>/);
  const haveCoa=new Set(fs.existsSync(path.join(OUT,'images/coa'))?fs.readdirSync(path.join(OUT,'images/coa')):[]);
  const data=JSON.parse(JSON.stringify(LCOAD));
  data.batches.forEach(b=>{['coaImageUrl','endotoxinImageUrl'].forEach(k=>{if(b[k]){const f=decodeURIComponent(b[k].split('/').pop());b[k]='images/coa/'+f}});(b.products||[]).forEach(p=>{if(p.url)p.url=mapHref(p.url,'')})});
  let script=LCOA.script.replace(/var ENDPOINT = "[^"]*";/,'var ENDPOINT = "";').replace(/var SAMPLE = \{[\s\S]*?\]\};/,'var SAMPLE = '+JSON.stringify(data)+';');
  write('coa-lookup.html',layout({title:LP['coa-lookup'].title,body:`${style}${wrap?wrap[0]:''}<script>${script}</script>`,current:'coa-lookup.html'}));
}

write('404.html',layout({title:'Page not found - Evolve Peptides',body:`<div class="compact center"><h1>404</h1><p>It looks like nothing was found at this location. Try another link or click the button below.</p><p><a class="btn btn-primary" href="javascript:history.back()">GO BACK</a> <a class="btn btn-primary" href="index.html">HOME</a></p></div>`}));
console.log('pages written');
