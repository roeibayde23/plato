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
    python3 test/v7.py http://127.0.0.1:8781/          # v7: edit items while building, מסקנות מהיום, frequent-only list, dish photos (+ WebKit)
    python3 test/v8.py http://127.0.0.1:8781/          # v8/v9: email + 6-digit code login, merge + sync with a mocked Supabase (no network)
    python3 test/v10.py http://127.0.0.1:8781/         # v10 (v11: floating 🧠 removed): insights for past days, ★ tab, green save, saved-dish edit/delete/swipe + undo
    python3 test/v10_day.py http://127.0.0.1:8781/     # v10.2: day view (option C): numbers vs goal, meals table with what he ate, מסקנות card, compact add
    python3 test/v12.py http://127.0.0.1:8781/         # v12: 'הוספה' in the values-DB header, chosen items light-brown, saved-dish detail sheet
    python3 test/v11.py http://127.0.0.1:8781/         # v11: no 🧠, weekly kcal per bar, targeted tips, ★ dishes in the values DB, label scan (needs deno)
    python3 test/v13.py http://127.0.0.1:8781/         # v13: one account = its own data (two users on one browser, sign-out clears the phone, old local data never uploaded), welcome flow (+ WebKit)
    (cd supabase/functions/plato-label && deno test --allow-net --allow-env label_test.ts)   # plato-label function unit tests (fake Gemini + fake auth)
    PLATO_E2E_FILE=creds.json python3 test/v8_real.py  # real Supabase e2e with a throwaway, pre-confirmed account (OTP calls stubbed, no mail sent; delete it afterwards)
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

## Label scan (v11)
`supabase/functions/plato-label/` is the Edge Function in the CASA project (PLATO-only, name `plato-label`, `verify_jwt=false` because it checks the user's JWT itself against `/auth/v1/user`).
It reads the Gemini key from the secret `PLATO_GEMINI_KEY` (optional `PLATO_GEMINI_MODEL`, default `gemini-3.8-flash`, falls back to `gemini-3.5-flash-lite`).
Without the secret it answers `503 {"error":"not_configured"}` and the app says "סריקת תוויות עוד לא הופעלה". This folder is not copied to GitHub Pages.


## Accounts & welcome flow (v13)
- Every email has its own data. Logging in with an account that is not the one this phone's data belongs to starts from an empty state and takes that account's cloud copy as is; whatever was on the phone is never merged into or uploaded to it (a non-empty previous state is kept only as an on-device backup, `plato-v1-backup-<owner|local>`, never shown or synced).
- Sign-out removes the account's data from the phone (local state, sync state, dish photos in IndexedDB) and reloads at the login screen; the data stays in the cloud.
- No personal defaults any more: empty profile, no starter dishes. A new account (or a new phone in local mode) goes through `#/welcome`: name, sex, age, height (cm), weight, workouts per week → goal type (lose / maintain / gain) with calories from Mifflin-St Jeor × activity (−450 / 0 / +250), protein 2 g/kg (1.8 when maintaining), fat 0.8 g/kg, carbs the rest; all editable → home.
- An account that already set its goals or profile (stamps) skips the flow.
