"""WCAG contrast check for the web palette (text pairs need 4.5:1, large text and UI parts 3:1)."""

import sys

PAPER, CARD, INK = "#F4ECDB", "#FBF6EA", "#171A2E"
PAIRS = [
    ("ink on paper", INK, PAPER, 4.5),
    ("ink on card", INK, CARD, 4.5),
    ("muted on paper", "#4A4A5C", PAPER, 4.5),
    ("muted on card", "#4A4A5C", CARD, 4.5),
    ("vermilion text on paper", "#B3321F", PAPER, 4.5),
    ("vermilion text on card", "#B3321F", CARD, 4.5),
    ("teal text on paper", "#0F5C5A", PAPER, 4.5),
    ("turmeric-ink text on paper", "#7A4F00", PAPER, 4.5),
    ("paper on ink (buttons)", PAPER, INK, 4.5),
    ("paper on vermilion", "#FFFFFF", "#B3321F", 4.5),
    ("turmeric fill as UI part on paper (adjusted from #C98A12)", "#A06B10", PAPER, 3.0),
    ("teal fill as UI part on paper", "#0F5C5A", PAPER, 3.0),
    ("gold rule on paper (ornament only)", "#B8892B", PAPER, 0.0),
]


def lum(hex_: str) -> float:
    rgb = [int(hex_[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def ratio(a: str, b: str) -> float:
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def main() -> None:
    failed = False
    for name, fg, bg, need in PAIRS:
        r = ratio(fg, bg)
        ok = r >= need
        failed |= not ok
        print(f"{'PASS' if ok else 'FAIL'} {r:5.2f}:1 (need {need}) {name}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
