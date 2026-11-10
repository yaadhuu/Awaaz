# Awaaz live voice workspace — 10 November 2026

This pass implements the user's feedback about missing personal voice input, overly narrow flood examples, static storytelling and audio controls that did not affect live recognition.

## Working path

`/try` → record (up to 30 s), upload (up to 5 MB/30 s), or choose a saved sample → `/api/audio/process` → actual resampling, quantisation, encoding/decoding and simulated loss → playable received WAV → `/api/audio/transcribe` → Prisma v3.0 on that received waveform → optional `/api/audio/speak` → Timbre. All model HTTP access remains in `tinytalk/gnani.py` with its ledger, retries and global caps.

Prisma offers automatic language detection plus Bengali, English, Gujarati, Hindi, Kannada, Malayalam, Marathi, Punjabi, Tamil and Telugu. The four output formats are exposed without claiming translation. Read-aloud language is explicit when detection is absent. Recognition can legitimately produce the same words for different audio settings; output text is never deliberately damaged to manufacture a difference.

PCM exposes 8/16-bit quantisation and 8/16/24/48 kHz sampling. Codec2 stays fixed at its genuine 8 kHz, 2400 bps configuration. Opus uses real ffmpeg encoding at 6/12/24/48 kbps; loss is labelled as post-decode 20 ms frame erasures rather than claiming native Opus network packet-loss concealment. PCM/Codec2 packet-loss emulation actually silences lost chunks. Preview WAV size is not confused with encoded payload size.

## Audit → critique → polish

Audit found and fixed:
- **P1:** browser multipart numeric values were rejected by integer Literal fields. The endpoint now parses integers then validates the supported settings; the test sends the exact browser form representation.
- **P1:** old live-report fallback could substitute unrelated saved flood text. New workspace endpoints refuse explicitly when unavailable or unsuccessful; no saved transcript is substituted.
- **P2:** old output could appear current after audio settings changed. Processing invalidates the current result, aborts superseded requests, and retains labelled history separately.
- **P2:** selected Malayalam sample showed English fact labels. Saved story facts now use the native display-name registry.
- **P2:** the public shell claimed no credits were used on the live workspace. It now describes the workspace separately, and its availability/remaining budget comes from the server.
- **P2:** headings had tight word spacing/italic overhang. Their tracking, word spacing, line height and italic separation were refined.

Manual audit judgement: accessibility 3/4, performance 3/4, responsive 4/4, token consistency 4/4, anti-patterns 4/4 = 18/20. This is not a fresh Lighthouse score or a WCAG certification. Real-radio references have no verified reference transcript. Recording captions are not streamed; the UI explicitly states that Prisma runs after stopping.

Critique: the experience now begins with a choice of sample, record or upload; the received audio is playable before paying for a model request; processing details are confined to the workspace; the landing progressively transforms its signal and message through scroll progress. Lenis is lazy-loaded on the landing only, native touch scrolling is retained, and reduced motion bypasses smoothing/animated transformations. The original artistic direction is retained. No brand/site content was copied.

Polish: explicit labels/status/errors; original/received/read-aloud audio pause one another; actual received audio is downloadable; stale playback URLs are revoked; microphone tracks/timers are cleaned up; four-attempt budget is displayed; read-aloud language is selectable; signed server cookies and SQLite enforce public attempt limits; failed attempts are counted; repeated exact live results are reused in memory without another paid request. The model disk cache is bypassed for visitor STT/TTS. Memory has a 20-minute access expiry and 40 MB pruning bound. Anonymous quotas are not proof of unique human identity.

## Verification

- Python: **91 tests passed**, including eight new waveform/codec/API/ownership/limit/privacy cases. Ruff passes; strict mypy passes across **50 source files**.
- Frontend: production Replay build passes; **618 unit tests passed**.
- Full Playwright regression: **37 passed** across Replay and mocked-live. New tests exercise real backend processing, microphone capture with Chromium's synthetic microphone, MP3 upload, all ten language options, changing audio previews, stale-result clearing, mobile overflow, model-unavailable behaviour, native fact display and continuous Lenis/scroll transforms. Transcription/read-aloud responses in browser tests are intercepted; these checks do not spend model credits.
- A follow-up workspace test run covers the final explicit read-aloud-language control.
- Local mobile workspace inspection reports **0 px horizontal overflow at 390 px**. Historical page screenshots still cover English/Hindi/Malayalam at 360/768/1280 px, with landing checks at 320–1920 px.
- Existing Fast Refresh lint warnings remain; the new media synchronisation effects also produce non-blocking set-state-in-effect warnings. No lint errors.

## Actual model checks (public synthetic inputs only)

Two live Prisma requests processed the **22.5-second** composite dispatch drill. Clear 16 kHz/16-bit PCM used **722,398 encoded bytes**. Codec2 with **40% simulated loss** used **6,774 encoded bytes** and yielded a materially different transcript with missing/confused information. Exact settings, waveform hashes and model responses are retained in `results/workspace-live-smoke.json`. This is a demonstration, not an accuracy study or a new measured-language claim.

One live Timbre request successfully returned **5.6 seconds of 16 kHz speech** for public drill text; metadata is in `results/workspace-tts-smoke.json`. Total manual verification: **two STT requests and one TTS request**; exact credit cost is unknown because configured prices remain unavailable. No visitor audio was used in these checks.

Samples now include medical assistance, supply dispatch and rescue coordination, a composite 22.5-second drill, the 26-second CC0 amateur-radio exchange, and an 11.5-second public-domain NASA mission recording. Source/licence and synthetic/historical labels remain visible. Scripts reuse cached synthetic speech with Replay enabled and zero live requests.

## Running and limits

The preview runs at `http://localhost:4173`; the workspace is `/#/try`. It proxies `/api` to the running FastAPI service on port 8000. The backend is explicitly enabled with `LIVE=1`, `AWAAZ_PUBLIC_LIVE=1`, and the existing ignored server-side Gnani key. Four visitor model requests per UTC day, server-wide caps, per-IP rate limits and two concurrent local processing slots are enforced.

Public hosting has not been provisioned. A deployed site needs a backend on the same `/api` origin, HTTPS for the microphone and a stable `AWAAZ_SESSION_SECRET`. The in-memory clip store requires one worker; distributed deployment needs shared ephemeral storage. These remain simulated link conditions, not real-radio field validation. Physical devices and screen readers were not available; Chromium emulation is not physical-device testing.
