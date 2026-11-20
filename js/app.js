/* PLATO app — vanilla JS, no build. Views: home, build, settings (hash routing). */
(function () {
  "use strict";
  var APP_VERSION = window.APP_VERSION || "3";
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
  function toast(msg) {
    var t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2000);
  }
  var ICON = {
    gear: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A4330" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    chevL: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    chevUp: '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
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
  var CATS = [["saved", "שמורות"], ["protein", "חלבון"], ["carb", "פחמימה"], ["fat", "שומן"], ["vegetable", "ירקות"], ["fruit", "פירות"], ["other", "אחר"]];
  var CAT_LABEL = { protein: "חלבון", carb: "פחמימה", fat: "שומן", vegetable: "ירקות", fruit: "פירות", other: "אחר" };
  var ESTIMATE = { asam_sweet_chili: 1, sweet_corn_canned_usda: 1, rice_paper: 1, whey_protein_powder: 1 };
  var BAD_UNIT = /^(כוס|חצי כוס|רבע כוס|אריזה|גביע|מנה|קערת|קופסה)/;
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
  function norm(i, custom) {
    var units = (i.units || []).filter(function (u) { return u && u.grams > 0; });
    var unit = null;
    for (var k = 0; k < units.length; k++) if (!BAD_UNIT.test(units[k].name_he)) { unit = units[k]; break; }
    var cat = i.category;
    var defMode = unit && (unit.grams <= 130 || cat === "fruit") ? "u" : "g";
    return { id: i.id, name: i.name_he, cat: cat, p: i.per_100g, unit: unit, defMode: defMode, est: !!ESTIMATE[i.id], custom: !!custom };
  }
  var ING = {}, ING_LIST = [];
  function loadIngredients() {
    ING = {}; ING_LIST = [];
    DB.ingredients.forEach(function (i) { var x = norm(i, false); ING[x.id] = x; ING_LIST.push(x); });
    S.customs().forEach(function (c) { var x = norm(c, true); ING[x.id] = x; ING_LIST.push(x); });
  }
  function gramsOf(ing, mode, qty) { return mode === "u" && ing.unit ? qty * ing.unit.grams : qty; }
  function valsFor(ing, grams) { var f = grams / 100; return { kcal: ing.p.kcal * f, protein: ing.p.protein * f, carbs: ing.p.carbs * f, fat: ing.p.fat * f }; }
  function unitWord(ing, qty) { var s = shortUnit(ing.unit.name_he); return qty === 1 ? s : (PLURAL[s] || s); }
  function qtyText(ing, mode, qty) { return mode === "u" && ing.unit ? n(r1(qty)) + " " + unitWord(ing, qty) : n(Math.round(qty)) + " ג׳"; }
  function snapshot(id, it) {
    var ing = ING[id]; var g = gramsOf(ing, it.mode, it.qty); var v = valsFor(ing, g);
    return { ingId: id, name: ing.name, mode: it.mode, qty: it.qty, unitName: it.mode === "u" && ing.unit ? ing.unit.name_he : null, grams: Math.round(g * 10) / 10,
      kcal: v.kcal, protein: v.protein, carbs: v.carbs, fat: v.fat };
  }
  function itemQtyLabel(s) {
    if (s.mode === "u" && s.unitName) { var u = shortUnit(s.unitName); return n(r1(s.qty)) + " " + (s.qty === 1 ? u : (PLURAL[u] || u)); }
    return n(Math.round(s.grams)) + " ג׳";
  }

  // ---------- state ----------
  var draft = null;    // {meal, items:{id:{mode,qty}}, order:[], open, tab, q, added:{dishId:n}}
  var ui = { fixesOpen: false, fixAdding: false };

  function newDraft(meal) { draft = { meal: meal, items: {}, order: [], open: false, tab: "protein", q: "", added: {} }; }
  function setQty(id, mode, qty) {
    if (qty <= 0) { delete draft.items[id]; draft.order = draft.order.filter(function (x) { return x !== id; }); return; }
    if (!draft.items[id]) draft.order.push(id);
    draft.items[id] = { mode: mode, qty: qty };
  }
  function draftSnap() { return draft.order.filter(function (id) { return draft.items[id] && ING[id]; }).map(function (id) { return snapshot(id, draft.items[id]); }); }
  function tot(items) { var t = { kcal: 0, protein: 0, carbs: 0, fat: 0 }; items.forEach(function (i) { t.kcal += i.kcal; t.protein += i.protein; t.carbs += i.carbs; t.fat += i.fat; }); return t; }

  // ---------- router ----------
  function route() {
    var h = location.hash || "#/";
    closeSheet();
    if (h.indexOf("#/build") === 0) { if (!draft) newDraft(mealByTime()); renderBuild(); }
    else if (h.indexOf("#/settings") === 0) renderSettings();
    else renderHome();
    window.scrollTo(0, 0);
  }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  window.addEventListener("hashchange", route);

  // ---------- home ----------
  var DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  var MONTHS = ["בינואר", "בפברואר", "במרץ", "באפריל", "במאי", "ביוני", "ביולי", "באוגוסט", "בספטמבר", "באוקטובר", "בנובמבר", "בדצמבר"];
  var DAYNAME = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  function renderHome() {
    var now = new Date(), g = S.goal(), day = S.day(S.dateKey(now)), t = day.totals;
    var eaten = Math.round(t.kcal), left = g.kcal - eaten, over = left < 0;
    var C = 2 * Math.PI * 98, frac = Math.min(1, eaten / Math.max(1, g.kcal));
    var macro = function (label, color, v, goal) {
      var pct = Math.min(100, Math.round(v / Math.max(1, goal) * 100));
      return '<div class="mc"><div class="t"><span class="dot" style="background:' + color + '"></span>' + label + '</div><div class="v">' + n(Math.round(v)) + "<small> / " + n(goal) + ' ג׳</small></div><div class="bar"><i style="width:' + pct + "%;background:" + color + '"></i></div></div>';
    };
    var meals = day.meals.map(function (m) {
      var names = m.items.map(function (i) { return i.name.split(",")[0]; }).join(" · ");
      return '<button class="ml" data-meal="' + m.id + '"><span class="t"><b>' + esc(m.type) + "</b><span>" + esc(names) + '</span></span><span class="k"><b class="n">' + fmt(m.totals.kcal) + "</b><span>" + n(Math.round(m.totals.protein)) + " ג׳ חלבון</span></span></button>";
    }).join("");
    // week
    var week = [], sum = 0, cnt = 0, maxV = g.kcal * 1.15;
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      var k = S.day(S.dateKey(d)).totals.kcal;
      week.push({ d: d, k: k, today: i === 0 });
      if (k > 0) { sum += k; cnt++; if (k > maxV) maxV = k; }
    }
    var H = 66;
    var bars = week.map(function (w) {
      var h = w.k > 0 ? Math.max(4, Math.round(w.k / maxV * H)) : 0;
      return '<div class="d' + (w.today ? " today" : "") + (w.k > 0 ? "" : " none") + '" title="' + fmt(w.k) + ' קק״ל"><i style="' + (h ? "height:" + h + "px" : "") + '"></i>' + DAYS[w.d.getDay()] + "</div>";
    }).join("");
    var goalTop = 6 + (H - Math.round(g.kcal / maxV * H));
    $app.innerHTML =
      '<div class="home">' +
      '<div class="hd"><img src="icons/logo.png" alt=""><b>PLATO</b><span class="date">יום ' + DAYNAME[now.getDay()] + " · " + now.getDate() + " " + MONTHS[now.getMonth()] + '</span><button class="gear" data-act="settings" aria-label="הגדרות" title="הגדרות">' + ICON.gear + "</button></div>" +
      '<div class="ring' + (over ? " over" : "") + '"><svg width="224" height="224"><circle cx="112" cy="112" r="98" stroke="#E7DFCF" stroke-width="13" fill="none"/>' + (frac > 0 ? '<circle cx="112" cy="112" r="98" stroke="' + (over ? "#7A5A3F" : "#4E9A3A") + '" stroke-width="13" fill="none" stroke-linecap="round" style="stroke-dasharray:' + (frac * C).toFixed(1) + " " + C.toFixed(1) + '"/>' : "") + '</svg>' +
      '<div class="c"><div class="l">' + (over ? "חרגת היום ב־" : "נשארו היום") + '</div><div class="k n" data-test="left">' + fmt(Math.abs(left)) + '</div><div class="s"><b class="n">' + fmt(eaten) + "</b> מתוך " + n(fmt(g.kcal)) + " קק״ל</div></div></div>" +
      '<div class="macs">' + macro("חלבון", "#4E9A3A", t.protein, g.protein) + macro("פחמימה", "#7A5A3F", t.carbs, g.carbs) + macro("שומן", "#C2A878", t.fat, g.fat) + "</div>" +
      '<div class="sec"><b>מה אכלתי היום</b><span>' + (day.meals.length ? n(day.meals.length) + (day.meals.length === 1 ? " ארוחה" : " ארוחות") : "") + "</span></div>" +
      (meals ? '<div class="meals">' + meals + "</div>" : '<div class="empty-card">עוד לא נרשמו ארוחות היום</div>') +
      '<div class="sec"><b>השבוע</b><span>' + (cnt ? "ממוצע " + n(fmt(sum / cnt)) + " · יעד " + n(fmt(g.kcal)) : "עוד אין נתונים") + "</span></div>" +
      '<div class="wk"><div class="bars"><span class="gl" style="top:' + goalTop + 'px"></span>' + bars + "</div></div>" +
      '<div class="cta"><button class="btn pri" data-act="newmeal">＋ ארוחה חדשה</button></div>' +
      "</div>";
  }

  // ---------- sheets ----------
  function openSheet(html, cls) {
    $sheet.innerHTML = '<div class="sheet-wrap ' + (cls || "") + '"><div class="dim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + "</div></div>";
  }
  function closeSheet() { $sheet.innerHTML = ""; }
  function head(title, ic) { return '<div class="sh-head">' + (ic ? '<span class="tile emoji">' + ic + "</span>" : "") + "<h3>" + title + '</h3><button class="x" data-act="close" aria-label="סגירה">✕</button></div>'; }

  function sheetNewMeal() {
    var day = S.day(), sel = mealByTime();
    var logged = {}; day.meals.forEach(function (m) { logged[m.type] = (logged[m.type] || 0) + m.totals.kcal; });
    var rows = MEALS.map(function (m) {
      return '<button class="mo' + (m.id === sel ? " sel" : "") + '" data-pick="' + m.id + '" aria-pressed="' + (m.id === sel) + '"><span class="tile emoji ' + m.tone + '">' + m.ic + '</span><span class="st"><b>' + m.id + "</b><small>" + (/^\d/.test(m.hint) ? n(m.hint) : m.hint) + "</small></span>" + (logged[m.id] ? '<span class="lg">✓ ' + n(fmt(logged[m.id])) + " קק״ל</span>" : "") + '<span class="rad"></span></button>';
    }).join("");
    openSheet(head("איזו ארוחה?") + '<div class="mlist">' + rows + '</div><button class="btn pri" data-act="startbuild">המשך · <span id="goName">' + sel + "</span></button>", "nm");
  }
  function sheetMeal(id) {
    var key = S.dateKey(), day = S.day(key), m = day.meals.filter(function (x) { return x.id === id; })[0]; if (!m) return;
    var time = new Date(m.createdAt);
    var lines = m.items.map(function (i) { return '<div class="ln"><span class="q">' + itemQtyLabel(i) + '</span><span class="nm">' + esc(i.name) + '</span><span class="kc n">' + fmt(i.kcal) + "</span></div>"; }).join("");
    openSheet(head(esc(mealInfo(m.type).title), mealInfo(m.type).ic) +
      '<div class="items">' + lines + "</div>" +
      '<div class="totline"><span>חלבון ' + n(Math.round(m.totals.protein)) + " · פחמ׳ " + n(Math.round(m.totals.carbs)) + " · שומן " + n(Math.round(m.totals.fat)) + " ג׳ · " + n(String(time.getHours()).padStart(2, "0") + ":" + String(time.getMinutes()).padStart(2, "0")) + "</span><b>" + n(fmt(m.totals.kcal)) + ' <span>קק״ל</span></b></div>' +
      '<button class="btn danger" data-act="delmeal" data-id="' + m.id + '">מחיקת הארוחה</button>');
  }

  // ---------- build ----------
  function rowIng(ing) {
    var it = draft.items[ing.id], on = !!it;
    var mode = on ? it.mode : ing.defMode, qty = on ? it.qty : 0;
    var g = on ? gramsOf(ing, mode, qty) : (ing.defMode === "u" ? ing.unit.grams : 100);
    var v = valsFor(ing, g);
    var basis = on ? (mode === "u" ? "ל־" + n(r1(qty)) + " × " + esc(cleanUnit(ing.unit.name_he)) : "ל־" + n(Math.round(qty)) + " ג׳")
      : (ing.defMode === "u" ? esc(cleanUnit(ing.unit.name_he)) + " · " + n(r0(ing.unit.grams)) + " ג׳" : "ל־" + n(100) + " ג׳");
    var tags = (ing.est ? '<span class="tag est">הערכה</span>' : "") + (ing.custom ? '<span class="tag mine">שלי</span>' : "");
    var ctl = "";
    if (on) {
      ctl = '<div class="ctl"><div class="stp"><button data-step="-1" data-id="' + ing.id + '" aria-label="פחות">−</button><div class="qv"><input type="number" inputmode="decimal" min="0" step="any" value="' + (mode === "u" ? r1(qty) : Math.round(qty)) + '" data-qty="' + ing.id + '" aria-label="כמות"><small>' + (mode === "u" ? unitWord(ing, qty) : "גרם") + '</small></div><button data-step="1" data-id="' + ing.id + '" aria-label="יותר">+</button></div>' +
        (ing.unit ? '<button class="mode" data-mode="' + ing.id + '">' + (mode === "u" ? "לפי גרם" : "לפי " + esc(shortUnit(ing.unit.name_he))) + "</button>" : "") + "</div>";
    }
    return '<div class="r4 ' + (on ? "on" : "off") + '" data-row="' + ing.id + '"><div class="rt"><b class="nm">' + esc(ing.name) + tags + '</b><span class="bs">' + basis + "</span>" + ctl + "</div>" +
      big(v, on) + (on ? "" : '<button class="addb" data-add="' + ing.id + '" aria-label="הוספה">+</button>') + "</div>";
  }
  function big(v, on) {
    return '<div class="lt"><div class="big"><div><span class="bv kc">' + n(Math.round(v.kcal)) + '</span><span class="bl">קלוריות</span></div><div><span class="bv pr">' + n(r0(v.protein)) + '<small>ג׳</small></span><span class="bl">חלבון</span></div></div>' +
      (on ? '<div class="tiny">פחמ׳ ' + n(r0(v.carbs)) + " · שומן " + n(r0(v.fat)) + " ג׳</div>" : "") + "</div>";
  }
  function dishTotals(d) { return tot(d.items.filter(function (i) { return ING[i.ingId]; }).map(function (i) { return snapshot(i.ingId, i); })); }
  function rowDish(d) {
    var v = dishTotals(d), a = draft.added[d.id];
    var sub = d.items.filter(function (i) { return ING[i.ingId]; }).map(function (i) { var ing = ING[i.ingId]; return (i.mode === "u" && ing.unit ? r1(i.qty) + " " + unitWord(ing, i.qty) : Math.round(i.qty) + " ג׳") + " " + ing.name.split(",")[0]; }).join(" · ");
    return '<div class="r4 dish off' + (a ? " added" : "") + '"><button class="delx" data-deldish="' + d.id + '" aria-label="מחיקת מנה" title="מחיקת מנה">✕</button><div class="rt"><b class="nm">' + esc(d.name) + '</b><span class="bs">' + (a ? '<span class="ok-t">נוסף לארוחה ×' + n(a) + "</span>" : esc(sub)) + "</span></div>" +
      big(v, false) + '<button class="addb" data-dish="' + d.id + '" aria-label="הוספת המנה">' + (a ? "✓" : "+") + "</button></div>";
  }
  function listHTML() {
    var q = draft.q.trim();
    if (q) {
      var ql = q.toLowerCase();
      var hits = ING_LIST.filter(function (i) { return i.name.toLowerCase().indexOf(ql) >= 0; });
      var dh = S.dishes().filter(function (d) { return d.name.indexOf(q) >= 0; });
      if (!hits.length && !dh.length) return '<div class="listmsg">לא נמצא מרכיב בשם "' + esc(q) + '"</div>' + addCustomBtn();
      return dh.map(rowDish).join("") + hits.map(rowIng).join("") + addCustomBtn();
    }
    if (draft.tab === "saved") {
      var ds = S.dishes();
      return (ds.length ? ds.map(rowDish).join("") : '<div class="listmsg">אין עדיין מנות שמורות. בונים ארוחה ולוחצים על הסימנייה כדי לשמור.</div>');
    }
    return ING_LIST.filter(function (i) { return i.cat === draft.tab; }).map(rowIng).join("") + addCustomBtn();
  }
  function addCustomBtn() { return '<button class="addcustom" data-act="custom">＋ הוספת מרכיב משלי</button>'; }
  function sumHTML() {
    var items = draftSnap(), t = tot(items), g = S.goal(), day = S.day().totals;
    var lk = Math.round(g.kcal - day.kcal - t.kcal), lp = Math.round(g.protein - day.protein - t.protein);
    var rows = items.map(function (i) { return '<div class="ln"><span class="q">' + itemQtyLabel(i) + '</span><span class="nm">' + esc(i.name) + '</span><span class="kc n">' + fmt(i.kcal) + "</span></div>"; }).join("");
    var aft = lk >= 0 ? "אחרי הארוחה: נשארו " + n(fmt(lk)) + " קק״ל ו־" + n(Math.max(0, lp)) + " ג׳ חלבון להיום" : "אחרי הארוחה: חריגה של " + n(fmt(-lk)) + " קק״ל מהיעד";
    return '<div class="det">' + (rows || '<div class="listmsg" style="padding:6px 0">עוד לא נבחרו מרכיבים</div>') +
      '<div class="smac">פחמימה ' + n(Math.round(t.carbs)) + " ג׳ · שומן " + n(Math.round(t.fat)) + ' ג׳</div><div class="aft' + (lk < 0 ? " over" : "") + '">' + aft + "</div></div>" +
      '<div class="bar"><button class="txt" data-act="toggle" aria-expanded="' + draft.open + '" aria-label="פירוט הארוחה">' + ICON.chevUp +
      '<span class="cnt">' + (items.length ? n(items.length) + (items.length === 1 ? " מרכיב" : " מרכיבים") : "ריק") + '</span><span class="dt">·</span><span class="kk">' + n(fmt(t.kcal)) + ' קק״ל</span><span class="dt">·</span><span class="pr">' + n(Math.round(t.protein)) + " ג׳ חלבון</span></button>" +
      '<button class="rb save" data-act="savedish" aria-label="שמור כמנה" title="שמור כמנה"' + (items.length ? "" : " disabled") + ">" + ICON.book + "</button>" +
      '<button class="rb ok" data-act="addday" aria-label="הוסף לסך היומי" title="הוסף לסך היומי"' + (items.length ? "" : " disabled") + ">" + ICON.check + "</button></div>";
  }
  function renderBuild() {
    var info = mealInfo(draft.meal);
    $app.innerHTML = '<div class="build"><div class="top"><h2 id="mealTitle">' + info.title + '</h2><button class="x" data-act="cancel" aria-label="סגירה">✕</button></div>' +
      '<div class="search"><span class="ic">' + ICON.search + '</span><input id="q" type="search" placeholder="חיפוש מרכיב לפי שם" value="' + esc(draft.q) + '" autocomplete="off">' + '<button class="clr" data-act="clearq" aria-label="ניקוי"' + (draft.q ? "" : " hidden") + '>✕</button>' + "</div>" +
      '<div class="seg" id="seg">' + CATS.map(function (c) { return '<button class="' + (!draft.q && c[0] === draft.tab ? "on" : "") + '" data-tab="' + c[0] + '">' + c[1] + "</button>"; }).join("") + "</div>" +
      '<div class="list" id="list">' + listHTML() + "</div>" +
      '<div class="sum' + (draft.open ? " open" : "") + '" id="sum">' + sumHTML() + "</div></div>";
  }
  function refreshBuild(keepScroll) {
    var l = document.getElementById("list"); var top = l ? l.scrollTop : 0;
    document.getElementById("list").innerHTML = listHTML();
    var s = document.getElementById("sum"); s.className = "sum" + (draft.open ? " open" : ""); s.innerHTML = sumHTML();
    document.getElementById("seg").innerHTML = CATS.map(function (c) { return '<button class="' + (!draft.q && c[0] === draft.tab ? "on" : "") + '" data-tab="' + c[0] + '">' + c[1] + "</button>"; }).join("");
    if (keepScroll !== false) document.getElementById("list").scrollTop = top;
  }
  function sheetSaveDish() {
    openSheet(head("שמירה כמנה", "🔖") + '<div class="sh-body"><div class="frow"><span>שם המנה</span><span class="fld wide"><input id="dishName" type="text" placeholder="למשל: טוסט גבינה" maxlength="40"></span></div></div><button class="btn pri" data-act="dosavedish">שמירה</button>');
    setTimeout(function () { var i = document.getElementById("dishName"); if (i) i.focus(); }, 50);
  }
  function sheetCustom() {
    var opts = Object.keys(CAT_LABEL).map(function (k) { return '<option value="' + k + '"' + (k === (draft.tab !== "saved" ? draft.tab : "protein") ? " selected" : "") + ">" + CAT_LABEL[k] + "</option>"; }).join("");
    var f = function (id, l, u) { return '<div class="frow"><span>' + l + '</span><span class="fld"><input id="' + id + '" type="number" inputmode="decimal" min="0" step="any"><span>' + u + "</span></span></div>"; };
    openSheet(head("מרכיב משלי", "🥣") +
      '<div class="sh-body"><div class="frow"><span>שם</span><span class="fld wide"><input id="cName" type="text" maxlength="40" placeholder="שם המרכיב" style="text-align:right"></span></div>' +
      '<div class="frow"><span>קטגוריה</span><span class="fld wide"><select id="cCat">' + opts + "</select></span></div>" +
      f("cK", "קלוריות ל־100 ג׳", "קק״ל") + f("cP", "חלבון ל־100 ג׳", "ג׳") + f("cC", "פחמימה ל־100 ג׳", "ג׳") + f("cF", "שומן ל־100 ג׳", "ג׳") +
      '<div class="frow"><span>יחידה (רשות)</span><span class="fld"><input id="cU" type="text" maxlength="14" placeholder="פרוסה" style="text-align:right"></span></div>' +
      f("cUG", "משקל יחידה", "ג׳") + '</div><button class="btn pri" data-act="docustom">הוספה</button>');
  }

  // ---------- settings ----------
  function renderSettings() {
    var fx = S.fixes(), prof = S.profile(), gl = S.goal();
    var row = function (key, ic, tone, title, sub) { return '<button class="srow" data-open="' + key + '"><span class="tile emoji ' + tone + '">' + ic + '</span><span class="st"><b>' + title + "</b><small>" + sub + "</small></span>" + ICON.chevL + "</button>"; };
    var list = "";
    if (ui.fixesOpen) {
      list = (ui.fixAdding ? '<div class="fx"><span class="cb"></span><input id="fixIn" type="text" placeholder="מה לתקן? (Enter לשמירה)" maxlength="140"><button class="delx" data-act="fixcancel" aria-label="ביטול">✕</button></div>' : "") +
        (fx.length ? fx.map(function (f) { return '<div class="fx' + (f.done ? " done" : "") + '"><button class="cb" data-fixtoggle="' + f.id + '" aria-label="סימון">' + (f.done ? "✓" : "") + '</button><span class="tx">' + esc(f.text) + '</span><button class="delx" data-fixdel="' + f.id + '" aria-label="מחיקה" title="מחיקה">✕</button></div>'; }).join("")
          : (ui.fixAdding ? "" : '<div class="fx emptyfx">אין עדיין פריטים. לוחצים ➕ כדי להוסיף.</div>'));
    }
    var open = fx.filter(function (f) { return !f.done; }).length;
    $app.innerHTML = '<div class="set"><button class="back" data-act="home">→ חזרה</button><h1>הגדרות</h1>' +
      '<div class="gt">אני והיעד שלי</div><div class="card">' + row("profile", prof.photo ? '<img src="' + prof.photo + '" alt="">' : "👤", prof.photo ? "photo" : "", "פרופיל", "שם, משקל, גובה וגיל") + row("goal", "🎯", "", "יעדים", n(fmt(gl.kcal)) + " קק״ל · " + n(gl.protein) + " ג׳ חלבון") + "</div>" +
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
      numField("pW", "משקל", p.weight, "ק״ג") + numField("pH", "גובה", Number(p.height).toFixed(2), "מ׳", "0.01") + numField("pA", "גיל", p.age, "", "1") + '</div><button class="btn pri" data-act="saveprofile">שמירה</button>', "profile");
  }
  function avatarInner(p) { return p.photo ? '<img src="' + p.photo + '" alt="תמונת פרופיל">' : '<span class="ini">' + esc((p.name || "ר").trim().charAt(0) || "ר") + "</span>"; }
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
  function sheetGoal() {
    var g = S.goal();
    openSheet(head("יעדים", "🎯") + '<div class="sh-body">' + numField("gK", "קלוריות", g.kcal, "קק״ל", "10") + numField("gP", "חלבון", g.protein, "ג׳", "1") + numField("gC", "פחמימה", g.carbs, "ג׳", "1") + numField("gF", "שומן", g.fat, "ג׳", "1") +
      '<p class="hint">ברירת המחדל היא ההמלצה של אקי: ' + n("2,050") + " קק״ל, " + n(160) + " חלבון, " + n(215) + " פחמימה, " + n(62) + ' שומן.</p></div><button class="btn pri" data-act="savegoal">שמירה</button><button class="linkbtn" data-act="resetgoal">חזרה להמלצה של אקי</button>');
  }
  function sheetApp() {
    openSheet(head("אפליקציה", "📱") + '<div class="sh-body"><div class="frow"><span>גרסה</span><span class="vv">' + n("v" + APP_VERSION) + '</span></div><div class="frow"><span>הנתונים</span><span class="vv">נשמרים בטלפון הזה</span></div></div>' +
      '<button class="btn pri" data-act="export">ייצוא גיבוי (JSON)</button><button class="btn sec2" data-act="import">שחזור מגיבוי</button><input id="importFile" type="file" accept="application/json,.json" hidden>');
  }

  // ---------- events ----------
  var armed = null;
  function arm(el, key) { if (armed === key) { armed = null; return true; } armed = key; el.classList.add("armed"); if (el.classList.contains("btn")) el.textContent = "בטוח? לחיצה נוספת מוחקת"; setTimeout(function () { if (armed === key) { armed = null; el.classList.remove("armed"); } }, 3500); return false; }

  document.addEventListener("click", function (ev) {
    var t = ev.target, el;
    if ((el = t.closest("[data-act]"))) {
      var a = el.getAttribute("data-act");
      switch (a) {
        case "close": closeSheet(); return;
        case "settings": go("#/settings"); return;
        case "home": go("#/"); return;
        case "newmeal": sheetNewMeal(); return;
        case "startbuild": var s = document.querySelector(".mo.sel"); newDraft(s ? s.getAttribute("data-pick") : mealByTime()); closeSheet(); go("#/build"); return;
        case "cancel": draft = null; go("#/"); return;
        case "toggle": draft.open = !draft.open; refreshBuild(); return;
        case "clearq": draft.q = ""; renderBuild(); return;
        case "custom": sheetCustom(); return;
        case "addday":
          var items = draftSnap(); if (!items.length) { toast("עוד לא נבחרו מרכיבים"); return; }
          S.addMeal(S.dateKey(), { type: draft.meal, items: items }); var mt = mealInfo(draft.meal).title; draft = null; go("#/"); toast(mt + " נוספה לסך היומי"); return;
        case "savedish": if (!draftSnap().length) return; sheetSaveDish(); return;
        case "dosavedish":
          var nm = (document.getElementById("dishName").value || "").trim(); if (!nm) { toast("צריך שם למנה"); return; }
          S.addDish(nm, draft.order.filter(function (id) { return draft.items[id]; }).map(function (id) { return { ingId: id, mode: draft.items[id].mode, qty: draft.items[id].qty }; }));
          closeSheet(); refreshBuild(); toast("נשמר בשמורות: " + nm); return;
        case "docustom":
          var cn = (document.getElementById("cName").value || "").trim(); var num = function (id) { return parseFloat(document.getElementById(id).value); };
          var k = num("cK"); if (!cn || !(k >= 0)) { toast("צריך שם וקלוריות ל־100 ג׳"); return; }
          var unitName = (document.getElementById("cU").value || "").trim(), ug = num("cUG");
          var c = S.addCustom({ name_he: cn, category: document.getElementById("cCat").value, per_100g: { kcal: k, protein: num("cP") || 0, carbs: num("cC") || 0, fat: num("cF") || 0 }, units: unitName && ug > 0 ? [{ name_he: unitName, grams: ug }] : [] });
          loadIngredients(); draft.tab = c.category; draft.q = ""; closeSheet(); renderBuild(); toast("נוסף: " + cn); return;
        case "delmeal": if (!arm(el, "meal" + el.getAttribute("data-id"))) return; S.deleteMeal(S.dateKey(), el.getAttribute("data-id")); closeSheet(); renderHome(); toast("הארוחה נמחקה"); return;
        case "fixeye": ui.fixesOpen = !ui.fixesOpen; ui.fixAdding = false; renderSettings(); return;
        case "fixadd": ui.fixesOpen = true; ui.fixAdding = true; renderSettings(); return;
        case "fixcancel": ui.fixAdding = false; renderSettings(); return;
        case "saveprofile":
          S.setProfile({ name: document.getElementById("pName").value.trim() || "רועי", weight: parseFloat(document.getElementById("pW").value) || 0, height: parseFloat(document.getElementById("pH").value) || 0, age: parseInt(document.getElementById("pA").value, 10) || 0 });
          closeSheet(); renderSettings(); toast("הפרופיל נשמר"); return;
        case "savegoal":
          var gv = function (id) { return Math.max(0, Math.round(parseFloat(document.getElementById(id).value) || 0)); };
          S.setGoal({ kcal: gv("gK") || 2050, protein: gv("gP"), carbs: gv("gC"), fat: gv("gF") }); closeSheet(); renderSettings(); toast("היעדים עודכנו"); return;
        case "resetgoal": S.setGoal(S.defaultGoal()); closeSheet(); renderSettings(); toast("חזרנו להמלצה של אקי"); return;
        case "export":
          var blob = new Blob([S.exportJSON()], { type: "application/json" }); var u = URL.createObjectURL(blob); var aEl = document.createElement("a");
          aEl.href = u; aEl.download = "plato-backup-" + S.dateKey() + ".json"; document.body.appendChild(aEl); aEl.click(); aEl.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); toast("הגיבוי ירד לקבצים"); return;
        case "import": document.getElementById("importFile").click(); return;
        case "photo": document.getElementById("photoFile").click(); return;
        case "rmphoto": setPhoto(null); toast("התמונה הוסרה"); return;
      }
    }
    if ((el = t.closest("[data-pick]"))) {
      document.querySelectorAll(".mo").forEach(function (m) { m.classList.toggle("sel", m === el); m.setAttribute("aria-pressed", m === el); });
      document.getElementById("goName").textContent = el.getAttribute("data-pick"); return;
    }
    if ((el = t.closest("[data-meal]"))) { sheetMeal(el.getAttribute("data-meal")); return; }
    if ((el = t.closest("[data-open]"))) { var o = el.getAttribute("data-open"); if (o === "profile") sheetProfile(); else if (o === "goal") sheetGoal(); else sheetApp(); return; }
    if ((el = t.closest("[data-fixtoggle]"))) { S.toggleFix(el.getAttribute("data-fixtoggle")); renderSettings(); return; }
    if ((el = t.closest("[data-fixdel]"))) { if (!arm(el, "fix" + el.getAttribute("data-fixdel"))) return; S.deleteFix(el.getAttribute("data-fixdel")); renderSettings(); return; }
    if (!draft) return;
    if ((el = t.closest("[data-tab]"))) { draft.tab = el.getAttribute("data-tab"); draft.q = ""; var qi = document.getElementById("q"); if (qi) qi.value = ""; renderBuild(); return; }
    if ((el = t.closest("[data-add]"))) { var ing = ING[el.getAttribute("data-add")]; setQty(ing.id, ing.defMode, ing.defMode === "u" ? 1 : 100); refreshBuild(); return; }
    if ((el = t.closest("[data-step]"))) {
      var id = el.getAttribute("data-id"), it = draft.items[id]; if (!it) return;
      var stp = it.mode === "u" ? 1 : 25, d = parseInt(el.getAttribute("data-step"), 10);
      var nq = d > 0 ? (Math.floor(it.qty / stp + 1e-9) + 1) * stp : (Math.ceil(it.qty / stp - 1e-9) - 1) * stp;
      setQty(id, it.mode, Math.max(0, Math.round(nq * 100) / 100)); refreshBuild(); return;
    }
    if ((el = t.closest("[data-mode]"))) {
      var mid = el.getAttribute("data-mode"), mi = draft.items[mid], ing2 = ING[mid]; if (!mi || !ing2.unit) return;
      if (mi.mode === "u") setQty(mid, "g", Math.max(1, Math.round(mi.qty * ing2.unit.grams)));
      else setQty(mid, "u", Math.max(1, Math.round(mi.qty / ing2.unit.grams)));
      refreshBuild(); return;
    }
    if ((el = t.closest("[data-dish]"))) {
      var dish = S.dishes().filter(function (x) { return x.id === el.getAttribute("data-dish"); })[0]; if (!dish) return;
      dish.items.forEach(function (i) {
        if (!ING[i.ingId]) return; var cur = draft.items[i.ingId];
        if (!cur) setQty(i.ingId, i.mode, i.qty);
        else if (cur.mode === i.mode) setQty(i.ingId, i.mode, cur.qty + i.qty);
        else { var g = gramsOf(ING[i.ingId], cur.mode, cur.qty) + gramsOf(ING[i.ingId], i.mode, i.qty); setQty(i.ingId, "g", Math.round(g)); }
      });
      draft.added[dish.id] = (draft.added[dish.id] || 0) + 1; refreshBuild(); return;
    }
    if ((el = t.closest("[data-deldish]"))) { if (!arm(el, "dish" + el.getAttribute("data-deldish"))) return; S.deleteDish(el.getAttribute("data-deldish")); refreshBuild(); toast("המנה נמחקה"); return; }
  });

  document.addEventListener("input", function (ev) {
    if (ev.target.id === "q" && draft) {
      draft.q = ev.target.value;
      var cb = document.querySelector(".search .clr"); if (cb) cb.hidden = !draft.q;
      document.getElementById("list").innerHTML = listHTML(); document.getElementById("list").scrollTop = 0;
      document.getElementById("seg").innerHTML = CATS.map(function (c) { return '<button class="' + (!draft.q && c[0] === draft.tab ? "on" : "") + '" data-tab="' + c[0] + '">' + c[1] + "</button>"; }).join("");
    }
  });
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.hasAttribute && t.hasAttribute("data-qty") && draft) {
      var id = t.getAttribute("data-qty"), it = draft.items[id]; var v = parseFloat(t.value);
      setQty(id, it ? it.mode : ING[id].defMode, isFinite(v) ? Math.max(0, v) : 0); refreshBuild(); return;
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
    if (ev.key !== "Enter") return;
    var t = ev.target;
    if (t.id === "fixIn") { var v = t.value.trim(); if (v) { S.addFix(v); } ui.fixAdding = false; renderSettings(); return; }
    if (t.id === "dishName") { document.querySelector('[data-act="dosavedish"]').click(); return; }
    if (t.hasAttribute && t.hasAttribute("data-qty")) t.blur();
    if (t.id === "q") t.blur();
  });

  // day rollover at local midnight
  var lastDay = S.dateKey();
  setInterval(function () { var k = S.dateKey(); if (k !== lastDay) { lastDay = k; if (!location.hash || location.hash === "#/") renderHome(); } }, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && (!location.hash || location.hash === "#/")) renderHome(); });

  // test hooks (used by Playwright only)
  window.PLATO = { route: route, openSheet: function (k) { if (k === "profile") sheetProfile(); else if (k === "goal") sheetGoal(); else if (k === "app") sheetApp(); }, version: APP_VERSION };

  S.load(); loadIngredients();
  if (location.hash.indexOf("#/build") === 0) location.hash = "#/";
  route();
})();
