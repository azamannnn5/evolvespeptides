(function () {
  var ROOT = document.body.getAttribute("data-root") || "";
  var CAT = (window.CATALOG || []).slice();
  var POP = window.POP || [];
  CAT.sort(function (a, b) { return POP.indexOf(a.id) - POP.indexOf(b.id); });
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function money(n) { return "$" + Number(n).toFixed(2); }
  function byId(id) { return CAT.filter(function (p) { return p.id === id; })[0]; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

  // ---------- Age / researcher gate ----------
  var KEY = "pst_age_ok", gate = $("#age-gate"), yes = $("#age-yes");
  function ageOk() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  if (gate && !ageOk()) { gate.classList.add("is-open"); document.body.style.overflow = "hidden"; }
  function gateReady() {
    var ok = $("#age-type").value && $$(".age-chk").every(function (c) { return c.checked; });
    if (yes) yes.disabled = !ok;
  }
  if (gate) { $("#age-type").addEventListener("change", gateReady); $$(".age-chk").forEach(function (c) { c.addEventListener("change", gateReady); }); }
  if (yes) yes.addEventListener("click", function () {
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    gate.classList.remove("is-open"); document.body.style.overflow = "";
  });

  // ---------- Mobile nav + search ----------
  var toggle = $("#nav-toggle"), nav = $("#main-nav");
  if (toggle && nav) toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  var so = $("#search-open"), sov = $("#search-overlay");
  if (so && sov) {
    so.addEventListener("click", function (e) { e.preventDefault(); sov.hidden = !sov.hidden; if (!sov.hidden) $("#search-input").focus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") sov.hidden = true; });
  }

  // ---------- Cart ----------
  var CART_KEY = "pst_cart", countEl = $("#cart-count");
  function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function saveCart(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) {} }
  function renderCount() { var n = getCart().reduce(function (s, i) { return s + i.qty; }, 0); if (countEl) countEl.textContent = n; }
  function addToCart(id, qty) {
    var cart = getCart(), f = cart.filter(function (i) { return i.id === id; })[0];
    var mp = byId(id), mq = mp && mp.max_qty ? mp.max_qty : 0; // admin: maximum quantity per order (no effect unless set)
    if (mq) qty = Math.max(0, Math.min(qty, mq - (f ? f.qty : 0)));
    if (!qty) return;
    if (f) f.qty += qty; else cart.push({ id: id, qty: qty });
    saveCart(cart); renderCount();
  }
  renderCount();

  // ---------- Product card ----------
  var HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z"/></svg>';
  function card(p) {
    var link = ROOT + "product/" + (p.slug || "") + ".html";
    var img = p.image ? '<img src="' + ROOT + p.image + '" alt="' + esc(p.name) + '" loading="lazy">' : "";
    var price = p.was ? "<del>" + money(p.was) + "</del><ins>" + money(p.price) + '</ins><span class="badge-save">Save ' + money(p.was - p.price) + "</span>" : "<ins>" + money(p.price) + "</ins>";
    if (!p.in_stock) price += '<span class="badge-out">Sold out</span>';
    var btn = p.in_stock
      ? '<button type="button" data-id="' + p.id + '">Add to cart</button>'
      : '<a href="' + link + '">Read more</a>';
    return '<article class="product-card' + (p.in_stock ? "" : " is-out") + '"><span class="wish">' + HEART + "</span>" +
      '<a class="product-card__img" href="' + link + '">' + img + "</a>" +
      '<div class="product-card__body"><h3><a href="' + link + '">' + esc(p.name) + "</a></h3>" +
      '<div class="price">' + price + '</div><div class="loop-btns">' + btn + "</div></div></article>";
  }
  function bindAdd(root) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-id]"); if (!b) return;
      addToCart(Number(b.getAttribute("data-id")), 1);
      var old = b.textContent; b.textContent = "Added"; setTimeout(function () { b.textContent = old; }, 900);
    });
  }
  // merge slug/in_stock info into the home best sellers
  function full(p) { return byId(p.id) || p; }

  // ---------- Home best sellers ----------
  var grid = $("#product-grid"), loadMore = $("#load-more");
  if (grid) {
    var list = (window.PRODUCTS || []).map(full), shown = 8;
    var render = function () {
      grid.innerHTML = list.slice(0, shown).map(card).join("");
      
    };
    bindAdd(grid);
    
    render();
  }

  // ---------- Shop page ----------
  var sg = $("#shop-grid");
  if (sg) {
    var qs = new URLSearchParams(location.search);
    var st = { cat: qs.get("cat") || "", sub: qs.get("sub") || "", q: (qs.get("q") || "").toLowerCase(), pp: 40, cols: 4, sort: "pop", page: 1, price: "", stock: false };
    var CATS = window.SITE_CATEGORIES || [], SUBS = window.SUBCATEGORIES || [];
    var BUCKETS = [["0-99", "Under 99"], ["100-199", "100 to 199"], ["200-499", "200 to 499"], ["500-999", "500 to 999"], ["1000-99999", "Over 1000"]];
    var DESC = {
      peptides: "Our Peptide collection features a diverse range of research peptides, each with specific applications in research.",
      capsules: "",
      "research-accessories": "",
      "": "This is where you can browse products in this store."
    };
    var draw = function () {
      var arr = CAT.filter(function (p) {
        if (st.cat && p.site_categories.indexOf(st.cat) < 0) return false;
        if (st.sub && p.subcategory !== st.sub) return false;
        if (st.q && (p.name + " " + p.group).toLowerCase().indexOf(st.q) < 0) return false;
        if (st.stock && !p.in_stock) return false;
        if (st.price) { var r = st.price.split("-"); if (p.price < +r[0] || p.price > +r[1] + 0.99) return false; }
        return true;
      });
      if (st.sort === "asc") arr.sort(function (a, b) { return a.price - b.price; });
      if (st.sort === "desc") arr.sort(function (a, b) { return b.price - a.price; });
      if (st.sort === "new") arr.sort(function (a, b) { return b.id - a.id; });
      var total = arr.length, pages = Math.max(1, Math.ceil(total / st.pp));
      if (st.page > pages) st.page = pages;
      var from = (st.page - 1) * st.pp, to = Math.min(total, from + st.pp);
      sg.className = "product-grid shop-grid cols-" + st.cols;
      sg.innerHTML = arr.slice(from, to).map(card).join("") || "";
      $("#shop-count").textContent = total ? "Showing " + (from + 1) + "\u2013" + to + " of " + total + " results" : "NO RESULTS";
      var cname = st.cat ? (CATS.filter(function (c) { return c.slug === st.cat; })[0] || {}).name : "Shop";
      var sname = st.sub ? (SUBS.filter(function (c) { return c.slug === st.sub; })[0] || {}).name : "";
      $("#shop-title").textContent = st.q ? 'Search: "' + st.q + '"' : (sname || cname || "Shop");
      $("#crumb-cur").textContent = st.q ? "Search" : (sname || cname || "Shop");
      $("#shop-desc").textContent = st.q || st.sub ? "" : DESC[st.cat];
      var pg = ""; for (var i = 1; i <= pages && pages > 1; i++) pg += '<button type="button" data-page="' + i + '"' + (i === st.page ? ' class="on"' : "") + ">" + i + "</button>";
      $("#pager").innerHTML = pg;
      $$("[data-pp]").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-pp") === st.pp); });
      $$("[data-cols]").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-cols") === st.cols); });

    };
    $("#f-cat").innerHTML = CATS.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; }).map(function (c) { return '<a href="?cat=' + c.slug + '">' + esc(c.name) + " " + c.count + "</a>"; }).join("");
    $("#f-price").innerHTML = BUCKETS.map(function (b) { return '<button type="button" data-price="' + b[0] + '">' + b[1] + "</button>"; }).join("");
    bindAdd(sg);
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.matches("[data-pp]")) { st.pp = +t.getAttribute("data-pp"); st.page = 1; draw(); }
      if (t.matches("[data-cols]")) { st.cols = +t.getAttribute("data-cols"); draw(); }
      if (t.matches("[data-page]")) { st.page = +t.getAttribute("data-page"); draw(); window.scrollTo(0, 0); }
      if (t.matches("[data-price]")) { st.price = t.getAttribute("data-price"); st.page = 1; draw(); }
    });
    $("#shop-sort").addEventListener("change", function (e) { st.sort = e.target.value; draw(); });
    $("#filter-toggle").addEventListener("click", function () { var f = $("#shop-filters"); f.hidden = !f.hidden; });
    draw();
  }

  // ---------- Product page ----------
  var addBtn = $("#add-btn");
  if (addBtn) {
    var qty = $("#qty");
    $$(".qty [data-q]").forEach(function (b) { b.addEventListener("click", function () { qty.value = Math.max(1, (+qty.value || 1) + +b.getAttribute("data-q")); }); });
    addBtn.addEventListener("click", function () {
      addToCart(+addBtn.getAttribute("data-id"), Math.max(1, +qty.value || 1));
      var o = addBtn.textContent; addBtn.textContent = "Added to cart"; setTimeout(function () { addBtn.textContent = o; }, 1200);
    });
  }
  $$(".pdp-thumbs button").forEach(function (b) {
    b.addEventListener("click", function () {
      $("#pdp-main-img").src = b.getAttribute("data-src");
      $$(".pdp-thumbs button").forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
    });
  });
  var rel = $("#related-grid");
  if (rel) {
    var me = byId(+rel.getAttribute("data-pid")) || {};
    var r = CAT.filter(function (p) { return p.id !== me.id && p.group !== me.group && p.subcategory === me.subcategory && p.in_stock; });
    var seen = {}; r = r.filter(function (p) { if (seen[p.group]) return false; seen[p.group] = 1; return true; }).slice(0, 4);
    rel.innerHTML = r.map(card).join(""); bindAdd(rel);
  }
  $$(".waitlist").forEach(function (f) { f.addEventListener("submit", function (e) { e.preventDefault();  }); });

  // ---------- Cart page ----------
  var croot = $("#cart-root");
  if (croot) {
    var drawCart = function () {
      var cart = getCart().filter(function (i) { return byId(i.id); });
      if (!cart.length) { croot.innerHTML = '<div class="empty-cart"><p>Your cart is currently empty.</p><a class="btn btn-primary" href="shop.html">Return to shop</a></div>'; return; }
      var CM = window.CMS || {}, S = { free_over: 200, standard: 14.9, two_day: 25.9, overnight: 52.9 }, SC = window.CMS_SHIP || {};
      for (var sk in SC) S[sk] = SC[sk];
      var unit = function (p, q) { return CM.unit ? CM.unit(p, q) : p.price; };
      var sub = 0, rows = cart.map(function (i) {
        var p = byId(i.id), u = unit(p, i.qty), line = u * i.qty; sub += line;
        return "<tr><td class=\"c-prod\"><img src=\"" + p.image + "\" alt=\"\"><a href=\"product/" + p.slug + ".html\">" + esc(p.name) + "</a><button type=\"button\" class=\"x\" data-rm=\"" + i.id + "\">Remove</button></td><td>" + money(u) +
          '</td><td><input type="number" min="1"' + (p.max_qty ? ' max="' + p.max_qty + '"' : "") + ' value="' + i.qty + '" data-qty="' + i.id + '" aria-label="' + esc(p.name) + ' quantity"></td><td>' + money(line) + "</td></tr>";
      }).join("");
      var left = Math.max(0, S.free_over - sub);
      var cp = null; try { cp = CM.hasCoupons ? JSON.parse(localStorage.getItem("pst_coupon")) : null; } catch (e) {}
      var disc = 0, freeShip = false;
      if (cp) { if (cp.type === "percent") disc = Math.round(sub * cp.amount) / 100; else if (cp.type === "fixed") disc = Math.min(cp.amount, sub); else if (cp.type === "free_shipping") freeShip = true; }
      var free = sub >= S.free_over || freeShip, FM = CM.forms || {};
      var couponBox = CM.hasCoupons ? '<div class="coupon"><p>Have a Coupon?</p><input type="text" id="coupon-code" value="' + esc(cp ? cp.code : "") + '"><button type="button" class="btn btn-outline" id="coupon-apply">' + esc(FM.coupon_button || "Apply coupon") + '</button><p id="coupon-msg"></p></div>' : "";
      croot.innerHTML = (left > 0 ? '<p class="fs-note">You\u2019re only ' + money(left) + " away from free shipping.</p>" : "") +
        '<table class="cart-table"><thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th></tr></thead><tbody>' + rows + "</tbody></table>" + couponBox +
        '<div class="cart-totals"><h3>Cart totals</h3><p>Subtotal <strong>' + money(sub) + '</strong></p>' + (disc ? "<p>" + esc(FM.discount_label || "Discount") + " <strong>-" + money(disc) + "</strong></p>" : "") + '<p>Shipment</p>' +
        '<p>Standard Shipping (2-5 Business Days): ' + (free ? "Free" : money(S.standard)) + '</p><p>Two-Day Shipping (2 Business Days): ' + money(S.two_day) + '</p><p>Overnight Shipping: ' + money(S.overnight) + '</p>' +
        '<p class="grand">Total <strong>' + money(sub - disc + (free ? 0 : S.standard)) + '</strong></p><button class="btn btn-primary" type="button" id="checkout">Proceed to checkout</button></div>';
    };
    croot.addEventListener("click", function (e) {
      if (e.target.id === "coupon-apply" && window.CMS) {
        var code = $("#coupon-code").value, msg = $("#coupon-msg"), FM = CMS.forms || {};
        var subNow = getCart().reduce(function (t, i) { var p = byId(i.id); return p ? t + CMS.unit(p, i.qty) * i.qty : t; }, 0);
        CMS.validateCoupon(code, subNow).then(function (r) {
          if (r && r.valid) { try { localStorage.setItem("pst_coupon", JSON.stringify({ code: r.code, type: r.type, amount: Number(r.amount) })); } catch (x) {} drawCart(); var m2 = $("#coupon-msg"); if (m2) m2.textContent = FM.coupon_ok || ""; }
          else { try { localStorage.removeItem("pst_coupon"); } catch (x) {} drawCart(); var m3 = $("#coupon-msg"); if (m3) m3.textContent = FM.coupon_bad || "This coupon is not valid."; }
        }).catch(function () { msg.textContent = FM.coupon_bad || "This coupon is not valid."; });
        return;
      }
      var rm = e.target.closest("[data-rm]");
      if (rm) { saveCart(getCart().filter(function (i) { return i.id !== +rm.getAttribute("data-rm"); })); renderCount(); drawCart(); }
      
    });
    croot.addEventListener("change", function (e) {
      var q = e.target.getAttribute("data-qty"); if (!q) return;
      var c = getCart(); c.forEach(function (i) { if (i.id === +q) i.qty = Math.max(1, +e.target.value || 1); }); saveCart(c); renderCount(); drawCart();
    });
    drawCart();
  }

  // ---------- newsletter / contact ----------
  var news = $("#news-form");
  if (news) news.addEventListener("submit", function (e) { e.preventDefault(); news.reset(); });
  var cf = $("#contact-form");
  if (cf) cf.addEventListener("submit", function (e) { e.preventDefault(); cf.reset(); });
  $$(".read-more").forEach(function (b) { b.addEventListener("click", function () { var d = b.previousElementSibling; var c = d.getAttribute("data-collapsed") === "1"; d.setAttribute("data-collapsed", c ? "0" : "1"); });  });
})();
