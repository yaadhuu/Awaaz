"""Explicit live smoke test: at most two public-sample transcription requests.

Run only when live-model verification is authorised. No visitor recording is used.
"""

import json
from pathlib import Path

import httpx


def main() -> None:
    results = []
    with httpx.Client(base_url="http://127.0.0.1:8000", timeout=100) as client:
        status = client.get("/api/audio/status").json()
        if not status.get("live"):
            raise RuntimeError("Live speech is disabled; no call was made.")
        for options in [
            {"codec_name": "pcm", "loss_percent": 0},
            {"codec_name": "codec2", "loss_percent": 40},
        ]:
            response = client.post(
                "/api/audio/process", data={"sample_id": "workspace-dispatch-en", **options}
            )
            response.raise_for_status()
            preview = response.json()
            response = client.post(
                "/api/audio/transcribe", json={"clip_id": preview["clip_id"], "language": "en-IN"}
            )
            record = {
                "settings": options,
                "meta": preview["meta"],
                "http_status": response.status_code,
                "output": response.json(),
            }
            results.append(record)
            Path("results/workspace-live-smoke.json").write_text(
                json.dumps(
                    {
                        "input": "Public synthetic 22.5-second composite drill; not a visitor recording",
                        "results": results,
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                "utf-8",
            )
            print(
                f"{options['codec_name']}/{options['loss_percent']}%: HTTP {response.status_code}; {preview['meta']['encoded_bytes']} encoded bytes",
                flush=True,
            )
            if response.status_code != 200:
                break


if __name__ == "__main__":
    main()
