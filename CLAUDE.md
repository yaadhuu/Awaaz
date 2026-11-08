# TinyTalk

Project: TinyTalk sends voice messages over weak links by sending text instead of audio. Tier A = audio (Codec2 at 2400 bps, fallback Opus 6 kbps), Tier B = full transcript, Tier C = critical facts only (places, numbers with units, times). A link meter picks the tier. At the receiver a voice teach-back says the facts back and Prisma checks them. The link is simulated at 2, 5 and 10 kbps with 0, 10, 20 and 30 percent packet loss.

## Gnani APIs (header X-API-Key-ID)

- Prisma = POST https://api.vachana.ai/stt/v3, multipart form with audio_file (30 s max), language_code (for example hi-IN or indic-auto), model=prisma-v3.0, format, keyterms (up to 200).
- Timbre = POST https://api.vachana.ai/api/v1/tts/inference, JSON with text, model timbre-v3.0, voice (must come from that model's voice catalog), language, speed 0.85 to 1.15, audio_config. Timbre allows one active request at a time and answers 429 RATE_LIMITED, so queue and back off.
- Languages: bn-IN en-IN gu-IN hi-IN kn-IN ml-IN mr-IN pa-IN ta-IN te-IN.
- Python SDK: gnani-vachana (import name gnani).

## Rules

- Test speech is synthetic, made with Timbre. Never record real people.
- The API key lives only in .env and is never committed.
- Never claim a real radio test.
- Report accuracy with intervals and show failures.
- No bought engagement on posts.

## Done means

pytest passes, the web build passes, a Playwright smoke test passes and the README lists limits. Deadline Tue 10 Nov 2026 23:59 IST; aim to submit by 18:00.

## Environment notes

- Windows 11, Git Bash. Python venv at .venv (Python 3.14); web app in web/ (Vite, React, TypeScript, Tailwind, shadcn).
- Codec2 built with MinGW at tools/codec2/build/src (c2enc.exe, c2dec.exe). MinGW and cmake are not on the default PATH.

## Tool usage guide

- Gnani calls: ONLY through tinytalk/gnani.py (diskcache for the cache, tenacity for retries, structlog for the ledger). The gnani MCP bypasses our ledger and cache: use it only for one-off manual checks and note any credits used in docs/COSTS.md. Never use it inside the pipeline.
- Config and data models: pydantic and pydantic-settings; all settings in config.yaml.
- Text: regex with \X for letter clusters (Malayalam), unicodedata NFC, indic-nlp-library for normalisation, our own number-word tables for hi and ml. rapidfuzz is for diagnostics only, never for scoring exact facts. indic-transliteration only for the romanisation byte-cost test.
- Audio: pycodec2 mode 2400 on 8 kHz int16 mono; soxr to resample; webrtcvad (16 kHz, 10/20/30 ms frames) to trim silence before STT and the codec; pystoi and pesq only if installed, for objective Tier A quality.
- Compression and coding: zstandard dictionary trained on the dev split only; reedsolo only inside the FEC-versus-resend experiment; model link loss as bursty (two-state Gilbert-Elliott), seeded.
- ML: scikit-learn; train on dev, report on test, always compare to the simple rule baseline.
- Tests: hypothesis for property tests (pack/unpack round trip, normaliser idempotence), respx for fake HTTP, pytest for the rest. Live API only in the stages that say so.
- Frontend: Noto Sans fonts imported, react-query for server state, i18next for ml/hi/en, framer-motion for the tier-switch animation, @ricky0123/vad-web for end-of-speech, vitest and testing-library for components, Playwright for e2e.
- Plugins and skills, when to use: feature-dev at the start of a stage to design it; superpowers for planning, test-first and debugging; security-guidance and code-review before each stage's final commit; commit-commands for commits; ui-ux-pro-max only in Stage 11.
- Do not add a library that is not listed here without logging a decision in docs/DECISIONS.md.
