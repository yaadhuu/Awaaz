# TinyTalk Build Playbook

Put this file at `docs/BUILD_PLAYBOOK.md`. Claude Code executes ONE stage at a time. Every stage ends at a gate: it stops, reports, and waits for Yadhu.

How to start any stage (paste this, change N):

```
Read CLAUDE.md, docs/NORTH_STAR.md and docs/BUILD_PLAYBOOK.md. Execute Stage N only. Follow the Working Agreement. Stop at the gate and report: what passed, what failed, credits used, open questions.
```

---

## Working Agreement (applies to every stage)

1. **Plan first.** Before writing code, write a half-page plan to `docs/plans/stage-N.md` (approach, files, risks, how the gate will be checked). Then implement it.
2. **Small, verified steps.** Commit after each working unit. Commit message says what and why. Never commit secrets, `.env`, or audio/result caches.
3. **Tests before trust.** Pure logic (parsers, scoring, packing, byte accounting) gets unit tests first. Anything that calls Gnani is tested with a fake transport; real calls happen only in the stage that says so.
4. **One owner per concern.** Only `tinytalk/gnani.py` talks to Gnani. Only `config.yaml` holds settings. No magic numbers in code.
5. **Readable code.** Type hints, short functions, one-line docstring per function saying what and why, no clever tricks. Run `ruff` and `mypy` before each commit.
6. **No scope creep.** If something outside the stage looks useful, add it to "Open questions" in `docs/DIARY.md`; do not build it.
7. **Credits are a budget.** Print the planned spend before any live run and wait for approval if it exceeds the stage budget. Every call goes through the cache and ledger.
8. **Honest numbers.** Results come from saved output files only. Anything not run is "not run".
9. **Diary.** At the end of each stage: DIARY entry, DECISIONS, EXPERIMENTS, COSTS updated, commit hash recorded.
10. **Gate means stop.** Do not start the next stage.

---

## Stage 0 — Foundation
**Spends credits:** no

**Goal:** a clean repo where checks, docs and config exist before any feature.

**Do**
- Package `tinytalk/` with empty modules named in NORTH_STAR layout, `tests/`, `web/`, `config.yaml`, `Makefile` (`make check` runs ruff, mypy, pytest).
- Create `docs/` files, NORTH_STAR, DIARY, DECISIONS, EXPERIMENTS, COSTS, VIVA, STORY, plus `.claude/commands/diary.md` and `story.md`.
- `config.yaml` skeleton: languages, models, paths, credit cap, concurrency, clip length limit, seeds.

**Gate:** `make check` passes on the empty skeleton; docs exist; first commit made.

---

## Stage 1 — Gnani client (the only API door)
**Spends credits:** a handful (2 to 4 calls for a smoke test)

**Goal:** every API call is cached, counted, capped, retried and replayable.

**Do**
- `tinytalk/gnani.py` with `stt(audio, lang_codes, format, keyterms, topic, previous_text)` and `tts(text, language, voice, speed, audio_config)`.
- Cache on disk keyed by a hash of input and all parameters. Replay mode: cache miss raises an error, never calls the API.
- Ledger (JSONL): timestamp, kind, model, language, audio seconds or characters, cache hit, request id, processing time, end-to-end latency, status.
- Hard cap from `config.yaml` (`GNANI_MAX_CALLS`, plus credits once the conversion is known). Stop before exceeding it.
- Retry with backoff on 429 and 5xx. TTS goes through a one-at-a-time queue.
- Key from environment or `.env`; never logged.
- Always send `model` and `format` explicitly. Record `detected_language_code`.

**Gate:** unit tests with a fake transport cover: cache hit costs zero, cap stops the run, retry works, replay mode blocks live calls. One live STT and one live TTS succeed and appear in the ledger.

---

## Stage 2 — Message corpus (no API)
**Spends credits:** no

**Goal:** ground-truth messages with known facts.

**Do**
- Fact schema: places (from a gazetteer), numbers with units, times, optional names.
- Templates in Malayalam, Hindi and English: flood warnings, boat positions, supply requests, medical requests. Hindi in plain standard Hindi; Arabic digits (0–9) only.
- 40 messages per language, each with a `facts.json` truth record. Dev/test split by seed (30/70).
- Export `docs/review/hindi_spotcheck.md` (all Hindi sentences) and `docs/review/malayalam_review.md` for human review.

**Gate:** schema validation passes on all messages; split saved with seed; review files generated. Yadhu reviews Malayalam; a Hindi speaker reviews Hindi (or Hindi is marked "machine-scored only").

---

## Stage 3 — Fact parser and scorer (no API)
**Spends credits:** no

**Goal:** a deterministic way to extract and compare facts.

