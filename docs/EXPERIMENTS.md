# Experiments

Rule: every number here must come from a command output or a saved results file. Anything unverified is marked UNVERIFIED. A check that was not run says "not run".

Each experiment uses this shape:

```
## E<number> - <title> (<date IST>)
- Setup: (what was run, on what data, with which command; where the raw output is saved)
- Results: (exact numbers copied from the output)
- Conclusion: (what it means, and what we did next)
```

## E0 - Live smoke test, Hindi round trip (2026-11-08 23:33 IST)
- Setup: `scripts/smoke_gnani.py`. Timbre (`timbre-v3.0`, voice Vasudha, `hi-IN`, speed 1.0, 16 kHz WAV) spoke the Hindi text "बाढ़ की चेतावनी। पचास लोग फंसे हैं।" ("Flood warning. Fifty people are trapped."). Prisma (`prisma-v3.0`, `hi-IN`, default `format=transcribe`) transcribed that audio. Raw rows: `results/ledger.jsonl`.
- Results: TTS returned 94764 bytes (HTTP 200, 1 attempt, `latency_s` 1.241). STT returned the transcript `बाढ़ की चेतावनी, 50 लोग फंसे हैं।`, `detected_language_code` `hi-IN`, `processing_time` 0.12991714477539062, `end_to_end_latency` 0.13153886795043945, HTTP 200, 1 attempt.
- Conclusion: both endpoints work with our client, the real response keys match `docs/GNANI_NOTES.md`, and Timbre read the spoken number "पचास" which Prisma returned as the digits "50" (ITN turns number words into digits, so the fact parser must handle digits). This is one sentence, so it says nothing about accuracy. Not tested yet: `keyterms`, `ml-IN`, other voices and speeds. Known flaw: the STT ledger row shows `audio_seconds` 134217.7279375 because Gnani's WAV header claims a huge frame count. The client is fixed (computes from byte length: about 2.96 s) and covered by a test, but the already-written ledger row is left as it is (the ledger is append-only).

## E1 - Offline sizes: raw text vs Tier B vs Tier C (2026-11-09)
- Setup: `scripts/size_report.py` (no API, no credits). Corpus seed 1108, test split of 28 messages per language. The Tier B dictionary is built from the 12 dev messages only. Raw numbers: `results/sizes.json`.
- Results (average bytes per message): Malayalam raw 226.28571428571428, Tier B 25.821428571428573, Tier C 6.607142857142857. Hindi raw 189.35714285714286, Tier B 25.642857142857142, Tier C 6.607142857142857. English raw 76.46428571428571, Tier B 26.5, Tier C 6.607142857142857.
- Conclusion: packing shrinks a Malayalam message about 8.8 times (226.3 / 25.8, computed from the numbers above) and facts-only is about 34 times smaller than raw Malayalam text. Limit: the corpus is templated (4 message types), so the dictionary matches test messages unusually well. Free speech would compress less. Facts-only is language independent, which is why Tier C is the same size everywhere. Tier A is 2400 bits per second = 300 bytes per second of speech (measured by `scripts/check_codec.py`: `measured_bps=2400.0`), so a 10 s message would be about 3000 bytes. No audio of that length has been generated yet.

## E2 - Link simulator checks (2026-11-09)
- Setup: `tests/test_link_codec.py` (seeded, no API). Loss levels 10, 20, 30 percent over 60000 packets each, mean burst length 3.
- Results: the long-run loss stays within 0.015 of the target and the mean burst length is between 2.5 and 3.5 at every level (these are the pass bounds in the test, which passes; the exact measured values were not printed). Airtime by hand: 600 bytes at 2 kbps is 13 packets, 652 bytes on the air, 2.608 s (the test asserts this exactly).
- Conclusion: the link model behaves as configured. It is a model, not a radio test.

## Not run yet (live, needs credits)
- Pilot (30 Timbre + 30 Prisma calls on the dev split), Malayalam decision, main run, Tier A recognition on decoded audio, the curve with intervals. Plan and call counts: `uv run python -m scripts.run_stage pilot|main|tiers` without `--live` prints how many calls are missing.
