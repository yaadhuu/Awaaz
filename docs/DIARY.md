# Project diary

Newest entry at the bottom. Format and rules are in `CLAUDE.md`.

## Open questions

- `docs/NORTH_STAR.md` does not exist, but `docs/BUILD_PLAYBOOK.md` tells every stage to read it. It must hold the goal, the module layout, and the Malayalam rule (≥85% exact facts). Yadhu to provide it. (Added 2026-11-08)
- Build freeze time is not set. Deadline in the playbook is 11:59 PM IST, Tue 10 Nov 2026. Yadhu to pick a freeze time. (Added 2026-11-08)
- Gnani credit-to-call conversion rate and the pilot and main-run credit budgets are not given. Stages 4 and 5 need them. (Added 2026-11-08)
- Ledger format is JSONL (playbook Stage 1). The file path is still not decided; `docs/COSTS.md` reads from it. (Added 2026-11-08)
- Native-speaker spot-checks (for example Hindi) are expected later. Who does them, and when, is not decided. (Added 2026-11-08)

---

## 2026-11-08 17:10 IST - Project diary system set up
- What we did: Created the `docs/` folder with DIARY, DECISIONS, EXPERIMENTS, VIVA, COSTS and STORY files. Wrote `CLAUDE.md` with the diary rules. Added two slash commands, `/diary` and `/story`, in `.claude/commands/`.
- Why (the reasoning, in plain words): Yadhu is building this with an AI assistant and has to explain all of it at the end. Writing things down as we go means every question can be answered from the record instead of from memory.
- How it works in 3 sentences a beginner could repeat: Every time we finish a step, we add a short entry to the diary saying what we did, why, and what the real numbers were. Decisions, experiments, costs and likely interview questions each have their own file so they are easy to find. Two commands automate the boring parts: one catches the diary up, the other writes the final story from the other files.
- Files touched: `CLAUDE.md`, `docs/DIARY.md`, `docs/DECISIONS.md`, `docs/EXPERIMENTS.md`, `docs/VIVA.md`, `docs/COSTS.md`, `docs/STORY.md`, `.claude/commands/diary.md`, `.claude/commands/story.md`.
- Result (real numbers only) and what it means: No experiments run yet, so no results. State of the repo at this point, read from the files: no commits existed before this one; `requirements.txt` lists 46 pinned Python packages, including `gnani-vachana==0.9.0`, `fastapi`, `uvicorn`, `jiwer`, `pandas`, `scipy`, `statsmodels`, `pytest`, `pydub`; `web/` holds a React + TypeScript + Vite app (dependencies include `recharts` and `wavesurfer.js`); `.env.example` names one variable, `GNANI_API_KEY`. What each of these is for in the project is UNVERIFIED, since no goal has been written down yet.
- What could go wrong / known limits: The docs are only as good as our habit of updating them. Commit hashes cannot be known before the commit, so each entry gets its hash filled in with the next commit. No call ledger exists yet, so COSTS.md has no numbers.
- What Yadhu should be able to say if asked about this: "I kept a diary, a decision log, an experiment log and a cost log from day one, so every number in the final report traces back to a real command output."
- Git commit hash: f1e07e8
