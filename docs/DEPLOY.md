# Deploying TinyTalk

There are two editions of the web app. Both read the same exported results.

## Vercel multi-service project

Import the repository with project root `.`. The root `vercel.json` defines:

- `app`: FastAPI at `tinytalk.api:app`, publicly routed only at `/api` and `/api/*`.
- `web`: Vite in `web/`, built with `npm run build:live`, publicly routed at all other paths.
  Its service-local routes serve existing files first and then `index.html`, so refreshing
  BrowserRouter pages such as `/try` and `/inspect/results` works.

Service rewrites preserve the original request path. Keep the existing `/api` prefixes
in FastAPI and in the browser's fetch calls. Do not strip them or add another `/api` prefix.
Saved JSON and audio under `/data` and `/assets` are served by `web`.

There are **no internal service calls and no bindings** in this application. Vite emits
browser JavaScript, which calls public same-origin `/api/*`; it has no server function
that can consume a runtime binding. FastAPI calls the external Gnani API through
`tinytalk/gnani.py`. Do not add a `VITE_*` variable containing a key or an internal URL.
The localhost Vite proxy is for standalone local development only; Vercel routes API
requests before they enter `web`.

Run `vercel dev --local` from the repository root to test both services together without
linking a cloud project. Leave `LIVE` unset for no-credit checks. Check `/api/health`, `/`,
`/try`, `/inspect/results`, and `/data/meta.json`. Only the health URL should reach FastAPI.

Local validation (10 Nov 2026): `npm run build:live` passed, 17 backend tests
(`test_live_api.py` and `test_audio_workspace.py`) passed, and 3 mocked-live Playwright
tests passed. `/api/health` returned 200 via FastAPI TestClient with live mode disabled.
Vercel CLI 57.0.0 detected both services, but `vercel dev --local` failed in its generated
Python launcher: the Windows `Z:\\Gnani\\tinytalk\\api.py` path was embedded without proper
escaping, turning backslash sequences into control characters. Integrated Vercel routing
and the Linux cloud build therefore remain unverified. No paid API calls were made.

### Live hosting is not yet production-ready

This configuration establishes service discovery, builds and public routing; it does
not finish the existing backend's migration to Vercel's runtime. Before enabling `LIVE=1`:

- Package and verify Linux FFmpeg/Opus and Codec2 native dependencies. They are required
  for uploads and audio processing; Python dependency installation alone is insufficient.
- Replace local writable cache, ledger, calibration and SQLite usage limits with shared
  persistent storage. Writing to temporary storage alone does not preserve global caps
  across instances or restarts. The current paths in `config.yaml` are local paths.
- Adapt the audio workspace's process-local clip store and locks to distributed operation.
  Subsequent processing/STT/TTS requests may run on another instance. Maintain the existing
  privacy rule: visitor audio must not be persisted. Configure a stable private
  `AWAAZ_SESSION_SECRET` for visitor cookie signing across instances.
- Verify upload/request size and duration limits against Vercel's selected runtime and plan.

Once those items are resolved, set `GNANI_API_KEY` (a newly rotated key), `LIVE=1`, and
`ACCESS_CODE` privately in the Vercel environment settings. Existing public workspace/live
routes have their own visitor/reviewer limits; the legacy access code is not a universal
login for every API route. Never commit the key or import a local `.env` indiscriminately.

References: [Services](https://vercel.com/docs/services),
[routing](https://vercel.com/docs/services/routing), and
[bindings](https://vercel.com/docs/services/bindings).

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
