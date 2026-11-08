"""API in replay mode: no network and no credits."""

from fastapi.testclient import TestClient

from tinytalk.api import app

client = TestClient(app)
TEXT = "Flood warning for Aluva. Water level will reach 5 metres by 6 pm."


def test_health_is_replay_by_default() -> None:
    assert client.get("/api/health").json() == {"ok": True, "live": False}


def test_samples() -> None:
    rows = client.get("/api/samples", params={"lang": "ml"}).json()
    assert len(rows) == 40
    assert {"id", "text", "category", "split"} <= rows[0].keys()


def test_send_returns_three_tiers_and_facts() -> None:
    r = client.post(
        "/api/send", json={"text": TEXT, "lang": "en", "rate_kbps": 5, "loss_percent": 0}
    )
    assert r.status_code == 200
    body = r.json()
    assert [t["tier"] for t in body["tiers"]] == ["A", "B", "C"]
    assert body["facts_sent"]["numbers"] == [{"value": 5, "unit": "metres"}]
    by = {t["tier"]: t for t in body["tiers"]}
    assert by["A"]["estimated"] and not by["A"]["available"]  # no cached audio for typed text
    assert by["C"]["payload_bytes"] < by["B"]["payload_bytes"] < by["A"]["payload_bytes"]
    assert by["C"]["facts_received"] == body["facts_sent"]


def test_auto_tier_switches_with_the_link() -> None:
    def chosen(rate: float, loss: float) -> str:
        r = client.post(
            "/api/send", json={"text": TEXT, "lang": "en", "rate_kbps": rate, "loss_percent": loss}
        )
        return str(r.json()["chosen"])

    assert chosen(10, 0) == "A"
    assert chosen(10, 30) == "B"


def test_send_validates_input() -> None:
    bad = {"text": "", "lang": "en"}
    assert client.post("/api/send", json=bad).status_code == 422
    assert client.post("/api/send", json={"text": "x", "lang": "fr"}).status_code == 422


def test_teachback_catches_a_changed_number() -> None:
    ok = client.post("/api/teachback", json={"sent": TEXT, "readback": TEXT}).json()
    assert ok["match"]
    bad = client.post(
        "/api/teachback", json={"sent": TEXT, "readback": TEXT.replace("5 m", "6 m")}
    ).json()
    assert not bad["match"]
    assert bad["missing"] == [["numbers", [5, "metres"]]]
    assert bad["wrong"] == [["numbers", [6, "metres"]]]


def test_curve_404_until_built_and_picker_grid() -> None:
    assert client.get("/api/curve").status_code in (200, 404)
    grid = client.get("/api/picker", params={"lang": "en", "text": TEXT}).json()
    assert len(grid) == 12
    assert {g["tier"] for g in grid} <= {"A", "B", "C"}
