# Costs (Gnani credits)

Source: `results/ledger.jsonl` (one JSON line per call). The Gnani docs publish no prices and no credit-balance API, so credits cannot be computed from the ledger. Calls and units are counted instead. Credit balance and price per unit: UNVERIFIED (must be read from the dashboard at app.gnani.ai).

| Stage | Calls | Units | Credits used | Date |
|-------|-------|-------|--------------|------|
| E0 smoke test (1 TTS, 1 STT) | 2 | 35 characters TTS, about 2.96 s audio STT | UNVERIFIED | 2026-11-08 |

- Live HTTP attempts used so far: 2 of the cap `credits.max_calls: 4` (set for the smoke test; raise before the pilot).
- Credits remaining: UNVERIFIED.
- Cost of a full rerun: not run (replay mode needs the cache, so a rerun from cache costs 0 calls).
