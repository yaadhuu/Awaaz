.PHONY: check reproduce demo

check:
	uv run ruff check .
	uv run mypy .
	uv run pytest

reproduce:
	@echo "not built yet"

demo:
	@echo "not built yet"
