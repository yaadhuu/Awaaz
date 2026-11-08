---
description: Catch up the project diary from git log and docs, refresh costs, print a 10-line status
---

Follow the diary rules in `CLAUDE.md`.

1. Run `git log --stat --format='%H %ad %s' --date=iso` and read every file in `docs/`.
2. Find commits or milestones with no entry in `docs/DIARY.md`. Write the missing entries in the exact entry format from `CLAUDE.md`, oldest first, at the bottom. Use only facts from git, the docs, saved results files, or command output you run now. Anything else is "not run" or UNVERIFIED. Fill in any "pending" commit hashes.
3. Add missing lines to `docs/DECISIONS.md` and `docs/EXPERIMENTS.md` if the git history or results files show decisions or experiments not yet logged.
4. Find the call ledger (search the repo for ledger files; if none, say so). Refresh `docs/COSTS.md`: credits used per stage, credits remaining, cost of a rerun. Compute from ledger rows only. Never write an API key anywhere.
5. Print a status of at most 10 lines: last commit, entries added, open questions count, experiments logged, credits used and remaining, anything stale or UNVERIFIED.
6. Do not commit unless the user asks.
