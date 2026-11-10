"""Persistent SQLite tracking for call limits across restarts."""

from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

_local_lock = threading.Lock()


class LimitTracker:
    def __init__(self, db_path: str | Path = "cache/limits.sqlite"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with _local_lock, self._get_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS call_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts REAL NOT NULL,
                    date TEXT NOT NULL,
                    ip TEXT NOT NULL,
                    visitor_id TEXT NOT NULL,
                    is_reviewer INTEGER NOT NULL,
                    route TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    units REAL NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_date ON call_logs(date)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ip_ts ON call_logs(ip, ts)")
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_visitor_date ON call_logs(visitor_id, date)"
            )

    def record_call(
        self,
        ip: str,
        visitor_id: str,
        is_reviewer: bool,
        route: str,
        kind: str,
        units: float = 1.0,
    ) -> None:
        now = time.time()
        today = time.strftime("%Y-%m-%d", time.gmtime(now))
        with _local_lock, self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO call_logs (ts, date, ip, visitor_id, is_reviewer, route, kind, units)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (now, today, ip, visitor_id, 1 if is_reviewer else 0, route, kind, units),
            )

    def check_and_record(
        self,
        ip: str,
        visitor_id: str,
        is_reviewer: bool,
        route: str,
        kind: str,
        cfg: dict[str, Any],
        units: float = 1.0,
    ) -> tuple[bool, str]:
        """Check limits before call; if allowed, records call and returns (True, 'ok').
        If disallowed, returns (False, reason).
        """
        now = time.time()
        today = time.strftime("%Y-%m-%d", time.gmtime(now))
        live_cfg = cfg.get("live", {})
        credits_cfg = cfg.get("credits", {})

        per_ip_min = live_cfg.get("per_ip_per_minute", 6)
        visitor_daily_cap = live_cfg.get("per_visitor_daily", 10)
        reviewer_share = live_cfg.get("reviewer_share", 0.3)
        total_daily_cap = live_cfg.get("daily_call_cap", 100)
        overall_call_cap = credits_cfg.get("cap_calls", 1200)

        with _local_lock, self._get_conn() as conn:
            # 1. Check IP rate limit (last 60s)
            c = conn.execute(
                "SELECT COUNT(*) as cnt FROM call_logs WHERE ip = ? AND ts > ?",
                (ip, now - 60.0),
            )
            if c.fetchone()["cnt"] >= per_ip_min:
                return False, "Rate limit exceeded: max calls per minute reached."

            # 2. Check visitor daily cap (unless reviewer)
            if not is_reviewer:
                c = conn.execute(
                    "SELECT COUNT(*) as cnt FROM call_logs WHERE visitor_id = ? AND date = ?",
                    (visitor_id, today),
                )
                if c.fetchone()["cnt"] >= visitor_daily_cap:
                    return False, f"Visitor daily cap of {visitor_daily_cap} reached."

            # 3. Check public daily cap vs reviewer share
            c = conn.execute(
                "SELECT COUNT(*) as cnt, SUM(is_reviewer) as rev_cnt FROM call_logs WHERE date = ?",
                (today,),
            )
            row = c.fetchone()
            today_total = row["cnt"] or 0
            today_reviewers = row["rev_cnt"] or 0
            today_public = today_total - today_reviewers

            if not is_reviewer:
                allowed_public = int(total_daily_cap * (1.0 - reviewer_share))
                if today_public >= allowed_public or today_total >= total_daily_cap:
                    return False, "Public daily call allocation reached."
            else:
                if today_total >= total_daily_cap:
                    return False, "Total daily server call cap reached."

            # 4. Check global call cap
            c = conn.execute("SELECT COUNT(*) as total FROM call_logs")
            if (c.fetchone()["total"] or 0) >= overall_call_cap:
                return False, "Global server lifetime call cap reached."

            # Record call
            conn.execute(
                """
                INSERT INTO call_logs (ts, date, ip, visitor_id, is_reviewer, route, kind, units)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (now, today, ip, visitor_id, 1 if is_reviewer else 0, route, kind, units),
            )

        return True, "ok"

    def get_summary(self) -> dict[str, Any]:
        now = time.time()
        today = time.strftime("%Y-%m-%d", time.gmtime(now))
        with _local_lock, self._get_conn() as conn:
            total_calls = conn.execute("SELECT COUNT(*) as c FROM call_logs").fetchone()["c"] or 0
            today_calls = (
                conn.execute(
                    "SELECT COUNT(*) as c FROM call_logs WHERE date = ?", (today,)
                ).fetchone()["c"]
                or 0
            )
            by_route = {
                r["route"]: r["cnt"]
                for r in conn.execute(
                    "SELECT route, COUNT(*) as cnt FROM call_logs GROUP BY route"
                ).fetchall()
            }
            by_kind = {
                r["kind"]: r["cnt"]
                for r in conn.execute(
                    "SELECT kind, COUNT(*) as cnt FROM call_logs GROUP BY kind"
                ).fetchall()
            }
        return {
            "total_calls": total_calls,
            "today_calls": today_calls,
            "by_route": by_route,
            "by_kind": by_kind,
        }

    def visitor_calls_today(self, visitor_id: str) -> int:
        today = time.strftime("%Y-%m-%d", time.gmtime())
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS cnt FROM call_logs WHERE visitor_id = ? AND date = ?",
                (visitor_id, today),
            ).fetchone()
            return int(row["cnt"])
