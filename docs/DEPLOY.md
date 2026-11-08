# Deploying TinyTalk

There are two editions of the web app. Both read the same exported results.

## Replay edition (static, offline, no credits)

Everything comes from saved runs in `web/public/data/` (committed). No server and no API key.

```
cd web
npm ci
npm run build:replay      # writes web/dist/
npx vite preview          # or serve web/dist/ with any static host
```

- Works from a clean clone without Python, the Gnani cache or the network.
- Uses hash URLs (`/#/results`), so any static host works (GitHub Pages, Netlify, an S3 bucket, a USB stick with a local server).
- The Playground shows labelled saved sample runs; live controls are disabled.
- To refresh the data after new runs (needs the local `cache/`): `uv run python -m scripts.export_site_data`, then rebuild.

## Live edition (real Gnani calls, costs credits)

```
# terminal 1: API (from the repo root)
export LIVE=1 ACCESS_CODE=<a long random secret>
uv run uvicorn tinytalk.api:app --port 8000 --workers 1
# terminal 2: web
cd web && npm run dev:live          # http://localhost:5173, proxies /api to :8000
# or: npm run build:live and serve dist/ behind the same origin as the API
```

- `GNANI_API_KEY` must be in `.env` (never committed). The key stays on the server; the browser never sees it.
- Every live request needs the `X-Access-Code` header (the access-code field in the app). Wrong codes are rate-limited like real calls.
- Server-enforced limits from `config.yaml` (`credits:` and `live:`): hard cap on calls (or credits once rates are set), warnings at 50/80/95 %, a global daily call cap, a per-IP limit per minute, upload types, 5 MB, 30 s, temp files removed after each request, ffmpeg reads only the piped input with a fixed format and a time limit.
- Run one worker (`--workers 1`): the call cap, the one-request-at-a-time lock and the rate limiter live in process memory.
- Before each live call the app shows "about X credits" (or seconds/characters while no rate is configured), asks for a confirm above `credits.confirm_above`, and afterwards shows the actual spend.
- Set `credits_per_audio_second` and `credits_per_1k_chars` in `config.yaml` once Gnani's prices are known, and calibrate the balance on `/usage` from the dashboard.

## Public hosting checklist (live)

1. HTTPS in front of both the app and `/api` (same origin).
2. `ACCESS_CODE` set and shared only with the people who should spend credits.
3. Lower `live.daily_call_cap` for a public demo.
4. Do not expose `results/ledger.jsonl` for writing; the API only reads and appends through `tinytalk/gnani.py`.
5. Keep CORS limited (`tinytalk/api.py` allows only `http://localhost:5173` by default).
