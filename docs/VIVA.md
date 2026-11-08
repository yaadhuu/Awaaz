# Likely judge / interviewer questions

Short, plain-English answers. Add to this as we build. Mark an answer UNVERIFIED if it depends on a result we have not measured.

## Process

**Q: How did you keep track of what was built and why?**
A: A diary entry for every milestone, a one-line-per-decision log, an experiment log with numbers copied from real outputs, and a cost log. All are in `docs/` and committed to git.

**Q: Where does each number in your report come from?**
A: From a command output or a saved results file. If a check was not run, the docs say "not run". Nothing is rounded or invented.

**Q: How do you protect the API key?**
A: It is in `.env`, which git ignores. `.env.example` only shows the variable name.

## The idea

**Q: What problem does TinyTalk solve?**
A: When a link is weak, voice messages fail. We send what matters instead of the whole audio: the full text, or just the facts (places, numbers, times), and we check at the other end that they were understood.

**Q: How does it choose what to send?**
A: A simple rule on the link speed and loss. Clean and fast enough: audio. Otherwise the transcript if it sends quickly. Otherwise facts only. The thresholds are in `config.yaml` and are not tuned on data.

**Q: How small is a message?**
A: Facts only is about 7 bytes. The packed transcript is about 26 bytes in our templated test messages. Audio at 2400 bits per second is 300 bytes per second (E1 in `docs/EXPERIMENTS.md`).

**Q: Did you test on a real radio?**
A: No. The link is a software model with bursty packet loss. We say so everywhere.

**Q: Why are the numbers in your README trustworthy?**
A: They come from saved result files or command output. Anything not run says "not run".

## Technical

**Q: How do you score accuracy?**
A: We know the true facts of each message. We read the facts out of the transcript with a rule-based parser and count how many are exactly right, with Wilson intervals. We do not use fuzzy matching for scoring.

**Q: Why not trust the dictionary compression result?**
A: Our messages come from templates, so the dictionary fits them very well. Real speech would compress less. This is in the limits.

**Q: How do you protect credits?**
A: One client does all Gnani calls with a cache, a ledger, a call cap, and replay mode. Live runs must be started with an explicit call limit, and by default they only report what is missing.

**Q: Why was Codec2's decoded audio stored?**
A: Its decoder adds random phase, so each decode differs. Storing the first decode keeps Prisma cache hits and saves credits.

**Q: What is the Malayalam rule?**
A: Malayalam stays a full language only if the pilot reaches at least 85 percent exact facts. The pilot has not been run yet.
