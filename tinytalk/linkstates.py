"""Python twin of web/src/lib/linkstates.ts.

L0–L3 link state definitions.  Any change here must be mirrored in
web/src/lib/linkstates.ts and vice versa.

The tier mapping comes from the tier-picker rule in tinytalk/tiers.py.
Demo presets are illustrative; the actual tier is computed at runtime.
We do NOT model or return dBm, RSSI or SNR.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

DeliveryMode = Literal["full_audio", "transcript", "facts_only", "store_and_forward"]
Tier = Literal["A", "B", "C"] | None
LinkStateId = Literal["L0", "L1", "L2", "L3"]

DEMO_NOTE = "demo preset, not a field measurement"


@dataclass(frozen=True)
class LinkState:
    id: LinkStateId
    level: int
    name: str
    delivery_mode: DeliveryMode
    tier: Tier
    subtitle: str
    demo_rate_kbps: float | None   # None = link down
    demo_loss_percent: float | None
    demo_note: str = DEMO_NOTE


LINK_STATES: list[LinkState] = [
    LinkState(
        id="L0", level=0, name="Nominal",
        delivery_mode="full_audio", tier="A",
        subtitle="Audio and captions — full quality",
        demo_rate_kbps=10, demo_loss_percent=0,
    ),
    LinkState(
        id="L1", level=1, name="Degraded",
        delivery_mode="transcript", tier="B",
        subtitle="Key words and text — compressed transcript",
        demo_rate_kbps=5, demo_loss_percent=10,
    ),
    LinkState(
        id="L2", level=2, name="Critical",
        delivery_mode="facts_only", tier="C",
        subtitle="Key facts only — about 7 bytes",
        demo_rate_kbps=2, demo_loss_percent=30,
    ),
    LinkState(
        id="L3", level=3, name="Outage",
        delivery_mode="store_and_forward", tier=None,
        subtitle="Held and retried — no Gnani call",
        demo_rate_kbps=None, demo_loss_percent=None,
    ),
]

LINK_STATE_MAP: dict[str, LinkState] = {s.id: s for s in LINK_STATES}


def get_link_state(id_or_level: str | int) -> LinkState | None:
    if isinstance(id_or_level, int):
        return LINK_STATES[id_or_level] if 0 <= id_or_level < len(LINK_STATES) else None
    return LINK_STATE_MAP.get(id_or_level)

