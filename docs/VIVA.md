# Likely judge / interviewer questions

Short, plain-English answers. Add to this as we build. Mark an answer UNVERIFIED if it depends on a result we have not measured.

## Process

**Q: How did you keep track of what was built and why?**
A: A diary entry for every milestone, a one-line-per-decision log, an experiment log with numbers copied from real outputs, and a cost log. All are in `docs/` and committed to git.

**Q: Where does each number in your report come from?**
A: From a command output or a saved results file. If a check was not run, the docs say "not run". Nothing is rounded or invented.

**Q: How do you protect the API key?**
A: It is in `.env`, which git ignores. `.env.example` only shows the variable name.
