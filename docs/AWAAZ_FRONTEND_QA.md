# Awaaz frontend review — 10 November 2026

Scope: editorial landing page, public shell, saved-example controls, radio listening reference, and navigation into existing prototype pages. Order: frontend-design → typeset/animate/adapt/harden → audit → critique → polish. User-provided design context is recorded in `.impeccable.md`.

## Audit — before final polish

Anti-pattern verdict: pass in this review. Original radio SVG, literary hierarchy, restrained ivory/forest/terracotta palette, a single persistent message example, no copied site content, neon/glass effects, repeated feature-card grids, bounce, or scroll hijacking.

| Dimension | Score / 4 | Finding |
| --- | --- | --- |
| Accessibility | 3 | Labelled native controls and reduced motion; supplementary real radio lacks an exact transcript. |
| Performance | 3 | First desktop Lighthouse: 90 performance; initial lazy landing causes footer layout shift. |
| Responsive | 3 | 320–1920 px checks pass; small supporting captions need more readable mobile sizes. |
| Theming | 4 | Landing uses explicit colour tokens; shared shell follows the same palette. No dark-mode toggle is offered. |
| Anti-patterns | 4 | Distinct editorial composition; animation communicates playback and story progression. |
| Total | 17/20 | Good; fix interaction obstruction and loading shift before delivery. |

Initial Lighthouse desktop: accessibility 100, best practices 100. These are automated checks, not proof of full WCAG conformance.

- **P1 — radio player hit target obstructed.** `web/src/pages/story.css`, `.aw-radio-reference-glyph`: the oversized decorative quotation glyph overlaps the play button. A real pointer click hits the decoration instead. Set `pointer-events: none` on decoration. Suggested action: `/harden` then `/polish`.
- **P2 — first-load layout shift.** `web/src/App.tsx`, lazy landing route: a short loading state initially exposes the footer, then the story moves it down (measured CLS 0.190). Eagerly load the primary landing and preload critical Latin fonts. Suggested action: `/optimize` then `/polish`.
- **P2 — supporting type too small on mobile.** `web/src/pages/story.css`, caption/console/header rules: several labels are below comfortable touch-screen reading sizes. Enlarge supporting text and simplify the smallest navigation label. Suggested action: `/typeset` and `/adapt`, then `/polish`.
- **P2 — radio transcript unavailable.** `StoryLanding.tsx`, optional real-radio reference: CC0 recording has no verified exact transcript. Disclose this and direct users to paired synthetic audio/text examples. Do not invent a transcript or claim accessibility completeness. Suggested action: `/clarify`.

Positives: no API keys/calls needed for the story; measured payload and wire sizes are distinct; labels distinguish saved speech and simulated conditions; source/licence accompany the radio reference; no autoplay; failure offers retry; native range is keyboard accessible; original examples remain usable in the older instrument pages.

## Critique — after audit, before polish

The composition communicates care and a specific Indian context through Wayanad, Indian-language type, and the voice-first message. The main opportunity is to keep decorative typography from competing with usable controls and to improve compact supporting type.

| Nielsen heuristic | Score / 4 | Assessment |
| --- | --- | --- |
| Visibility of status | 3 | Playback, selected format and loss are labelled. |
| Real-world match | 4 | The same place, number and time persist through the explanation. |
| Control/freedom | 3 | Native scrolling, optional audio, reversible number change. |
| Consistency | 3 | Shared brand and colour story; existing Studio retains its earlier structure. |
| Error prevention | 3 | Simulation and reference audio separated from benchmark claims. |
| Recognition over recall | 4 | Transcript and compact facts remain together. |
| Efficiency | 3 | Primary demo immediately accessible; supporting tools disclosed. |
| Minimalist design | 3 | Clear hierarchy; some tiny labels need refinement. |
| Error recovery | 3 | Retry and readable fallback; audio reports failure. |
| Help/documentation | 3 | Method and evidence linked; real radio transcript absent. |
| Total | 32/40 | Good, with concrete polish work. |

Cognitive-load checklist: 0/8 failures for the principal journey (single story, grouped controls, three format choices, visible context, progressive technical disclosure). This is a reviewer judgement, not user-research evidence.

Persona checks:
- First-time LinkedIn visitor: immediately sees the promise, a playable voice, and the demo entry; does not need to read benchmarks first.
- Gnani evaluator: reaches real saved results and source links through Behind the signal; synthetic corpus and simulation limitations remain explicit.
- Mobile/keyboard visitor: native control works at 320 px; small captions and the decorative click obstruction are the priority fixes.

Recommended actions: `/harden` for the radio hit area and scroll-motion preference; `/optimize` for initial loading; `/typeset` and `/adapt` for captions and narrow navigation; `/polish` for final spacing, word spacing and unused styles. No further preference questions needed: these changes implement the user's approved direction.

## Polish and final verification

Completed: decorative glyph no longer captures clicks; MP3 browser transcode provided; the landing loads eagerly with critical font preloads; mobile supporting text enlarged; heading word spacing and text overflow refined; native range has a 44 px target; reduced-motion preferences apply to programmatic scrolling; skip link focuses main without corrupting the hash route; unused decorative styles removed. Method copy distinguishes actual saved transcript evaluation from a live spoken loop.

Verification on the finished frontend:

- `npm run build:replay`: passed (TypeScript and Vite).
- `npm run test`: 618 tests passed across four suites.
- Playwright Replay: 29 tests passed, including existing Studio, link lab, teach-back, usage, results and 404 flows; all-page screenshots in English, Hindi and Malayalam at 360/768/1280 px; landing layouts at 320/390/768/1280/1920 px; failed-data retry; native keyboard range; reduced motion; skip-link routing; real audio playback and licence; ten-language typography stress inputs and enlarged heading text. The ten-language test is layout-only, not proof of model or parser accuracy.
- Playwright mocked-live: three tests passed for estimated/confirmed TTS, STT cap refusal and usage calibration. No real model requests were made.
- `npm run lint`: exit 0; five pre-existing Fast Refresh export warnings in LiveCall, Instruments and Charts.
- Desktop Lighthouse: performance 100, accessibility 100, best practices 100; CLS approximately 0.00001. Raw report: `results/lighthouse/awaaz-desktop.json`.
- Throttled-mobile Lighthouse: performance 84 while regression tests ran concurrently; an isolated follow-up scored 90. Both runs scored 100 accessibility and best practices, with CLS 0. Raw reports: `results/lighthouse/awaaz-mobile.json` and `awaaz-mobile-isolated.json`. These local lab results vary with load and do not establish field performance; the isolated mobile total blocking time remains about 410 ms.
- Preview screenshots: `docs/screenshots/awaaz-home.png`, `awaaz-story.png`, `awaaz-mobile.png`.
- Changed frontend files pass whitespace checks. The original repository has an unrelated pre-existing trailing blank-line warning in `tinytalk/api.py`.

Remaining limits: physical-phone and screen-reader testing were not available in this session; browser emulation is not physical-device testing. The real-radio reference lacks an exact transcript and is disclosed as supplementary. The current `/try` route is the existing Studio, not a new shared-device calling implementation. Four-attempt visitor workflows and public backend deployment were not added in this landing-focused pass. Public hosting is separate from this local frontend work.
