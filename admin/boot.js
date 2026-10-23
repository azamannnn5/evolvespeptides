/* Admin start up: config check, login, forgot password, access check. */
(function () {
  'use strict';
  var A = window.ADMIN, $ = A.$, S = A.S, esc = A.esc, app = document.getElementById('app');
  function card(inner) { app.innerHTML = '<div class="login-wrap"><div class="login">' + inner + '</div></div>'; }
  function notConfigured() { card('<h1>Site admin</h1><p class="sub">Not connected yet</p><div class="msg warn">The database address is empty. Open <b>cms/cms-config.js</b> on the site, paste the Supabase project URL and the anon public key between the quotes, upload the file again, and reload this page.</div>'); }
  function loginForm(msg, kind) {
    card('<h1>Site admin</h1><p class="sub">Sign in to change your site</p>' + (msg ? '<div class="msg ' + (kind || 'err') + '">' + esc(msg) + '</div>' : '') + '<form id="lf"><label>Email</label><input type="email" id="le" required autocomplete="username"><label>Password</label><input type="password" id="lp" required autocomplete="current-password"><button class="btn pri" type="submit">Sign in</button></form><p style="margin:14px 0 0;text-align:center"><button class="link" id="fp" type="button">Forgot password?</button></p>');
    $('#lf').onsubmit = async function (e) { e.preventDefault(); var r = await S.sb.auth.signInWithPassword({ email: $('#le').value.trim(), password: $('#lp').value }); if (r.error) return loginForm(r.error.message.indexOf('Invalid') > -1 ? 'Wrong email or password.' : r.error.message); after(r.data.user); };
    $('#fp').onclick = async function () { var em = $('#le').value.trim(); if (!em) return loginForm('Type your email first, then press Forgot password.'); var r = await S.sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname }); loginForm(r.error ? r.error.message : 'If that email has a login, a reset link is on its way.', r.error ? 'err' : 'ok'); };
  }
  function newPassword() {
    card('<h1>Choose a new password</h1><form id="nf"><label>New password</label><input type="password" id="np" minlength="8" required><button class="btn pri" type="submit">Save password</button></form>');
    $('#nf').onsubmit = async function (e) { e.preventDefault(); var r = await S.sb.auth.updateUser({ password: $('#np').value }); if (r.error) return loginForm(r.error.message); history.replaceState(null, '', location.pathname); var u = (await S.sb.auth.getUser()).data.user; after(u); };
  }
  async function after(user) {
    S.user = user;
    var r = await S.sb.from('admin_users').select('role').eq('user_id', user.id).maybeSingle();
    if (r.error) { card('<h1>Site admin</h1><div class="msg err">' + esc(A.explain(r.error)) + '</div><button class="btn" id="so">Sign out</button>'); $('#so').onclick = async function () { await S.sb.auth.signOut(); location.reload(); }; return; }
    if (!r.data) { card('<h1>Site admin</h1><div class="msg err">You are signed in as ' + esc(user.email) + ', but this account does not have admin access. Ask the owner to add you under Team (or run the first owner line from the setup guide).</div><button class="btn" id="so">Sign out</button>'); $('#so').onclick = async function () { await S.sb.auth.signOut(); location.reload(); }; return; }
    S.role = r.data.role;
    try { await A.loadSaved(); } catch (e) { card('<h1>Site admin</h1><div class="msg err">' + esc(A.explain(e)) + '</div>'); return; }
    A.layout(); A.route(); window.addEventListener('hashchange', A.route);
  }
  (async function () {
    if (!A.configured) return notConfigured();
    if (!window.supabase) return card('<div class="msg err">The admin library did not load (admin/vendor/supabase.js).</div>');
    try {
      var d = await (await fetch('../cms/defaults.json')).json(); S.defaults = d; d.fields.forEach(function (f) { S.fmap[f.key] = f; });
    } catch (e) { return card('<div class="msg err">Could not load cms/defaults.json. Run tools/cms-annotate.js and upload the cms folder.</div>'); }
    S.sb = supabase.createClient(A.cfg.url, A.cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    var recovering = /type=recovery/.test(location.hash + location.search);
    S.sb.auth.onAuthStateChange(function (ev) { if (ev === 'PASSWORD_RECOVERY') newPassword(); });
    if (recovering) return;
    var s = (await S.sb.auth.getSession()).data.session;
    if (!s) return loginForm(); after(s.user);
  })();
})();
