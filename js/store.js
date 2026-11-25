/* PLATO data layer.
   All app data goes through Store. Today it is saved in localStorage via LocalAdapter;
   later a remote adapter (accounts + sync) can replace it without touching the UI.
   Every record set carries userId so multi-user data can be merged later. */
(function () {
  "use strict";
  var KEY = "plato-v1";
  var SCHEMA = 4;   // v8: per-record stamps (u), tombstones (deleted) and section stamps for cloud merge
  var DB = window.PLATO_DB || { daily_target: {}, ingredients: [] };
  var T = DB.daily_target || {};

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function defaultGoal() {
    return { kcal: T.kcal || 2050, protein: T.protein_g || 160, carbs: T.carbs_g || 215, fat: T.fat_g || 62 };
  }
  function defaults() {
    return {
      schema: SCHEMA,
      userId: "local",
      profile: { name: "", sex: "", weight: 0, height: 0, age: 0, activity: "", photo: null },   // v13: neutral — a new user fills this in the welcome flow (it used to be Roei's details)
      goal: defaultGoal(),
      days: {},            // "YYYY-MM-DD" -> { meals: [ {id,type,createdAt,items:[snapshot],totals} ] }
      dishes: [],          // v13: no starter dishes (they were Roei's own products)
      customIngredients: [],
      fixes: [],           // owner-only fix list: {id,text,done,createdAt}
      weights: [],         // weight history: {id,date:"YYYY-MM-DD",kg,at} (one per day, sorted by date)
      overrides: {},       // v3: edits to built-in (Aki) ingredients: id -> {userId, per_100g, unit, updatedAt}
      prefs: { homeVariant: "B", tip: { date: "", hidden: false, rot: 0 }, onboarded: false },
      stamps: {},          // v8: section -> ms of last change (profile, goal, prefs)
      deleted: {},         // v8: tombstones "kind:id" -> ms, so a delete on one device wins over an older copy elsewhere
      usage: {},           // learning order: key (ingredient id or "dish:"+id) -> {n: decayed count, last: ms}
      updatedAt: Date.now()
    };
  }

  var LocalAdapter = {
    read: function () { try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
    write: function (state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  };

  var adapter = LocalAdapter;
  var state = null;

  function migrate(s) {
    var d = defaults();
    if (!s || typeof s !== "object") s = d;
    for (var k in d) if (s[k] === undefined) s[k] = d[k];
    // v2: start the weight history from the profile weight he already entered
    if (!s.weights.length && s.profile && s.profile.weight > 0) s.weights.push({ id: uid(), date: dateKey(new Date(s.updatedAt || Date.now())), kg: s.profile.weight, at: s.updatedAt || Date.now() });
    if (!s.stamps) s.stamps = {}; if (!s.deleted) s.deleted = {};
    s.schema = SCHEMA;
    return s;
  }
  function load() { state = migrate(adapter.read()); return state; }
  var listeners = [], quiet = 0;
  function save() { state.updatedAt = Date.now(); adapter.write(state); if (!quiet) listeners.forEach(function (f) { try { f(); } catch (e) {} }); }
  function now() { return Date.now(); }
  function stamp(sec) { st().stamps[sec] = now(); }
  function tomb(kind, id) { st().deleted[kind + ":" + id] = now(); }
  function recT(r) { return r ? (r.u || r.editedAt || r.updatedAt || r.at || r.createdAt || 0) : 0; }
  // ---- v8 merge: union by id, newest record wins, tombstones newer than a record delete it ----
  function mergeList(a, b, kind, keyOf, dead) {
    var m = {}, order = [];
    (a || []).concat(b || []).forEach(function (r) { var k = keyOf(r); if (!(k in m)) order.push(k); if (!(k in m) || recT(r) > recT(m[k])) m[k] = r; });
    return order.filter(function (k) { var t = dead[kind + ":" + k]; return !(t && t >= recT(m[k])); }).map(function (k) { return m[k]; });
  }
  function merge(L, R) {
    if (!R || typeof R !== "object" || !R.days) return L;
    R = migrate(clone(R));
    var out = clone(L), dead = {};
    [L.deleted || {}, R.deleted || {}].forEach(function (d) { for (var k in d) if (!(dead[k] >= d[k])) dead[k] = d[k]; });
    out.deleted = dead;
    var meals = function (S) { var a = []; for (var k in S.days) S.days[k].meals.forEach(function (m) { a.push(Object.assign({}, m, { _day: k })); }); return a; };
    out.days = {};
    mergeList(meals(L), meals(R), "meal", function (m) { return m.id; }, dead).forEach(function (m) { var k = m._day; delete m._day; (out.days[k] = out.days[k] || { meals: [] }).meals.push(m); });
    for (var dk in out.days) out.days[dk].meals.sort(function (x, y) { return x.createdAt - y.createdAt; });
    out.dishes = mergeList(L.dishes, R.dishes, "dish", function (d) { return d.id; }, dead);
    out.customIngredients = mergeList(L.customIngredients, R.customIngredients, "custom", function (c) { return c.id; }, dead);
    out.fixes = mergeList(L.fixes, R.fixes, "fix", function (f) { return f.id; }, dead).sort(function (x, y) { return y.createdAt - x.createdAt; });
    out.weights = mergeList(L.weights, R.weights, "weight", function (w) { return w.date; }, dead);
    var ov = {}; [L.overrides, R.overrides].forEach(function (o) { for (var k in o) if (!ov[k] || recT(o[k]) > recT(ov[k])) ov[k] = o[k]; });
    for (var ok in ov) { var t = dead["ov:" + ok]; if (t && t >= recT(ov[ok])) delete ov[ok]; } out.overrides = ov;
    var us = {}; [L.usage, R.usage].forEach(function (o) { for (var k in o) if (!us[k] || o[k].last > us[k].last) us[k] = o[k]; }); out.usage = us;
    out.stamps = {};
    ["profile", "goal", "prefs"].forEach(function (sec) {
      var lt = (L.stamps || {})[sec] || 0, rt = (R.stamps || {})[sec] || 0;
      out[sec] = rt > lt ? clone(R[sec]) : clone(L[sec]); out.stamps[sec] = Math.max(lt, rt);
    });
    if (!((L.stamps || {}).profile) && !((R.stamps || {}).profile) && !L.profile.photo && R.profile && R.profile.photo) out.profile.photo = R.profile.photo;
    out.userId = L.userId;
    return out;
  }
  function st() { return state || load(); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function sumTotals(items) {
    var t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    items.forEach(function (i) { t.kcal += i.kcal; t.protein += i.protein; t.carbs += i.carbs; t.fat += i.fat; });
    return t;
  }

  var HALF_LIFE = 30 * 864e5;
  function decay(e, now) { return e.n * Math.pow(0.5, Math.max(0, now - e.last) / HALF_LIFE); }
  function syncWeight() {
    var w = st().weights.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.at - b.at; });
    if (w.length) st().profile.weight = w[w.length - 1].kg;
  }

  var Store = {
    dateKey: dateKey,
    uid: uid,
    defaultGoal: defaultGoal,
    setAdapter: function (a) { adapter = a; state = null; },
    load: load,
    userId: function () { return st().userId; },

    profile: function () { return clone(st().profile); },
    setProfile: function (p) { Object.assign(st().profile, p); stamp("profile"); save(); },
    goal: function () { return clone(st().goal); },
    setGoal: function (g) { Object.assign(st().goal, g); stamp("goal"); save(); },

    day: function (key) {
      var d = st().days[key || dateKey()];
      var meals = d ? clone(d.meals) : [];
      return { key: key || dateKey(), meals: meals, totals: sumTotals(meals.map(function (m) { return m.totals; })) };
    },
    addMeal: function (key, meal) {
      var s = st(); key = key || dateKey();
      if (!s.days[key]) s.days[key] = { meals: [] };
      var m = { id: uid(), userId: s.userId, type: meal.type, createdAt: Date.now(), u: Date.now(), items: meal.items, totals: sumTotals(meal.items) };
      if (meal.dishes && meal.dishes.length) m.dishes = meal.dishes;   // v14: saved dishes used in this meal (for the home thumbnail)
      s.days[key].meals.push(m); save(); return clone(m);
    },
    updateMeal: function (key, id, meal) {
      var d = st().days[key]; if (!d) return null;
      var m = d.meals.filter(function (x) { return x.id === id; })[0]; if (!m) return null;
      m.type = meal.type || m.type; m.items = meal.items; m.totals = sumTotals(meal.items); m.editedAt = Date.now(); m.u = m.editedAt;
      if (Array.isArray(meal.dishes)) { if (meal.dishes.length) m.dishes = meal.dishes; else delete m.dishes; }
      save(); return clone(m);
    },
    deleteMeal: function (key, id) {
      var d = st().days[key]; if (!d) return;
      d.meals = d.meals.filter(function (m) { return m.id !== id; }); tomb("meal", id);
      if (!d.meals.length) delete st().days[key];
      save();
    },

    dishes: function () { return clone(st().dishes); },
    addDish: function (name, items) { var d = { id: uid(), userId: st().userId, name: name, items: items, u: now() }; st().dishes.push(d); save(); return clone(d); },
    updateDish: function (id, patch) { var d = st().dishes.filter(function (x) { return x.id === id; })[0]; if (!d) return null; Object.assign(d, patch); d.u = now(); save(); return clone(d); },
    deleteDish: function (id) { st().dishes = st().dishes.filter(function (d) { return d.id !== id; }); tomb("dish", id); save(); },
    restoreDish: function (d) {   // v10 undo: bring a deleted dish back; stamp it newer than its tombstone so sync keeps it
      var k = "dish:" + d.id, t = st().deleted[k] || 0; delete st().deleted[k];
      var r = clone(d); r.u = Math.max(now(), t + 1); st().dishes = st().dishes.filter(function (x) { return x.id !== d.id; }).concat([r]); save(); return clone(r);
    },

    customs: function () { return clone(st().customIngredients); },
    addCustom: function (c) { c.id = "custom_" + uid(); c.userId = st().userId; c.u = now(); st().customIngredients.push(c); save(); return clone(c); },
    updateCustom: function (id, patch) { st().customIngredients.forEach(function (c) { if (c.id === id) { Object.assign(c, patch); c.u = now(); } }); save(); },
    overrides: function () { return clone(st().overrides); },
    setOverride: function (id, o) { o.userId = st().userId; o.updatedAt = Date.now(); st().overrides[id] = o; save(); },
    resetOverride: function (id) { delete st().overrides[id]; tomb("ov", id); save(); },
    prefs: function () { return clone(st().prefs); },
    setPrefs: function (p) { Object.assign(st().prefs, p); stamp("prefs"); save(); },
    deleteCustom: function (id) { st().customIngredients = st().customIngredients.filter(function (c) { return c.id !== id; }); tomb("custom", id); save(); },

    fixes: function () { return clone(st().fixes); },
    addFix: function (text) { st().fixes.unshift({ id: uid(), text: text, done: false, createdAt: Date.now(), u: now() }); save(); },
    toggleFix: function (id) { st().fixes.forEach(function (f) { if (f.id === id) { f.done = !f.done; f.u = now(); } }); save(); },
    deleteFix: function (id) { st().fixes = st().fixes.filter(function (f) { return f.id !== id; }); tomb("fix", id); save(); },

    // weight history; profile.weight always mirrors the latest entry
    weights: function () { return clone(st().weights).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.at - b.at; }); },
    addWeight: function (kg, date) {
      var s = st(); date = date || dateKey();
      var ex = s.weights.filter(function (w) { return w.date === date; })[0];
      if (ex) { ex.kg = kg; ex.at = Date.now(); } else s.weights.push({ id: uid(), date: date, kg: kg, at: Date.now() });
      syncWeight(); save();
    },
    deleteWeight: function (id) { st().weights = st().weights.filter(function (w) { if (w.id === id) tomb("weight", w.date); return w.id !== id; }); syncWeight(); save(); },

    // learning order: decayed use count (half-life 30 days) so frequent AND recent items rise
    recordUse: function (keys) {
      var u = st().usage, now = Date.now();
      keys.forEach(function (k) { var e = u[k]; u[k] = { n: (e ? decay(e, now) : 0) + 1, last: now }; });
      save();
    },
    useScore: function (key) { var e = st().usage[key]; return e ? decay(e, Date.now()) : 0; },

    // ---- v8 cloud sync hooks ----
    onSave: function (f) { listeners.push(f); },
    raw: function () { return clone(st()); },
    merge: merge,
    // replace local state with a merged document without firing onSave (the sync engine pushes it itself)
    applyMerged: function (doc, owner) { quiet++; try { var s = migrate(clone(doc)); if (owner) { s.userId = owner; s.owner = owner; } state = s; syncWeight(); save(); } finally { quiet--; } },
    owner: function () { return st().owner || null; },
    // v13: per-account data. A login of another account (or of an account on a device holding local data) starts from an
    // empty state that is only ever *replaced* by that account's cloud copy — local data is never merged into/uploaded to it.
    freshFor: function (owner) { quiet++; try { var s = defaults(); s.userId = owner; s.owner = owner; s.fresh = true; state = s; save(); } finally { quiet--; } },
    isFresh: function () { return !!st().fresh; },
    wipe: function () { quiet++; try { try { localStorage.removeItem(KEY); } catch (e) {} state = defaults(); adapter.write(state); } finally { quiet--; } },
    hasData: function () { var s = st(); return Object.keys(s.days).some(function (k) { return s.days[k].meals.length; }) || s.dishes.length > 0 || s.customIngredients.length > 0 || s.weights.length > 1 || !!(s.profile && s.profile.name); },
    // new user: never finished the welcome flow and never set a profile or goals (Roei's row has a goal stamp → skips it)
    needsOnboard: function () { var s = st(); return !s.fresh && !(s.prefs && s.prefs.onboarded) && !(s.stamps && (s.stamps.goal || s.stamps.profile)); },
    exportJSON: function () { return JSON.stringify({ app: "PLATO", exportedAt: new Date().toISOString(), data: st() }, null, 2); },
    importJSON: function (text) {
      var o = JSON.parse(text);
      var data = o && o.data ? o.data : o;
      if (!data || typeof data !== "object" || !data.goal || !data.days) throw new Error("bad backup");
      state = migrate(data); save();
    }
  };
  window.Store = Store;
})();
