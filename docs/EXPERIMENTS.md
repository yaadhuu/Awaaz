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
