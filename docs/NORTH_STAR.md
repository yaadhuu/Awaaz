# TinyTalk North Star (DRAFT, needs Yadhu's approval)

Written in Stage 0 from `CLAUDE.md` and `docs/BUILD_PLAYBOOK.md` only. Nothing here is new; where the sources were silent, it says so.

## What it is

TinyTalk sends voice messages over weak links by sending text instead of audio. A link meter picks a tier. At the receiver, a voice teach-back says the facts back and Prisma checks them.

- Tier A: audio. Codec2 at 2400 bps, fallback Opus 6 kbps.
- Tier B: the full transcript.
- Tier C: critical facts only (places, numbers with units, times).

## The test setup

- The link is simulated: 2, 5 and 10 kbps, with 0, 10, 20 and 30 percent packet loss. No real radio test is claimed.
- Languages: Malayalam, Hindi, English.
- Test speech is synthetic (Timbre). No real people are recorded.
- Headline result: facts correct versus bytes per minute, per tier, with intervals.

## The Malayalam rule

Malayalam stays a full language only if the pilot reaches at least 85% exact facts (Stage 4 applies this).

## Layout

`tinytalk/` modules. The first seven names come from the playbook. The last four (`corpus`, `estimator`, `teachback`, `api`) are my reading of Stages 2, 8, 9 and 10 and are UNVERIFIED as the intended layout.

- `gnani.py`: the only code that talks to Gnani (cache, ledger, cap, retries).
- `facts.py`: text normalising, fact extraction, scoring.
- `codec.py`: Codec2 and Opus.
- `linksim.py`: packets, link rates, loss, resends.
- `textpack.py`: compressing text and facts.
- `tiers.py`: tier packers, link meter, tier picker.
- `evaluate.py`: the curve and the statistics.
- `corpus.py`, `estimator.py`, `teachback.py`, `api.py`.

Other folders: `tests/`, `web/`, `docs/`, `scripts/`, `results/`, `tools/codec2`. Settings live only in `config.yaml`.

## Rules that never change

- The API key lives only in `.env` and is never committed.
- Accuracy is reported with intervals, and failures are shown.
- No bought engagement on posts.
- Results come from saved output files only. Anything not run is "not run".
- Deadline: Tue 10 Nov 2026 23:59 IST; aim to submit by 18:00.
