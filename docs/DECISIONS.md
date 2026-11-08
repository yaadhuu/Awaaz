# Decisions

One line per decision: date | decision | alternatives rejected | reason.

| Date | Decision | Alternatives rejected | Reason |
|------|----------|-----------------------|--------|
| 2026-11-08 | Keep the project diary as markdown files in `docs/`, committed to git. | A Notion or Google Doc; keeping notes only in chat. | Git history shows when each note was written, and the files sit next to the code. Chat history is easy to lose. |
| 2026-11-08 | API key stays in `.env` (git-ignored); `.env.example` has only the variable name `GNANI_API_KEY`. | Putting the key in code or docs. | Keys in git history are hard to remove and can be abused. |
| 2026-11-08 | Use `pycodec2` as the Codec2 path. `scripts/check_codec.py` run on this machine (Windows 11, Python 3.14.2): `samples_per_frame=160`, `bytes_per_frame=6`, 600 bytes for 2 s, `measured_bps=2400.0`. | Building Codec2 with cmake in `tools/codec2`; Opus 6 kbps via ffmpeg (kept only as the fallback, ffmpeg 8.0.1 is installed). | It installed from a wheel, matches the design numbers, and needs no compiler. |
| 2026-11-08 | Manage Python dependencies with `uv` (`pyproject.toml` plus `uv.lock`), with `package = false` until Stage 0 creates `tinytalk/`. `requirements.txt` is now superseded and left in place for now. | Keep the `pip freeze` `requirements.txt`. | The lock file records exact versions for reproducing results. `uv` also replaced the unfinished `wrapt==2.6.0.dev1` pin with `wrapt==2.5.2`. |
| 2026-11-08 | `pystoi` and `audiomentations` are an optional dependency group `audio`. `pesq` is not installed. | Adding `pesq` to the main dependencies. | `pesq==0.0.4` failed to build here: `fatal error C1083: Cannot open include file: 'io.h'` (the Windows SDK headers are missing). One fix would be installing the Windows SDK. Objective Tier A scores use `pystoi` only until then. |
| 2026-11-08 | No `num2words`. Number words for Hindi and Malayalam come from our own tables. | `num2words`. | It has no Hindi or Malayalam support (tested v0.5.14, as reported by Yadhu; not re-tested by me). |
| 2026-11-08 | Added `tests/test_codec_smoke.py` so `make check` and CI have one real test. | An empty `tests/` folder. | `pytest` exits with an error when it finds no tests, so the empty skeleton would fail the Stage 0 gate. |
