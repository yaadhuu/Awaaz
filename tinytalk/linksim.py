"""Simulated weak link: packets with sequence number and CRC, bursty seeded loss, resends, airtime."""

import binascii
import random
import struct
from dataclasses import dataclass, field


def make_packet(seq: int, payload: bytes) -> bytes:
    """2-byte sequence number + 2-byte CRC16 of the payload + payload."""
    return struct.pack(">HH", seq, binascii.crc_hqx(payload, 0)) + payload


def parse_packet(packet: bytes) -> tuple[int, bytes] | None:
    """(sequence number, payload), or None if the CRC does not match."""
    seq, crc = struct.unpack(">HH", packet[:4])
    payload = packet[4:]
    return (seq, payload) if binascii.crc_hqx(payload, 0) == crc else None


@dataclass
class LinkResult:
    """What one transfer cost and delivered."""

    delivered: bool  # every packet arrived
    received: list[bytes | None]  # payload per packet in order; None where never delivered
    packets: int
    transmissions: int  # packets sent in total, resends included
    bytes_sent: int  # on the air, headers included
    airtime_s: float
    resends: int = field(default=0)

    @property
    def data(self) -> bytes:
        """All payloads joined (lost packets are skipped)."""
        return b"".join(p for p in self.received if p is not None)


class Link:
    """A link with a rate and an average packet loss, with loss in bursts (Gilbert-Elliott)."""

    def __init__(
        self,
        rate_kbps: float,
        loss_percent: float,
        seed: int,
        mean_burst_packets: float = 3,
        payload_bytes: int = 48,
        header_bytes: int = 4,
        max_resends: int = 3,
    ) -> None:
        if not 0 <= loss_percent < 100:
            raise ValueError("loss_percent must be in [0, 100)")
        self.rate_bps = rate_kbps * 1000
        self.payload_bytes = payload_bytes
        self.header_bytes = header_bytes
        self.max_resends = max_resends
        loss = loss_percent / 100
        self._p_bg = 1 / mean_burst_packets  # chance a burst ends after each packet
        self._p_gb = loss * self._p_bg / (1 - loss)  # chosen so the long-run loss equals `loss`
        self._rng = random.Random(seed)
        self._bad = self._rng.random() < loss  # start in the long-run state mix

    def _lost(self) -> bool:
        """Whether the next packet is lost; the loss state moves one step."""
        lost = self._bad
        draw = self._rng.random()
        self._bad = draw >= self._p_bg if self._bad else draw < self._p_gb
        return lost

    def _chunks(self, payload: bytes) -> list[bytes]:
        n = self.payload_bytes
        return [payload[i : i + n] for i in range(0, len(payload), n)] or [b""]

    def _result(
        self, received: list[bytes | None], tx: int, wire_bytes: int, resends: int
    ) -> LinkResult:
        return LinkResult(
            delivered=all(p is not None for p in received),
            received=received,
            packets=len(received),
            transmissions=tx,
            bytes_sent=wire_bytes,
            airtime_s=wire_bytes * 8 / self.rate_bps,
            resends=resends,
        )

    def send_stream(self, payload: bytes) -> LinkResult:
        """Tier A: send once, no resends. Lost packets come back as None."""
        chunks = self._chunks(payload)
        got = [None if self._lost() else c for c in chunks]
        wire = sum(self.header_bytes + len(c) for c in chunks)
        return self._result(got, len(chunks), wire, 0)

    def send_reliable(self, payload: bytes) -> LinkResult:
        """Tier B and C: resend lost packets, up to max_resends rounds."""
        chunks = self._chunks(payload)
        got: list[bytes | None] = [None] * len(chunks)
        pending = list(range(len(chunks)))
        tx = wire = resends = 0
        for attempt in range(self.max_resends + 1):
            still = []
            for i in pending:
                tx += 1
                wire += self.header_bytes + len(chunks[i])
                resends += attempt > 0
                if self._lost():
                    still.append(i)
                else:
                    parsed = parse_packet(make_packet(i, chunks[i]))
                    assert parsed is not None  # the loss model drops packets, never corrupts them
                    got[i] = parsed[1]
            pending = still
            if not pending:
                break
        return self._result(got, tx, wire, resends)
