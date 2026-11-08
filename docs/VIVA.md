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

## Failures and what we learned

**Q: Did anything go wrong?**
A: Yes. The first audio-tier run scored almost zero, even on a clean link. The cause was a library that only compresses the first 20 milliseconds of an array, and my earlier check only measured the output length, so it did not notice. We found it because the numbers were absurd, fixed the code, added a test that checks the audio really survives, and re-ran. It cost 336 extra calls. The failed results are kept in `results/tiers_invalid_codec_bug.jsonl`.

**Q: What did the context hint do?**
A: Giving Prisma the list of place names fixed all the place-name mistakes (Hindi 80 to 91 of 91 facts, English 87 to 91). But the list is closed, so on open vocabulary the gain would be smaller.

**Q: What is the main result?**
A: On a clean link, audio and text carry about the same facts, but audio costs roughly 50 to 70 times more bytes than the transcript. As packet loss rises, audio drops quickly (English from 0.88 to 0.32 of facts at 30 percent loss) while the text tiers hold much better. Details and intervals are in E5.

**Q: Why is Malayalam OK?**
A: In the pilot it met the 85 percent rule, and on the 28 test messages it got 90 of 91 facts right with or without the hint. Hindi was the weakest on place names without the hint.

## The app

**Q: What does the app show?**
A: You choose a message and a link quality. It shows which tier the link meter picks, why in plain words, how many bytes and how much airtime each tier needs, a strip of packets for each tier (lost ones in red), and which facts reached the receiver. The teach-back panel catches a changed number. The evidence section shows the measured curve.

**Q: Is the app talking to Gnani live?**
A: Not by default. It runs in replay mode on cached results, so it costs nothing. Live mode needs a secret token and an explicit switch.

**Q: Why can't the audio tier show its facts in the app?**
A: Reading facts from audio needs speech recognition, which costs credits. In replay mode the app shows Tier A's size and packet losses only. The measured Tier A results are in the evidence section.
