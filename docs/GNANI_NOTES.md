# Gnani API notes for TinyTalk

Read from docs.gnani.ai on 2026-11-08 (intro page says "Last verified: 5 August 2026"). "Docs say" means the page text; anything marked UNVERIFIED has not been tested with a real call. Pages not read: `prisma-v3.md` differences table, Batch, voice cloning, SSE and WebSocket pages (we do not use them).

## What we use

- Base URL `https://api.vachana.ai`. Header `X-API-Key-ID` (key). Optional `X-API-Request-ID` is echoed back as `request_id`. We send our own and put it in the ledger.
- **Prisma STT (REST)**: `POST /stt/v3`, multipart. Fields: `audio_file` (wav, mp3, ogg, flac, aac, m4a; max 30 s; docs say it is converted to 16 kHz mono), `language_code`, `model=prisma-v3.0`, `format` (`verbatim`, `transcribe`, `codemix`, `transliterate`), `keyterms` (up to 200), `topic` (up to 1600 chars), `previous_text` (last 600 chars kept), `multi_lang_codes`-style candidates (1 to 4 codes, or `indic-auto`).
- STT response keys: `success`, `request_id`, `transcript`, `model`, `detected_language_code` (v3.0 only, absent for empty transcript), `processing_time`, `end_to_end_latency`, `truncated` (only when true). Audio under 0.1 s gives an empty transcript, not an error.
- **Timbre TTS (REST)**: `POST /api/v1/tts/inference`, JSON: `text`, `model` (`timbre-v3.0`), `voice`, `language` (`ml-IN`, `hi-IN`, `en-IN`, `auto`), `speed` 0.85 to 1.15, `audio_config` (sample_rate 8000/16000/22050/24000/44100/48000, container wav/raw/mp3/ogg/mulaw/alaw, encoding linear_pcm/pcm_s16le/pcm_mulaw/pcm_alaw/oggopus). Response is raw audio bytes. No request id or timing in the response.
- Timbre v3.0 voices (13, all ten languages): Shivani, Lakshmi, Kalpana, Chetana, Vasudha, Riyaa, Tarika (female); Avinash, Shubham, Prakash, Devansh, Yashraj, Harshad (male). Voices are not shared between v2.5 and v3.0.
- Errors: 401 `MISSING_API_KEY` / `INVALID_API_KEY`, 402 "Insufficient credit", 403 `SCOPE_NOT_ALLOWED`, 429 `RATE_LIMITED`, 400 for bad parameters, 500/503/504 server side. Docs advise: retry connection errors and 429/500/503/504 with exponential backoff, three attempts (0.5, 1, 2 s). Do not retry other 4xx.

## Limits that shape the design

- **One active request at a time per account** (429 `RATE_LIMITED` otherwise). It is shown on both the STT and TTS pages, so `tinytalk/gnani.py` serialises STT and TTS together. No numeric request-rate limit is published; the docs point to the dashboard at app.gnani.ai.
- **Clips must be 30 s or less for STT.** Test messages must synthesise to under 30 s even at speed 0.85. TTS maximum text length is not stated (too-long text gives a 500).
- **No pricing in the docs.** No credit-balance API, no per-second or per-character price. Known: inline TTS audio tags (for example `<pauses>`) count as billable characters. Credits and rates must be read from the dashboard (UNVERIFIED until Yadhu supplies them).
- STT `itn_native_numerals` is ignored on v3.0, so we cannot ask Prisma for native-script digits. Our normaliser must handle Malayalam, Devanagari and Arabic digits.
- Omitting `format` on v3.0 gives `transcribe` for a single hi-IN or en-IN and `verbatim` otherwise, so we always send `format`.
- Prisma v2.5 (default if `model` is omitted): one language per request, no `keyterms`/`topic`/`previous_text`, ITN (`transcribe`) works only for hi-IN and en-IN. This matters for the optional v2.5 versus v3.0 comparison.

## Things to watch (from the docs)

- Timbre text normalisation runs on every request: `42` is read as a number word, `2,40,000` as lakh grouping, runs of 6+ digits or near words like OTP/PIN/card are read digit by digit. Only English compresses repeated digits ("double four"); other languages say each digit. Malayalam number and currency wording is "under continuous refinement" and the page gives no Malayalam-specific rules. This is exactly what the pilot tests.
- `<pauses>` works only on timbre-v3.0, adds silence with no stated length, and is not spoken.
- Docs disagree in places: the intro and quick start recommend Timbre v2.5 and never mention v3.0, while the TTS and voices pages document v3.0. The TTS text guide lists language values like `hi`, but the REST page uses `hi-IN`. We use the REST page forms.
- SDK versus docs: `gnani-vachana` 0.9.0 sends the context list as form field `keywords`, but the REST docs name it `keyterms`. We send `keyterms`. UNVERIFIED until the first live call with keyterms succeeds.
- Not needed: realtime and SSE streaming, batch, voice cloning (also against our rule never to use real voices).
