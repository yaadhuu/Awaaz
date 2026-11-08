.PHONY: check reproduce demo web-check site-data

check:
	uv run ruff check .
	uv run mypy .
	uv run pytest

web-check:
	cd web && npm run build:replay && npm test && npx playwright test

# Refresh the Replay data from results/ and the local cache (no API calls).
site-data:
	uv run python -m scripts.export_site_data

# Rebuilds the curve and plot from the saved results (no credits, no network).
reproduce:
	uv run python -m scripts.run_stage curve

demo:
	@echo "Terminal 1: uv run uvicorn tinytalk.api:app --port 8000"
	@echo "Terminal 2: cd web && npm run dev   (then open http://localhost:5173)"
