# Project rules

Yadhu is vibe-coding this project and must be able to explain every part of it at the end. The docs in `docs/` are how that happens. Keep them current.

## Diary rules

- After every milestone or experiment, and before every commit, append an entry to `docs/DIARY.md`. Update `docs/DECISIONS.md`, `docs/EXPERIMENTS.md` and `docs/COSTS.md` if they changed. Put the commit hash in the entry. The hash is only known after the commit, so fill it in with the next commit.
- When something fails, log the failure and the fix too. Failures are part of the story.
- Never invent or round results. Copy numbers from command output or saved results files. If a check was not run, write "not run". Anything unverified is marked UNVERIFIED.
- When we change direction (for example dropping Malayalam after the pilot rule), write why, with the numbers that triggered it, in `DIARY.md` and `DECISIONS.md`.
- Keep an "Open questions" list at the top of `docs/DIARY.md` for things Yadhu must decide or verify (for example a Hindi spot-check by a native speaker). Remove an item only when it is answered, and log the answer.
- Never put API keys in any doc, commit, or log. The key lives in `.env` (git-ignored). `.env.example` holds only the variable name.
- Write docs in plain language. Explain any jargon in one line.

## Diary entry format

Use exactly this, newest entry at the bottom of `docs/DIARY.md`:

```
## <date time IST> - <milestone title>
- What we did:
- Why (the reasoning, in plain words):
- How it works in 3 sentences a beginner could repeat:
- Files touched:
- Result (real numbers only) and what it means:
- What could go wrong / known limits:
- What Yadhu should be able to say if asked about this:
- Git commit hash:
```

## Other docs

- `docs/DECISIONS.md`: one line per decision: date, decision, alternatives rejected, reason.
- `docs/EXPERIMENTS.md`: each experiment with setup, exact numbers from real output, conclusion.
- `docs/VIVA.md`: likely judge questions with short plain-English answers. Grow it as we build.
- `docs/COSTS.md`: Gnani credits per stage, read from the call ledger. Show what remains and what a rerun costs.
- `docs/STORY.md`: empty until the end. `/story` writes it from the other docs only.

## Commands

- `/diary`: catch up the diary from git log and docs, refresh COSTS, print a 10-line status.
- `/story`: write `docs/STORY.md` from the other docs.
