# Decisions

One line per decision: date | decision | alternatives rejected | reason.

| Date | Decision | Alternatives rejected | Reason |
|------|----------|-----------------------|--------|
| 2026-11-08 | Keep the project diary as markdown files in `docs/`, committed to git. | A Notion or Google Doc; keeping notes only in chat. | Git history shows when each note was written, and the files sit next to the code. Chat history is easy to lose. |
| 2026-11-08 | API key stays in `.env` (git-ignored); `.env.example` has only the variable name `GNANI_API_KEY`. | Putting the key in code or docs. | Keys in git history are hard to remove and can be abused. |
