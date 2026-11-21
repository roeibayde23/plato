/* PLATO data layer.
   All app data goes through Store. Today it is saved in localStorage via LocalAdapter;
   later a remote adapter (accounts + sync) can replace it without touching the UI.
   Every record set carries userId so multi-user data can be merged later. */
(function () {
  "use strict";
  var KEY = "plato-v1";
  var SCHEMA = 3;
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
      profile: { name: "רועי", weight: 82, height: 1.8, age: 26, photo: null },
      goal: defaultGoal(),
      days: {},            // "YYYY-MM-DD" -> { meals: [ {id,type,createdAt,items:[snapshot],totals} ] }
      dishes: [
        { id: "dish_toast_cheese", name: "טוסט גבינה צהובה", items: [{ ingId: "tesco_toast_wheat", mode: "u", qty: 2 }, { ingId: "madeland_fit_20", mode: "u", qty: 2 }] },
        { id: "dish_cornies_cheese", name: "פריכיות עם גבינה", items: [{ ingId: "racio_cornies", mode: "u", qty: 3 }, { ingId: "madeland_fit_20", mode: "u", qty: 2 }] }
      ],
      customIngredients: [],
      fixes: [],           // owner-only fix list: {id,text,done,createdAt}
      weights: [],         // weight history: {id,date:"YYYY-MM-DD",kg,at} (one per day, sorted by date)
      overrides: {},       // v3: edits to built-in (Aki) ingredients: id -> {userId, per_100g, unit, updatedAt}
      prefs: { homeVariant: "B", tip: { date: "", hidden: false, rot: 0 } },
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
    s.schema = SCHEMA;
    return s;
  }
  function load() { state = migrate(adapter.read()); return state; }
  function save() { state.updatedAt = Date.now(); adapter.write(state); }
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
    setProfile: function (p) { Object.assign(st().profile, p); save(); },
    goal: function () { return clone(st().goal); },
    setGoal: function (g) { Object.assign(st().goal, g); save(); },

    day: function (key) {
      var d = st().days[key || dateKey()];
      var meals = d ? clone(d.meals) : [];
      return { key: key || dateKey(), meals: meals, totals: sumTotals(meals.map(function (m) { return m.totals; })) };
    },
    addMeal: function (key, meal) {
      var s = st(); key = key || dateKey();
      if (!s.days[key]) s.days[key] = { meals: [] };
      var m = { id: uid(), userId: s.userId, type: meal.type, createdAt: Date.now(), items: meal.items, totals: sumTotals(meal.items) };
      s.days[key].meals.push(m); save(); return clone(m);
    },
    updateMeal: function (key, id, meal) {
      var d = st().days[key]; if (!d) return null;
      var m = d.meals.filter(function (x) { return x.id === id; })[0]; if (!m) return null;
      m.type = meal.type || m.type; m.items = meal.items; m.totals = sumTotals(meal.items); m.editedAt = Date.now();
      save(); return clone(m);
    },
    deleteMeal: function (key, id) {
      var d = st().days[key]; if (!d) return;
      d.meals = d.meals.filter(function (m) { return m.id !== id; });
      if (!d.meals.length) delete st().days[key];
      save();
    },

    dishes: function () { return clone(st().dishes); },
    addDish: function (name, items) { var d = { id: uid(), userId: st().userId, name: name, items: items }; st().dishes.push(d); save(); return clone(d); },
    deleteDish: function (id) { st().dishes = st().dishes.filter(function (d) { return d.id !== id; }); save(); },

    customs: function () { return clone(st().customIngredients); },
    addCustom: function (c) { c.id = "custom_" + uid(); c.userId = st().userId; st().customIngredients.push(c); save(); return clone(c); },
    updateCustom: function (id, patch) { st().customIngredients.forEach(function (c) { if (c.id === id) Object.assign(c, patch); }); save(); },
    overrides: function () { return clone(st().overrides); },
    setOverride: function (id, o) { o.userId = st().userId; o.updatedAt = Date.now(); st().overrides[id] = o; save(); },
    resetOverride: function (id) { delete st().overrides[id]; save(); },
    prefs: function () { return clone(st().prefs); },
    setPrefs: function (p) { Object.assign(st().prefs, p); save(); },
    deleteCustom: function (id) { st().customIngredients = st().customIngredients.filter(function (c) { return c.id !== id; }); save(); },

    fixes: function () { return clone(st().fixes); },
    addFix: function (text) { st().fixes.unshift({ id: uid(), text: text, done: false, createdAt: Date.now() }); save(); },
    toggleFix: function (id) { st().fixes.forEach(function (f) { if (f.id === id) f.done = !f.done; }); save(); },
    deleteFix: function (id) { st().fixes = st().fixes.filter(function (f) { return f.id !== id; }); save(); },

    // weight history; profile.weight always mirrors the latest entry
    weights: function () { return clone(st().weights).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.at - b.at; }); },
    addWeight: function (kg, date) {
      var s = st(); date = date || dateKey();
      var ex = s.weights.filter(function (w) { return w.date === date; })[0];
      if (ex) { ex.kg = kg; ex.at = Date.now(); } else s.weights.push({ id: uid(), date: date, kg: kg, at: Date.now() });
      syncWeight(); save();
    },
    deleteWeight: function (id) { st().weights = st().weights.filter(function (w) { return w.id !== id; }); syncWeight(); save(); },

    // learning order: decayed use count (half-life 30 days) so frequent AND recent items rise
    recordUse: function (keys) {
      var u = st().usage, now = Date.now();
      keys.forEach(function (k) { var e = u[k]; u[k] = { n: (e ? decay(e, now) : 0) + 1, last: now }; });
      save();
    },
    useScore: function (key) { var e = st().usage[key]; return e ? decay(e, Date.now()) : 0; },

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
