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

## E3 - Pilot: Timbre speaks, Prisma listens (2026-11-09)
- Setup: `uv run python -m scripts.run_stage pilot --live --max-new-calls 70`. First 10 dev-split messages per language (30 messages), Timbre v3.0 voice Vasudha, speed 1.0, 16 kHz WAV, Prisma v3.0 `transcribe`, explicit language code, no context (`off`). 60 live calls, all HTTP 200, no retries. Raw: `results/pilot/records.jsonl`, `summary.json`, `decision.json`, `ml_failures.json`, ledger `results/ledger.jsonl`.
- Results, first scoring (parser v1, saved as `summary_parser_v1.json`). Exact facts matched / total (Wilson 95 percent): Malayalam 27/31 = 0.871 (0.711 to 0.949), Hindi 25/31 = 0.806 (0.637 to 0.908), English 28/31 = 0.903 (0.751 to 0.967). Messages with every fact exact: Malayalam 6/10, Hindi 4/10, English 7/10. Mean WER / CER: Malayalam 0.123 / 0.033, Hindi 0.127 / 0.116, English 0.043 / 0.018. No made-up extra facts in any language.
- What went wrong: all 4 Malayalam misses were the parser, not Prisma. Prisma wrote "മീറ്ററാകും" (metre + will be, joined into one word) and the parser looked for the word "മീറ്റർ". Fix (parser v2): Malayalam unit stems now stop before the final letter (`lexicon.py`), plus English spelling variant "Chalakudi". Re-scored from the cache with 0 new calls. The fix was made after looking at these dev messages, so the new Malayalam number is optimistic.
- Results after the fix (`summary.json`): Malayalam 31/31 = 1.0 (0.890 to 1.0), message exact 10/10. Hindi unchanged 25/31 = 0.806 (0.637 to 0.908), message exact 4/10. English 29/31 = 0.935 (0.793 to 0.982), message exact 8/10.
- Remaining misses are real Prisma errors on place names, not numbers. Hindi (6 messages): Chalakudy heard as "सालाकुड़ी", "चालाखुड़ी", "सालाखुड़ी"; Aluva as "आलुआ" (twice); Alappuzha as "अलग पूजा". English (2): Idukki heard as "Itachi", Chalakudy as "Chalakuri". Every number and unit was right in the 30 clips after the parser fix, so Malayalam number reading by Timbre worked on these 10 messages (no failures logged).
- Conclusion: the Malayalam rule (at least 85 percent exact facts) passes (0.871 before and 1.0 after the parser fix, on 10 messages, so the interval is wide). Malayalam stays a full language (`results/pilot/decision.json`). The weak point is place names, which is what the `keyterms` context condition in the main run should help; not tested yet. Not measured: other voices, speeds, the test split.
- Cost: 62 live attempts in the ledger in total (2 smoke test + 60 pilot), all status 200. Pilot text sent to Timbre: 2340 characters. Mean Timbre latency 1.62 s per call (computed from the ledger). Pilot audio sent to Prisma: about 203.8 s (computed from the ledger, mean 6.8 s per clip). Credits used: UNVERIFIED (read the balance from the dashboard).
