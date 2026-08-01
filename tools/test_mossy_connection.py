#!/usr/bin/env python3
"""Test Mossy bridge connectivity and full pipeline end-to-end.

Tests (run in order):
  1. HTTP reachability   - can we reach 127.0.0.1:8765 at all?
  2. dialogue_request    - does Mossy return a valid NPC response?
  3. Pipeline simulation - writes bridge_input.json, waits for bridge_output.json
                           (requires Fallout4_AI_Engine.exe to be running)

Usage:
    python tools/test_mossy_connection.py
    python tools/test_mossy_connection.py --npc "Codsworth" --location "Sanctuary Hills"
    python tools/test_mossy_connection.py --skip-pipeline   (skip file-based test)
    python tools/test_mossy_connection.py --endpoint http://127.0.0.1:8765/f4ai/bridge
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("[mossy-test] ERROR: 'requests' library not found.")
    print("[mossy-test] Install with: pip install requests")
    sys.exit(1)

# Windows consoles default to cp1252, which can't encode the arrows/dashes
# used below — force utf-8 with a safe fallback so the test never crashes
# on output instead of reporting the actual result.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


REPO_ROOT = Path(__file__).resolve().parents[1]
# bridge_status.json is written to Data/F4AI/ next to the exe — resolve relative to repo
STATUS_FILE = REPO_ROOT / "src" / "bridge_status.json"

DEFAULT_ENDPOINT = "http://127.0.0.1:8787/v1/chat"
DEFAULT_NPC = "Curie"
DEFAULT_LOCATION = "Diamond City"
DEFAULT_SPEECH = "What do you think about this place?"


def _ok(msg: str) -> None:
    print(f"  [OK]   {msg}")


def _fail(msg: str) -> None:
    print(f"  [FAIL] {msg}")


def _warn(msg: str) -> None:
    print(f"  [WARN] {msg}")


def _info(msg: str) -> None:
    print(f"         {msg}")


# ──────────────────────────────────────────────────────────────────────────────
# Test 1 — HTTP reachability
# ──────────────────────────────────────────────────────────────────────────────

def test_reachability(endpoint: str, timeout: float) -> bool:
    print("\n[1/3] HTTP reachability check")
    host = endpoint.split("/")[2]
    try:
        resp = requests.get(f"http://{host}/", timeout=timeout)
        _ok(f"Host {host} responded  (HTTP {resp.status_code})")
        return True
    except requests.exceptions.ConnectionError:
        _fail(f"Cannot reach {host} — is Mossy running?")
        return False
    except requests.exceptions.Timeout:
        _fail(f"Timed out after {timeout}s")
        return False
    except requests.RequestException as exc:
        _warn(f"Unexpected error: {exc}")
        return True   # host responded, just odd status


# ──────────────────────────────────────────────────────────────────────────────
# Test 2 — dialogue_request
# ──────────────────────────────────────────────────────────────────────────────

def test_dialogue_request(endpoint: str, npc: str, location: str, speech: str, timeout: float) -> bool:
    print(f"\n[2/3] Mossy dialogue_request")
    _info(f"NPC      : {npc}")
    _info(f"Location : {location}")
    _info(f"Player   : {speech}")

    payload = {
        "event": "dialogue_request",
        "payload": {
            "npc_name": npc,
            "location": location,
            "player_speech": speech,
            "history": "",
            "system_prompt": f"You are {npc} in Fallout 4. Respond in character.",
        },
    }

    t0 = time.perf_counter()
    try:
        resp = requests.post(endpoint, json=payload, timeout=timeout)
        elapsed = time.perf_counter() - t0
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        _fail("Connection refused — Mossy endpoint not reachable")
        return False
    except requests.exceptions.Timeout:
        _fail(f"Request timed out after {timeout}s")
        return False
    except requests.HTTPError as exc:
        _fail(f"HTTP {exc.response.status_code}: {exc}")
        return False

    try:
        data = resp.json()
    except ValueError:
        _fail(f"Response was not valid JSON: {resp.text[:200]}")
        return False

    response_text = data.get("npc_response") or data.get("text") or ""
    if not response_text.strip():
        _warn("Mossy responded but returned empty text")
        _info(f"Full response: {data}")
        return False

    _ok(f"Response received in {elapsed:.2f}s")
    print(f"\n  [{npc}]: {response_text.strip()}\n")

    if elapsed > 3.0:
        _warn(f"Response took {elapsed:.2f}s — consider raising mossy_timeout in config.json")

    return True


# ──────────────────────────────────────────────────────────────────────────────
# Test 3 — full pipeline simulation (bridge_input → bridge_output)
# ──────────────────────────────────────────────────────────────────────────────

def find_data_f4ai_dir() -> Path | None:
    """Locate Data/F4AI in release_staging or MO2 mods if present."""
    candidates = [
        REPO_ROOT / "release_staging" / "core" / "Data" / "F4AI",
        REPO_ROOT / "build_output",
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def test_pipeline(npc: str, location: str, speech: str, timeout: float) -> bool:
    print(f"\n[3/3] Full pipeline simulation (bridge_input → bridge_output)")

    data_dir = find_data_f4ai_dir()
    if data_dir is None:
        _warn("Data/F4AI directory not found — skipping pipeline test")
        _info("Run this test after building the exe and staging files.")
        return True   # not a failure, just not applicable

    input_file = data_dir / "bridge_input.json"
    output_file = data_dir / "bridge_output.json"

    # Clean any stale output
    if output_file.exists():
        output_file.unlink()

    # Write test input
    packet = {"npc_name": npc, "location": location, "player_speech": speech}
    input_file.write_text(json.dumps(packet), encoding="utf-8")
    _info(f"Wrote {input_file}")

    # Poll for output (engine must be running)
    _info("Waiting for Fallout4_AI_Engine.exe to process...")
    deadline = time.perf_counter() + timeout
    found = False
    while time.perf_counter() < deadline:
        if output_file.exists():
            found = True
            break
        time.sleep(0.2)

    if not found:
        _warn(
            "bridge_output.json did not appear within "
            f"{timeout:.0f}s — is Fallout4_AI_Engine.exe running?"
        )
        if input_file.exists():
            input_file.unlink()
        return False

    elapsed = time.perf_counter() - (deadline - timeout)
    try:
        result = json.loads(output_file.read_text(encoding="utf-8"))
        output_file.unlink()
    except (OSError, ValueError) as exc:
        _fail(f"Could not read bridge_output.json: {exc}")
        return False

    _ok(f"Pipeline round-trip completed in {elapsed:.2f}s")
    subtitle = result.get("subtitle_text", "")
    emotion = result.get("emotion_id", 0)
    duration = result.get("display_duration", 0)
    _info(f"Subtitle  : {subtitle}")
    _info(f"Emotion ID: {emotion}")
    _info(f"Duration  : {duration}s")
    return True


# ──────────────────────────────────────────────────────────────────────────────
# Status file
# ──────────────────────────────────────────────────────────────────────────────

def write_status(results: dict) -> None:
    try:
        STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
        STATUS_FILE.write_text(json.dumps(results, indent=2), encoding="utf-8")
        print(f"\n  Status written to {STATUS_FILE}")
    except OSError:
        pass


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Test Mossy bridge connectivity.")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT)
    parser.add_argument("--npc", default=DEFAULT_NPC)
    parser.add_argument("--location", default=DEFAULT_LOCATION)
    parser.add_argument("--speech", default=DEFAULT_SPEECH)
    parser.add_argument("--timeout", type=float, default=8.0)
    parser.add_argument("--skip-pipeline", action="store_true",
                        help="Skip the bridge_input/output file-based pipeline test")
    args = parser.parse_args()

    print("=" * 56)
    print("  F4AI Mossy Bridge Connection Test")
    print(f"  Endpoint : {args.endpoint}")
    print(f"  Timeout  : {args.timeout}s per test")
    print("=" * 56)

    reach = test_reachability(args.endpoint, args.timeout)
    dialogue_ok = False
    pipeline_ok = None

    if reach:
        dialogue_ok = test_dialogue_request(
            args.endpoint, args.npc, args.location, args.speech, args.timeout
        )

    if not args.skip_pipeline:
        pipeline_ok = test_pipeline(args.npc, args.location, args.speech, args.timeout)

    # Summary
    print("\n" + "=" * 56)
    print("  RESULTS")
    print("=" * 56)
    print(f"  Reachability    : {'PASS' if reach else 'FAIL'}")
    print(f"  Dialogue test   : {'PASS' if dialogue_ok else ('FAIL' if reach else 'SKIPPED')}")
    if pipeline_ok is not None:
        print(f"  Pipeline test   : {'PASS' if pipeline_ok else 'FAIL'}")
    print()

    overall_ok = reach and dialogue_ok
    if overall_ok:
        print("  Mossy is ONLINE and responding correctly.")
    else:
        print("  Mossy is OFFLINE or not responding.")
        print()
        print("  Checklist:")
        if not reach:
            print("    - Make sure Mossy server is running")
            print("    - Verify endpoint: " + args.endpoint)
        elif not dialogue_ok:
            print("    - Mossy is reachable but not returning NPC text")
            print("    - Check Mossy server logs for errors")

    write_status({
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "endpoint": args.endpoint,
        "reachability": reach,
        "dialogue_ok": dialogue_ok,
        "pipeline_ok": pipeline_ok,
        "overall": overall_ok,
    })

    return 0 if overall_ok else 1


if __name__ == "__main__":
    sys.exit(main())