**Do**
- `tinytalk/facts.py`: normalise text (Unicode NFC; handle ZWJ/ZWNJ in Malayalam; map Malayalam and Devanagari digits to 0–9; common number words in each language; unit synonyms).
- Extract places (via gazetteer), numbers with units, times.
- `score_facts(truth, hypothesis)` returns per-fact exact match, and aggregate rates.
- WER and CER via `jiwer` for reference.

**Gate:** tests on at least 30 hand-made transcript pairs per language, including spacing, digit-script and joiner variants, all pass.

---

## Stage 4 — Pilot and language decision
**Spends credits:** yes, pilot budget only

**Goal:** decide Malayalam's role from data.

**Do**
- Take 10 messages per language, one voice. Timbre generates audio at 16 kHz mono, then Prisma transcribes (`transcribe` format, explicit language codes).
- Score with Stage 3. Report exact-fact rate per language with Wilson intervals, and WER/CER.
- Test Timbre number reading in Malayalam specifically; log failures.
- Apply the NORTH_STAR rule: Malayalam stays a full language only at ≥85% exact facts.
- Record the credit conversion rate if Yadhu has provided it.

**Gate:** pilot results in `results/pilot/`, the decision written in DECISIONS with the numbers, estimated spend for the full run printed. **Yadhu approves before Stage 5.**

---

## Stage 5 — Full audio set and baseline STT
**Spends credits:** yes, main-run budget

**Goal:** all audio and all transcripts, generated once and cached.

**Do**
- 3 voices × speeds (0.85, 1.0, 1.15) over the corpus, within the approved budget. Print the estimate; wait for approval.
- Prisma runs: context off, `keyterms`, `topic`, both. If the API accepts it, compare Prisma v2.5 against v3.0. Optionally compare `transliterate` against `transcribe` for byte cost.
- Report per voice, per language, per condition.

**Gate:** all results cached and in `results/main/`; COSTS shows actual versus estimate; experiments logged with the winning settings.

---

## Stage 6 — Codec and link simulation (no API)
**Spends credits:** no

**Goal:** a realistic, seeded weak-link simulator with exact byte accounting.

**Do**
- `tinytalk/codec.py`: Codec2 mode 2400 encode/decode from 8 kHz PCM (build in `tools/codec2`), Opus 6 kbps fallback through ffmpeg.
- `tinytalk/linksim.py`: packetisation, link rates 2, 5, 10 kbps, loss 0, 10, 20, 30%, seeded random loss, resend logic for Tier B and C (CRC, sequence number, up to 3 resends).
- Byte and airtime accounting per tier.

**Gate:** tests show deterministic output for a fixed seed; measured codec bitrate matches mode; loss reduces decoded audio as expected; airtime numbers reproduced by hand for one case.

---

## Stage 7 — Tiers, packing and the curve
**Spends credits:** a few (Prisma on decoded Tier A audio, cached)

**Goal:** the headline result.

**Do**
- `tinytalk/textpack.py`: zstd dictionary trained on the dev split only; place codebook indices; binary numbers.
- `tinytalk/tiers.py`: Tier A/B/C packers, link meter, rule-based tier picker.
- `tinytalk/evaluate.py`: facts correct versus bytes per minute, one line per tier, per language, bootstrap intervals for WER/CER, Wilson for rates. For Tier A, Prisma on the decoded audio is a proxy for a human listener; state this limit in the results.
- Save `results/curve.json` and a plot.

**Gate:** the curve reproduces from cached results with one command; test-split only for reported numbers; limits written to EXPERIMENTS.

---

## Stage 8 — Reliability estimator (the ML piece)
**Spends credits:** no

**Goal:** predict when a transcript's facts are wrong.

**Do**
- Features: agreement between context-on/off runs on numbers and places, counts of parsed facts, clip length, language, loss level, readback match.
- Labels from ground truth. Train logistic regression and gradient boosting on dev; report on test.
- Compare with the simple baseline "two runs agree". Report precision/recall at the chosen threshold and a calibration curve.
- If the model does not beat the baseline, say so and keep the baseline.

**Gate:** `results/estimator.json` with test metrics; the picker can use the estimator behind a config switch.

---

## Stage 9 — Voice teach-back
**Spends credits:** yes, small

**Goal:** a receiver says the facts back and the system checks them.

**Do**
- Timbre reads the facts back in the message language (explicit language, `<pauses>` between facts, speed 0.85, long digit strings grouped).
- Receiver clips (synthetic) go through Prisma, then Stage 3 compares them with the sent facts.
- Half the readbacks are deliberately altered (one number, place or unit changed). Report catch rate and false alarm rate with Wilson intervals.

