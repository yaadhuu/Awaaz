# Awaaz — Every voice deserves to reach

**One-page solution pitch · Gnani hackathon · 10 November 2026**  
**Project:** [github.com/yaadhuu/Awaaz](https://github.com/yaadhuu/Awaaz)

### The problem
When connectivity deteriorates, a spoken message can lose the details that matter:
the place, the number of supplies needed, or the time to act. Sending the same audio
again consumes scarce bandwidth without guaranteeing those details arrive.

### Our solution
Awaaz explores sending the information in a voice message in the form the connection
can support. It compares three tiers: compressed audio, a packed full transcript,
and a compact packet of critical facts. A rule-based selector uses simulated link
speed and packet loss to choose a tier. A teach-back check compares the received
facts with the sent facts, making a changed quantity or place visible.

### How we use Gnani
Gnani **Prisma v3.0** transcribes speech, with place-name keyterms to improve recognition.
Gnani **Timbre v3.0** generates synthetic speech and supports spoken read-backs.
The research evaluates English, Hindi and Malayalam. The React interface lets reviewers
hear saved examples, vary simulated packet loss, compare payload sizes, and inspect
the supporting results. The local voice workspace also supports audio experiments;
public live deployment remains in progress. API credentials stay on the backend.

### Evidence
In the saved test at 5 kbps, English compressed-audio fact accuracy fell from
**87.9%** at zero loss to **31.9%** at 30% simulated loss; the corresponding Wilson
95% intervals are **79.6–93.1%** and **23.2–42.0%**. Audio cost about **19,506 bytes
per minute of speech**, versus **281–409** for packed transcripts and **80–98** for
facts-only packets across the three languages. The saved text teach-back experiment
caught **14/14 deliberate single-fact changes per language** (Wilson 95%: 78.5–100%).

### Scope and next step
This is a research prototype using **synthetic speech, a templated corpus and a
software-simulated link**, not a field-tested emergency system. Facts-only packets
omit nuance. Interface translations need native-speaker review. Next steps are
broader speech evaluation, real-link testing and reliable public live hosting.

**Evidence:** [experiment log](EXPERIMENTS.md), [measured curves](../results/curve.json),
[running instructions](DEPLOY.md).
