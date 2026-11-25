/* PLATO app — vanilla JS, no build. Views: home, build, settings (hash routing). */
(function () {
  "use strict";
  var APP_VERSION = window.APP_VERSION || "5";
  var DB = window.PLATO_DB;
  var S = window.Store;
  var $app = document.getElementById("app");
  var $sheet = document.getElementById("sheet");

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n(x) { return '<span class="n">' + x + "</span>"; }
  function fmt(x) { return Math.round(x).toLocaleString("en-US"); }
  function r1(x) { return x >= 10 ? Math.round(x) : Math.round(x * 10) / 10; }
  function r0(x) { return x >= 1 ? Math.round(x) : Math.round(x * 10) / 10; }
  function toast(msg, act, onAct, ms) {   // v10: optional action button (e.g. "ביטול" to undo a delete)
    var t = document.getElementById("toast"); t.textContent = msg; t.classList.toggle("act", !!act);
    if (act) { var b = document.createElement("button"); b.className = "tact"; b.textContent = act; b.onclick = function (e) { e.stopPropagation(); clearTimeout(toast._t); t.classList.remove("show"); onAct(); }; t.appendChild(b); }
    t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); if (toast._done) { var f = toast._done; toast._done = null; f(); } }, ms || 2000);
  }
  var ICON = {
    trash: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>',
    camera: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    gear: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A4330" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A4330" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    chevR: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    chevL: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    chevUp: '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    bookOn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>',
    pencil: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    book: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>',
    plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    eye: function (open) { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>' + (open ? "" : '<path d="M3 3l18 18"/>') + "</svg>"; }
  };

  // ---------- meals ----------
  var MEALS = [
    { id: "בוקר", ic: "☀️", hint: "07–10", tone: "br", title: "ארוחת בוקר" },
    { id: "ביניים", ic: "🍎", hint: "10–12", tone: "", title: "ארוחת ביניים" },
    { id: "צהריים", ic: "🍽️", hint: "12–15", tone: "br", title: "ארוחת צהריים" },
    { id: "ערב", ic: "🌙", hint: "18–21", tone: "", title: "ארוחת ערב" },
    { id: "נשנוש", ic: "🥨", hint: "מתי שרוצים", tone: "br", title: "נשנוש" }
  ];
  function mealInfo(id) { for (var i = 0; i < MEALS.length; i++) if (MEALS[i].id === id) return MEALS[i]; return MEALS[4]; }
  function mealByTime(d) {
    var h = (d || new Date()).getHours();
    if (h >= 4 && h < 10) return "בוקר";
    if (h >= 10 && h < 12) return "ביניים";
    if (h >= 12 && h < 15) return "צהריים";
    if (h >= 18 && h < 22) return "ערב";
    return "נשנוש";
  }

  // ---------- ingredients ----------
  var CATS = [["saved", "★"], ["protein", "חלבון"], ["carb", "פחמימה"], ["fat", "שומן"], ["vegetable", "ירקות"], ["fruit", "פירות"], ["other", "אחר"]];
  var CAT_LABEL = { protein: "חלבון", carb: "פחמימה", fat: "שומן", vegetable: "ירקות", fruit: "פירות", other: "אחר" };
  var ESTIMATE = { asam_sweet_chili: 1, sweet_corn_canned_usda: 1, rice_paper: 1, whey_protein_powder: 1 };
  var BAD_UNIT = /^(כוס|חצי כוס|רבע כוס|אריזה|גביע|מנה|קערת|קופסה)/;
  // v7: a sensible starter set per tab before there is any usage history (order = priority)
  var STARTER = {}; ["egg_whole_raw", "chicken_breast_cooked", "cottage_5_tnuva", "greek_yogurt_0_milko", "madeland_fit_20", "tofu_roei", "white_cheese_5_tnuva", "turkey_breast_cooked", "whey_protein_powder",
    "rice_white_cooked", "pasta_cooked", "oats_rolled", "rye_bread", "tesco_toast_wheat", "racio_cornies", "pita_white", "potato_boiled", "sweet_potato_baked",
    "olive_oil", "tahini", "avocado", "peanut_butter", "almonds", "hummus", "walnuts", "butter",
    "cucumber", "tomato", "salad_veg_mix", "pepper_red", "lettuce_romaine", "carrot", "broccoli_raw", "onion",
    "banana", "apple", "orange", "strawberries", "dates_medjool", "blueberries", "grapes",
    "milk_1", "coffee_brewed", "honey", "asam_sweet_chili", "heinz_ketchup", "soy_sauce", "sugar"].forEach(function (id, k) { STARTER[id] = k + 1; });
  var PLURAL = { "כף": "כפות", "כפית": "כפיות", "פרוסה": "פרוסות", "חופן": "חפנים", "יח׳": "יח׳" };
  function cleanUnit(name) { return String(name).replace(/\s*\(.*?\)\s*/g, " ").trim(); }
  function shortUnit(name) {
    var c = cleanUnit(name);
    if (/^כפית/.test(c)) return "כפית";
    if (/^כף/.test(c)) return "כף";
    if (/^פרוסה/.test(c)) return "פרוסה";
    if (/^חופן/.test(c)) return "חופן";
    return "יח׳";
  }
  function norm(i, custom, ov) {
    var units = (i.units || []).filter(function (u) { return u && u.grams > 0; });
    var p100 = i.per_100g;
    if (ov) {   // his own edit of a built-in ingredient
      p100 = Object.assign({}, p100, ov.per_100g || {});
      if (ov.unit !== undefined) {
        var fi = -1; for (var q = 0; q < units.length; q++) if (!BAD_UNIT.test(units[q].name_he)) { fi = q; break; }
        units = units.slice();
        if (ov.unit && ov.unit.grams > 0) { if (fi >= 0) units[fi] = ov.unit; else units.unshift(ov.unit); }
        else if (fi >= 0) units.splice(fi, 1);
      }
    }
    var unit = null;
    for (var k = 0; k < units.length; k++) if (!BAD_UNIT.test(units[k].name_he)) { unit = units[k]; break; }
    var cat = i.category;
    var defMode = unit && (unit.grams <= 130 || cat === "fruit") ? "u" : "g";
    // unit options for the stepper: up to 3 real units, plus a כפית (= ⅓ כף) wherever only a כף exists
    var opts = [], seen = {};
    units.filter(function (u) { return !BAD_UNIT.test(u.name_he) && !/^חצי/.test(u.name_he); }).slice(0, 3).forEach(function (u, k) {
      var sh = shortUnit(u.name_he); if (seen[sh] && sh !== "יח׳") return; seen[sh] = 1;
      opts.push({ m: k === 0 ? "u" : "u" + k, name: u.name_he, grams: u.grams, short: sh });
    });
    var kaf = opts.filter(function (o) { return o.short === "כף"; })[0];
    if (kaf && !seen["כפית"]) opts.push({ m: "t", name: "כפית", grams: Math.round(kaf.grams / 3 * 100) / 100, short: "כפית", synth: true });
    return { id: i.id, name: i.name_he, cat: cat, p: p100, unit: unit, units: units, opts: opts, defMode: defMode, est: !!ESTIMATE[i.id], custom: !!custom, edited: !!ov, orig: i };
  }
  var ING = {}, ING_LIST = [];
  function loadIngredients() {
    ING = {}; ING_LIST = [];
    var ovs = S.overrides();
    DB.ingredients.forEach(function (i) { var x = norm(i, false, ovs[i.id]); ING[x.id] = x; ING_LIST.push(x); });
    S.customs().forEach(function (c) { var x = norm(c, true); ING[x.id] = x; ING_LIST.push(x); });
  }
  function optOf(ing, mode) { if (!mode || mode === "g") return null; for (var k = 0; k < ing.opts.length; k++) if (ing.opts[k].m === mode) return ing.opts[k]; return mode === "u" && ing.unit ? { m: "u", name: ing.unit.name_he, grams: ing.unit.grams, short: shortUnit(ing.unit.name_he) } : null; }
  function gramsOf(ing, mode, qty) { var o = optOf(ing, mode); return o ? qty * o.grams : qty; }
  function valsFor(ing, grams) { var f = grams / 100; return { kcal: ing.p.kcal * f, protein: ing.p.protein * f, carbs: ing.p.carbs * f, fat: ing.p.fat * f }; }
  function unitWord(ing, qty, mode) { var o = optOf(ing, mode || "u"), s = o ? o.short : "יח׳"; return qty === 1 ? s : (PLURAL[s] || s); }
  function qtyText(ing, mode, qty) { return optOf(ing, mode) ? n(r1(qty)) + " " + unitWord(ing, qty, mode) : n(Math.round(qty)) + " ג׳"; }
  function snapshot(id, it) {
    var ing = ING[id]; var g = gramsOf(ing, it.mode, it.qty); var v = valsFor(ing, g);
    return { ingId: id, name: ing.name, mode: it.mode, qty: it.qty, unitName: optOf(ing, it.mode) ? optOf(ing, it.mode).name : null, grams: Math.round(g * 10) / 10,
      kcal: v.kcal, protein: v.protein, carbs: v.carbs, fat: v.fat };
  }
  function itemQtyLabel(s) {
    if (s.mode && s.mode !== "g" && s.unitName) { var u = shortUnit(s.unitName); return n(r1(s.qty)) + " " + (s.qty === 1 ? u : (PLURAL[u] || u)); }
    return n(Math.round(s.grams)) + " ג׳";
  }

  // ---------- state ----------
  var draft = null;    // {meal, items:{id:{mode,qty}}, order:[], open, tab, q, added:{dishId:n}}
  var ui = { fixesOpen: false, fixAdding: false, weekOff: 0, dbCat: "all", dbQ: "" };

  // date: the day this meal belongs to (past days from the day view); editId: editing an existing meal; fixed: snapshot items whose ingredient no longer exists
  function newDraft(meal, o) { o = o || {}; draft = { meal: meal, items: {}, order: [], open: false, tab: "protein", q: "", added: {}, more: {}, date: o.date || S.dateKey(), editId: o.editId || null, fixed: [] }; }
  function setQty(id, mode, qty) {
    if (qty <= 0) { delete draft.items[id]; draft.order = draft.order.filter(function (x) { return x !== id; }); return; }
    if (!draft.items[id]) draft.order.push(id);
    draft.items[id] = { mode: mode, qty: qty };
  }
  function draftSnap() { return draft.fixed.concat(draft.order.filter(function (id) { return draft.items[id] && ING[id]; }).map(function (id) { return snapshot(id, draft.items[id]); })); }
  function tot(items) { var t = { kcal: 0, protein: 0, carbs: 0, fat: 0 }; items.forEach(function (i) { t.kcal += i.kcal; t.protein += i.protein; t.carbs += i.carbs; t.fat += i.fat; }); return t; }

  // ---------- router ----------
  function route() {
    var h = location.hash || "#/";
    ui.prevHash = ui.curHash || ""; ui.curHash = h;
    closeSheet();
    if (h.indexOf("#/login") === 0) { renderLogin(); window.scrollTo(0, 0); fabPlace(); return; }
    // v13: a new account (no profile, no goals yet) fills in its details + goals before anything else
    if (h.indexOf("#/welcome") === 0 || S.needsOnboard()) { if (!S.needsOnboard() && !ui.onb) { location.replace("#/"); return; } renderWelcome(h === "#/welcome/2" && ui.onb && ui.onb.ok1 ? 2 : 1); window.scrollTo(0, 0); fabPlace(); return; }
    if (h.indexOf("#/build") === 0) { if (!draft) newDraft(mealByTime()); renderBuild(); }
    else if (h.indexOf("#/settings") === 0) renderSettings();
    else if (h.indexOf("#/db") === 0) renderDB();
    else if (h.indexOf("#/weekly") === 0) renderWeekly();
    else if (h.indexOf("#/weight") === 0) renderWeight();
    else if (h.indexOf("#/insights/") === 0 && /^\d{4}-\d\d-\d\d$/.test(h.slice(11))) renderInsights(h.slice(11) > S.dateKey() ? S.dateKey() : h.slice(11));
    else if (h.indexOf("#/day/") === 0 && /^\d{4}-\d\d-\d\d$/.test(h.slice(6))) { applyTheme(); renderDay(h.slice(6) > S.dateKey() ? S.dateKey() : h.slice(6)); }
    else renderHome();
    window.scrollTo(0, 0);
    fabPlace(); setTimeout(fabCheck, 400);
  }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  window.addEventListener("hashchange", route);

  // ---------- home ----------
  var DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  var MONTHS = ["בינואר", "בפברואר", "במרץ", "באפריל", "במאי", "ביוני", "ביולי", "באוגוסט", "בספטמבר", "באוקטובר", "בנובמבר", "בדצמבר"];
  var DAYNAME = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  // ---------- home: activity-style rings (3 variants, chosen in settings → אפליקציה) ----------
  // Roei's macro colours (v5): calories light brown, protein green, carbs dark brown, fat mustard-yellow. Used everywhere.
  var MC = { kcal: "#C49A6C", protein: "#4E9A3A", carbs: "#5A3A22", fat: "#D9A21B" };
  var THEMES = { C: { name: "טבעות בכרטיס", kcal: MC.kcal, protein: MC.protein, carbs: MC.carbs, fat: MC.fat } };
  var GEO = {
    A: { size: 252, rings: [[112, 17], [92, 15], [74, 15], [56, 15]] },
    B: { size: 252, rings: [[110, 22], [84, 11], [70, 11], [56, 11]] },
    C: { size: 184, rings: [[82, 15], [65, 12], [51, 12], [37, 12]] }
  };
  function variant() { return "C"; }
  function applyTheme() { var v = variant(); document.documentElement.className = document.documentElement.className.replace(/\btheme-\w\b/g, "").trim() + " theme-" + v; }
  function fracs(t, g) { return [t.kcal / Math.max(1, g.kcal), t.protein / Math.max(1, g.protein), t.carbs / Math.max(1, g.carbs), t.fat / Math.max(1, g.fat)]; }
  function ringsSVG(v, f, to) {
    var G = GEO[v], T = THEMES[v], c = G.size / 2, cols = [T.kcal, T.protein, T.carbs, T.fat];
    return '<svg class="rings" width="' + G.size + '" height="' + G.size + '" viewBox="0 0 ' + G.size + " " + G.size + '" aria-hidden="true">' + G.rings.map(function (r, k) {
      var C = 2 * Math.PI * r[0], a = Math.min(1, Math.max(0, f[k])), b = to ? Math.min(1, Math.max(0, to[k])) : a;
      var over = k === 0 && (to ? to[0] : f[0]) > 1;
      return '<circle cx="' + c + '" cy="' + c + '" r="' + r[0] + '" stroke="' + cols[k] + '" stroke-opacity=".16" stroke-width="' + r[1] + '" fill="none"/>' +
        '<circle class="arc" cx="' + c + '" cy="' + c + '" r="' + r[0] + '" stroke="' + (over ? "#7A3E22" : cols[k]) + '" stroke-width="' + r[1] + '" fill="none" stroke-linecap="round" style="stroke-dasharray:' + (a * C).toFixed(1) + " " + C.toFixed(1) + (a === 0 ? ";opacity:0" : "") + '" data-to="' + (b * C).toFixed(1) + " " + C.toFixed(1) + '"/>';
    }).join("") + "</svg>";
  }
  function homeRings(t, g, from) {
    var v = variant(), T = THEMES[v], f = fracs(from || t, g), to = from ? fracs(t, g) : null;
    var eaten = Math.round(t.kcal), left = g.kcal - eaten, over = left < 0;
    var center = '<div class="c"><div class="l">' + (over ? "חרגת ב־" : "נשארו היום") + '</div><div class="k n" data-test="left" data-final="' + fmt(Math.abs(left)) + '">' + fmt(Math.abs(from ? g.kcal - Math.round(from.kcal) : left)) + '</div><div class="s"><b class="n">' + fmt(eaten) + "</b> / " + n(fmt(g.kcal)) + "</div></div>";
    var lg = function (k, label, val, goal, unit) { return '<div class="lg"><i style="background:' + T[k] + '"></i><span>' + label + "</span><b class=\"n\">" + fmt(val) + "<small>/" + fmt(goal) + "</small></b></div>"; };
    var macros = lg("protein", "חלבון", t.protein, g.protein, "ג׳") + lg("carbs", "פחמימה", t.carbs, g.carbs, "ג׳") + lg("fat", "שומן", t.fat, g.fat, "ג׳");
    if (v === "C") {
      var bar = function (k, label, val, goal) { var p = Math.min(100, Math.round(val / Math.max(1, goal) * 100)); return '<div class="cl"><span><i style="background:' + T[k] + '"></i>' + label + '</span><b class="n">' + Math.round(val) + "<small>/" + fmt(goal) + '</small></b><span class="bar"><i style="width:' + p + "%;background:" + T[k] + '"></i></span></div>'; };
      return '<button class="hero v-C' + (over ? " over" : "") + '" data-act="goals" aria-label="יעדים"><div class="ringwrap" id="ringwrap">' + ringsSVG(v, f, to) + '<div class="c mini"><div class="k n" data-test="left" data-final="' + fmt(Math.abs(left)) + '">' + fmt(Math.abs(from ? g.kcal - Math.round(from.kcal) : left)) + '</div><div class="l">' + (over ? "חריגה" : "נשארו") + "</div></div></div>" +
        '<div class="side"><div class="cl kc"><span><i style="background:' + T.kcal + '"></i>קלוריות</span><b class="n">' + fmt(eaten) + "<small>/" + fmt(g.kcal) + "</small></b></div>" + bar("protein", "חלבון", t.protein, g.protein) + bar("carbs", "פחמימה", t.carbs, g.carbs) + bar("fat", "שומן", t.fat, g.fat) + "</div></button>";
    }
    return '<button class="hero v-' + v + (over ? " over" : "") + '" data-act="goals" aria-label="יעדים"><div class="ringwrap" id="ringwrap">' + ringsSVG(v, f, to) + center + "</div>" +
      '<div class="legend">' + (v === "A" ? lg("kcal", "קלוריות", eaten, g.kcal, "") : "") + macros + "</div></button>";
  }
  // v14: a logged day "met" its calorie goal when —
  //   lose: at or under the goal (kcal ≤ goal);
  //   maintain / gain (and anyone who hasn't picked a goal type): within ±10% of the goal.
  // A day with no meals is neither met nor missed (the bar stays the empty style).
  function goalKind() { var t = (S.prefs() || {}).goalType; return t === "lose" || t === "gain" || t === "keep" ? t : "keep"; }
  function dayGoalClass(kcal) {
    if (!(kcal > 0)) return "";
    var g = S.goal().kcal;
    if (goalKind() === "lose") return kcal <= g ? "met" : "miss";
    return kcal >= g * 0.9 && kcal <= g * 1.1 ? "met" : "miss";
  }
  function weekMini(g) {
    var now = new Date(), week = [], sum = 0, cnt = 0, maxV = g.kcal * 1.15, H = 66;
    for (var i = 6; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i), k = S.day(S.dateKey(d)).totals.kcal; week.push({ d: d, k: k, today: i === 0 }); if (k > 0) { sum += k; cnt++; if (k > maxV) maxV = k; } }
    var bars = week.map(function (w) { var h = w.k > 0 ? Math.max(4, Math.round(w.k / maxV * H)) : 0, st = dayGoalClass(w.k); return '<div class="d' + (w.today ? " today" : "") + (w.k > 0 ? "" : " none") + (st ? " " + st : "") + '"><span class="kv n">' + (w.k > 0 ? fmt(w.k) : "") + '</span><i style="' + (h ? "height:" + h + "px" : "") + '"></i>' + DAYS[w.d.getDay()] + "</div>"; }).join("");
    var goalTop = 22 + (H - Math.round(g.kcal / maxV * H));   // v11: no average in the header; each bar shows its kcal
    return '<button class="sec link" data-go="#/weekly"><b>מעקב שבועי</b><span>לפירוט ←</span></button>' +
      '<button class="wk wkcard" data-go="#/weekly" aria-label="מעקב שבועי"><div class="bars kvb"><span class="gl" style="top:' + goalTop + 'px"></span>' + bars + "</div></button>";
  }
  function renderHome() {
    applyTheme();
    var now = new Date(), g = S.goal(), day = S.day(S.dateKey(now)), t = day.totals, cel = ui.celebrate; ui.celebrate = null;
    var meals = day.meals.map(function (m) {
      var names = m.items.map(function (i) { return i.name.split(",")[0]; }).join(" · ");
      var ph = mealPhotoId(m);
      var ic = ph ? '<span class="mph" data-dimg="' + ph + '" role="img" aria-label="תמונת הארוחה"></span>' : '<span class="mi emoji">' + mealInfo(m.type).ic + "</span>";
      return '<button class="ml" data-meal="' + m.id + '">' + ic + '<span class="t"><b>' + esc(m.type) + "</b><span>" + esc(names) + '</span></span><span class="k"><b class="n">' + fmt(m.totals.kcal) + "</b><span>" + n(Math.round(m.totals.protein)) + " ג׳ חלבון</span></span></button>";
    }).join("");
    $app.innerHTML =
      '<div class="home">' +
      '<div class="hd"><img src="icons/logo.png" alt=""><b>PLATO</b><span class="date">יום ' + DAYNAME[now.getDay()] + " · " + now.getDate() + " " + MONTHS[now.getMonth()] + '</span><button class="gear" data-act="menu" aria-label="תפריט" title="תפריט" aria-haspopup="true">' + ICON.menu + "</button></div>" +
      homeRings(t, g, cel ? cel.before : null) +
      '<div class="sec"><b>מה אכלתי היום</b><span class="sr">' + (day.meals.length ? n(day.meals.length) + (day.meals.length === 1 ? " ארוחה" : " ארוחות") : "") + "</span></div>" +
      (meals ? '<div class="meals">' + meals + "</div>" : '<div class="empty-card">עוד לא נרשמו ארוחות היום</div>') +
      '<div class="cta"><button class="btn pri" data-act="newmeal">＋ ארוחה חדשה</button></div>' +
      weekMini(g) +
      "</div>";
    hydrate($app);   // v14: meal thumbnails from the saved-dish photo
    if (cel) { var cmsg = cel.msg; celebrate(); fabCheer(cmsg); }
  }

  // ---------- save effect: rings fill up, number counts, confetti burst, little bounce ----------
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function buzz() { try { if (navigator.vibrate) navigator.vibrate([14, 40, 22]); } catch (e) {} }
  function celebrate() {
    var wrap = document.getElementById("ringwrap"); if (!wrap) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      wrap.querySelectorAll(".arc").forEach(function (a) { a.style.opacity = 1; a.style.strokeDasharray = a.getAttribute("data-to"); });
      wrap.classList.add("bounce");
    }); });
    var k = wrap.querySelector("[data-final]"), from = parseInt(k.textContent.replace(/,/g, ""), 10), to = parseInt(k.getAttribute("data-final").replace(/,/g, ""), 10), step = 0, N = 24;
    var iv = setInterval(function () { step++; var v = Math.round(from + (to - from) * (1 - Math.pow(1 - step / N, 3))); k.textContent = fmt(v); if (step >= N) { clearInterval(iv); k.textContent = k.getAttribute("data-final"); } }, 28);
    if (REDUCED) return;
    var r = wrap.getBoundingClientRect(), box = document.createElement("div"); box.className = "confetti";
    box.style.left = (r.left + r.width / 2) + "px"; box.style.top = (r.top + r.height / 2 + window.scrollY) + "px";
    var cols = ["#2E6B2A", "#4E9A3A", "#9DBF6E", "#7A5A3F", "#C2A878", "#E8B84A", "#FBF8F1"];
    for (var i = 0; i < 34; i++) {
      var p = document.createElement("i"), ang = (i / 34) * Math.PI * 2 + Math.random() * 0.4, dist = 90 + Math.random() * 90;
      p.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(0) + "px"); p.style.setProperty("--dy", (Math.sin(ang) * dist - 30).toFixed(0) + "px");
      p.style.setProperty("--rot", (Math.random() * 540 - 270).toFixed(0) + "deg"); p.style.background = cols[i % cols.length];
      p.style.animationDelay = (Math.random() * 80).toFixed(0) + "ms"; if (i % 3 === 0) p.className = "dot";
      box.appendChild(p);
    }
    document.body.appendChild(box); setTimeout(function () { box.remove(); }, 1500);
  }

  // ---------- friendly tips (contextual: weakest macro vs. the time of day) ----------
  var TIPS = {
    protein: ["היי {n}, יאללה נעשה שייק חלבון זריז בשביל הכמות היומית 💪", "{n}, חסר עוד קצת חלבון היום. 200 ג׳ טופו או קוטג׳ יסגרו פינה.", "מה דעתך על חביתה משתי ביצים? עוד 12 ג׳ חלבון בקלות 🍳", "יוגורט יווני עם קצת פרי: חטיף חלבון שמרגיש כמו קינוח.", "{n}, חזה עוף או טונה לארוחה הבאה, ונראה את טבעת החלבון נסגרת.", "טבעת החלבון מחכה לך {n}. קוטג׳ על פריכית וזהו."],
    proteinEve: ["ערב טוב {n} 🌙 קוטג׳ לפני השינה זה חלבון שעובד כל הלילה.", "{n}, עוד קצת חלבון לפני שהיום נגמר? יוגורט חלבון יעשה את העבודה."],
    fat: ["היי {n}, מה לא נאכל קצת אגוזי מלך לחיזוק מאגרי השומן? 🌰", "כף טחינה על הסלט: שומן טוב וטעם של בית.", "חצי אבוקדו לצד הארוחה ישלים את השומן היומי בכיף 🥑", "{n}, כפית חמאת בוטנים על פריכית? מגיע לך.", "קצת שמן זית על הירקות, וטבעת השומן תגיד תודה 🫒"],
    carbs: ["{n}, חסרה אנרגיה? פרוסת לחם מלא או קצת אורז יחזירו את הכוח.", "בננה לפני אימון: פחמימה מהירה וטעימה 🍌", "שיבולת שועל בבוקר נותנת אנרגיה לכל היום.", "{n}, פסטה בערב? בהחלט, בכמות שמתאימה ליעד 🍝"],
    start: ["בוקר טוב {n}! ☀️ מתחילים את היום עם ארוחת בוקר טובה?", "{n}, היום עוד ריק. בוא נבנה ארוחה ראשונה 🍽️", "ביצים, לחם וירקות: ארוחת בוקר קלאסית שפותחת יום טוב."],
    good: ["וואו {n}, אתה ממש בקצב היום! 🎯", "איזון יפה בין חלבון, פחמימה ושומן. ככה ממשיכים 💚", "יום מאוזן! אולי כוס מים גדולה כפרס? 💧"],
    almost: ["כמעט ביעד {n}. ירקות טריים הם הבחירה הכי חכמה עכשיו 🥒", "{n}, הליכה קצרה אחרי הארוחה תעשה טוב לגוף ולראש 🚶"],
    over: ["עברנו קצת את היעד היום. לא נורא, מחר יום חדש 🌱", "{n}, היום היה עשיר. סלט גדול וכוס מים, ואנחנו מאוזנים 🥗"]
  };
  function tipFor(t, g, h) {
    var rk = t.kcal / Math.max(1, g.kcal);
    if (t.kcal <= 0) return "start";
    if (rk > 1.02) return "over";
    var exp = Math.min(1, Math.max(0.2, (h - 7) / 13));
    var r = { protein: t.protein / Math.max(1, g.protein), carbs: t.carbs / Math.max(1, g.carbs), fat: t.fat / Math.max(1, g.fat) };
    var low = Object.keys(r).sort(function (a, b) { return r[a] - r[b]; })[0];
    if (rk > 0.9 && r[low] > 0.75) return "almost";
    if (r[low] < exp * 0.85) return low === "protein" && h >= 19 ? "proteinEve" : low;
    return "good";
  }
  // v11: targeted tips — what's actually missing / over today, with foods from HIS database (frequent first) and the amount that closes the gap
  function pn(x) { return String(x); }   // tips are plain text (escaped), so no <span class=n> number wrappers
  var TIP_PL = { "ביצה": "ביצים", "פרוסה": "פרוסות", "גביע": "גביעים", "כף": "כפות", "כפית": "כפיות", "אריזה": "אריזות", "מנה": "מנות", "כוס": "כוסות", "חופן": "חפנים", "חזה": "חזות" };
  var TIP_MAC = {
    protein: { cat: "protein", dens: function (p) { return p.protein * 4 / Math.max(1, p.kcal); }, min: 0.3, cap: 35 },
    carbs: { cat: "carb", dens: function (p) { return p.carbs * 4 / Math.max(1, p.kcal); }, min: 0.55, cap: 55 },
    fat: { cat: "fat", dens: function (p) { return p.fat * 9 / Math.max(1, p.kcal); }, min: 0.6, cap: 18 }
  };
  function tipAmount(ing, grams) {   // "3 ביצים" · "2 פרוסות גבינה צהובה 20%" · "200 ג׳ קוטג׳ 1%"
    var food = ing.name.split(",")[0].trim(), u = ing.unit;
    if (u && u.grams > 0) {
      var k = Math.round(grams / u.grams), w = cleanUnit(u.name_he).split(" ")[0];
      if (k >= 1 && k <= 4 && Math.abs(k * u.grams - grams) / grams <= 0.35 && (k === 1 || TIP_PL[w])) {
        var lead = food.indexOf(w) === 0, unitTxt = k === 1 ? w : pn(k) + " " + TIP_PL[w];
        return { txt: lead ? (k === 1 ? food : unitTxt) : unitTxt + " " + food, g: k * u.grams };
      }
    }
    var gr = grams < 60 ? Math.max(5, Math.round(grams / 5) * 5) : Math.round(grams / 10) * 10;
    return { txt: pn(gr) + " ג׳ " + food, g: gr };
  }
  function tipFoods(mac, need, roomK) {   // ranked by his use (frequency+recency), then his own products, then density; must fit the kcal left
    var M = TIP_MAC[mac];
    var list = ING_LIST.filter(function (i) { return i.p && i.p.kcal > 0 && i.p[mac] > 0 && M.dens(i.p) >= M.min && (i.cat === M.cat || S.useScore(i.id) > 0); });
    list = list.map(function (i) { return { i: i, s: S.useScore(i.id) * 10 + (i.orig && i.orig.is_roei_product || i.custom ? 1 : 0) + M.dens(i.p) * 0.5 }; }).sort(function (a, b) { return b.s - a.s; }).map(function (o) { return o.i; });
    var out = [], seen = {};
    for (var k = 0; k < list.length && out.length < 2; k++) {
      var ing = list[k], u = ing.unit, maxG = u && u.grams > 0 ? u.grams * (u.grams <= 80 ? 3 : u.grams <= 150 ? 2 : 1) : 250;
      var grams = Math.min(maxG, need / (ing.p[mac] / 100)), a = tipAmount(ing, grams), v = valsFor(ing, a.g), key = ing.name.split(" ")[0];
      if (seen[key]) continue;
      if (roomK != null && v.kcal > Math.max(roomK, 120) + 60) continue;
      seen[key] = 1; out.push({ txt: a.txt, got: Math.round(v[mac]), kcal: Math.round(v.kcal) });
    }
    return out;
  }
  function smartTips(name) {
    var day = S.day(), t = day.totals, g = S.goal(), now = new Date(), h = now.getHours() + now.getMinutes() / 60;
    if (!day.meals.length || t.kcal <= 0) return [];
    var f = Math.max(0.2, Math.min(1, (h - 7) / 13)), late = h >= 20, early = h < 11.5, roomK = g.kcal - t.kcal, out = [];
    var gap = { protein: g.protein - t.protein, carbs: g.carbs - t.carbs, fat: g.fat - t.fat };
    var behind = function (m) { return t[m] < g[m] * f * 0.9; };
    var gr = function (x) { return pn(Math.round(x)) + " ג׳"; };
    var foodsTxt = function (fs, m, need) {
      if (!fs.length) return "";
      var a = fs[0], closes = a.got >= gap[m] * 0.85, w = m === "protein" ? "חלבון" : m === "carbs" ? "פחמימה" : "שומן";
      return a.txt + (closes ? " יסגרו את הפער כמעט לגמרי" : " יוסיפו " + gr(a.got) + " " + w) + (fs[1] ? ", או " + fs[1].txt + " (" + gr(fs[1].got) + ")" : "") + ".";
    };
    // over on calories: gentle, never preachy
    if (t.kcal > g.kcal * 1.02) {
      var ot = name + ", עברנו את היעד היום ב־" + pn(fmt(t.kcal - g.kcal)) + " קלוריות. לא נורא 🌱 להמשך היום ירקות וכוס מים, ומחר מתאפסים.";
      if (gap.protein > 15) { var lf = tipFoods("protein", Math.min(gap.protein, 25), 0); if (lf.length) ot += " ואם בכל זאת רעב: " + lf[0].txt + ", חלבוני וקל (" + pn(lf[0].kcal) + " קל׳)."; }
      out.push(ot);
    }
    // protein short — the main one
    if (gap.protein > 8 && behind("protein") && t.kcal <= g.kcal * 1.02) {
      var need = late ? Math.min(gap.protein, 45) : Math.min(gap.protein, TIP_MAC.protein.cap), fs = tipFoods("protein", need, roomK);
      var head = early ? "בוקר טוב " + name + " ☀️ יש עוד " + gr(gap.protein) + " חלבון ליום. להתחיל חזק: " : late ? "ערב טוב " + name + " 🌙 נשארו עוד " + gr(gap.protein) + " חלבון. " : name + ", חסרים עוד " + gr(gap.protein) + " חלבון היום 💪 ";
      if (fs.length) out.push(head + foodsTxt(fs, "protein", need) + (late && gap.protein > 45 ? " לא חייבים לסגור הכל הערב." : ""));
    }
    // over on fat / carbs: a gentle note
    if (t.fat > g.fat * 1.08) out.push("השומן כבר " + gr(t.fat) + " מתוך " + gr(g.fat) + " היום. לא דרמה 🙂 להמשך היום עדיף חלבון רזה וירקות, ושמן או טחינה למדוד בכפית.");
    else if (!late && f < 0.75 && t.fat > g.fat * f * 1.5 && t.fat > g.fat * 0.6) out.push(name + ", השומן רץ היום מהר מהקלוריות (" + gr(t.fat) + " מתוך " + gr(g.fat) + "). בארוחה הבאה כדאי ללכת על חלבון רזה, וזהו 🫒");
    if (t.carbs > g.carbs * 1.08) out.push("הפחמימה כבר " + gr(t.carbs) + " מתוך " + gr(g.carbs) + ". בארוחה הבאה אפשר לוותר על הלחם/האורז ולמלא בירקות וחלבון 🥗");
    // carbs / fat short (only if there's room in the calories)
    if (gap.carbs > 20 && behind("carbs") && roomK > 150) { var cn = Math.min(gap.carbs, TIP_MAC.carbs.cap), cf = tipFoods("carbs", cn, roomK); if (cf.length) out.push(name + ", חסרה עוד פחמימה (" + gr(gap.carbs) + "). " + (h >= 7 && h < 18 ? "אנרגיה לשאר היום: " : "") + foodsTxt(cf, "carbs", cn)); }
    if (gap.fat > 8 && behind("fat") && roomK > 100) { var fn = Math.min(gap.fat, TIP_MAC.fat.cap), ff = tipFoods("fat", fn, roomK); if (ff.length) out.push("השומן הטוב עוד חסר (" + gr(gap.fat) + "). " + foodsTxt(ff, "fat", fn) + " 🥑"); }
    // a lot of calories left late in the day
    if (!out.length && h >= 18.5 && roomK > g.kcal * 0.35) out.push(name + ", נשארו עוד " + pn(fmt(roomK)) + " קלוריות להיום. ארוחת ערב מלאה בהחלט בתכנון 🍽️");
    return out.slice(0, 3);
  }
  function tipText(cat, rot) {
    var pool = TIPS[cat], d = S.dateKey(), seed = 0; for (var i = 0; i < d.length; i++) seed = (seed * 31 + d.charCodeAt(i)) % 997;
    var name = (S.profile().name || "").trim(), sm = [];   // v13: no hardcoded name any more (it used to fall back to "רועי")
    try { sm = smartTips(name); } catch (e) { sm = []; }
    var t = rot < sm.length ? sm[rot] : pool[(seed + rot - sm.length) % pool.length].replace(/\{n\}/g, name);   // targeted first, then the general pool ("עוד טיפ ↻" walks through both)
    return name ? t : t.replace(/^\s*,\s*/, "").replace(/ ([,!.])/g, "$1").replace(/\s{2,}/g, " ").trim();
  }
  // ---------- floating tip button (all screens): peeks from the edge, pops out when there's a new relevant tip ----------
  var fab = { el: null, idle: null, autoClose: null, lastKey: "" };
  function tipNow() { var t = S.day().totals, g = S.goal(), h = new Date().getHours(); return { cat: tipFor(t, g, h), band: h < 11 ? "m" : h < 16 ? "d" : h < 20 ? "e" : "n", meals: S.day().meals.length }; }
  function tipKey(x) { return S.dateKey() + "|" + x.cat + "|" + x.band + "|" + x.meals; }
  function fabInit() {
    var d = document.createElement("div"); d.id = "tipfab"; d.className = "tipfab peek";
    d.innerHTML = '<div class="tippop" id="tippop" role="dialog" aria-label="טיפ אישי" hidden><p id="tiptext"></p><div class="tpb"><button data-act="tipnext">עוד טיפ ↻</button><button class="x" data-act="tipclose" aria-label="סגירה">✕</button></div></div>' +
      '<button class="fab" data-act="tipopen" aria-label="טיפ אישי"><img src="icons/logo.png" alt=""><span class="badge"></span></button>';
    document.body.appendChild(d); fab.el = d;
    new MutationObserver(function () { document.body.classList.toggle("sheet-open", $sheet.children.length > 0); if ($sheet.children.length) tipClose(true); }).observe($sheet, { childList: true });
    window.addEventListener("scroll", fabPeekSoon, { passive: true });
    document.addEventListener("scroll", function (e) { if (e.target && e.target.id === "list") fabPeekSoon(); }, true);
    setInterval(fabCheck, 60000);
  }
  function fabPlace() { if (!fab.el) return; var b = (location.hash || "").indexOf("#/build") === 0; fab.el.classList.toggle("lift", b); document.body.classList.toggle("nofab", (location.hash || "").indexOf("#/login") === 0 || (location.hash || "").indexOf("#/welcome") === 0 || S.needsOnboard()); document.body.classList.toggle("sum-open", b && !!draft && !!draft.open); }
  function fabOut(fresh) {
    var e = fab.el; if (!e) return; clearTimeout(fab.idle);
    e.classList.remove("peek"); e.classList.add("out"); if (fresh) { e.classList.remove("bounce2"); void e.offsetWidth; e.classList.add("bounce2", "new"); }
    fab.idle = setTimeout(fabPeek, 5000);
  }
  function fabPeek() { var e = fab.el; if (!e || e.classList.contains("open")) return; e.classList.remove("out", "bounce2"); e.classList.add("peek"); }
  function fabPeekSoon() { if (fab.el && !fab.el.classList.contains("open")) fabPeek(); }
  function fabCheck() { var k = tipKey(tipNow()), pr = S.prefs().tip || {}; if (k !== pr.seenKey && k !== fab.lastKey) { if (/^#\/build/.test(location.hash)) { if (fab.el && !fab.el.classList.contains("open")) { fab.el.classList.add("new"); fabPeek(); } return; } fab.lastKey = k; fabOut(true); } }
  function tipRot() { var tp = S.prefs().tip || {}; return tp.date === S.dateKey() ? tp.rot || 0 : 0; }
  function tipOpen(cheer, msg) {
    var e = fab.el, x = tipNow(); if (!e) return; clearTimeout(fab.idle); clearTimeout(fab.autoClose);
    document.getElementById("tiptext").innerHTML = (cheer ? "<b>כל הכבוד! 🎉" + (msg ? " <small>" + esc(msg) + "</small>" : "") + "</b>" : "") + esc(tipText(x.cat, tipRot()));
    e.setAttribute("data-cat", x.cat);
    var tp = S.prefs().tip || {}; S.setPrefs({ tip: { date: S.dateKey(), hidden: false, rot: tipRot(), seenKey: tipKey(x) } });
    e.classList.remove("peek", "new"); e.classList.add("out", "open"); document.getElementById("tippop").hidden = false;
  }
  function tipClose(quiet) { var e = fab.el; if (!e) return; clearTimeout(fab.autoClose); e.classList.remove("open"); document.getElementById("tippop").hidden = true; if (!quiet) fab.idle = setTimeout(fabPeek, 1800); else fabPeek(); }
  function fabCheer(msg) { fabOut(true); setTimeout(function () { tipOpen(true, msg); fab.autoClose = setTimeout(function () { tipClose(); }, 4500); }, 900); }

  // ---------- v7: 🧠 daily insights — rule-based daily insights (no server, no AI) ----------
  function insights(key) {
    var g = S.goal(), day = S.day(key), t = day.totals, today = key === S.dateKey(), now = new Date();
    var h = now.getHours() + now.getMinutes() / 60, f = today ? Math.max(0.25, Math.min(1, (h - 7) / 13)) : 1, full = f >= 1;
    var name = (S.profile().name || "").trim(), good = [], miss = [], focus = [];
    var meals = day.meals, cnt = meals.length;
    if (!cnt) return { empty: true, partial: !full, name: name, good: [], miss: [], focus: [] };
    var rk = t.kcal / Math.max(1, g.kcal * f), rp = t.protein / Math.max(1, g.protein * f), rc = t.carbs / Math.max(1, g.carbs * f), rf = t.fat / Math.max(1, g.fat * f);
    var pg = function (x) { return n(fmt(x)); };
    // calories
    if (rk >= 0.9 && rk <= 1.08) good.push("הקלוריות " + (full ? "בדיוק ביעד" : "בקצב מצוין") + ": " + pg(t.kcal) + " מתוך " + pg(g.kcal));
    else if (rk > 1.08) { miss.push(full ? "חריגה של " + pg(t.kcal - g.kcal) + " קלוריות מהיעד" : "הקצב קצת מהיר: כבר " + pg(t.kcal) + " קלוריות"); focus.push(full ? "בארוחה הגדולה של מחר — מנה קצת קטנה יותר, ולמדוד שמן וממרחים בכפית" : "להמשך היום: ארוחה קלה עם חלבון וירקות, בלי נשנושים מיותרים"); }
    else if (rk < 0.8) { if (full) { miss.push("חסרו בערך " + pg(g.kcal - t.kcal) + " קלוריות ליעד"); focus.push("לא לדלג על ארוחות — מעט מדי אוכל מאט את ההתקדמות ומעייף"); } else focus.push("נשארו עוד " + pg(g.kcal - t.kcal) + " קלוריות להיום — מקום לארוחה מסודרת"); }
    else good.push("הקלוריות קרובות ליעד (" + pg(t.kcal) + ")");
    // protein
    if (rp >= 0.9) good.push("חלבון מעולה: " + n(Math.round(t.protein)) + " ג׳" + (full ? " מתוך " + n(g.protein) : "") + " 💪");
    else if (rp < 0.75) { miss.push((full ? "חסרו " : "עד עכשיו חסרים ") + n(Math.round(g.protein * f - t.protein)) + " ג׳ חלבון"); focus.push("מקור חלבון בכל ארוחה — ביצים, קוטג׳, יוגורט, עוף או טופו"); }
    else focus.push("עוד קצת חלבון — " + n(Math.round(g.protein * f - t.protein)) + " ג׳ (למשל גביע יוגורט או 2 ביצים)");
    // vegetables & fruit
    var veg = 0, fruit = 0; meals.forEach(function (m) { m.items.forEach(function (i) { var c = ING[i.ingId] ? ING[i.ingId].cat : ""; if (c === "vegetable") veg += i.grams || 0; if (c === "fruit") fruit += i.grams || 0; }); });
    if (veg >= 200) good.push("ירקות: " + n(Math.round(veg)) + " ג׳ 🥗");
    else if (veg > 0) focus.push("עוד ירקות — היו " + n(Math.round(veg)) + " ג׳, היעד הוא בערך 400 ג׳ ביום");
    else { (full ? miss : focus).push(full ? "לא היו ירקות " + (today ? "היום" : "ביום הזה") : "עוד לא היו ירקות היום — סלט קטן לארוחה הבאה"); if (full) focus.push("ירק בכל ארוחה — מלפפון, עגבנייה, סלט — נפח גדול, מעט קלוריות"); }
    if (fruit > 0) good.push("היה פרי 🍎"); else if (full) focus.push("פרי אחד ביום — מתוק טבעי וויטמינים");
    // fat / carbs
    if (rf > 1.15) { miss.push("השומן גבוה: " + n(Math.round(t.fat)) + " ג׳ מתוך " + n(g.fat)); focus.push("שמן, טחינה ואגוזים — כף אחת זה כבר 90–120 קלוריות, כדאי למדוד"); }
    if (rc > 1.2) { miss.push("הרבה פחמימות: " + n(Math.round(t.carbs)) + " ג׳ מתוך " + n(g.carbs)); focus.push("פחות לחם/אורז בצלחת, ולהשלים נפח עם ירקות"); }
    else if (full && rc < 0.5) { miss.push("מעט פחמימות (" + n(Math.round(t.carbs)) + " ג׳)"); focus.push("פחמימה טובה לפני אימון — שיבולת שועל, אורז או פרי"); }
    if (rf <= 1.15 && rc <= 1.2 && rf >= 0.6 && rc >= 0.6) good.push("איזון טוב בין פחמימה לשומן");
    var share = t.kcal > 0 ? t.protein * 4 / t.kcal : 0;
    if (share >= 0.27) good.push("יחס מצוין: " + n(Math.round(share * 100) + "%") + " מהקלוריות הגיעו מחלבון");
    // meals: how many, how spread, breakfast, heavy evening
    var by = {}; meals.forEach(function (m) { by[m.type] = (by[m.type] || 0) + m.totals.kcal; });
    var big = meals.reduce(function (a, m) { return m.totals.kcal > a ? m.totals.kcal : a; }, 0), bigShare = t.kcal ? big / t.kcal : 0;
    if (cnt >= 3) good.push(n(cnt) + " ארוחות מפוזרות לאורך היום");
    else if (full) miss.push(cnt === 1 ? "רק ארוחה אחת נרשמה" : "רק 2 ארוחות נרשמו");
    if (cnt >= 2 && bigShare > 0.5) { miss.push(n(Math.round(bigShare * 100) + "%") + " מהקלוריות הגיעו בארוחה אחת"); focus.push("לפזר את האוכל טוב יותר — 3–4 ארוחות שוות פחות או יותר"); }
    if (!by["בוקר"] && (full || h >= 11)) focus.push("ארוחת בוקר עם חלבון — מקלה על כל היום ועל הערב");
    if (t.kcal > 600 && (by["ערב"] || 0) + (by["נשנוש"] || 0) > t.kcal * 0.5) focus.push("רוב האוכל הגיע בערב — כדאי להקדים חלק לצהריים");
    if (!good.length) good.push("רשמת את כל מה שאכלת — זה כבר חצי מהדרך");
    if (!miss.length) miss.push("כמעט כלום — יום מאוזן מאוד 👏");
    if (!focus.length) focus.push("להמשיך בדיוק ככה");
    return { partial: !full, name: name, good: good.slice(0, 4), miss: miss.slice(0, 4), focus: focus.filter(function (x, i, a) { return a.indexOf(x) === i; }).slice(0, 3) };
  }
  function insHead(x, key) {
    if (x.empty) return "עוד לא נרשמו ארוחות" + (key === S.dateKey() ? " היום" : " ביום הזה") + ", " + esc(x.name) + ".";
    if (x.partial) return esc(x.name) + ", זה מה שעולה מהיום עד עכשיו. התמונה המלאה מתבהרת לקראת הערב.";
    var gN = x.good.length, mN = x.miss[0].indexOf("כמעט כלום") === 0 ? 0 : x.miss.length;
    return esc(x.name) + ", " + (mN === 0 ? "יום מצוין! כמעט הכל בדיוק במקום." : gN >= mN ? "יום טוב בסך הכל — הנה מה שלמדנו ממנו." : "היו דברים טובים, ויש על מה לעבוד מחר. ככה מתקדמים.");
  }
  function dateHead(key) { var p = key.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]); return "יום " + DAYNAME[d.getDay()] + ", " + d.getDate() + "." + (d.getMonth() + 1); }
  function renderInsights(key) {
    var x = insights(key), today = key === S.dateKey();
    var sec = function (cls, ic, title, arr) { return '<div class="card ins ' + cls + '"><div class="ih"><span class="emoji">' + ic + "</span><b>" + title + "</b></div><ul>" + arr.map(function (l) { return "<li>" + l + "</li>"; }).join("") + "</ul></div>"; };
    if ((ui.prevHash || "").indexOf("#/insights/") !== 0) ui.insFrom = ui.prevHash || "#/";   // v10: remember where he came from while switching days
    var fr = ui.insFrom || "#/";
    var back = fr.indexOf("#/day/") === 0 ? '<button class="back" data-go="#/day/' + key + '">→ ' + dayLabel(key) + "</button>" : fr.indexOf("#/build") === 0 && draft ? '<button class="back" data-go="#/build">→ חזרה לארוחה</button>' : '<button class="back" data-act="home">→ חזרה</button>';
    var tk = S.dateKey(), yk = shiftKey(tk, -1), wk = shiftKey(tk, -7);
    var chip = function (k, label) { return '<button class="ichip' + (k === key ? " on" : "") + '" data-go="#/insights/' + k + '"' + (k === key ? ' aria-current="date"' : "") + ">" + label + "</button>"; };
    var nav = '<div class="dnav inav"><button class="ib" data-go="#/insights/' + shiftKey(key, -1) + '" aria-label="יום קודם">' + ICON.chevR + "</button><div class=\"ititle\"><h1>מסקנות</h1><div class=\"isub\">" + dateHead(key) + '</div></div><button class="ib" data-go="#/insights/' + shiftKey(key, 1) + '" aria-label="יום הבא"' + (key >= tk ? " disabled" : "") + ">" + ICON.chevL + "</button></div>" +
      '<div class="ichips">' + chip(tk, "היום") + chip(yk, "אתמול") + chip(wk, "לפני שבוע") + "</div>";
    $app.innerHTML = '<div class="set insp"><div class="phd">' + back + nav.split('<div class="ichips">')[0] + '</div><div class="ichips">' + nav.split('<div class="ichips">')[1] + (today && x.partial && !x.empty ? '<div class="sofar">⏳ עד עכשיו · מתעדכן לאורך היום</div>' : "") + '<p class="lead">' + insHead(x, key) + "</p>" +
      (x.empty ? '<div class="empty-card">כשיהיו ארוחות רשומות — יופיע כאן מה היה טוב ומה חסר</div>' :
        sec("good", "✅", "מה היה טוב", x.good) + sec("miss", "⚠️", "מה חסר", x.miss) + sec("focus", "🎯", "על מה לשים דגש", x.focus)) +
      '<div class="cta"><button class="btn sec2" data-go="#/day/' + key + '">לפירוט הארוחות</button></div></div>';
  }

  // ---------- day view (from מעקב שבועי): see / edit / add meals on any day ----------
  function dayLabel(key) {
    var today = S.dateKey(), y = new Date(); y.setDate(y.getDate() - 1);
    if (key === today) return "היום"; if (key === S.dateKey(y)) return "אתמול";
    var p = key.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return "יום " + DAYNAME[d.getDay()] + " · " + d.getDate() + " " + MONTHS[d.getMonth()];
  }
  function shiftKey(key, n2) { var p = key.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2] + n2); return S.dateKey(d); }
  function renderDay(key) {   // v10.2 (Roei's pick, option C): numbers first · meals table with what he ate · מסקנות teaser · compact add
    var g = S.goal(), day = S.day(key), t = day.totals, today = S.dateKey(), T = THEMES[variant()];
    var gram = " ג׳";
    var row = function (cls, label, color, v, goal, unit, isPro) {
      v = Math.round(v); var d = v - goal, near = Math.abs(d) <= Math.max(goal * 0.05, isPro ? 5 : 0), st, sc;
      if (near) { st = "ביעד ✓"; sc = "ok"; }
      else if (d > 0) { st = "+" + n(fmt(d)) + (unit ? "" : "") + " מעל"; sc = isPro ? "ok" : "over"; }
      else if (isPro) { st = "חסרו " + n(fmt(-d)) + unit; sc = "short"; }
      else { st = "נשארו " + n(fmt(-d)) + unit; sc = "left"; }
      var pct = Math.min(100, v / Math.max(1, goal) * 100);
      return '<div class="drow ' + cls + '"><span class="dl"><i style="background:' + color + '"></i>' + label + '</span><span class="dv2" dir="ltr"><b>' + fmt(v) + '</b><small> / ' + fmt(goal) + unit + '</small></span><span class="ds ' + sc + '">' + st + '</span>' +
        '<span class="dbar"><i style="width:' + pct.toFixed(0) + "%;background:" + color + '"></i></span></div>';
    };
    var meals = day.meals.slice().sort(function (x, y) { return x.createdAt - y.createdAt; });
    var hm = function (ts) { var d = new Date(ts); return d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2); };
    var rows = meals.map(function (m) {
      var M = mealInfo(m.type), names = m.items.map(function (i) { return esc(i.name.split(",")[0]); }).join(" · ");
      return '<button class="dmr" data-meal="' + m.id + '" data-key="' + key + '" aria-label="עריכת ' + esc(M.title) + '">' +
        '<span class="dmn"><span class="emoji">' + M.ic + "</span><b>" + esc(m.type) + '</b><small class="n">' + hm(m.createdAt) + "</small>" + (m.editedAt ? '<em>נערך</em>' : "") + "</span>" +
        '<span class="dkc n">' + fmt(m.totals.kcal) + '</span><span class="dpr n">' + Math.round(m.totals.protein) + '</span><span class="dcb n">' + Math.round(m.totals.carbs) + '</span><span class="dft n">' + Math.round(m.totals.fat) + "</span>" +
        '<span class="dpen" aria-hidden="true">' + ICON.pencil + "</span>" +
        '<span class="dit">' + names + "</span></button>";
    }).join("");
    var x = insights(key), tease = "";
    if (!x.empty) {
      var pts = (x.miss.length && x.miss[0].indexOf("כמעט כלום") !== 0 ? x.miss : x.good).slice(0, 3);
      tease = '<button class="card dtease" data-go="#/insights/' + key + '"><span class="tx"><b>מסקנות' + (key === today && x.partial ? ' <small>· עד עכשיו</small>' : "") + "</b>" + pts.join(" · ") + '</span><span class="go">לכל המסקנות ←</span></button>';
    }
    $app.innerHTML = '<div class="set dayp dayc"><div class="phd"><button class="back" data-go="#/weekly">→ מעקב שבועי</button>' +
      '<div class="dnav"><button class="ib" data-go="#/day/' + shiftKey(key, -1) + '" aria-label="יום קודם">' + ICON.chevR + '</button><h1>' + dayLabel(key) + '</h1><button class="ib" data-go="#/day/' + shiftKey(key, 1) + '" aria-label="יום הבא"' + (key >= today ? " disabled" : "") + ">" + ICON.chevL + "</button></div></div>" +
      '<div class="card dsum">' + row("dk", "קלוריות", T.kcal, t.kcal, g.kcal, "", false) + row("dp", "חלבון", T.protein, t.protein, g.protein, gram, true) + row("dc", "פחמימה", T.carbs, t.carbs, g.carbs, gram, false) + row("df", "שומן", T.fat, t.fat, g.fat, gram, false) + "</div>" +
      (meals.length ? '<div class="card dtab"><div class="dth"><span>ארוחה</span><span>קל׳</span><span>חלבון</span><span>פחמ׳</span><span>שומן</span><span></span></div>' + rows + "</div>"
        : '<div class="empty-card">לא נרשמו ארוחות ביום הזה</div>') +
      tease +
      '<div class="dadd"><button class="btn-sm" data-act="newmealday" data-key="' + key + '">＋ הוספת ארוחה ' + (key === today ? "להיום" : "ליום הזה") + "</button></div></div>";
  }

  // ---------- sheets ----------
  function openSheet(html, cls) {
    $sheet.innerHTML = '<div class="sheet-wrap ' + (cls || "") + '"><div class="dim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + "</div></div>";
  }
  function closeSheet() { $sheet.innerHTML = ""; }
  function head(title, ic) { return '<div class="sh-head">' + (ic ? '<span class="tile emoji">' + ic + "</span>" : "") + "<h3>" + title + '</h3><button class="x" data-act="close" aria-label="סגירה">✕</button></div>'; }

  function sheetNewMeal(key) {
    key = key || S.dateKey(); ui.nmDate = key;
    var day = S.day(key), past = key !== S.dateKey(), sel = mealByTime();
    if (past) { var have = {}; day.meals.forEach(function (m) { have[m.type] = 1; }); sel = "נשנוש"; for (var q = 0; q < MEALS.length; q++) if (!have[MEALS[q].id]) { sel = MEALS[q].id; break; } }
    var logged = {}; day.meals.forEach(function (m) { logged[m.type] = (logged[m.type] || 0) + m.totals.kcal; });
    var rows = MEALS.map(function (m) {
      return '<button class="mo' + (m.id === sel ? " sel" : "") + '" data-pick="' + m.id + '" aria-pressed="' + (m.id === sel) + '"><span class="tile emoji ' + m.tone + '">' + m.ic + '</span><span class="st"><b>' + m.id + "</b><small>" + (/^\d/.test(m.hint) ? n(m.hint) : m.hint) + "</small></span>" + (logged[m.id] ? '<span class="lg">✓ ' + n(fmt(logged[m.id])) + " קלוריות</span>" : "") + '<span class="rad"></span></button>';
    }).join("");
    openSheet(head("איזו ארוחה?") + (past ? '<p class="nmdate">ל' + dayLabel(key) + "</p>" : "") + '<div class="mlist">' + rows + '</div><button class="btn pri" data-act="startbuild">המשך · <span id="goName">' + sel + "</span></button>", "nm");
  }
  function sheetMeal(id, key) {
    key = key || S.dateKey();
    var day = S.day(key), m = day.meals.filter(function (x) { return x.id === id; })[0]; if (!m) return;
    var time = new Date(m.createdAt);
    var lines = m.items.map(function (i) { return '<div class="ln"><span class="q">' + itemQtyLabel(i) + '</span><span class="nm">' + esc(i.name) + '</span><span class="kc n">' + fmt(i.kcal) + "</span></div>"; }).join("");
    openSheet(head(esc(mealInfo(m.type).title), mealInfo(m.type).ic) + (key !== S.dateKey() ? '<p class="nmdate">' + dayLabel(key) + "</p>" : "") +
      '<div class="items">' + lines + "</div>" +
      '<div class="totline"><span>חלבון ' + n(Math.round(m.totals.protein)) + " · פחמ׳ " + n(Math.round(m.totals.carbs)) + " · שומן " + n(Math.round(m.totals.fat)) + " ג׳ · " + n(String(time.getHours()).padStart(2, "0") + ":" + String(time.getMinutes()).padStart(2, "0")) + "</span><b>" + n(fmt(m.totals.kcal)) + ' <span>קלוריות</span></b></div>' +
      '<div class="btn2"><button class="btn sec2" data-act="editmeal" data-id="' + m.id + '" data-key="' + key + '">✏️ עריכת הארוחה</button><button class="btn danger" data-act="delmeal" data-id="' + m.id + '" data-key="' + key + '">מחיקה</button></div>');
  }
  function editMeal(id, key) {
    var m = S.day(key).meals.filter(function (x) { return x.id === id; })[0]; if (!m) return;
    newDraft(m.type, { date: key, editId: id });
    m.items.forEach(function (i) {
      if (!ING[i.ingId]) { draft.fixed.push(i); return; }
      var mode = i.mode === "g" || optOf(ING[i.ingId], i.mode) ? i.mode : "g", qty = mode === "g" && i.mode !== "g" ? Math.round(i.grams) : i.qty;
      if (draft.items[i.ingId]) { var g0 = gramsOf(ING[i.ingId], draft.items[i.ingId].mode, draft.items[i.ingId].qty) + gramsOf(ING[i.ingId], mode, qty); setQty(i.ingId, "g", Math.round(g0)); }
      else setQty(i.ingId, mode, qty);
    });
    var cat = m.items.filter(function (i) { return ING[i.ingId]; }).map(function (i) { return ING[i.ingId].cat; })[0];
    if (cat) draft.tab = cat;
    (m.dishes || []).forEach(function (x) { var id = typeof x === "string" ? x : x.id, n = (typeof x === "object" && x.n) || 1; if (id) draft.added[id] = (draft.added[id] || 0) + n; });
    closeSheet(); go("#/build");
  }

  // ---------- build ----------
  function rowIng(ing) {
    var it = draft.items[ing.id], on = !!it;
    var mode = on ? it.mode : ing.defMode, qty = on ? it.qty : 0;
    var g = on ? gramsOf(ing, mode, qty) : (ing.defMode === "u" ? ing.unit.grams : 100);
    var v = valsFor(ing, g);
    var o = on ? optOf(ing, mode) : null;
    var basis = on ? (o ? "ל־" + n(r1(qty)) + " × " + esc(cleanUnit(o.name)) + (o.synth ? " (⅓ כף)" : "") : "ל־" + n(Math.round(qty)) + " ג׳")
      : (ing.defMode === "u" ? esc(cleanUnit(ing.unit.name_he)) + " · " + n(r0(ing.unit.grams)) + " ג׳" : "ל־" + n(100) + " ג׳");
    var tags = (ing.est ? '<span class="tag est">הערכה</span>' : "") + (ing.custom ? '<span class="tag mine">שלי</span>' : "") + (ing.edited ? '<span class="tag ed">ערכתי</span>' : "");
    var ctl = "";
    if (on) {
      ctl = '<div class="ctl"><div class="stp"><button data-step="-1" data-id="' + ing.id + '" aria-label="פחות">−</button><div class="qv"><input type="number" inputmode="decimal" min="0" step="any" value="' + (o ? r1(qty) : Math.round(qty)) + '" data-qty="' + ing.id + '" aria-label="כמות"><small>' + (o ? unitWord(ing, qty, mode) : "גרם") + '</small></div><button data-step="1" data-id="' + ing.id + '" aria-label="יותר">+</button></div>' +
        (ing.opts.length ? '<label class="mode"><select data-modesel="' + ing.id + '" aria-label="יחידת מידה">' + ing.opts.map(function (x) { return '<option value="' + x.m + '"' + (x.m === mode ? " selected" : "") + ">" + esc(x.short) + "</option>"; }).join("") + '<option value="g"' + (mode === "g" ? " selected" : "") + ">גרם</option></select></label>" : "") + "</div>";
    }
    return '<div class="r4 ' + (on ? "on" : "off") + '" data-row="' + ing.id + '"><div class="rt"><b class="nm">' + esc(ing.name) + tags + '</b><span class="bs">' + basis + "</span>" + ctl + "</div>" +
      big(v, on) + (on ? "" : '<button class="addb" data-add="' + ing.id + '" aria-label="הוספה">+</button>') + "</div>";
  }
  function big(v, on) {
    return '<div class="lt"><div class="big"><div><span class="bv kc">' + n(Math.round(v.kcal)) + '</span><span class="bl">קלוריות</span></div><div><span class="bv pr">' + n(r0(v.protein)) + '<small>ג׳</small></span><span class="bl">חלבון</span></div></div>' +
      (on ? '<div class="tiny"><span class="cc">פחמ׳ ' + n(r0(v.carbs)) + '</span> · <span class="fc">שומן ' + n(r0(v.fat)) + " ג׳</span></div>" : "") + "</div>";
  }
  // v7: dish photos live in IndexedDB (not localStorage: quota). dish.photo = true marks that one exists.
  var IMG = { db: null, cache: {}, failed: false };
  function idb(cb) {
    if (IMG.db) return cb(IMG.db); if (IMG.failed || !window.indexedDB) return cb(null);
    try {
      var r = indexedDB.open("plato-img", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("dish"); };
      r.onsuccess = function () { IMG.db = r.result; cb(IMG.db); };
      r.onerror = r.onblocked = function () { IMG.failed = true; cb(null); };
    } catch (e) { IMG.failed = true; cb(null); }
  }
  function imgPut(id, data, cb) { idb(function (db) { if (!db) return cb(false); try { var tx = db.transaction("dish", "readwrite"); tx.objectStore("dish").put(data, id); tx.oncomplete = function () { IMG.cache[id] = data; cb(true); }; tx.onerror = tx.onabort = function () { cb(false); }; } catch (e) { cb(false); } }); }
  function imgGet(id, cb) { if (IMG.cache[id]) return cb(IMG.cache[id]); idb(function (db) { if (!db) return cb(null); try { var q = db.transaction("dish").objectStore("dish").get(id); q.onsuccess = function () { if (q.result) IMG.cache[id] = q.result; cb(q.result || null); }; q.onerror = function () { cb(null); }; } catch (e) { cb(null); } }); }
  function imgClear() { IMG.cache = {}; idb(function (db) { if (db) try { db.transaction("dish", "readwrite").objectStore("dish").clear(); } catch (e) {} }); }   // v13: on sign-out / account switch
  function imgDel(id) { delete IMG.cache[id]; idb(function (db) { if (db) try { db.transaction("dish", "readwrite").objectStore("dish").delete(id); } catch (e) {} }); }
  function noop() {}
  function hydrate(root) {
    if (root && root.querySelectorAll) root.querySelectorAll(".dsw").forEach(function (e) { e.onclick = noop; });   // v10: WebKit only synthesizes a tap-click on a div row that has its own listener (the real work is delegated)
    (root || document).querySelectorAll("[data-dimg]").forEach(function (el) {
      var id = el.getAttribute("data-dimg");
      imgGet(id, function (u) { if (u) { el.style.backgroundImage = "url(" + u + ")"; el.classList.add("has"); } else el.classList.add("none"); });
    });
  }
  function thumb(d, cls) { return d.photo ? '<span class="dph ' + (cls || "") + '" data-dimg="' + d.id + '" role="img" aria-label="תמונת המנה"></span>' : '<span class="dph ' + (cls || "") + ' none" aria-hidden="true">🍽️</span>'; }
  // v14: the photo to show on a logged meal — a saved dish used in it that still has a photo, or an exact match to a saved dish
  function mealDishIds(m) {
    return (m.dishes || []).map(function (x) { return typeof x === "string" ? x : x.id; }).filter(Boolean);
  }
  function mealPhotoId(m) {
    var ids = mealDishIds(m), list = S.dishes(), i, d;
    for (i = 0; i < ids.length; i++) { d = list.filter(function (x) { return x.id === ids[i]; })[0]; if (d && d.photo) return d.id; }
    var sg = dishSig({ items: m.items || [] });
    d = list.filter(function (x) { return x.photo && dishSig(x) === sg; })[0];
    return d ? d.id : null;
  }
  function photoPicker(cur) {
    return '<div class="phpick"><div class="pv" id="phpv"' + (cur ? ' style="background-image:url(' + cur + ')"' : "") + ">" + (cur ? "" : "<span>🍽️</span>") + "</div>" +
      '<div class="pb"><label class="btn sm2">' + ICON.camera + ' צילום<input type="file" accept="image/*" capture="environment" id="dishPhoto" hidden></label>' +
      '<label class="btn sm2">🖼️ מהגלריה<input type="file" accept="image/*" id="dishPhoto2" hidden></label>' +
      '<button class="lnk" data-act="rmdishphoto"' + (cur ? "" : " hidden") + ">הסרת התמונה</button></div></div>";
  }
  function setPend(d) {
    ui.pendPhoto = d; var pv = document.getElementById("phpv"); if (!pv) return;
    pv.style.backgroundImage = d ? "url(" + d + ")" : ""; pv.innerHTML = d ? "" : "<span>🍽️</span>";
    var rb = document.querySelector('[data-act="rmdishphoto"]'); if (rb) rb.hidden = !d;
  }
  function savePhoto(id, pend, done) {   // pend: undefined = untouched, null = removed, string = new image
    if (pend === undefined) return done();
    if (pend === null) { imgDel(id); if (window.Cloud) Cloud.photoChanged(id, true); S.updateDish(id, { photo: false }); return done(); }
    imgPut(id, pend, function (ok) { S.updateDish(id, { photo: !!ok, photoAt: Date.now() }); done(); if (!ok) toast("לא הצלחתי לשמור את התמונה במכשיר — המנה נשמרה בלי תמונה"); });
  }
  function sheetDish(id) {
    var d = S.dishes().filter(function (x) { return x.id === id; })[0]; if (!d) return;
    ui.pendPhoto = undefined; ui.editDish = id;
    var lines = d.items.filter(function (i) { return ING[i.ingId]; }).map(function (i) { var s2 = snapshot(i.ingId, i); return '<div class="ln"><span class="q">' + itemQtyLabel(s2) + '</span><span class="nm">' + esc(s2.name) + '</span><span class="kc n">' + fmt(s2.kcal) + "</span></div>"; }).join("");
    openSheet(head("המנה השמורה", "🔖") + '<p class="sublead">אפשר לשנות את השם ולהוסיף או להחליף תמונה מהמצלמה או מהגלריה.</p><div class="sh-body">' + photoPicker(null) +
      '<div class="frow"><span>שם המנה</span><span class="fld wide"><input id="dishName" type="text" maxlength="40" value="' + esc(d.name) + '"></span></div></div>' +
      '<div class="items">' + lines + '</div><button class="btn pri" data-act="doeditdish">שמירה</button><button class="btn danger" data-act="deldbdish">מחיקת המנה</button>');
    if (d.photo) imgGet(id, function (u) { if (u && ui.pendPhoto === undefined) { setPend(u); ui.pendPhoto = undefined; } });
  }
  // v12: saved-dish detail (builder ★): photo, ingredients with amounts, per-serving kcal + macros, quantity, "הוספה לארוחה", ✏️ / 🗑
  function addDishToDraft(dish, mult) {
    dish.items.forEach(function (i) {
      if (!ING[i.ingId]) return; var cur = draft.items[i.ingId], q = i.qty * mult;
      if (!cur) setQty(i.ingId, i.mode, q);
      else if (cur.mode === i.mode) setQty(i.ingId, i.mode, cur.qty + q);
      else { var g = gramsOf(ING[i.ingId], cur.mode, cur.qty) + gramsOf(ING[i.ingId], i.mode, q); setQty(i.ingId, "g", Math.round(g)); }
    });
    draft.added[dish.id] = (draft.added[dish.id] || 0) + mult;
  }
  function dvBtn(d) { var q = ui.dvQty || 1, k = Math.round(dishTotals(d).kcal * q); return "<span>הוספה לארוחה" + (q !== 1 ? " · " + n(String(q).replace(".5", "½").replace(/^0½$/, "½")) + " מנות" : "") + ' · <span class="n">' + fmt(k) + "</span> קק״ל</span>"; }
  function sheetDishView(id) {
    var d = S.dishes().filter(function (x) { return x.id === id; })[0]; if (!d || !draft) return;
    ui.dvDish = id; ui.dvQty = 1;
    var v = dishTotals(d), a = draft.added[id];
    var lines = d.items.filter(function (i) { return ING[i.ingId]; }).map(function (i) { var s2 = snapshot(i.ingId, i); return '<div class="ln"><span class="q">' + itemQtyLabel(s2) + '</span><span class="nm">' + esc(s2.name) + '</span><span class="kc n">' + fmt(s2.kcal) + "</span></div>"; }).join("");
    var mc = function (cls, l, val, u) { return '<div class="dvm ' + cls + '"><b class="n">' + val + "<small>" + u + "</small></b><span>" + l + "</span></div>"; };
    openSheet('<div class="dview">' + head(esc(d.name), "★") +
      (d.photo ? '<div class="dvph" data-dimg="' + d.id + '" role="img" aria-label="תמונת המנה"></div>' : "") +
      '<div class="dvtot"><span class="dvlbl">למנה</span>' + mc("mk", "קלוריות", fmt(v.kcal), "") + mc("mp", "חלבון", r0(v.protein), "ג׳") + mc("mc", "פחמימה", r0(v.carbs), "ג׳") + mc("mf", "שומן", r0(v.fat), "ג׳") + "</div>" +
      '<div class="items dvitems">' + lines + "</div>" +
      (a ? '<div class="dvin">✓ כבר בארוחה ×' + n(a) + "</div>" : "") +
      '<div class="dvrow"><div class="dvq" role="group" aria-label="כמות מנות"><button data-act="dvq" data-d="-0.5" aria-label="פחות">−</button><b id="dvqn" class="n">1</b><button data-act="dvq" data-d="0.5" aria-label="יותר">+</button></div>' +
      '<button class="btn pri dvadd" data-act="dvadd">' + dvBtn(d) + "</button></div>" +
      '<div class="dvacts"><button class="lnk" data-act="dvedit">' + ICON.pencil + ' עריכה</button><button class="lnk del" data-act="dvdel">' + ICON.trash + " מחיקה</button></div></div>");
    hydrate($sheet);
  }
  function dishTotals(d) { return tot(d.items.filter(function (i) { return ING[i.ingId]; }).map(function (i) { return snapshot(i.ingId, i); })); }
  // v10: delete a saved dish right away, offer "ביטול" for 5 s; the photo is only dropped (locally + cloud) once the undo window closes
  var pendDel = null;
  function commitDel() { var p = pendDel; pendDel = null; toast._done = null; if (!p) return; imgDel(p.d.id); if (window.Cloud) Cloud.photoChanged(p.d.id, true); }
  function delDish(id) {
    var d = S.dishes().filter(function (x) { return x.id === id; })[0]; if (!d) return;
    commitDel();
    pendDel = { d: d }; S.deleteDish(id); if (draft) delete draft.added[id];
    if (draft && document.getElementById("list")) refreshBuild();
    if ((location.hash || "").indexOf("#/db") === 0) refreshDB();
    toast._done = commitDel;
    toast("המנה נמחקה · " + d.name, "ביטול", function () { var p = pendDel; pendDel = null; toast._done = null; if (!p) return; S.restoreDish(p.d); if (draft && document.getElementById("list")) refreshBuild(); if ((location.hash || "").indexOf("#/db") === 0) refreshDB(); toast("המנה חזרה ★"); }, 5000);
  }
  function rowDish(d) {   // v12: tap the row = detail sheet (add from there) · ✏️ = edit (name/photo) · 🗑 or swipe left = delete (with undo)
    var v = dishTotals(d), a = draft.added[d.id];
    var sub = d.items.filter(function (i) { return ING[i.ingId]; }).map(function (i) { var ing = ING[i.ingId]; return (optOf(ing, i.mode) ? r1(i.qty) + " " + unitWord(ing, i.qty, i.mode) : Math.round(i.qty) + " ג׳") + " " + ing.name.split(",")[0]; }).join(" · ");
    return '<div class="dsw" data-swipe="' + d.id + '"><div class="dswbg" aria-hidden="true">' + ICON.trash + '<span>מחיקה</span></div>' +
      '<div class="r4 dish off' + (a ? " added" : "") + '" data-dish="' + d.id + '" role="button" aria-label="פרטי המנה ' + esc(d.name) + '"><span class="dthumb">' + thumb(d) + '</span><div class="rt"><b class="nm">' + esc(d.name) + '</b><span class="bs">' + (a ? '<span class="ok-t">✓ נוסף לארוחה ×' + n(a) + "</span>" : esc(sub)) + "</span></div>" +
      big(v, false) + '<span class="dacts"><button class="dact ed" data-editdish="' + d.id + '" aria-label="עריכת המנה" title="עריכה">' + ICON.pencil + '</button><button class="dact del" data-deldish="' + d.id + '" aria-label="מחיקת המנה" title="מחיקה">' + ICON.trash + "</button></span></div></div>";
  }
  function listHTML() {
    var q = draft.q.trim();
    if (q) {
      var ql = q.toLowerCase();
      var hits = byUse(ING_LIST.filter(function (i) { return i.name.toLowerCase().indexOf(ql) >= 0; }), function (i) { return i.id; });
      var dh = byUse(S.dishes().filter(function (d) { return d.name.indexOf(q) >= 0; }), function (d) { return "dish:" + d.id; });
      if (!hits.length && !dh.length) return '<div class="listmsg">לא נמצא מרכיב בשם "' + esc(q) + '"</div>' + addCustomBtn();
      return dh.map(rowDish).join("") + hits.map(rowIng).join("") + addCustomBtn();
    }
    if (draft.tab === "saved") {
      var ds = byUse(S.dishes(), function (d) { return "dish:" + d.id; });
      return (ds.length ? ds.map(rowDish).join("") : '<div class="listmsg">אין עדיין מנות שמורות. בונים ארוחה ולוחצים על הסימנייה כדי לשמור.</div>');
    }
    // v7: only what he uses (★ נפוץ אצלך) is shown; everything else waits behind "עוד רכיבים". Search still covers all.
    var all = ING_LIST.filter(function (i) { return i.cat === draft.tab; });
    var fav = byUse(all.filter(function (i) { return S.useScore(i.id) > 0; }), function (i) { return i.id; }).slice(0, 12);
    var shown = {}; fav.forEach(function (i) { shown[i.id] = 1; });
    var starter = [];
    if (fav.length < 5) starter = all.filter(function (i) { return !shown[i.id] && (i.custom || STARTER[i.id]); }).sort(function (a, b) { return (STARTER[a.id] || 0) - (STARTER[b.id] || 0); }).slice(0, Math.max(0, 8 - fav.length));
    starter.forEach(function (i) { shown[i.id] = 1; });
    var picked = all.filter(function (i) { return !shown[i.id] && draft.items[i.id]; });   // already in this meal: never hide
    picked.forEach(function (i) { shown[i.id] = 1; });
    var rest = all.filter(function (i) { return !shown[i.id]; }), open = !!(draft.more && draft.more[draft.tab]);
    var html = (fav.length ? '<div class="dv fav">נפוץ אצלך</div>' + fav.map(rowIng).join("") : "") +
      (starter.length ? '<div class="dv st">' + (fav.length ? "עוד בסיסיים" : "בסיס מומלץ להתחלה") + "</div>" + starter.map(rowIng).join("") : "") +
      (picked.length ? '<div class="dv">כבר בארוחה</div>' + picked.map(rowIng).join("") : "");
    if (rest.length) html += '<button class="more' + (open ? " on" : "") + '" data-act="more" aria-expanded="' + open + '">' + (open ? "הסתרת שאר הרכיבים ▴" : "עוד רכיבים (" + n(rest.length) + ") ▾") + "</button>" + (open ? rest.map(rowIng).join("") : "");
    return html + addCustomBtn();
  }
  function byUse(arr, keyOf) {   // stable sort by decayed use score (frequency + recency)
    return arr.map(function (x, i) { return { x: x, i: i, s: S.useScore(keyOf(x)) }; }).sort(function (a, b) { return b.s - a.s || a.i - b.i; }).map(function (o) { return o.x; });
  }
  function addCustomBtn() { return '<button class="addcustom" data-act="custom">＋ הוספת מרכיב משלי</button>'; }
  function sumHTML() {
    var items = draftSnap(), t = tot(items), g = S.goal(), dd = S.day(draft.date), day = tot(dd.meals.filter(function (m) { return m.id !== draft.editId; }).map(function (m) { return m.totals; }));
    var isToday = draft.date === S.dateKey();
    var lk = Math.round(g.kcal - day.kcal - t.kcal), lp = Math.round(g.protein - day.protein - t.protein);
    var rows = draft.fixed.map(function (i, k) { return '<div class="ei fx"><div class="e1"><b class="nm">' + esc(i.name) + '</b><span class="kc n">' + fmt(i.kcal) + '</span><button class="rm" data-rmfix="' + k + '" aria-label="הסרה מהארוחה">' + ICON.trash + '</button></div><div class="e2"><span class="q">' + itemQtyLabel(i) + '</span><small>מרכיב שנמחק מהמאגר · נשמר כמו שהיה</small></div></div>'; }).join("") +
      draft.order.filter(function (id) { return draft.items[id] && ING[id]; }).map(function (id) {
        var ing = ING[id], it = draft.items[id], o = optOf(ing, it.mode), v = valsFor(ing, gramsOf(ing, it.mode, it.qty));
        return '<div class="ei" data-erow="' + id + '"><div class="e1"><b class="nm">' + esc(ing.name) + '</b><span class="kc n">' + fmt(v.kcal) + '</span><button class="rm" data-rm="' + id + '" aria-label="הסרה מהארוחה" title="הסרה">' + ICON.trash + "</button></div>" +
          '<div class="e2"><div class="stp sm"><button data-es="-1" data-id="' + id + '" aria-label="פחות">−</button><div class="qv"><input type="number" inputmode="decimal" min="0" step="any" value="' + (o ? r1(it.qty) : Math.round(it.qty)) + '" data-eq="' + id + '" aria-label="כמות"><small>' + (o ? unitWord(ing, it.qty, it.mode) : "גרם") + '</small></div><button data-es="1" data-id="' + id + '" aria-label="יותר">+</button></div>' +
          (ing.opts.length ? '<label class="mode"><select data-em="' + id + '" aria-label="יחידת מידה">' + ing.opts.map(function (x) { return '<option value="' + x.m + '"' + (x.m === it.mode ? " selected" : "") + ">" + esc(x.short) + "</option>"; }).join("") + '<option value="g"' + (it.mode === "g" ? " selected" : "") + ">גרם</option></select></label>" : "") +
          '<span class="pq">' + n(r0(v.protein)) + " ג׳ חלבון</span></div></div>";
      }).join("");
    var aft = lk >= 0 ? "אחרי הארוחה: נשארו " + n(fmt(lk)) + " קלוריות ו־" + n(Math.max(0, lp)) + " ג׳ חלבון " + (isToday ? "להיום" : "ליום הזה") : "אחרי הארוחה: חריגה של " + n(fmt(-lk)) + " קלוריות מהיעד";
    return '<div class="det">' + (rows ? '<div class="eh">המרכיבים בארוחה · משנים כמות או מוחקים</div>' : "") + (rows || '<div class="listmsg" style="padding:6px 0">עוד לא נבחרו מרכיבים</div>') +
      '<div class="smac"><span class="cc">פחמימה ' + n(Math.round(t.carbs)) + ' ג׳</span> · <span class="fc">שומן ' + n(Math.round(t.fat)) + ' ג׳</span></div><div class="aft' + (lk < 0 ? " over" : "") + '">' + aft + "</div></div>" +
      '<div class="bar"><button class="txt" data-act="toggle" aria-expanded="' + draft.open + '" aria-label="פירוט הארוחה">' + ICON.chevUp +
      '<span class="cnt">' + (items.length ? n(items.length) + (items.length === 1 ? " מרכיב" : " מרכיבים") : "ריק") + '</span><span class="dt">·</span><span class="kk">' + n(fmt(t.kcal)) + ' קלוריות</span><span class="dt">·</span><span class="pr">' + n(Math.round(t.protein)) + " ג׳ חלבון</span></button>" +
      (function () { var sd = items.length && savedDish(); return '<button class="rb save' + (sd ? " on" : "") + '" data-act="savedish" aria-label="' + (sd ? "שמור כמנה: " + esc(sd.name) : "שמור כמנה") + '" title="' + (sd ? "שמור ★" : "שמור כמנה") + '"' + (items.length ? "" : " disabled") + ">" + (sd ? ICON.bookOn : ICON.book) + "</button>"; })() +
      '<button class="rb ok" data-act="addday" aria-label="הוסף לסך היומי" title="הוסף לסך היומי"' + (items.length ? "" : " disabled") + ">" + ICON.check + "</button></div>";
  }
  function draftSig() { return draft.order.filter(function (id) { return draft.items[id] && draft.items[id].qty > 0; }).map(function (id) { var it = draft.items[id]; return id + ":" + it.mode + ":" + (Math.round(it.qty * 100) / 100); }).sort().join("|"); }
  function dishSig(d) { return d.items.filter(function (i) { return i.qty > 0; }).map(function (i) { return i.ingId + ":" + i.mode + ":" + (Math.round(i.qty * 100) / 100); }).sort().join("|"); }
  function savedDish() {   // v10: the meal being built is exactly a saved dish → save icon is green
    if (draft.fixed && draft.fixed.length) return null; var sg = draftSig(); if (!sg) return null;
    return S.dishes().filter(function (d) { return dishSig(d) === sg; })[0] || null;
  }
  function renderBuild() {
    var info = mealInfo(draft.meal);
    var past = draft.date !== S.dateKey();
    $app.innerHTML = '<div class="build"><div class="top"><div class="tt">' + (draft.editId ? '<span class="ed">עריכה</span>' : "") + '<h2 id="mealTitle">' + info.title + "</h2>" + (past ? '<small class="bdate">' + dayLabel(draft.date) + "</small>" : "") + '</div><button class="x" data-act="cancel" aria-label="סגירה">✕</button></div>' +
      '<div class="search"><span class="ic">' + ICON.search + '</span><input id="q" type="search" placeholder="חיפוש מרכיב לפי שם" value="' + esc(draft.q) + '" autocomplete="off">' + '<button class="clr" data-act="clearq" aria-label="ניקוי"' + (draft.q ? "" : " hidden") + '>✕</button>' + "</div>" +
      '<div class="seg" id="seg">' + CATS.map(function (c) { return '<button class="' + (!draft.q && c[0] === draft.tab ? "on" : "") + '" data-tab="' + c[0] + '"' + (c[0] === "saved" ? ' aria-label="מנות שמורות" title="מנות שמורות" ' : "") + ">" + c[1] + "</button>"; }).join("") + "</div>" +
      '<div class="list" id="list">' + listHTML() + "</div>" +
      '<div class="sum' + (draft.open ? " open" : "") + '" id="sum">' + sumHTML() + "</div></div>";
    hydrate(document.getElementById("list"));
  }
  function refreshBuild(keepScroll) {
    var l = document.getElementById("list"); var top = l ? l.scrollTop : 0;
    document.getElementById("list").innerHTML = listHTML();
    var s = document.getElementById("sum"); s.className = "sum" + (draft.open ? " open" : ""); s.innerHTML = sumHTML(); fabPlace();
    document.getElementById("seg").innerHTML = CATS.map(function (c) { return '<button class="' + (!draft.q && c[0] === draft.tab ? "on" : "") + '" data-tab="' + c[0] + '"' + (c[0] === "saved" ? ' aria-label="מנות שמורות" title="מנות שמורות" ' : "") + ">" + c[1] + "</button>"; }).join("");
    if (keepScroll !== false) document.getElementById("list").scrollTop = top;
    hydrate(document.getElementById("list"));
  }
  function sheetSaveDish() {
    ui.pendPhoto = undefined;
    openSheet(head("שמירה כמנה", "🔖") + '<div class="sh-body">' + photoPicker(null) + '<div class="frow"><span>שם המנה</span><span class="fld wide"><input id="dishName" type="text" placeholder="למשל: טוסט גבינה" maxlength="40"></span></div></div><button class="btn pri" data-act="dosavedish">שמירה</button>');
    setTimeout(function () { var i = document.getElementById("dishName"); if (i) i.focus(); }, 50);
  }
  function sheetCustom(defCat) {
    defCat = CAT_LABEL[defCat] ? defCat : "protein";
    var opts = Object.keys(CAT_LABEL).map(function (k) { return '<option value="' + k + '"' + (k === defCat ? " selected" : "") + ">" + CAT_LABEL[k] + "</option>"; }).join("");
    var f = function (id, l, u) { return '<div class="frow"><span>' + l + '</span><span class="fld"><input id="' + id + '" type="number" inputmode="decimal" min="0" step="any"><span>' + u + "</span></span></div>"; };
    openSheet(head("מרכיב משלי", "🥣") +
      '<div class="sh-body"><div class="lscan" id="lscan"><button class="btn sm2 lsbtn" data-act="scanlabel" type="button">' + ICON.camera + ' צלם תווית</button><span class="lsnote" id="lsnote">צילום של טבלת הערכים התזונתיים ימלא את השדות</span><input type="file" accept="image/*" id="labelFile" hidden></div>' +
      '<div class="frow"><span>שם</span><span class="fld wide"><input id="cName" type="text" maxlength="40" placeholder="שם המרכיב" style="text-align:right"></span></div>' +
      '<div class="frow"><span>קטגוריה</span><span class="fld wide"><select id="cCat">' + opts + "</select></span></div>" +
      f("cK", "קלוריות ל־100 ג׳", "") + f("cP", "חלבון ל־100 ג׳", "ג׳") + f("cC", "פחמימה ל־100 ג׳", "ג׳") + f("cF", "שומן ל־100 ג׳", "ג׳") +
      '<div class="frow"><span>יחידה (רשות)</span><span class="fld"><input id="cU" type="text" maxlength="14" placeholder="פרוסה" style="text-align:right"></span></div>' +
      f("cUG", "משקל יחידה", "ג׳") + '</div><button class="btn pri" data-act="docustom">הוספה</button>');
  }

  // ---------- settings ----------
  function renderSettings() {
    var fx = S.fixes(), prof = S.profile(), gl = S.goal();
    var row = function (key, ic, tone, title, sub, pill) { return '<button class="srow" data-open="' + key + '"><span class="tile emoji ' + tone + '">' + ic + '</span><span class="st"><b>' + title + "</b><small>" + sub + "</small></span>" + (pill ? '<span class="pill">✏️ ' + pill + "</span>" : "") + ICON.chevL + "</button>"; };
    var list = "";
    if (ui.fixesOpen) {
      list = (ui.fixAdding ? '<form class="fx adding" id="fixForm" action="#" novalidate><span class="cb"></span><input id="fixIn" type="text" enterkeyhint="done" autocomplete="off" placeholder="מה לתקן?" maxlength="140" aria-label="פריט חדש"><button type="submit" class="fxok" data-keepfocus aria-label="שמירה" title="שמירה">' + ICON.check + '</button><button type="button" class="delx" data-act="fixcancel" data-keepfocus aria-label="ביטול">✕</button></form>' : "") +
        (fx.length ? fx.map(function (f) { return '<div class="fx' + (f.done ? " done" : "") + '"><button class="cb" data-fixtoggle="' + f.id + '" aria-label="סימון">' + (f.done ? "✓" : "") + '</button><span class="tx">' + esc(f.text) + '</span><button class="delx" data-fixdel="' + f.id + '" aria-label="מחיקה" title="מחיקה">✕</button></div>'; }).join("")
          : (ui.fixAdding ? "" : '<div class="fx emptyfx">אין עדיין פריטים. לוחצים ➕ כדי להוסיף.</div>'));
    }
    var open = fx.filter(function (f) { return !f.done; }).length;
    var cs = window.Cloud ? Cloud.status() : { on: false };
    var acct = cs.on ? row("account", "☁️", "", "חשבון", esc(cs.email) + ' · <span id="syncst" class="syncst ' + cs.state + '">' + syncText(cs) + "</span>")
      : '<button class="srow" data-go="#/login"><span class="tile emoji br">☁️</span><span class="st"><b>התחברות לחשבון</b><small>כרגע הנתונים רק בטלפון הזה · גיבוי וסנכרון בענן</small></span>' + ICON.chevL + "</button>";
    $app.innerHTML = '<div class="set"><div class="phd"><button class="back" data-act="home">→ חזרה</button><h1>הגדרות</h1></div>' +
      '<div class="gt">חשבון וסנכרון</div><div class="card">' + acct + "</div>" +
      '<div class="gt">אני והיעד שלי</div><div class="card">' + row("profile", prof.photo ? '<img src="' + prof.photo + '" alt="">' : "👤", prof.photo ? "photo" : "", "פרופיל", esc(prof.name) + " · " + n(kg(prof.weight)) + " ק״ג") + row("goal", "🎯", "", "יעדים", n(fmt(gl.kcal)) + " קלוריות · " + n(gl.protein) + " ג׳ חלבון", "עריכה") + "</div>" +
      '<div class="gt">רק לך</div><div class="card fixes"><div class="srow" style="cursor:default"><span class="tile emoji br">🔧</span><span class="st"><b>שיפוצים</b><small>מה לתקן באפליקציה' + (fx.length ? " · " + n(open) + " פתוחים" : "") + "</small></span>" +
      '<button class="ib" data-act="fixadd" aria-label="הוספת פריט" title="הוספה">' + ICON.plus + '</button><button class="ib' + (ui.fixesOpen ? " on" : "") + '" data-act="fixeye" aria-label="הצג או הסתר" title="הצג/הסתר">' + ICON.eye(ui.fixesOpen) + "</button></div>" + list + "</div>" +
      '<div class="gt">אפליקציה</div><div class="card">' + row("app", "📱", "", "אפליקציה", "גרסה, גיבוי ושחזור") + "</div>" +
      '<div class="foot"><b>PLATO</b> · גרסה ' + n("v" + APP_VERSION) + "</div></div>";
    if (ui.fixAdding) { var i = document.getElementById("fixIn"); if (i) i.focus(); }
  }
  function numField(id, label, val, unit, step) { return '<div class="frow"><span>' + label + '</span><span class="fld"><input id="' + id + '" type="number" inputmode="decimal" step="' + (step || "any") + '" value="' + val + '">' + (unit ? "<span>" + unit + "</span>" : "") + "</span></div>"; }
  function sheetProfile() {
    var p = S.profile();
    openSheet(head("פרופיל", "👤") + avatarHTML(p) + '<div class="sh-body"><div class="frow"><span>שם</span><span class="fld"><input id="pName" type="text" value="' + esc(p.name) + '" maxlength="30"></span></div>' +
      numField("pH", "גובה", Number(p.height).toFixed(2), "מ׳", "0.01") + numField("pA", "גיל", p.age, "", "1") + '</div><button class="btn pri" data-act="saveprofile">שמירה</button>' +
      '<div class="gt" style="padding:20px 4px 8px">מעקב משקל</div><div class="wbox" id="wbox">' + wboxInner() + "</div>", "profile");
  }
  function avatarInner(p) { return p.photo ? '<img src="' + p.photo + '" alt="תמונת פרופיל">' : '<span class="ini">' + esc((p.name || "").trim().charAt(0) || "🙂") + "</span>"; }
  function avatarHTML(p) {
    return '<div class="avwrap"><div class="av" id="avatar">' + avatarInner(p) + '</div><button class="cam" data-act="photo" aria-label="הוספת תמונה" title="הוספת תמונה"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button>' +
      '<input id="photoFile" type="file" accept="image/*" hidden></div><button class="linkbtn rmphoto" data-act="rmphoto"' + (p.photo ? "" : " hidden") + ">הסרת התמונה</button>";
  }
  function setPhoto(dataUrl) {
    S.setProfile({ photo: dataUrl || null });
    var av = document.getElementById("avatar"); if (av) av.innerHTML = avatarInner(S.profile());
    var rm = document.querySelector(".rmphoto"); if (rm) rm.hidden = !dataUrl;
    if ((location.hash || "").indexOf("#/settings") === 0) renderSettings();
  }
  function resizeImage(file, size, cb) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement("canvas"); c.width = c.height = size;
      var ctx = c.getContext("2d"); ctx.fillStyle = "#F5F0E6"; ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url); cb(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }
  // v11: label photo -> keep aspect, long side <= max, JPEG (small enough for the Edge Function, sharp enough for the digits)
  function labelImage(file, max, cb) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h)), c = document.createElement("canvas");
      c.width = Math.round(w * k); c.height = Math.round(h * k); var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); cb(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }
  var LABEL_ERR = {
    signin: "סריקת תווית עובדת כשמחוברים לחשבון (תפריט ← חשבון). בינתיים אפשר למלא ידנית",
    not_signed_in: "צריך להתחבר מחדש לחשבון כדי לסרוק תווית",
    offline: "אין חיבור כרגע. אפשר למלא ידנית, או לצלם שוב כשיש רשת",
    network: "לא הצלחתי להגיע לשרת. נסו שוב עוד רגע, או מלאו ידנית",
    not_configured: "סריקת תוויות עוד לא הופעלה בשרת. בינתיים אפשר למלא ידנית",
    no_label: "לא מצאתי טבלה תזונתית בתמונה. נסו צילום קרוב, ישר וחד של הטבלה",
    no_per100: "בתווית יש רק ערכים למנה בלי משקל המנה. אפשר למלא ידנית",
    implausible: "המספרים שיצאו לא הגיוניים. נסו צילום חד יותר של הטבלה",
    rate_limited: "יותר מדי סריקות בזמן קצר. נסו שוב בעוד דקה",
    too_large: "התמונה גדולה מדי. נסו שוב",
    bad_type: "סוג הקובץ לא נתמך. צלמו תמונה רגילה",
    bad_key: "יש בעיה במפתח של שירות הסריקה בשרת",
    upstream: "שירות הסריקה לא ענה כרגע. נסו שוב עוד רגע, או מלאו ידנית"
  };
  function labelState(state, msg) {
    var b = document.querySelector('[data-act="scanlabel"]'), nt = document.getElementById("lsnote"), box = document.getElementById("lscan"); if (!b || !nt) return;
    b.disabled = state === "busy"; b.innerHTML = state === "busy" ? '<span class="spin"></span> קורא את התווית…' : ICON.camera + (state === "done" ? " צילום מחדש" : " צלם תווית");
    box.className = "lscan" + (state === "err" ? " err" : state === "done" ? " done" : "");
    nt.textContent = msg || "צילום של טבלת הערכים התזונתיים ימלא את השדות";
  }
  function labelScan(file) {
    labelState("busy");
    labelImage(file, 1600, function (d) {
      if (!d) { labelState("err", "לא הצלחתי לקרוא את התמונה"); return; }
      if (!window.Cloud) { labelState("err", LABEL_ERR.network); return; }
      Cloud.scanLabel(d).then(function (r) {
        if (!document.getElementById("cK")) return;   // sheet closed meanwhile
        var put = function (id, v) { var el = document.getElementById(id); if (!el || v == null) return; el.value = v; el.classList.add("fromlabel"); };
        put("cK", r.per100.kcal); put("cP", r.per100.protein); put("cC", r.per100.carbs); put("cF", r.per100.fat);
        if (r.unit) { put("cU", cleanUnit(r.unit.name)); put("cUG", r.unit.grams); }
        var nm = document.getElementById("cName"); if (nm && !nm.value.trim() && r.name) { nm.value = r.name; nm.classList.add("fromlabel"); }
        labelState("done", "✓ מולא מהתווית" + (r.basis === "serving" ? " (חושב ל־100 ג׳ מתוך מנה)" : "") + (r.check ? " · שווה לבדוק: הקלוריות לא מסתדרות עם המאקרו" : " · כדאי לעבור על המספרים") + ", לתת שם ולשמור");
        if (nm && !nm.value.trim()) nm.focus();
      }).catch(function (e) {
        var code = (e && e.code) || "upstream";
        labelState("err", LABEL_ERR[code] || LABEL_ERR.upstream);
        if (code === "signin" || code === "not_signed_in") { var b = document.querySelector('[data-act="scanlabel"]'); if (b) b.innerHTML = ICON.camera + " צלם תווית"; }
      });
    });
  }
  function goalField(id, label, val, unit, step, color) {
    return '<div class="frow gf"><span><i class="dot" style="background:' + color + '"></i>' + label + '</span><span class="gstp"><button data-gstep="-' + step + '" data-g="' + id + '" aria-label="פחות">−</button><span class="fld"><input id="' + id + '" type="number" inputmode="numeric" step="' + step + '" value="' + val + '"><span>' + unit + '</span></span><button data-gstep="' + step + '" data-g="' + id + '" aria-label="יותר">+</button></span></div>';
  }
  function goalCalc() {
    var v = function (id) { return parseFloat((document.getElementById(id) || {}).value) || 0; }, el = document.getElementById("gCalc"); if (!el) return;
    var mk = Math.round(v("gP") * 4 + v("gC") * 4 + v("gF") * 9), d = mk - v("gK");
    el.innerHTML = "חלבון ופחמימה 4, שומן 9 קלוריות לגרם: המאקרו שווים " + n(fmt(mk)) + " קלוריות" + (Math.abs(d) <= 60 ? " · מתאים ליעד ✓" : " · " + n((d > 0 ? "+" : "−") + fmt(Math.abs(d))) + " לעומת יעד הקלוריות");
    el.className = "hint calc" + (Math.abs(d) <= 60 ? " ok" : "");
  }
  function sheetGoal() {
    var g = S.goal(), T = THEMES[variant()];
    openSheet(head("יעדים", "🎯") + '<p class="sublead">אפשר ללחוץ על ± או להקליד מספר. נשמר אחרי "שמירת היעדים".</p><div class="sh-body goals">' +
      goalField("gK", "קלוריות", g.kcal, "ליום", 50, T.kcal) + goalField("gP", "חלבון", g.protein, "ג׳", 5, T.protein) + goalField("gC", "פחמימה", g.carbs, "ג׳", 5, T.carbs) + goalField("gF", "שומן", g.fat, "ג׳", 2, T.fat) +
      '<p class="hint calc" id="gCalc"></p></div><button class="btn pri" data-act="savegoal">שמירת היעדים</button><button class="linkbtn" data-act="resetgoal">חזרה להמלצה של אקי (' + n("2,050") + " · " + n(160) + " · " + n(215) + " · " + n(62) + ")</button>", "goals");
    goalCalc();
  }
  // ---------- v8: account + sync ----------
  function hhmm(t) { var d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function syncText(cs) {
    if (cs.state === "offline") return "אין חיבור · יסונכרן אחר כך";
    if (cs.state === "syncing") return "מסנכרן…";
    if (cs.state === "error") return "הסנכרון נכשל — ננסה שוב";
    if (cs.state === "signedout") return "צריך להתחבר מחדש";
    if (!cs.last) return "עוד לא סונכרן";
    var d = new Date(cs.last), today = S.dateKey(d) === S.dateKey();
    return "מסונכרן · " + (today ? "היום " : fmtDate(S.dateKey(d)) + " ") + n(hhmm(cs.last));
  }
  function sheetAccount() {
    var cs = Cloud.status(); if (!cs.on) { closeSheet(); go("#/login"); return; }
    openSheet(head("חשבון", "☁️") + '<div class="sh-body acct">' +
      '<div class="frow"><span>אימייל</span><span class="vv" dir="ltr">' + esc(cs.email) + "</span></div>" +
      '<div class="frow"><span>סנכרון</span><span class="vv"><span id="syncst2" class="syncst ' + cs.state + '">' + syncText(cs) + "</span></span></div>" +
      '<p class="note">הנתונים נשמרים בטלפון ומסתנכרנים לענן אוטומטית. התנתקות לא מוחקת כלום — לא מהענן ולא מהטלפון.</p></div>' +
      '<button class="btn sec2" data-act="syncnow">סנכרון עכשיו ↻</button><button class="btn danger" data-act="logout">התנתקות</button>');
  }
  function onSyncStatus(cs) {
    ["syncst", "syncst2"].forEach(function (id) { var e = document.getElementById(id); if (e) { e.className = "syncst " + cs.state; e.innerHTML = syncText(cs); } });
    var hb = document.getElementById("cloudst"); if (hb) hb.className = "cloudst " + (cs.on ? cs.state : "off");
  }
  function onCloudChange() {   // new data arrived from the server
    loadIngredients();
    var h = location.hash || "#/";
    if (h.indexOf("#/build") === 0 || h.indexOf("#/login") === 0 || $sheet.innerHTML) return;   // never yank the screen he is working in
    route();
  }
  // ---- login: email → 6-digit code (same Supabase OTP flow as CASA; no passwords) ----
  var OTPK = "plato-otp", OTP_WAIT = 60000, otpTick = null;
  function otpPending() { try { var o = JSON.parse(localStorage.getItem(OTPK) || "null"); return o && o.email && Date.now() - o.at < 3600000 ? o : null; } catch (e) { return null; } }
  function otpLeft() { var o = otpPending(); return o ? Math.max(0, Math.ceil((OTP_WAIT - (Date.now() - o.at)) / 1000)) : 0; }
  function resendLabel() { var l = otpLeft(); return l ? "שליחה מחדש בעוד " + Math.floor(l / 60) + ":" + ("0" + (l % 60)).slice(-2) : "לא הגיע? שליחה מחדש"; }
  function paintResend() {
    var r = document.getElementById("aResend"); if (!r) { clearInterval(otpTick); otpTick = null; return; }
    r.disabled = otpLeft() > 0; r.textContent = resendLabel();
  }
  function renderLogin() {
    var o = otpPending(), body;
    if (o) {
      body = '<form id="codeForm" class="aform" action="#" novalidate><div class="otpto"><div class="big emoji">📬</div><h3>בדקו את המייל</h3><p>שלחנו קוד כניסה אל<br><b dir="ltr">' + esc(o.email) + '</b></p></div>' +
        '<label class="af"><span>הקוד מהמייל</span><input id="aCode" class="codein" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="10" dir="ltr" placeholder="••••••" required></label>' +
        '<div class="aerr" id="aErr" role="alert"></div>' +
        '<button type="submit" class="btn pri" id="aGo">כניסה</button></form>' +
        '<div class="otpacts"><button type="button" class="lnk2" id="aResend" data-act="resendcode"' + (otpLeft() ? " disabled" : "") + ">" + resendLabel() + '</button><button type="button" class="lnk2" data-act="otpback">החלפת מייל</button></div>' +
        '<p class="ahint">הגיע קישור במקום קוד? אפשר ללחוץ עליו. כדאי לבדוק גם בספאם.</p>';
    } else {
      body = '<form id="authForm" class="aform" action="#" novalidate>' +
        '<label class="af"><span>אימייל</span><input id="aEmail" type="email" inputmode="email" autocomplete="email" dir="ltr" placeholder="name@example.com" value="' + esc(ui.authEmail || "") + '" required></label>' +
        '<div class="aerr" id="aErr" role="alert"></div>' +
        '<button type="submit" class="btn pri" id="aGo">שלח לי קוד</button></form>' +
        '<p class="ahint">נשלח למייל קוד כניסה בן 6 ספרות, בלי סיסמה.<br>יש לך חשבון CASA? זה אותו מייל.</p>';
    }
    $app.innerHTML = '<div class="login"><div class="lhead"><img src="icons/logo.png" alt=""><b>PLATO</b><p>שומרים את הנתונים בענן,<br>ממשיכים מכל מכשיר.</p></div>' +
      '<div class="lcard">' + body + "</div>" +
      (o ? "" : '<button class="skip" data-act="skiplogin">המשך בלי חשבון ←</button><p class="lfoot">אפשר להתחבר מאוחר יותר מההגדרות. בלי חשבון הנתונים נשמרים רק בטלפון הזה.</p>') + "</div>";
    clearInterval(otpTick); otpTick = o ? setInterval(paintResend, 1000) : null;
    var f = document.getElementById(o ? "aCode" : "aEmail"); if (f && (o || !ui.authEmail)) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  function authBusy(on, msg) { var b = document.getElementById("aGo"); if (b) { b.disabled = on; if (msg) b.textContent = msg; } }
  function authErr(m) { var e = document.getElementById("aErr"); if (e) e.textContent = m || ""; }
  function sendCode(em, again) {
    return Cloud.sendCode(em).then(function () {
      localStorage.setItem(OTPK, JSON.stringify({ email: em, at: Date.now() }));
      if (again) { paintResend(); authErr(""); toast("שלחנו קוד חדש ✉️"); } else renderLogin();
    });
  }
  function doAuth() {
    var em = (document.getElementById("aEmail").value || "").trim().toLowerCase();
    ui.authEmail = em;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return authErr("כתובת האימייל לא נראית תקינה");
    authErr(""); authBusy(true, "שולח…");
    sendCode(em).catch(function (e) { authBusy(false, "שלח לי קוד"); authErr(e.message || "לא הצלחתי לשלוח קוד"); });
  }
  function doCode() {
    var o = otpPending(), c = (document.getElementById("aCode").value || "").replace(/\D/g, "");
    if (!o) return renderLogin();
    if (c.length < 6) return authErr("הקוד בן 6 ספרות");
    authErr(""); authBusy(true, "בודק…");
    Cloud.verifyCode(o.email, c).then(function () {
      localStorage.removeItem(OTPK); clearInterval(otpTick); loadIngredients(); go("#/"); if (!S.needsOnboard()) toast("מחובר · הנתונים מסונכרנים ☁️");   // v13: a new account goes to the welcome flow instead
    }).catch(function (e) { authBusy(false, "כניסה"); authErr(e.message || "לא הצלחתי להתחבר"); });
  }
  // ---------- v13: welcome flow for a new account — personal details → goals → home ----------
  var OACT = [["0", "לא מתאמנים", 1.2], ["1", "1–2 בשבוע", 1.375], ["3", "3–4 בשבוע", 1.55], ["5", "5+ בשבוע", 1.725]];
  var OGOAL = [["lose", "ירידה במשקל", "📉", -450], ["keep", "שמירה על המשקל", "⚖️", 0], ["gain", "עלייה במסה", "💪", 250]];
  function onbData() {
    // always starts blank: a profile that was never saved holds only defaults (older versions defaulted to Roei's own details)
    if (!ui.onb) ui.onb = { name: "", sex: "", age: "", hcm: "", w: "", act: "", goal: "lose" };
    return ui.onb;
  }
  // Mifflin-St Jeor BMR × activity, then the goal's adjustment; protein ~1.8–2 g/kg, fat 0.8 g/kg, carbs = the rest
  function onbCalc(o) {
    var w = +o.w, h = +o.hcm, a = +o.age, bmr = 10 * w + 6.25 * h - 5 * a + (o.sex === "f" ? -161 : 5);
    var act = (OACT.filter(function (x) { return x[0] === o.act; })[0] || OACT[0])[2], tdee = bmr * act;
    var adj = (OGOAL.filter(function (x) { return x[0] === o.goal; })[0] || OGOAL[1])[3];
    var kcal = Math.max(o.sex === "f" ? 1300 : 1500, Math.round((tdee + adj) / 50) * 50);
    var pr = Math.round(w * (o.goal === "keep" ? 1.8 : 2) / 5) * 5, ft = Math.round(w * 0.8 / 2) * 2, cb = Math.max(0, Math.round((kcal - pr * 4 - ft * 9) / 4 / 5) * 5);
    return { kcal: kcal, protein: pr, carbs: cb, fat: ft, tdee: Math.round(tdee / 10) * 10 };
  }
  function onbErr(m) { var e = document.getElementById("oErr"); if (e) e.textContent = m || ""; }
  function onbOpts(field, list, cls) { var o = onbData(); return '<div class="' + cls + '" role="radiogroup" data-of="' + field + '">' + list.map(function (x) { var on = String(o[field]) === x[0]; return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? "on" : "") + '" data-ov="' + x[0] + '">' + (x[2] && typeof x[2] === "string" ? '<span class="emoji">' + x[2] + "</span>" : "") + "<b>" + x[1] + "</b></button>"; }).join("") + "</div>"; }
  function onbHead(step) {
    return '<div class="ohead"><img src="icons/logo.png" alt=""><b>PLATO</b></div><div class="osteps" aria-label="שלב ' + step + ' מתוך 2"><i class="on"></i><i' + (step > 1 ? ' class="on"' : "") + '></i></div><div class="ostep">שלב ' + n(step) + " מתוך " + n(2) + "</div>";
  }
  function renderWelcome(step) {
    var o = onbData(), T = THEMES[variant()];
    if (step === 1) {
      var fld = function (id, label, val, unit, mode, ph) { return '<label class="af onum"><span>' + label + '</span><span class="oin"><input id="' + id + '" type="number" inputmode="' + mode + '" value="' + esc(String(val)) + '" placeholder="' + ph + '"><i>' + unit + "</i></span></label>"; };
      $app.innerHTML = '<div class="onb">' + onbHead(1) + '<h1>נעים להכיר 👋</h1><p class="olead">כמה פרטים קטנים, ונחשב יעד יומי שמתאים בדיוק לך.</p>' +
        '<div class="lcard ocard"><label class="af"><span>איך קוראים לך?</span><input id="oName" type="text" autocomplete="given-name" dir="rtl" maxlength="30" placeholder="שם פרטי" value="' + esc(o.name) + '"></label>' +
        '<div class="af"><span>מין</span>' + onbOpts("sex", [["m", "זכר"], ["f", "נקבה"]], "oseg") + "</div>" +
        '<div class="orow3">' + fld("oAge", "גיל", o.age, "שנים", "numeric", "30") + fld("oH", "גובה", o.hcm, "ס״מ", "numeric", "175") + fld("oW", "משקל", o.w, "ק״ג", "decimal", "75") + "</div>" +
        '<div class="af"><span>כמה פעמים בשבוע מתאמנים?</span>' + onbOpts("act", OACT, "ochips") + "</div>" +
        '<div class="aerr" id="oErr" role="alert"></div></div>' +
        '<button class="btn pri onext" data-act="onbnext">המשך ליעדים ←</button></div>';
      return;
    }
    var c = onbCalc(o);
    $app.innerHTML = '<div class="onb">' + onbHead(2) + '<h1>היעדים שלך 🎯</h1><p class="olead">' + esc(o.name) + ", מה המטרה? חישבנו לפי הפרטים שלך, ואפשר לשנות כל מספר.</p>" +
      onbOpts("goal", OGOAL, "ogoal") +
      '<div class="lcard otd"><div class="otk"><b id="oKcal">' + n(fmt(c.kcal)) + '</b><span>קלוריות ליום</span></div><p>שריפה יומית משוערת: ' + n(fmt(c.tdee)) + ' קלוריות<br><small>חישוב לפי גיל, גובה, משקל ואימונים</small></p></div>' +
      '<div class="card ogf goals">' + goalField("gK", "קלוריות", c.kcal, "ליום", 50, T.kcal) + goalField("gP", "חלבון", c.protein, "ג׳", 5, T.protein) + goalField("gC", "פחמימה", c.carbs, "ג׳", 5, T.carbs) + goalField("gF", "שומן", c.fat, "ג׳", 2, T.fat) +
      '<p class="hint calc" id="gCalc"></p></div>' +
      '<button class="btn pri onext" data-act="onbdone">סיום · יאללה לאכול 🍽️</button><button class="back oback" data-act="onbback">→ חזרה לפרטים</button></div>';
    goalCalc();
  }
  function onbPick(el) {
    var g = el.closest("[data-of]"); if (!g || !ui.onb) return;
    var f = g.getAttribute("data-of"); ui.onb[f] = el.getAttribute("data-ov"); onbErr("");
    g.querySelectorAll("[data-ov]").forEach(function (b) { b.classList.toggle("on", b === el); b.setAttribute("aria-checked", b === el); });
    if (f === "goal") {
      var c = onbCalc(ui.onb);
      [["gK", c.kcal], ["gP", c.protein], ["gC", c.carbs], ["gF", c.fat]].forEach(function (x) { var i = document.getElementById(x[0]); if (i) i.value = x[1]; });
      var k = document.getElementById("oKcal"); if (k) k.innerHTML = n(fmt(c.kcal)); goalCalc();
    }
  }
  function onbNext() {
    var o = onbData(); o.name = (o.name || "").trim();
    var age = +o.age, h = +o.hcm, w = parseFloat(o.w);
    if (!o.name) return onbErr("רק שם, כדי שנדע איך לפנות אליך");
    if (!o.sex) return onbErr("צריך לבחור מין (משפיע על חישוב הקלוריות)");
    if (!(age >= 13 && age <= 100)) return onbErr("גיל בין 13 ל־100");
    if (!(h >= 120 && h <= 230)) return onbErr("גובה בסנטימטרים, למשל 175");
    if (!(w >= 30 && w <= 300)) return onbErr("משקל בקילוגרמים, למשל 75");
    if (!o.act) return onbErr("כמה פעמים בשבוע מתאמנים? אפשר גם 'לא מתאמנים'");
    o.ok1 = true; go("#/welcome/2");
  }
  function onbDone() {
    var o = onbData(), v = function (id) { return Math.round(parseFloat(document.getElementById(id).value) || 0); };
    var g = { kcal: v("gK"), protein: v("gP"), carbs: v("gC"), fat: v("gF") };
    if (g.kcal < 800) return toast("יעד הקלוריות נמוך מדי");
    var w = Math.round(parseFloat(o.w) * 10) / 10;
    S.setProfile({ name: o.name, sex: o.sex, age: +o.age, height: Math.round(+o.hcm) / 100, weight: w, activity: o.act });
    S.addWeight(w);
    S.setGoal(g); S.setPrefs({ onboarded: true, goalType: o.goal });
    var hi = (o.sex === "f" ? "ברוכה הבאה" : "ברוך הבא") + " ל־PLATO, " + o.name + " 🌱"; ui.onb = null; location.replace("#/"); route(); toast(hi);
  }
  function sheetApp() {
    openSheet(head("אפליקציה", "📱") + '<div class="sh-body"><div class="frow"><span>גרסה</span><span class="vv">' + n("v" + APP_VERSION) + '</span></div><div class="frow"><span>הנתונים</span><span class="vv">' + (window.Cloud && Cloud.session() ? "בטלפון + בענן" : "נשמרים בטלפון הזה") + '</span></div></div>' +
      '<button class="btn pri" data-act="export">ייצוא גיבוי (JSON)</button><button class="btn sec2" data-act="import">שחזור מגיבוי</button><input id="importFile" type="file" accept="application/json,.json" hidden>');
  }

  // ---------- menu (drawer from the left, where the button is) ----------
  function fmtDate(key) { var p = key.split("-"); return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1]; }
  function kg(x) { return (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, ""); }
  function signed(x) { var v = Math.round(x * 10) / 10; return (v > 0 ? "+" : v < 0 ? "−" : "") + kg(Math.abs(v)); }
  function weightInfo() {
    var w = S.weights(); if (!w.length) return null;
    var last = w[w.length - 1], first = w[0];
    return { list: w, last: last, first: first, change: last.kg - first.kg, prev: w.length > 1 ? w[w.length - 2] : null };
  }
  function openMenu() {
    var p = S.profile(), wi = weightInfo(), g = S.goal();
    var mrow = function (href, ic, tone, title, sub) { return '<button class="srow" data-go="' + href + '"><span class="tile emoji ' + tone + '">' + ic + '</span><span class="st"><b>' + title + "</b><small>" + sub + "</small></span>" + ICON.chevL + "</button>"; };
    $sheet.innerHTML = '<div class="drawer-wrap"><div class="dim" data-act="close"></div><nav class="drawer" role="dialog" aria-label="תפריט">' +
      '<div class="dh"><img src="icons/logo.png" alt=""><b>PLATO</b><button class="x" data-act="close" aria-label="סגירה">✕</button></div>' +
      '<button class="who" data-go="#/settings"><span class="av sm">' + avatarInner(p) + '</span><span class="st"><b>' + esc(p.name) + "</b><small>" + n(kg(p.weight)) + " ק״ג · " + n(fmt(g.kcal)) + " קלוריות ליום</small></span></button>" +
      '<div class="card">' +
      mrow("#/settings", "⚙️", "br", "הגדרות", "פרופיל, יעדים ושיפוצים") +
      '<button class="srow" data-act="goals"><span class="tile emoji br">🎯</span><span class="st"><b>יעדים</b><small>' + n(fmt(g.kcal)) + " קלוריות · " + n(g.protein) + ' ג׳ חלבון</small></span>' + ICON.chevL + "</button>" +
      mrow("#/db", "📖", "", "מאגר ערכים", n(ING_LIST.length) + " מרכיבים · חיפוש ערכים") +
      mrow("#/weekly", "📊", "br", "מעקב שבועי", "קלוריות וחלבון ב־7 ימים") +
      mrow("#/weight", "⚖️", "", "מעקב משקל", wi ? n(kg(wi.last.kg)) + " ק״ג" + (wi.list.length > 1 ? " · " + n(signed(wi.change)) + " מההתחלה" : "") : "עוד אין שקילות") +
      '</div><div class="foot"><b>PLATO</b> · גרסה ' + n("v" + APP_VERSION) + "</div></nav></div>";
  }
  function pageHead(title, lead) { return '<div class="phd"><button class="back" data-act="home">→ חזרה</button><h1>' + title + "</h1></div>" + (lead ? '<p class="lead">' + lead + "</p>" : ""); }

  // ---------- weekly ----------
  function renderWeekly() {
    var now = new Date(), g = S.goal(), off = ui.weekOff, week = [], sum = 0, sumP = 0, cnt = 0, maxV = g.kcal * 1.15;
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i - 7 * off), t = S.day(S.dateKey(d)).totals;
      week.push({ d: d, k: t.kcal, p: t.protein, today: off === 0 && i === 0 });
      if (t.kcal > 0) { sum += t.kcal; sumP += t.protein; cnt++; if (t.kcal > maxV) maxV = t.kcal; }
    }
    var H = 130, a = week[0].d, b = week[6].d;
    var range = a.getMonth() === b.getMonth() ? n(a.getDate() + "–" + b.getDate()) + " " + MONTHS[b.getMonth()] : n(a.getDate()) + " " + MONTHS[a.getMonth()] + " – " + n(b.getDate()) + " " + MONTHS[b.getMonth()];
    var bars = week.map(function (w) {
      var h = w.k > 0 ? Math.max(4, Math.round(w.k / maxV * H)) : 0;
      var st = dayGoalClass(w.k);
      return '<div class="d' + (w.today ? " today" : "") + (w.k > 0 ? "" : " none") + (st ? " " + st : "") + '" role="button" data-go="#/day/' + S.dateKey(w.d) + '"><span class="v n">' + (w.k > 0 ? fmt(w.k) : "") + '</span><i style="' + (h ? "height:" + h + "px" : "") + '"></i>' + DAYS[w.d.getDay()] + "</div>";
    }).join("");
    var goalTop = 26 + (H - Math.round(g.kcal / maxV * H));
    var rows = week.slice().reverse().map(function (w) {
      var pct = Math.min(100, Math.round(w.k / Math.max(1, g.kcal) * 100));
      var rst = dayGoalClass(w.k);
      return '<button class="wr' + (w.k > 0 ? "" : " none") + (rst ? " " + rst : "") + '" data-go="#/day/' + S.dateKey(w.d) + '"><span class="dn"><b>' + (w.today ? "היום" : "יום " + DAYNAME[w.d.getDay()]) + "</b><small>" + n(w.d.getDate()) + " " + MONTHS[w.d.getMonth()] + "</small></span>" +
        (w.k > 0 ? '<span class="wv"><span class="bar"><i style="width:' + pct + '%"></i></span><small>' + n(Math.round(w.p)) + ' ג׳ חלבון</small></span><span class="wk2"><b class="n">' + fmt(w.k) + "</b><small>קלוריות</small></span>" : '<span class="wv"><small>לא נרשם · אפשר להוסיף</small></span><span class="wk2"><b>—</b></span>') + ICON.chevL + "</button>";
    }).join("");
    $app.innerHTML = '<div class="set wkp">' + pageHead("מעקב שבועי") +
      '<div class="wnav"><button class="ib" data-act="wkprev" aria-label="שבוע קודם">' + ICON.chevR + '</button><span><b>' + (off === 0 ? "7 הימים האחרונים" : off === 1 ? "שבוע קודם" : "לפני " + n(off) + " שבועות") + "</b><small>" + range + '</small></span><button class="ib" data-act="wknext" aria-label="שבוע הבא"' + (off === 0 ? " disabled" : "") + ">" + ICON.chevL + "</button></div>" +
      '<div class="card wkc"><div class="bars tall"><span class="gl" style="top:' + goalTop + 'px"><em>יעד ' + n(fmt(g.kcal)) + "</em></span>" + bars + "</div></div>" +
      '<div class="stats"><div><b class="n">' + (cnt ? fmt(sum / cnt) : "—") + "</b><small>ממוצע קלוריות ליום</small></div><div><b class=\"n\">" + (cnt ? Math.round(sumP / cnt) : "—") + "</b><small>ממוצע חלבון (ג׳)</small></div><div><b class=\"n\">" + cnt + "/7</b><small>ימים שנרשמו</small></div></div>" +
      '<div class="gt">יום אחר יום · לוחצים על יום כדי לראות ולערוך</div><div class="card wlist">' + rows + "</div></div>";
  }

  // ---------- weight ----------
  function weightChart(list, W, H, mini) {
    var pts = list.slice(-30);
    if (pts.length < 2) return '<div class="wempty">' + (pts.length ? "אחרי השקילה הבאה יופיע כאן גרף" : "עוד אין שקילות") + "</div>";
    var vals = pts.map(function (p) { return p.kg; }), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pad = Math.max(0.5, (hi - lo) * 0.25); lo -= pad; hi += pad;
    var px = mini ? 8 : 34, py = mini ? 8 : 18;
    // RTL timeline: oldest on the right, latest on the left
    var X = function (i) { return W - px - i * (W - 2 * px) / (pts.length - 1); }, Y = function (v) { return py + (hi - v) / (hi - lo) * (H - 2 * py); };
    var line = pts.map(function (p, i) { return X(i).toFixed(1) + "," + Y(p.kg).toFixed(1); }).join(" ");
    var area = "M" + X(0).toFixed(1) + "," + (H - 2) + " L" + line.split(" ").join(" L") + " L" + X(pts.length - 1).toFixed(1) + "," + (H - 2) + " Z";
    var dots = pts.map(function (p, i) { var last = i === pts.length - 1; return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.kg).toFixed(1) + '" r="' + (last ? 5 : mini ? 0 : 3) + '" fill="' + (last ? "#2E6B2A" : "#FBF8F1") + '" stroke="#2E6B2A" stroke-width="2"/>'; }).join("");
    var labels = mini ? "" : '<text x="' + (W - 4) + '" y="' + (Y(pts[0].kg) - 9).toFixed(1) + '" text-anchor="end" class="cl">' + kg(pts[0].kg) + '</text><text x="' + (X(pts.length - 1) + 0).toFixed(1) + '" y="' + (Y(pts[pts.length - 1].kg) - 11).toFixed(1) + '" text-anchor="middle" class="cl b">' + kg(pts[pts.length - 1].kg) + "</text>";
    return '<svg class="wchart" direction="ltr" viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" preserveAspectRatio="xMidYMid meet"><path d="' + area + '" fill="#E3EDD9" opacity=".7"/><polyline points="' + line + '" fill="none" stroke="#4E9A3A" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' + dots + labels + "</svg>";
  }
  function weightAddRow() {
    var wi = weightInfo();
    return '<div class="wadd"><span class="fld"><input id="wNew" type="number" inputmode="decimal" step="0.1" min="20" max="400" placeholder="' + (wi ? kg(wi.last.kg) : "80") + '" aria-label="משקל חדש"><span>ק״ג</span></span><span class="wd">היום · ' + fmtDate(S.dateKey()) + '</span><button class="addw" data-act="addweight">שקילה חדשה</button></div>';
  }
  function wboxInner() {
    var wi = weightInfo();
    var ch = wi && wi.list.length > 1 ? '<span class="chg ' + (wi.change < 0 ? "dn" : wi.change > 0 ? "up" : "") + '">' + n(signed(wi.change)) + " ק״ג מההתחלה</span>" : '<span class="chg">התחלה</span>';
    return '<div class="wtop"><span class="wl">משקל נוכחי</span><b class="n">' + (wi ? kg(wi.last.kg) : "—") + "</b><small>ק״ג</small>" + ch + "</div>" +
      weightChart(wi ? wi.list : [], 320, 64, true) + weightAddRow() +
      '<button class="linkbtn" data-go="#/weight">כל השקילות ←</button>';
  }
  function renderWeight() {
    var wi = weightInfo(), list = wi ? wi.list : [];
    var rows = list.slice().reverse().map(function (w, i, arr) {
      var prev = arr[i + 1], d = prev ? w.kg - prev.kg : null;
      return '<div class="wh"><span class="dn"><b>' + fmtDate(w.date) + "</b>" + (i === arr.length - 1 ? "<small>התחלה</small>" : "") + '</span><span class="dd ' + (d < 0 ? "dn" : d > 0 ? "up" : "") + '">' + (d === null ? "" : n(signed(d))) + '</span><b class="kgv n">' + kg(w.kg) + '</b><button class="delx" data-wdel="' + w.id + '" aria-label="מחיקת שקילה">✕</button></div>';
    }).join("");
    $app.innerHTML = '<div class="set wgp">' + pageHead("מעקב משקל") +
      '<div class="card whero"><div class="wtop"><span class="wl">משקל נוכחי</span><b class="n">' + (wi ? kg(wi.last.kg) : "—") + "</b><small>ק״ג</small></div>" +
      (wi && list.length > 1 ? '<div class="wsum"><span>מההתחלה <b class="n ' + (wi.change < 0 ? "dn" : wi.change > 0 ? "up" : "") + '">' + signed(wi.change) + "</b> ק״ג</span><span>התחלה " + n(kg(wi.first.kg)) + " · " + fmtDate(wi.first.date) + "</span></div>" : "") +
      weightChart(list, 354, 150, false) + "</div>" +
      '<div class="gt">שקילה חדשה</div><div class="card wcard">' + weightAddRow() + "</div>" +
      '<div class="gt">היסטוריה</div><div class="card wlist">' + (rows || '<div class="fx emptyfx">אין עדיין שקילות</div>') + "</div></div>";
  }

  // ---------- values database ----------
  var DB_CATS = [["all", "הכל"], ["dishes", "★ מנות"], ["protein", "חלבון"], ["carb", "פחמימה"], ["fat", "שומן"], ["vegetable", "ירקות"], ["fruit", "פירות"], ["other", "אחר"], ["mine", "שלי"]];
  var CAT_IC = { protein: "🥚", carb: "🍞", fat: "🫒", vegetable: "🥒", fruit: "🍎", other: "🥫" };
  function dbRow(i) {
    var tags = (i.est ? '<span class="tag est">הערכה</span>' : "") + (i.custom ? '<span class="tag mine">שלי</span>' : "") + (i.edited ? '<span class="tag ed">ערכתי</span>' : "");
    var pu = i.unit ? " · " + esc(cleanUnit(i.unit.name_he)) + " = " + n(Math.round(valsFor(i, i.unit.grams).kcal)) : "";
    return '<button class="r4 off dbr" data-ing="' + i.id + '"><div class="rt"><b class="nm">' + esc(i.name) + tags + '</b><span class="bs">ל־' + n(100) + " ג׳" + pu + "</span></div>" + big(i.p, false) + ICON.chevL + "</button>";
  }
  // v11: saved dishes live in the values DB too (★ מנות filter, a ★ section on top of "הכל", and in search); per-serving totals; tap = the dish editor
  function dbDishRow(d) {
    var v = dishTotals(d), its = d.items.filter(function (i) { return ING[i.ingId]; });
    var sub = '<span class="dst">★ למנה</span> · פחמ׳ ' + n(r0(v.carbs)) + " · שומן " + n(r0(v.fat)) + " ג׳";
    return '<button class="r4 off dbr dbdish" data-editdish="' + d.id + '" aria-label="עריכת המנה ' + esc(d.name) + '" title="' + its.length + ' מרכיבים"><span class="dthumb">' + thumb(d) + '</span><div class="rt"><b class="nm">' + esc(d.name) + '</b><span class="bs">' + sub + "</span></div>" + big(v, false) + ICON.chevL + "</button>";
  }
  function dbDishes(q) { return byUse(S.dishes().filter(function (d) { return !q || d.name.toLowerCase().indexOf(q) >= 0 || d.items.some(function (i) { return ING[i.ingId] && ING[i.ingId].name.toLowerCase().indexOf(q) >= 0; }); }), function (d) { return "dish:" + d.id; }); }
  function dbListHTML() {
    var q = ui.dbQ.trim().toLowerCase(), c = ui.dbCat;
    var add = '<button class="addcustom" data-act="custom">＋ הוספת מרכיב משלי</button>';
    if (c === "dishes") {
      var ds = dbDishes(q);
      if (!ds.length) return '<div class="listmsg">' + (q ? 'לא נמצאה מנה בשם "' + esc(ui.dbQ.trim()) + '"' : "עוד אין מנות שמורות. בונים ארוחה ושומרים אותה עם 🔖") + "</div>";
      return '<div class="dv">★ מנות שמורות · ' + n(ds.length) + " · ערכים למנה</div>" + ds.map(dbDishRow).join("");
    }
    var list = ING_LIST.filter(function (i) { return (c === "all" || (c === "mine" ? i.custom : i.cat === c)) && (!q || i.name.toLowerCase().indexOf(q) >= 0); });
    var dl = c === "all" ? dbDishes(q) : [], dh = dl.length ? '<div class="dv star">★ מנות שמורות · ' + n(dl.length) + "</div>" + dl.map(dbDishRow).join("") : "";
    if (!list.length && !dl.length) return '<div class="listmsg">' + (q ? 'לא נמצא מרכיב בשם "' + esc(ui.dbQ.trim()) + '"' : c === "mine" ? "עוד לא הוספת מרכיבים משלך" : "אין מרכיבים") + "</div>" + add;
    if (c === "all" && !q) return dh + Object.keys(CAT_LABEL).map(function (k) { var g = list.filter(function (i) { return i.cat === k; }); return g.length ? '<div class="dv">' + CAT_LABEL[k] + " · " + n(g.length) + "</div>" + g.map(dbRow).join("") : ""; }).join("") + add;
    return dh + (list.length ? '<div class="dv">' + n(list.length) + " " + (dl.length ? "מרכיבים" : "תוצאות") + "</div>" + list.map(dbRow).join("") : "") + add;
  }
  function dbSeg() { return DB_CATS.map(function (c) { return '<button class="' + (c[0] === ui.dbCat ? "on" : "") + '" data-dbcat="' + c[0] + '"' + (c[0] === "saved" ? ' aria-label="מנות שמורות" title="מנות שמורות" ' : "") + ">" + c[1] + "</button>"; }).join(""); }
  function renderDB() {
    $app.innerHTML = '<div class="set dbp"><button class="hdadd" data-act="custom" aria-label="הוספת מוצר חדש">＋ הוספה</button>' + pageHead("מאגר ערכים", n(ING_LIST.length) + " מרכיבים" + (S.dishes().length ? " · " + n(S.dishes().length) + " מנות ★" : "") + " · ערכים ל־100 ג׳ וליחידה") +
      '<div class="search"><span class="ic">' + ICON.search + '</span><input id="dbq" type="search" placeholder="חיפוש מרכיב או מנה, למשל: טופו" value="' + esc(ui.dbQ) + '" autocomplete="off"><button class="clr" data-act="dbclear" aria-label="ניקוי"' + (ui.dbQ ? "" : " hidden") + ">✕</button></div>" +
      '<div class="seg" id="dbseg">' + dbSeg() + '</div><div class="dblist" id="dblist">' + dbListHTML() + "</div></div>";
    hydrate($app);
  }
  function refreshDB() { var L = document.getElementById("dblist"); if (!L) return; L.innerHTML = dbListHTML(); hydrate(L); document.getElementById("dbseg").innerHTML = dbSeg(); var c = document.querySelector("#app .search .clr"); if (c) c.hidden = !ui.dbQ; }
  function sheetEditIng(id) {
    var i = ING[id]; if (!i) return;
    var u = i.unit, f = function (fid, l, v, unit) { return '<div class="frow"><span>' + l + '</span><span class="fld"><input id="' + fid + '" type="number" inputmode="decimal" min="0" step="any" value="' + (v == null ? "" : Math.round(v * 10) / 10) + '">' + (unit ? "<span>" + unit + "</span>" : "") + "</span></div>"; };
    openSheet(head("עריכת ערכים", "✏️") + '<p class="nmdate">' + esc(i.name) + (i.custom ? "" : " · ערך מקורי של אקי נשמר, אפשר לחזור אליו") + "</p>" +
      '<div class="sh-body">' + (i.custom ? '<div class="frow"><span>שם</span><span class="fld wide"><input id="eName" type="text" maxlength="40" value="' + esc(i.name) + '" style="text-align:right"></span></div>' : "") +
      f("eK", "קלוריות ל־100 ג׳", i.p.kcal, "") + f("eP", "חלבון ל־100 ג׳", i.p.protein, "ג׳") + f("eC", "פחמימה ל־100 ג׳", i.p.carbs, "ג׳") + f("eF", "שומן ל־100 ג׳", i.p.fat, "ג׳") +
      '<div class="frow"><span>יחידה</span><span class="fld"><input id="eU" type="text" maxlength="20" placeholder="למשל: פרוסה" value="' + (u ? esc(cleanUnit(u.name_he)) : "") + '" style="text-align:right"></span></div>' +
      f("eUG", "משקל יחידה", u ? u.grams : null, "ג׳") + '<p class="hint">ארוחות שכבר נשמרו לא משתנות. הערכים החדשים ישמשו מעכשיו בבניית ארוחה.</p></div>' +
      '<button class="btn pri" data-act="saveing" data-id="' + id + '">שמירת הערכים</button>', "edit");
  }
  function saveIng(id) {
    var i = ING[id], num = function (k) { var v = parseFloat(document.getElementById(k).value); return isFinite(v) && v >= 0 ? v : null; };
    var p100 = { kcal: num("eK"), protein: num("eP"), carbs: num("eC"), fat: num("eF") };
    if (p100.kcal === null) { toast("צריך קלוריות ל־100 ג׳"); return; }
    ["protein", "carbs", "fat"].forEach(function (k) { if (p100[k] === null) p100[k] = 0; });
    var un = (document.getElementById("eU").value || "").trim(), ug = num("eUG");
    var origUnit = i.unit ? cleanUnit(i.unit.name_he) : "", unit = un && ug > 0 ? { name_he: un === origUnit && i.unit ? i.unit.name_he : un, grams: ug } : null;
    if (i.custom) {
      var nm = (document.getElementById("eName").value || "").trim() || i.name;
      var rest = (i.orig.units || []).filter(function (x) { return !i.unit || x.name_he !== i.unit.name_he; });
      S.updateCustom(id, { name_he: nm, per_100g: p100, units: unit ? [unit].concat(rest) : rest });
    } else {
      var o = { per_100g: p100 };
      if (!(i.unit && unit && unit.name_he === i.unit.name_he && unit.grams === i.unit.grams) && !(!i.unit && !unit)) o.unit = unit;
      var prev = S.overrides()[id]; if (prev && prev.unit !== undefined && o.unit === undefined) o.unit = prev.unit;
      S.setOverride(id, o);
    }
    loadIngredients();
    if (location.hash.indexOf("#/db") === 0) refreshDB(); else if (draft && location.hash.indexOf("#/build") === 0) refreshBuild();
    sheetIng(id); toast("הערכים עודכנו: " + ING[id].name.split(",")[0]);
  }
  function sheetIng(id) {
    var i = ING[id]; if (!i) return;
    var cols = [{ t: "ל־100 ג׳", s: "", g: 100 }].concat(i.units.slice(0, 2).map(function (u) { return { t: esc(cleanUnit(u.name_he)), s: n(r0(u.grams)) + " ג׳", g: u.grams }; }));
    var line = function (label, key, unit) { return '<div class="nr"><span>' + label + "</span>" + cols.map(function (c) { var v = valsFor(i, c.g)[key]; return '<b class="n">' + (key === "kcal" ? Math.round(v) : r0(v)) + (unit ? "<small>" + unit + "</small>" : "") + "</b>"; }).join("") + "</div>"; };
    var more = i.units.slice(2).map(function (u) { return '<div class="mu">' + esc(cleanUnit(u.name_he)) + " · " + n(r0(u.grams)) + " ג׳ · " + n(Math.round(valsFor(i, u.grams).kcal)) + " קלוריות</div>"; }).join("");
    openSheet(head(esc(i.name), CAT_IC[i.cat] || "🥣") +
      '<div class="itags"><span class="tag cat">' + (CAT_LABEL[i.cat] || "") + "</span>" + (i.est ? '<span class="tag est">הערכה</span>' : "") + (i.custom ? '<span class="tag mine">שלי</span>' : "") + (i.edited ? '<span class="tag ed">ערכתי</span>' : "") + "</div>" +
      '<div class="sh-body ntab"><div class="nr nh"><span></span>' + cols.map(function (c) { return "<b>" + c.t + (c.s ? "<small>" + c.s + "</small>" : "") + "</b>"; }).join("") + "</div>" +
      line("קלוריות", "kcal", "") + line("חלבון", "protein", "ג׳") + line("פחמימה", "carbs", "ג׳") + line("שומן", "fat", "ג׳") + "</div>" +
      (more ? '<div class="gt" style="padding:14px 4px 6px">יחידות נוספות</div>' + more : "") +
      '<button class="btn sec2" data-act="editing" data-id="' + i.id + '">✏️ עריכת הערכים</button>' +
      (i.edited ? '<button class="linkbtn" data-act="resetinge" data-id="' + i.id + '">חזרה לערכים המקוריים של אקי</button>' : "") +
      (i.custom ? '<button class="btn danger" data-act="delcustom" data-id="' + i.id + '">מחיקת המרכיב</button>' : ""), "ing");
  }

  // ---------- events ----------
  var armed = null;
  function arm(el, key) { if (armed === key) { armed = null; return true; } armed = key; el.classList.add("armed"); if (el.classList.contains("btn")) el.textContent = "בטוח? לחיצה נוספת מוחקת"; setTimeout(function () { if (armed === key) { armed = null; el.classList.remove("armed"); } }, 3500); return false; }

  document.addEventListener("click", function (ev) {
    var t = ev.target, el;
    if (fab.el && fab.el.classList.contains("open") && !t.closest("#tipfab")) tipClose();
    if ((el = t.closest("[data-act]"))) {
      var a = el.getAttribute("data-act");
      switch (a) {
        case "close": closeSheet(); return;
        case "onbnext": onbNext(); return;
        case "onbback": go("#/welcome/1"); return;
        case "onbdone": onbDone(); return;
        case "settings": go("#/settings"); return;
        case "home": go("#/"); return;
        case "newmeal": sheetNewMeal(); return;
        case "startbuild": var s = document.querySelector(".mo.sel"); newDraft(s ? s.getAttribute("data-pick") : mealByTime(), { date: ui.nmDate || S.dateKey() }); closeSheet(); go("#/build"); return;
        case "cancel": var back = draft && draft.date !== S.dateKey() ? "#/day/" + draft.date : (draft && draft.editId ? "#/" : "#/"); draft = null; go(back); return;
        case "toggle": draft.open = !draft.open; refreshBuild(); return;
        case "more": draft.more[draft.tab] = !draft.more[draft.tab]; refreshBuild(); return;
        case "clearq": draft.q = ""; renderBuild(); return;
        case "custom": sheetCustom(draft && location.hash.indexOf("#/build") === 0 ? draft.tab : ui.dbCat); return;
        case "addday":
          var items = draftSnap(); if (!items.length) { toast("עוד לא נבחרו מרכיבים"); return; }
          var key = draft.date, today = S.dateKey(), before = S.day(today).totals, editing = draft.editId;
          var used = Object.keys(draft.added).filter(function (id) { return draft.added[id] > 0; }).map(function (id) { return { id: id, n: draft.added[id] }; });   // v14
          if (editing) S.updateMeal(key, editing, { type: draft.meal, items: items, dishes: used }); else S.addMeal(key, { type: draft.meal, items: items, dishes: used });
          S.recordUse(items.filter(function (i) { return ING[i.ingId]; }).map(function (i) { return i.ingId; }).concat(Object.keys(draft.added).map(function (d) { return "dish:" + d; })));
          var mt = mealInfo(draft.meal).title; draft = null; buzz();
          if (key === today) { var pr = S.prefs(); S.setPrefs({ tip: { date: today, hidden: false, rot: (pr.tip.rot || 0) + 1 } }); ui.celebrate = { before: before, edited: !!editing, msg: editing ? mt + " עודכנה" : mt + " נוספה לסך היומי" }; go("#/"); }
          else { go("#/day/" + key); toast(editing ? mt + " עודכנה" : mt + " נוספה ל" + dayLabel(key)); }
          return;
        case "savedish": if (!draftSnap().length) return; var already = savedDish(); if (already) { toast("כבר שמור ב־★ · " + already.name); return; } sheetSaveDish(); return;
        case "dosavedish":
          var nm = (document.getElementById("dishName").value || "").trim(); if (!nm) { toast("צריך שם למנה"); return; }
          var nd = S.addDish(nm, draft.order.filter(function (id) { return draft.items[id]; }).map(function (id) { return { ingId: id, mode: draft.items[id].mode, qty: draft.items[id].qty }; }));
          savePhoto(nd.id, ui.pendPhoto || undefined, function () { closeSheet(); refreshBuild(); toast("נשמר ב־★ · " + nm); }); return;
        case "doeditdish":
          var en = (document.getElementById("dishName").value || "").trim(); if (!en) { toast("צריך שם למנה"); return; }
          S.updateDish(ui.editDish, { name: en }); savePhoto(ui.editDish, ui.pendPhoto, function () { closeSheet(); if (draft && document.getElementById("list")) refreshBuild(); if ((location.hash || "").indexOf("#/db") === 0) refreshDB(); toast("המנה עודכנה"); }); return;
        case "deldbdish": if (!arm(el, "deldb" + ui.editDish)) return; var did = ui.editDish; closeSheet(); delDish(did); return;   // v14: confirm tap, then delete (undo toast still offered)
        case "rmdishphoto": setPend(null); return;
        case "scanlabel":   // pre-check so he isn't sent to the camera for nothing
          if (!window.Cloud || !Cloud.session()) { labelState("err", LABEL_ERR.signin); return; }
          if (navigator.onLine === false) { labelState("err", LABEL_ERR.offline); return; }
          document.getElementById("labelFile").click(); return;
        case "dvq":
          var dvd = S.dishes().filter(function (x) { return x.id === ui.dvDish; })[0]; if (!dvd) return;
          ui.dvQty = Math.max(0.5, Math.min(6, (ui.dvQty || 1) + parseFloat(el.getAttribute("data-d"))));
          document.getElementById("dvqn").textContent = String(ui.dvQty).replace(".5", "½").replace(/^0½$/, "½"); document.querySelector(".dvadd").innerHTML = dvBtn(dvd); return;
        case "dvadd":
          var dva = S.dishes().filter(function (x) { return x.id === ui.dvDish; })[0]; if (!dva || !draft) return;
          addDishToDraft(dva, ui.dvQty || 1); closeSheet(); refreshBuild(); toast("נוסף לארוחה: " + dva.name); return;
        case "dvedit": closeSheet(); sheetDish(ui.dvDish); return;
        case "dvdel": closeSheet(); delDish(ui.dvDish); return;
        case "docustom":
          var cn = (document.getElementById("cName").value || "").trim(); var num = function (id) { return parseFloat(document.getElementById(id).value); };
          var k = num("cK"); if (!cn || !(k >= 0)) { toast("צריך שם וקלוריות ל־100 ג׳"); return; }
          var unitName = (document.getElementById("cU").value || "").trim(), ug = num("cUG");
          var c = S.addCustom({ name_he: cn, category: document.getElementById("cCat").value, per_100g: { kcal: k, protein: num("cP") || 0, carbs: num("cC") || 0, fat: num("cF") || 0 }, units: unitName && ug > 0 ? [{ name_he: unitName, grams: ug }] : [] });
          loadIngredients(); closeSheet(); toast("נוסף: " + cn);
          if (draft && location.hash.indexOf("#/build") === 0) { draft.tab = c.category; draft.q = ""; renderBuild(); } else if (location.hash.indexOf("#/db") === 0) { ui.dbCat = c.category; ui.dbQ = ""; renderDB(); }
          return;
        case "delmeal": if (!arm(el, "meal" + el.getAttribute("data-id"))) return; var dk = el.getAttribute("data-key") || S.dateKey(); S.deleteMeal(dk, el.getAttribute("data-id")); closeSheet(); route(); toast("הארוחה נמחקה"); return;
        case "editmeal": editMeal(el.getAttribute("data-id"), el.getAttribute("data-key") || S.dateKey()); return;
        case "newmealday": sheetNewMeal(el.getAttribute("data-key")); return;
        case "fixeye": commitFix(); ui.fixesOpen = !ui.fixesOpen; ui.fixAdding = false; renderSettings(); return;
        case "fixadd": commitFix(); ui.fixesOpen = true; ui.fixAdding = true; renderSettings(); return;
        case "fixcancel": var fi = document.getElementById("fixIn"); if (fi) fi.value = ""; ui.fixAdding = false; renderSettings(); return;
        case "menu": openMenu(); return;
        case "goals": closeSheet(); sheetGoal(); return;
        case "tipopen": if (fab.el.classList.contains("open")) tipClose(); else tipOpen(false); return;
        case "tipclose": tipClose(); return;
        case "tipnext": var rt = tipRot() + 1, x0 = tipNow(); S.setPrefs({ tip: { date: S.dateKey(), hidden: false, rot: rt, seenKey: tipKey(x0) } }); document.getElementById("tiptext").textContent = tipText(x0.cat, rt); clearTimeout(fab.autoClose); return;
        case "editing": sheetEditIng(el.getAttribute("data-id")); return;
        case "saveing": saveIng(el.getAttribute("data-id")); return;
        case "resetinge": if (!arm(el, "rst" + el.getAttribute("data-id"))) return; S.resetOverride(el.getAttribute("data-id")); loadIngredients(); if (location.hash.indexOf("#/db") === 0) refreshDB(); sheetIng(el.getAttribute("data-id")); toast("חזרנו לערכים המקוריים של אקי"); return;
        case "wkprev": ui.weekOff++; renderWeekly(); return;
        case "wknext": if (ui.weekOff > 0) ui.weekOff--; renderWeekly(); return;
        case "addweight":
          var wv = parseFloat((document.getElementById("wNew") || {}).value);
          if (!(wv >= 20 && wv <= 400)) { toast("צריך משקל בק״ג, למשל 81.5"); return; }
          wv = Math.round(wv * 10) / 10; S.addWeight(wv);
          var wb = document.getElementById("wbox"); if (wb) wb.innerHTML = wboxInner();
          if (location.hash.indexOf("#/weight") === 0) renderWeight(); else if (location.hash.indexOf("#/settings") === 0) renderSettings();
          toast("נרשמה שקילה: " + kg(wv) + " ק״ג"); return;
        case "dbclear": ui.dbQ = ""; renderDB(); return;
        case "delcustom": if (!arm(el, "cus" + el.getAttribute("data-id"))) return; S.deleteCustom(el.getAttribute("data-id")); loadIngredients(); closeSheet(); renderDB(); toast("המרכיב נמחק"); return;
        case "saveprofile":
          S.setProfile({ name: document.getElementById("pName").value.trim() || S.profile().name, height: parseFloat(document.getElementById("pH").value) || 0, age: parseInt(document.getElementById("pA").value, 10) || 0 });
          closeSheet(); renderSettings(); toast("הפרופיל נשמר"); return;
        case "savegoal":
          var gv = function (id) { return Math.max(0, Math.round(parseFloat(document.getElementById(id).value) || 0)); };
          S.setGoal({ kcal: gv("gK") || 2050, protein: gv("gP"), carbs: gv("gC"), fat: gv("gF") }); route(); toast("היעדים עודכנו ✓"); return;
        case "resetgoal": S.setGoal(S.defaultGoal()); route(); toast("חזרנו להמלצה של אקי"); return;
        case "export":
          var blob = new Blob([S.exportJSON()], { type: "application/json" }); var u = URL.createObjectURL(blob); var aEl = document.createElement("a");
          aEl.href = u; aEl.download = "plato-backup-" + S.dateKey() + ".json"; document.body.appendChild(aEl); aEl.click(); aEl.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); toast("הגיבוי ירד לקבצים"); return;
        case "import": document.getElementById("importFile").click(); return;
        case "photo": document.getElementById("photoFile").click(); return;
        case "skiplogin": Cloud.chooseLocal(); go("#/"); return;
        case "otpback": var op = otpPending(); if (op) ui.authEmail = op.email; localStorage.removeItem(OTPK); renderLogin(); return;
        case "resendcode": var oq = otpPending(); if (!oq) { renderLogin(); return; } if (otpLeft()) { paintResend(); return; }
          el.disabled = true; sendCode(oq.email, true).catch(function (e) { paintResend(); authErr(e.message || "לא הצלחתי לשלוח קוד"); }); return;
        case "syncnow": Cloud.syncNow().then(function () { var c2 = Cloud.status(); toast(c2.state === "ok" ? "מסונכרן ✓" : syncText(c2)); }); return;
        // v13: sign-out wipes this account's data from the device (it stays in the cloud) and reloads clean at the login screen
        case "logout": if (!arm(el, "logout")) return; Cloud.signOut().then(function () { closeSheet(); draft = null; ui.onb = null; location.replace(location.pathname + location.search + "#/login"); location.reload(); }); return;
        case "rmphoto": setPhoto(null); toast("התמונה הוסרה"); return;
      }
    }
    if ((el = t.closest("[data-pick]"))) {
      document.querySelectorAll(".mo").forEach(function (m) { m.classList.toggle("sel", m === el); m.setAttribute("aria-pressed", m === el); });
      document.getElementById("goName").textContent = el.getAttribute("data-pick"); return;
    }
    if ((el = t.closest("[data-meal]"))) { sheetMeal(el.getAttribute("data-meal"), el.getAttribute("data-key")); return; }
    if ((el = t.closest("[data-open]"))) { var o = el.getAttribute("data-open"); if (o === "profile") sheetProfile(); else if (o === "goal") sheetGoal(); else if (o === "account") sheetAccount(); else sheetApp(); return; }
    if ((el = t.closest("[data-ov]"))) { onbPick(el); return; }
    if ((el = t.closest("[data-gstep]"))) { var gi = document.getElementById(el.getAttribute("data-g")); gi.value = Math.max(0, (parseFloat(gi.value) || 0) + parseFloat(el.getAttribute("data-gstep"))); goalCalc(); return; }
    if ((el = t.closest("[data-go]"))) { closeSheet(); go(el.getAttribute("data-go")); return; }
    if ((el = t.closest("[data-dbcat]"))) { ui.dbCat = el.getAttribute("data-dbcat"); refreshDB(); return; }
    if ((el = t.closest("[data-ing]"))) { sheetIng(el.getAttribute("data-ing")); return; }
    if ((el = t.closest("[data-wdel]"))) { if (!arm(el, "w" + el.getAttribute("data-wdel"))) return; S.deleteWeight(el.getAttribute("data-wdel")); renderWeight(); return; }
    if ((el = t.closest("[data-fixtoggle]"))) { S.toggleFix(el.getAttribute("data-fixtoggle")); renderSettings(); return; }
    if ((el = t.closest("[data-fixdel]"))) { if (!arm(el, "fix" + el.getAttribute("data-fixdel"))) return; S.deleteFix(el.getAttribute("data-fixdel")); renderSettings(); return; }
    if ((el = t.closest(".dbdish[data-editdish]"))) { sheetDish(el.getAttribute("data-editdish")); return; }   // v11: saved dishes in the values DB
    if (!draft) return;
    if ((el = t.closest("[data-tab]"))) { draft.tab = el.getAttribute("data-tab"); draft.q = ""; var qi = document.getElementById("q"); if (qi) qi.value = ""; renderBuild(); return; }
    if ((el = t.closest("[data-add]"))) { var ing = ING[el.getAttribute("data-add")]; setQty(ing.id, ing.defMode, ing.defMode === "u" ? 1 : 100); refreshBuild(); return; }
    if ((el = t.closest("[data-rm]"))) { setQty(el.getAttribute("data-rm"), "g", 0); refreshBuild(); toast("הוסר מהארוחה"); return; }
    if ((el = t.closest("[data-rmfix]"))) { draft.fixed.splice(+el.getAttribute("data-rmfix"), 1); refreshBuild(); toast("הוסר מהארוחה"); return; }
    if ((el = t.closest("[data-deldish]"))) { delDish(el.getAttribute("data-deldish")); return; }
    if ((el = t.closest("[data-editdish]"))) { sheetDish(el.getAttribute("data-editdish")); return; }
    if ((el = t.closest("[data-step],[data-es]"))) {
      var id = el.getAttribute("data-id"), it = draft.items[id]; if (!it) return;
      var stp = it.mode !== "g" ? 1 : 25, d = parseInt(el.getAttribute("data-step") || el.getAttribute("data-es"), 10);
      var nq = d > 0 ? (Math.floor(it.qty / stp + 1e-9) + 1) * stp : (Math.ceil(it.qty / stp - 1e-9) - 1) * stp;
      setQty(id, it.mode, Math.max(0, Math.round(nq * 100) / 100)); refreshBuild(); return;
    }
    if ((el = t.closest("[data-dish]"))) { sheetDishView(el.getAttribute("data-dish")); return; }   // v12: tap = detail sheet, add from there
  });

  // v10: swipe a saved dish left to delete (pointer events; vertical scrolling stays native via touch-action:pan-y)
  var sw = null;
  document.addEventListener("pointerdown", function (ev) {
    var w = ev.target.closest && ev.target.closest(".dsw"); if (!w || ev.target.closest(".dact") || (ev.pointerType === "mouse" && ev.button !== 0)) return;
    sw = { w: w, r: w.querySelector(".r4"), x: ev.clientX, y: ev.clientY, dx: 0, on: false, id: ev.pointerId };
  });
  document.addEventListener("pointermove", function (ev) {
    if (!sw || ev.pointerId !== sw.id) return;
    var dx = ev.clientX - sw.x, dy = ev.clientY - sw.y;
    if (!sw.on) { if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; } if (dx < -10 && Math.abs(dx) > Math.abs(dy)) { sw.on = true; sw.w.classList.add("swiping"); try { sw.w.setPointerCapture(ev.pointerId); } catch (e) {} } else return; }
    sw.dx = Math.min(0, dx); sw.r.style.transform = "translateX(" + sw.dx + "px)";
    sw.w.classList.toggle("far", sw.dx < -sw.w.offsetWidth * 0.35);
  });
  function swEnd(ev) {
    if (!sw || ev.pointerId !== sw.id) return; var s2 = sw; sw = null; if (!s2.on) return;
    s2.w.classList.remove("swiping", "far"); ui.swiped = performance.now();
    if (s2.dx < -s2.w.offsetWidth * 0.35) { s2.w.style.maxHeight = s2.w.offsetHeight + "px"; void s2.w.offsetHeight; s2.w.classList.add("gone"); var id = s2.w.getAttribute("data-swipe"); setTimeout(function () { delDish(id); }, 300); }
    else s2.r.style.transform = "";
  }
  document.addEventListener("pointerup", swEnd); document.addEventListener("pointercancel", swEnd);
  document.addEventListener("click", function (ev) { if (ui.swiped && performance.now() - ui.swiped < 400 && ev.target.closest && ev.target.closest(".dsw")) { ev.stopPropagation(); ev.preventDefault(); } }, true);

  document.addEventListener("input", function (ev) {
    if (ev.target.id === "aCode") { var cv = ev.target.value.replace(/\D/g, "").slice(0, 10); if (cv !== ev.target.value) ev.target.value = cv; authErr(""); return; }
    if (ev.target.id === "dbq") { ui.dbQ = ev.target.value; refreshDB(); return; }
    if (/^g[KPCF]$/.test(ev.target.id)) { goalCalc(); return; }
    if (/^o(Name|Age|H|W)$/.test(ev.target.id) && ui.onb) { ui.onb[{ oName: "name", oAge: "age", oH: "hcm", oW: "w" }[ev.target.id]] = ev.target.value; onbErr(""); return; }
    if (ev.target.id === "q" && draft) {
      draft.q = ev.target.value;
      var cb = document.querySelector(".search .clr"); if (cb) cb.hidden = !draft.q;
      document.getElementById("list").innerHTML = listHTML(); document.getElementById("list").scrollTop = 0; hydrate(document.getElementById("list"));
      document.getElementById("seg").innerHTML = CATS.map(function (c) { return '<button class="' + (!draft.q && c[0] === draft.tab ? "on" : "") + '" data-tab="' + c[0] + '"' + (c[0] === "saved" ? ' aria-label="מנות שמורות" title="מנות שמורות" ' : "") + ">" + c[1] + "</button>"; }).join("");
    }
  });
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.hasAttribute && (t.hasAttribute("data-modesel") || t.hasAttribute("data-em")) && draft) {   // כף / כפית / גרם … keep the same amount, convert the number
      var mid = t.getAttribute("data-modesel") || t.getAttribute("data-em"), mi = draft.items[mid], ing2 = ING[mid], nm2 = t.value; if (!mi) return;
      var gr = gramsOf(ing2, mi.mode, mi.qty), no = optOf(ing2, nm2);
      setQty(mid, nm2, no ? Math.max(0.5, Math.round(gr / no.grams * 2) / 2) : Math.max(1, Math.round(gr)));
      refreshBuild(); return;
    }
    if (t.hasAttribute && (t.hasAttribute("data-qty") || t.hasAttribute("data-eq")) && draft) {
      var id = t.getAttribute("data-qty") || t.getAttribute("data-eq"), it = draft.items[id]; var v = parseFloat(t.value);
      setQty(id, it ? it.mode : ING[id].defMode, isFinite(v) ? Math.max(0, v) : 0); refreshBuild(); return;
    }
    if (t.id === "labelFile" && t.files && t.files[0]) { labelScan(t.files[0]); t.value = ""; return; }
    if ((t.id === "dishPhoto" || t.id === "dishPhoto2") && t.files && t.files[0]) {
      resizeImage(t.files[0], 360, function (d) { if (d) setPend(d); else toast("לא הצלחתי לקרוא את התמונה"); });
      t.value = ""; return;
    }
    if (t.id === "photoFile" && t.files && t.files[0]) {
      resizeImage(t.files[0], 256, function (d) { if (d) { setPhoto(d); toast("התמונה עודכנה"); } else toast("לא הצלחתי לקרוא את התמונה"); });
      t.value = ""; return;
    }
    if (t.id === "importFile" && t.files && t.files[0]) {
      var rd = new FileReader();
      rd.onload = function () { try { S.importJSON(rd.result); loadIngredients(); closeSheet(); toast("הנתונים שוחזרו מהגיבוי"); renderSettings(); } catch (e) { toast("הקובץ לא נראה כמו גיבוי של PLATO"); } };
      rd.readAsText(t.files[0]);
    }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" || ev.isComposing || ev.keyCode === 229) return;   // ignore Enter that only confirms IME/predictive text
    var t = ev.target;
    if (t.id === "fixIn") return;   // handled by the form's submit event (works with the iOS keyboard's Done/Return key)
    if (t.id === "wNew") { ev.preventDefault(); document.querySelector('[data-act="addweight"]').click(); return; }
    if (t.id === "dbq") t.blur();
    if (t.id === "dishName") { var go = document.querySelector('[data-act="doeditdish"]') || document.querySelector('[data-act="dosavedish"]'); if (go) go.click(); return; }
    if (t.hasAttribute && (t.hasAttribute("data-qty") || t.hasAttribute("data-eq"))) t.blur();
    if (t.id === "q") t.blur();
  });

  // ---------- שיפוצים input ----------
  // iOS bug fix: before v4 the text was saved ONLY on a keydown Enter. Closing the iPhone keyboard (Done / tapping
  // outside) or tapping ➕ / 👁 again re-rendered the list and threw the typed text away. Now every way out commits.
  function commitFix() {
    var i = document.getElementById("fixIn"); if (!i) return false;
    var v = i.value.trim(); if (!v) return false;
    S.addFix(v); i.value = ""; return true;
  }
  document.addEventListener("submit", function (ev) {
    if (ev.target.id === "authForm") { ev.preventDefault(); doAuth(); return; }
    if (ev.target.id === "codeForm") { ev.preventDefault(); doCode(); return; }
    if (ev.target.id !== "fixForm") return;
    ev.preventDefault();
    var ok = commitFix(); ui.fixesOpen = true; ui.fixAdding = true; renderSettings();
    if (ok) toast("נשמר בשיפוצים");
  });
  document.addEventListener("focusout", function (ev) {
    if (ev.target.id !== "fixIn") return;
    if (commitFix()) toast("נשמר בשיפוצים");
    setTimeout(function () {
      var a = document.activeElement; if (a && a.id === "fixIn") return;
      if (!document.getElementById("fixIn")) return;
      ui.fixAdding = false; renderSettings();
    }, 250);
  });
  // keep focus in the field when tapping its own ✓ / ✕ buttons (so ✕ really discards)
  document.addEventListener("mousedown", function (ev) { if (ev.target.closest && ev.target.closest("[data-keepfocus]")) ev.preventDefault(); });
  window.addEventListener("pagehide", commitFix);
  document.addEventListener("visibilitychange", function () { if (document.hidden) commitFix(); });

  // day rollover at local midnight
  var lastDay = S.dateKey();
  setInterval(function () { var k = S.dateKey(); if (k !== lastDay) { lastDay = k; if (!location.hash || location.hash === "#/") renderHome(); } }, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && (!location.hash || location.hash === "#/")) renderHome(); });

  // test hooks (used by Playwright only)
  window.PLATO = { route: route, openSheet: function (k) { if (k === "profile") sheetProfile(); else if (k === "goal") sheetGoal(); else if (k === "app") sheetApp(); else if (k === "menu") openMenu(); }, version: APP_VERSION };

  S.load(); loadIngredients();
  applyTheme(); fabInit();
  if (location.hash.indexOf("#/build") === 0) location.hash = "#/";
  if (window.Cloud && Cloud.enabled()) {
    Cloud.init({ imgGet: imgGet, imgPut: imgPut, clearImages: imgClear, onChange: onCloudChange, onStatus: onSyncStatus });
    if (Cloud._landing) Cloud._landing.then(function () { route(); toast("המייל אושר · מחובר ☁️"); });
    else if (!Cloud.mode() && !/access_token=/.test(location.hash)) location.hash = "#/login";
  }
  route();
})();
