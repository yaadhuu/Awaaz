# Stage 11 plan: the TinyTalk web product

## Approach

One React app (Vite, React Router) with nine pages plus 404, reading data through one `DataSource` interface:

- `static` (Replay build): JSON files generated from the real `results/`, `docs/EXPERIMENTS.md`, the ledger and the asset manifest by `scripts/export_site_data.py` into `web/public/data/`. Works offline, no server, no live calls.
- `api` (Live build): the FastAPI server. Same shapes, plus live endpoints (`/api/stt`, `/api/tts`, `/api/usage`, `/api/estimate`, `/api/send`, `/api/teachback`).
- Fixtures exist only inside tests.

Backend additions (all Gnani traffic still through `tinytalk/gnani.py`): a credit model in `tinytalk/credits.py` (rates from `config.yaml`, "rate not configured" until set, warn at 50/80/95 percent, hard stop at the cap), live STT/TTS endpoints with access code, global daily cap, per-IP rate limit, upload type/size/30 s limits and temp-file cleanup.

Audio assets: `scripts/fetch_radio_beds.py` searches Wikimedia Commons (and Internet Archive) for radio noise, keeps only CC0, public domain and CC-BY, trims to 30 s and 1 MB, 16 kHz mono, writes `assets/manifest.json` and `docs/ASSETS.md`. `scripts/make_channel_samples.py` mixes beds onto our cached synthetic speech at fixed SNRs (seeded). No STT on noisy audio without Yadhu's approval.

Design: printed field manual and radio-room panel. Warm paper, ink, brass; kasavu border lines and stamp perforations as small motifs. Type is the hero (Fraunces, Rozha One, Noto Serif Malayalam, Anek for body, IBM Plex Mono for numbers). Custom SVG instruments (tuning dial, VU loss gauge, stamped tier cards) and d3 charts. Motion via LazyMotion + `m`, reduced motion respected.

## Files

`tinytalk/credits.py`, `tinytalk/api.py`, `config.yaml`, `tests/test_credits.py`, `tests/test_api.py`, `scripts/fetch_radio_beds.py`, `scripts/make_channel_samples.py`, `scripts/export_site_data.py`, `scripts/check_contrast.py`, `assets/`, `web/src/**`, `web/e2e/**`, `docs/ASSETS.md`, `docs/DEPLOY.md`, `docs/review/ui_strings_review.md`.

## Risks

- Scope is large for the time left: build every page, keep each one small and honest about what is live and what is replay.
- Credit rates are unknown: show seconds and characters until configured.
- Asset downloads may be blocked: list the failures and continue.
- vad-web needs model files: load it only in Live mode and fall back to a plain 30 s recorder.

## Checks

`make check`; vitest (credit math, warnings, cap); Playwright e2e (Studio, Link, Playground with a fake server, Usage), screenshots of every page at 360/768/1280 with glyph checks, a reduced-motion run; Lighthouse on the Replay build; bundle size of the animation code.
