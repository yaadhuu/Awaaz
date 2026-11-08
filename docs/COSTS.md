# Costs (Gnani credits)

Source: `results/ledger.jsonl` (one JSON line per call). The Gnani docs publish no prices and no credit-balance API, so credits cannot be computed from the ledger. Calls and units are counted instead. Credit balance and price per unit: UNVERIFIED (must be read from the dashboard at app.gnani.ai).

| Stage | Calls | Units | Credits used | Date |
|-------|-------|-------|--------------|------|
| E0 smoke test (1 TTS, 1 STT) | 2 | 35 characters TTS, about 2.96 s audio STT | UNVERIFIED | 2026-11-08 |

- Live HTTP attempts used so far: 2 of the cap `credits.max_calls: 4` (set for the smoke test; raise before the pilot).
- Credits remaining: UNVERIFIED.
- Cost of a full rerun: not run (replay mode needs the cache, so a rerun from cache costs 0 calls).

## Update 2026-11-09
| Stage | Live attempts | Units | Credits used | Date |
|-------|---------------|-------|--------------|------|
| E3 pilot (30 TTS, 30 STT) | 60 | 2340 characters TTS, about 203.8 s audio STT | UNVERIFIED | 2026-11-09 |

- Live attempts in the ledger so far: 62 (all status 200, no retries). `credits.max_calls: 4` in `config.yaml` is the old smoke-test cap; live runs now use `--max-new-calls`.
- Credits remaining: UNVERIFIED (Yadhu reported about 4.9k before the pilot).
- A rerun of the pilot costs 0 calls (all cached; `scripts.run_stage pilot --live` was re-run twice for re-scoring and used 0 new calls).
