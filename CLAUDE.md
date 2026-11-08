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
