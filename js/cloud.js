/* PLATO v9 cloud: email + one-time code login (Supabase Auth OTP, same flow as CASA) and local-first sync of the whole Store document.
   - localStorage stays the source the UI reads; the server copy lives in public.plato_state (one jsonb row per user, RLS own row).
   - push: debounced after every local save; pull: on open, focus/visibility and when the network comes back.
   - every sync is pull → merge (newest record wins, tombstones) → apply locally → upsert, so no device overwrites newer data.
   - dish photos: IndexedDB locally, plato-photos/<uid>/dish-<id>.jpg in Storage.
   No SDK: plain fetch against the Auth / PostgREST / Storage HTTP APIs. */
(function () {
  "use strict";
  var CFG = window.PLATO_CLOUD || {}, S = window.Store;
  var AKEY = "plato-auth", SKEY = "plato-sync", MKEY = "plato-mode";
  var hooks = { imgGet: null, imgPut: null, onChange: function () {}, onStatus: function () {} };
  var timer = null, busy = false, again = false;

  function jget(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function jset(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sess() { return jget(AKEY); }
  function sync() { return jget(SKEY) || { dirty: false, last: 0, state: "idle", photos: {} }; }
  function setSync(p) { var s = Object.assign(sync(), p); jset(SKEY, s); hooks.onStatus(status()); return s; }
  function status() {
    var se = sess(), sy = sync();
    if (!se) return { on: false, mode: localStorage.getItem(MKEY) || "" };
    var st = !navigator.onLine ? "offline" : sy.state;
    return { on: true, email: se.user && se.user.email, last: sy.last || 0, dirty: !!sy.dirty, state: st, error: sy.error || "" };
  }

  function errMsg(j, code) {
    var m = (j && (j.msg || j.error_description || j.message || j.error)) || "", ec = (j && j.error_code) || "";
    var wait = /after (\d+) seconds?/i.exec(m);
    if (wait) return "אפשר לבקש קוד חדש בעוד " + wait[1] + " שניות";
    if (ec === "over_email_send_rate_limit" || /rate limit|too many|only request/i.test(m) || code === 429) return "נשלחו יותר מדי קודים בזמן קצר — חכו כמה דקות ונסו שוב";
    if (ec === "otp_expired" || /expired|invalid.*(token|otp)|token.*invalid/i.test(m)) return "הקוד לא נכון או שפג תוקפו — אפשר לבקש קוד חדש";
    if (ec === "email_address_not_authorized" || /not authorized/i.test(m)) return "שרת המייל עדיין לא שולח לכתובת הזו (פתוח רק לכתובות מאושרות)";
    if (ec === "otp_disabled" || /signups not allowed/i.test(m)) return "אין חשבון עם המייל הזה, ויצירת חשבון חדש כבוי כרגע";
    if (/valid email|invalid email|unable to validate email|invalid format/i.test(m)) return "כתובת האימייל לא נראית תקינה";
    return m ? "שגיאה: " + m : "לא הצלחתי להתחבר לשרת";
  }
  function api(path, opt) {
    opt = opt || {}; var h = Object.assign({ apikey: CFG.key }, opt.headers || {});
    if (opt.json !== undefined) { h["Content-Type"] = "application/json"; opt.body = JSON.stringify(opt.json); }
    return fetch(CFG.url + path, { method: opt.method || "GET", headers: h, body: opt.body }).then(function (r) {
      var ct = r.headers.get("content-type") || "";
      var p = opt.raw ? (r.ok ? r.blob() : r.text().then(function () { return null; })) : ct.indexOf("json") >= 0 ? r.json().catch(function () { return null; }) : r.text();
      return p.then(function (b) { if (!r.ok) { var e = new Error(errMsg(b, r.status)); e.status = r.status; e.body = b; throw e; } return b; });
    });
  }
  function keep(j) {
    if (!j || !j.access_token) return null;
    var se = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at ? j.expires_at * 1000 : Date.now() + (j.expires_in || 3600) * 1000, user: { id: j.user ? j.user.id : (sess() || {}).user.id, email: j.user ? j.user.email : (sess() || {}).user.email } };
    jset(AKEY, se); return se;
  }
  function token() {
    var se = sess(); if (!se) return Promise.reject(new Error("not signed in"));
    if (se.expires_at - Date.now() > 60000) return Promise.resolve(se.access_token);
    return api("/auth/v1/token?grant_type=refresh_token", { method: "POST", json: { refresh_token: se.refresh_token } })
      .then(function (j) { return keep(j).access_token; })
      .catch(function (e) { if (e.status === 400 || e.status === 401) { jset(AKEY, null); setSync({ state: "signedout" }); } throw e; });
  }
  function authed(path, opt) { return token().then(function (t) { opt = opt || {}; opt.headers = Object.assign({ Authorization: "Bearer " + t }, opt.headers || {}); return api(path, opt); }); }

  // ---------- data ----------
  function pullDoc() {
    var u = sess().user.id;
    return authed("/rest/v1/plato_state?select=doc,updated_at&user_id=eq." + u).then(function (rows) { return rows && rows[0] ? rows[0] : null; });
  }
  function pushDoc(doc) {
    var u = sess().user.id, d = JSON.parse(JSON.stringify(doc)); delete d.owner;
    return authed("/rest/v1/plato_state?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, json: { user_id: u, doc: d, device: (navigator.userAgent || "").slice(0, 120) } });
  }
  function photoPath(id) { return sess().user.id + "/dish-" + id + ".jpg"; }
  function dataToBlob(d) { var p = d.split(","), b = atob(p[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], { type: "image/jpeg" }); }
  function blobToData(b) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { res(null); }; r.readAsDataURL(b); }); }
  function syncPhotos(doc) {   // upload changed local photos, download missing ones; best effort
    if (!hooks.imgGet) return Promise.resolve();
    var sy = sync(), up = sy.photos || {}, jobs = [];
    (doc.dishes || []).forEach(function (d) {
      var tag = String(d.photoAt || (d.photo ? 1 : 0));
      if (!d.photo || up[d.id] === tag) return;
      jobs.push(new Promise(function (res) {
        hooks.imgGet(d.id, function (data) {
          if (data) {
            token().then(function (t) { return fetch(CFG.url + "/storage/v1/object/plato-photos/" + photoPath(d.id), { method: "POST", headers: { apikey: CFG.key, Authorization: "Bearer " + t, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: dataToBlob(data) }); })
              .then(function (r) { if (r.ok) up[d.id] = tag; }).catch(function () {}).then(res);
          } else {
            authed("/storage/v1/object/authenticated/plato-photos/" + photoPath(d.id), { raw: true }).then(function (b) { return b ? blobToData(b) : null; })
              .then(function (u) { if (u) return new Promise(function (r2) { hooks.imgPut(d.id, u, function () { up[d.id] = tag; r2(); }); }); })
              .catch(function () {}).then(res);
          }
        });
      }));
    });
    (sy.photoDel || []).forEach(function (id) { jobs.push(authed("/storage/v1/object/plato-photos/" + photoPath(id), { method: "DELETE" }).catch(function () {})); });
    return Promise.all(jobs).then(function () { setSync({ photos: up, photoDel: [] }); });
  }

  // pull → merge → apply → push
  function run(reason) {
    if (!sess()) return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    if (!navigator.onLine) { setSync({ state: "offline" }); return Promise.resolve(); }
    busy = true; setSync({ state: "syncing" });
    var uid = sess().user.id, changed = false;
    return pullDoc().then(function (row) {
      var local = S.raw(), merged = row ? S.merge(local, row.doc) : local;
      if (JSON.stringify(merged) !== JSON.stringify(local) || local.owner !== uid) { S.applyMerged(merged, uid); changed = row ? true : changed; }
      var need = sync().dirty || !row || JSON.stringify(row.doc) !== JSON.stringify(stripOwner(S.raw()));
      return (need ? pushDoc(S.raw()) : Promise.resolve()).then(function () { return syncPhotos(S.raw()); });
    }).then(function () {
      setSync({ dirty: false, last: Date.now(), state: "ok", error: "" });
      if (changed) hooks.onChange(reason);
    }).catch(function (e) {
      setSync({ dirty: true, state: navigator.onLine ? (sess() ? "error" : "signedout") : "offline", error: e && e.message || "" });
    }).then(function () { busy = false; if (again) { again = false; schedule(300); } });
  }
  function stripOwner(d) { d = JSON.parse(JSON.stringify(d)); delete d.owner; return d; }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(function () { run("push"); }, ms == null ? 1500 : ms); }

  // ---------- auth flows ----------
  function afterLogin(se) {
    // another account's data on this device? keep a backup and start from that account's cloud copy instead of mixing
    var owner = S.owner();
    if (owner && owner !== se.user.id) {
      try { localStorage.setItem("plato-v1-backup-" + owner, JSON.stringify(S.raw())); } catch (e) {}
      var fresh = S.raw(); fresh.days = {}; fresh.dishes = []; fresh.customIngredients = []; fresh.fixes = []; fresh.weights = []; fresh.overrides = {}; fresh.usage = {}; fresh.deleted = {}; fresh.stamps = {};
      S.applyMerged(fresh, se.user.id);
    }
    localStorage.setItem(MKEY, "cloud"); setSync({ dirty: true, state: "syncing", photos: {} });
    return run("login").then(function () { return se; });
  }
  var Cloud = {
    enabled: function () { return !!(CFG.url && CFG.key); },
    init: function (h) {
      Object.assign(hooks, h || {});
      S.onSave(function () { if (sess()) { setSync({ dirty: true }); schedule(); } });
      window.addEventListener("online", function () { run("online"); });
      window.addEventListener("offline", function () { if (sess()) setSync({ state: "offline" }); });
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") run("focus"); });
      window.addEventListener("focus", function () { run("focus"); });
      setInterval(function () { if (sess() && sync().dirty) run("retry"); }, 60000);
      // email-confirmation / magic link landing: #access_token=…&refresh_token=…
      var h2 = location.hash || "";
      if (/access_token=/.test(h2)) {
        var q = {}; h2.replace(/^#/, "").split("&").forEach(function (kv) { var p = kv.split("="); q[p[0]] = decodeURIComponent(p[1] || ""); });
        history.replaceState(null, "", location.pathname + location.search + "#/");
        Cloud._landing = api("/auth/v1/user", { headers: { Authorization: "Bearer " + q.access_token } }).then(function (u) {
          var se = keep({ access_token: q.access_token, refresh_token: q.refresh_token, expires_in: +q.expires_in || 3600, user: u }); return afterLogin(se);
        }).catch(function () {});
      }
      if (sess()) run("open");
    },
    status: status,
    session: function () { var s = sess(); return s ? { email: s.user.email, id: s.user.id } : null; },
    mode: function () { return sess() ? "cloud" : localStorage.getItem(MKEY) || ""; },
    chooseLocal: function () { localStorage.setItem(MKEY, "local"); },
    // Step 1: email the 6-digit code. Same call as CASA's signInWithOtp({shouldCreateUser:true, emailRedirectTo}).
    // Existing users (Roei's CASA account) get CASA's "Magic Link" mail, which carries {{ .Token }}; redirect_to makes the link variant land back here.
    sendCode: function (email) {
      var back = location.origin + location.pathname;
      return api("/auth/v1/otp?redirect_to=" + encodeURIComponent(back), { method: "POST", json: { email: email, create_user: true, data: {}, gotrue_meta_security: {} } });
    },
    // Step 2: trade the code for a session (then the usual first sync).
    verifyCode: function (email, code) {
      return api("/auth/v1/verify", { method: "POST", json: { type: "email", email: email, token: code, gotrue_meta_security: {} } }).then(function (j) {
        var se = keep(j); if (!se) { var e = new Error("הקוד לא נכון או שפג תוקפו — אפשר לבקש קוד חדש"); throw e; }
        return afterLogin(se);
      });
    },
    signOut: function () {
      var se = sess(), p = se ? run("logout").catch(function () {}).then(function () { return api("/auth/v1/logout", { method: "POST", headers: { Authorization: "Bearer " + se.access_token } }).catch(function () {}); }) : Promise.resolve();
      return p.then(function () { jset(AKEY, null); jset(SKEY, null); localStorage.setItem(MKEY, "local"); hooks.onStatus(status()); });
    },
    syncNow: function () { return run("manual"); },
    photoChanged: function (id, removed) { if (removed) { var s = sync(); s.photoDel = (s.photoDel || []).concat([id]); delete (s.photos || {})[id]; jset(SKEY, s); } },
    _run: run
  };
  window.Cloud = Cloud;
})();
