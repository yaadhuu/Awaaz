# Gnani Feature Coverage & Usage Matrix

Documented Prisma STT and Timbre TTS features from `docs/GNANI_NOTES.md`, tracking how each is used, measured, or omitted in TinyTalk.

| Feature | Service | Status | TinyTalk Reference | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| `POST /stt/v3` REST | Prisma | **used and measured** | `tinytalk/gnani.py:223`, `tinytalk/pipeline.py` | Primary STT endpoint evaluated across 120 corpus records (E3, E4). |
| `prisma-v3.0` model | Prisma | **used and measured** | `config.yaml:7`, `tinytalk/gnani.py:26` | Evaluated on en-IN, hi-IN, ml-IN with Wilson confidence intervals. |
| `keyterms` biasing (<=200) | Prisma | **used and measured** | `tinytalk/gnani.py:236`, `tinytalk/api.py:545` | Place names & unit stems boost Hindi from 80/91 to 91/91 exact facts (E4). |
| `topic` context prompt | Prisma | **used and measured** | `tinytalk/pipeline.py:84` | Tested in `both` condition alongside keyterms. |
| `format="transcribe"` (ITN) | Prisma | **used and measured** | `tinytalk/pipeline.py:79`, `tinytalk/api.py:469` | Converts spoken number words to numerals for exact fact extraction. |
| `format="verbatim"` | Prisma | **used in the app** | `tinytalk/api.py:469` | Supported in manual STT playground options. |
| `format="codemix"`, `"transliterate"` | Prisma | **not used** | - | Not required for emergency facts parsing pipeline. |
| Multi-candidate / `indic-auto` | Prisma | **used in the app** | `tinytalk/api.py:468`, `tinytalk/api.py:875` | Default language hint for live uploads. |
| `POST /api/v1/tts/inference` | Timbre | **used and measured** | `tinytalk/gnani.py:175`, `tinytalk/pipeline.py` | Speech generation for synthetic corpus and live voice reply. |
| `timbre-v3.0` model | Timbre | **used and measured** | `config.yaml:8`, `tinytalk/gnani.py:27` | Standard speech model used for all evaluation audio generation. |
| 13 v3.0 Voices | Timbre | **used and measured** | `tinytalk/api.py:75`, `results/pilot/` | Vasudha, Avinash, Lakshmi tested; full 13-catalog exposed via `/api/voices`. |
| Speeds (0.85 - 1.15) | Timbre | **used and measured** | `config.yaml:11`, `results/main/` | Tested at standard 1.0x with speed variations configured. |
| Audio configs (WAV, 16kHz PCM) | Timbre | **used and measured** | `tinytalk/gnani.py:28`, `tinytalk/codec.py` | Converted directly to 8kHz for Codec2 encoding. |
| `<pauses>` inline tag | Timbre | **used in the app** | `tinytalk/api.py:764` | Injected between facts in live teachback voice readouts. |
| WebSocket / SSE Streaming | Prisma/Timbre | **not used** | - | Omitted per design: emergency packets are sent as discrete bursts over weak links. |
| Voice Cloning | Timbre | **not used** | - | Explicit project rule: only synthetic catalog voices, no human recordings. |
| Prisma v2.5 Legacy Model | Prisma | **not used** | - | Evaluated v3.0 only due to keyterms requirement and native numeral handling. |

*Last verified: 2026-11-10 against `docs/GNANI_NOTES.md` and repository implementation.*

