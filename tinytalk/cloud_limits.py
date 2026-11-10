"""Shared quota counters and model mutex for Vercel. Never stores visitor speech."""

import contextlib
import os
import secrets
import time
from collections.abc import Iterator
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException


def configured() -> bool:
    return bool((os.getenv("KV_REST_API_URL") or os.getenv("UPSTASH_REDIS_REST_URL"))
                and (os.getenv("KV_REST_API_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")))


def command(*args: Any) -> Any:
    url = os.getenv("KV_REST_API_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
    token = os.getenv("KV_REST_API_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        raise HTTPException(503, "Live speech requires the shared quota store on this deployment.")
    try:
        response = httpx.post(url, headers={"Authorization": f"Bearer {token}"}, json=list(args), timeout=8)
        response.raise_for_status()
        result = response.json()
        if "error" in result:
            raise ValueError("quota command rejected")
        return result.get("result")
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(503, "The shared usage counter is unavailable. No model request was made.") from exc


def _day() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def used(owner: str) -> int:
    return int(command("GET", f"awaaz:v1:visitor:{_day()}:{owner}") or 0)


def reserve(owner: str, ip_hash: str, config: dict[str, Any], remaining_attempts: int) -> int:
    c = config["live"]
    visitor_cap = int(c.get("per_visitor_daily", 4))
    daily_cap = int(c.get("daily_call_cap", 100) * (1 - c.get("reviewer_share", .3)))
    keys = [f"awaaz:v1:visitor:{_day()}:{owner}", f"awaaz:v1:ip:{int(time.time()) // 60}:{ip_hash}",
            f"awaaz:v1:daily:{_day()}", "awaaz:v1:reserved-attempts"]
    script = """
    local v=tonumber(redis.call('GET',KEYS[1]) or '0')
    local ip=tonumber(redis.call('GET',KEYS[2]) or '0')
    local d=tonumber(redis.call('GET',KEYS[3]) or '0')
    local total=tonumber(redis.call('GET',KEYS[4]) or '0')
    if v>=tonumber(ARGV[1]) then return -1 end
    if ip>=tonumber(ARGV[2]) then return -2 end
    if d>=tonumber(ARGV[3]) then return -3 end
    if total+3>tonumber(ARGV[4]) then return -4 end
    redis.call('INCR',KEYS[1]);redis.call('EXPIRE',KEYS[1],172800)
    redis.call('INCR',KEYS[2]);redis.call('EXPIRE',KEYS[2],120)
    redis.call('INCR',KEYS[3]);redis.call('EXPIRE',KEYS[3],172800)
    redis.call('INCRBY',KEYS[4],3)
    return tonumber(ARGV[1])-v-1
    """
    result = int(command("EVAL", script, 4, *keys, visitor_cap,
                         int(c.get("per_ip_per_minute", 6)), daily_cap, remaining_attempts))
    if result < 0:
        messages = {-1: "Your four live tries for today are used up.",
                    -2: "Too many requests from this connection. Try again in a minute.",
                    -3: "Today's public model allocation has been used up.",
                    -4: "The server's protected model budget is used up."}
        raise HTTPException(429, messages[result])
    return result


@contextlib.contextmanager
def model_lock() -> Iterator[None]:
    if not os.getenv("VERCEL"):
        yield
        return
    token = secrets.token_hex(16)
    if command("SET", "awaaz:v1:model-lock", token, "NX", "EX", 240) != "OK":
        raise HTTPException(429, "Another voice request is running. Try again shortly; no try was consumed.")
    try:
        yield
    finally:
        try:
            command("EVAL", "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", 1, "awaaz:v1:model-lock", token)
        except HTTPException:
            pass  # The bounded lock expires even when Redis is briefly unreachable.
