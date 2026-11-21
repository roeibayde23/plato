# PLATO — מעקב בריא בהישג יד

Static PWA (vanilla JS, no build). Hebrew RTL, iPhone-first.

## Run locally
    cd /workspace/plato/app
    python3 -m http.server 8781 --bind 127.0.0.1
    # open http://127.0.0.1:8781/

## Test (Playwright, 390x844)
    python3 test/e2e.py http://127.0.0.1:8781/
    python3 test/fixes_ios.py http://127.0.0.1:8781/   # WebKit / iPhone 13 regression test for שיפוצים (needs: python3 -m playwright install webkit)
    python3 test/v5.py http://127.0.0.1:8781/          # v5 features: tips, goals, teaspoon, save effect, DB edit, day view
Screenshots go to `shots/`.

## Files
- `index.html` — shell, APP_VERSION, SW registration (printer pattern: network-first HTML, `?v=` assets, skipWaiting, reload to `?sw=N`).
- `sw.js` — bump `APP_VERSION` here and in index.html (`?v=` too) on every release.
- `js/ingredients.js` — generated from `/workspace/plato/ingredients.json` (Aki's DB, 130 items).
- `js/store.js` — data layer (`window.Store`), localStorage key `plato-v1`, `userId` + `schema` fields; swap `LocalAdapter` for a remote adapter later.
- `js/app.js` — UI (home / new-meal sheet / build / settings).
- `css/style.css`, `fonts/` (Assistant, Frank Ruhl Libre), `icons/` (from the real logo).

Regenerate the DB file after Aki updates the JSON:

    python3 -c "import json;d=json.load(open('/workspace/plato/ingredients.json'));keep=['id','name_he','category','brand','is_roei_product','per_100g','units','source','flagged'];out={'daily_target':d['daily_target'],'ingredients':[{k:i.get(k) for k in keep} for i in d['ingredients']]};open('js/ingredients.js','w').write('window.PLATO_DB='+json.dumps(out,ensure_ascii=False)+';\n')"
