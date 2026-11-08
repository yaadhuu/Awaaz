# Stage 0 plan: Foundation

**Goal:** a clean repo where checks, docs and config exist before any feature. No credits are spent.

## Approach

1. Create the `tinytalk/` package with empty modules named in `docs/NORTH_STAR.md`, and keep `tests/` and `web/` as they are.
2. Add `config.yaml` with the skeleton settings: languages, models, paths, credit cap, concurrency, clip length limit, seeds. Values come from `CLAUDE.md` and `docs/BUILD_PLAYBOOK.md`. Anything not given there is left empty (`null`) and listed as an open question. No invented values.
3. Add `tests/test_config.py`: loads `config.yaml` and checks the expected keys exist. This is the only logic in Stage 0.
4. Make `make check` runnable. `make` is not installed on this machine, so install GNU Make with `winget` if it works without admin rights; otherwise run the same three commands and say so.
5. Write `docs/NORTH_STAR.md`. It did not exist. It is a draft built only from `CLAUDE.md` and the playbook, and Yadhu must approve it.
6. Docs already exist from earlier work (DIARY, DECISIONS, EXPERIMENTS, COSTS, VIVA, STORY, `/diary`, `/story`). Update DIARY and DECISIONS.

## Files

`tinytalk/__init__.py` plus empty modules, `config.yaml`, `tests/test_config.py`, `docs/NORTH_STAR.md`, `docs/plans/stage-0.md`, `pyproject.toml` (add `pyyaml`, pytest `pythonpath`), `docs/DIARY.md`, `docs/DECISIONS.md`.

## Risks

- NORTH_STAR is missing, so the module layout is my reading of the playbook. Fix: mark it DRAFT and list it as an open question.
- `make` missing on Windows. Fix: see step 4.
- `package = false` in `pyproject.toml` means `import tinytalk` only works from the repo root. Fix: `pythonpath = ["."]` for pytest. Revisit if packaging is needed.

## Gate check

`make check` (ruff, mypy, pytest) passes on the skeleton; the docs listed above exist; the Stage 0 commit exists.