**Gate:** results in `results/teachback.json`; per-language rates; failure cases listed.

---

## Stage 10 — API server
**Spends credits:** no (replay by default)

**Goal:** a thin FastAPI layer over the library.

**Do**
- Endpoints: send message (returns chosen tier, bytes, facts), link state, curve data, teach-back check.
- `LIVE=1` switches to live Gnani; the default is replay. The key stays server-side.
- Request and response models typed; errors returned clearly.

**Gate:** API tests pass in replay mode; one live round trip works with `LIVE=1`; p50 and p95 latencies recorded.

---

## Stage 11 — Web UI
**Spends credits:** no (replay) plus one live demo path

**Goal:** a demo judges understand in 30 seconds.

**Do**
- Screens: send a message (type or record), link slider (2–10 kbps, loss), live tier switch, bytes and airtime readout, the curve with intervals, teach-back with the alter-and-catch demo.
- Language switch Malayalam / Hindi / English. Loading, error and empty states for every screen.
- Responsive, readable fonts for Malayalam and Devanagari, accessible contrast.
- Playwright end-to-end test of the main flow.

**Gate:** e2e test passes; the demo path runs fully offline from cache and once live.

---

## Stage 12 — Hardening
**Spends credits:** minimal

**Do**
- Profile latency per step and record p50/p95 in EXPERIMENTS.
- Review COSTS and cap behaviour; confirm replay mode never calls the API.
- `make reproduce` rebuilds all numbers from caches. README with setup, run, results, limits.
- Remove dead code; run lint, types, tests; check no secrets in git history.
- Draft the demo script and recording checklist.

**Engineering evidence (reviewers will look for these)**
- GitHub Actions workflow running ruff, mypy and pytest on every push, with a passing badge in the README.
- README: problem, one architecture diagram, results table with intervals, how to reproduce, limits and what we did not do, credit usage, and a short "How this was built" section stating openly that Claude Code assisted and how we kept engineering control (diary, decisions log, tests, staged gates).
- `docs/DECISIONS.md` linked from the README as the decision record; `docs/EXPERIMENTS.md` as the evidence.
- Pinned dependencies (lock file), a LICENSE, `.env.example`, no secrets in history.
- A readable commit history: small commits, clear messages, one stage per branch or tagged release (`stage-4-pilot`, `v1.0`).
- Tests cover the pure logic and the replay path; the coverage number is reported honestly.
- Tagged release `v1.0` containing the exact code behind the posted numbers.

**Gate:** clean clone runs `make reproduce` and the demo; CI is green; checks pass.

---

## Stage 13 — Story and posts
**Do**
- Run `/diary`, then `/story`. Fill VIVA with the real questions and answers.
- Demo video, 60 to 90 seconds: Yadhu speaks a Malayalam message, the link slider drops, the tier switches, the receiver reads the facts back, and one deliberately wrong readback is caught. Subtitles in English. Ends on the curve and the repo link.
- LinkedIn post (and the X post): first line states the measured result in plain words; then the problem in one sentence; the video; one chart; what we measured and what we did not; limits; repo link; Gnani credit and tags as the challenge rules require. No claims beyond EXPERIMENTS.
- Read the challenge rules again for the exact tags, which post counts, and whether edits after posting are allowed. Write the answer in DECISIONS.
- Engagement comes only from real people: classmates, club and open-source contacts, faculty, and anyone who can follow the demo. No bought or automated engagement.
- Yadhu reviews every claim against EXPERIMENTS.

**Gate:** every claim in the posts maps to a line in EXPERIMENTS or DECISIONS; the repo link opens a clean README with a green CI badge.

---

## Minimum winning package and the freeze

Shortlisting is by verified engagement on the posts, so the finish line is the post, not the last feature. Deadline: 11:59 PM IST, Tue 10 Nov 2026, no extension.

- **Must ship:** Stages 0 to 7 (client, corpus, parser, pilot, full run, link simulation, the curve), a simple UI that shows the tier switch and the curve, the engineering evidence in Stage 12, and the post with the demo video.
- **Bonus, only if the core is green:** Stage 8 (estimator), Stage 9 (teach-back demo), a polished UI.
- **Freeze rule:** agree a build freeze time. Whatever is passing its gate at the freeze is what gets documented, recorded and posted. Do not start a new stage after the freeze.
- Post as early as the demo and README are solid; engagement needs time to accumulate before the deadline.

---

## Order and parallel work
Stages 0 to 5 go in order. Stage 2 (the Hindi spot-check) and Stage 11 (UI against fixture data) can be done by the teammate while the pipeline stages run. Stages 6 and 3 do not depend on the API and can run before the pilot if credits or waiting are the issue.
