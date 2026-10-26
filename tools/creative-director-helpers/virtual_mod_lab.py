"""
VirtualModLab — peer service for the Vault-Tec Creative Director Network
Port 8768 (WebSocket + REST on same port via FastAPI)

Creative Director connects to ws://localhost:8768.
VirtualModLab accepts mod experiment submissions, runs simulations/checks,
and reports vml_experiment_result messages back to Creative Director.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import sqlite3
import argparse
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
    API_OK = True
except ImportError:
    print("ERROR: fastapi/uvicorn not installed.  Run: pip install fastapi 'uvicorn[standard]' pydantic")
    raise SystemExit(1)

# ─── Config ──────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("virtual_mod_lab")

PORT    = int(os.environ.get("VML_PORT", 8768))
DB_PATH = Path(__file__).parent / "virtual_mod_lab.db"

# ─── State ───────────────────────────────────────────────────────────────────

_cd_ws: Optional[WebSocket] = None
_pending: list[dict] = []

# ─── Database ────────────────────────────────────────────────────────────────

def _db() -> sqlite3.Connection:
    con = sqlite3.connect(str(DB_PATH))
    con.row_factory = sqlite3.Row
    con.executescript("""
        CREATE TABLE IF NOT EXISTS experiments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT,
            mod_list    TEXT,
            hypothesis  TEXT,
            status      TEXT DEFAULT 'pending',
            result      TEXT,
            summary     TEXT,
            sent        INTEGER DEFAULT 0,
            created     TEXT DEFAULT (datetime('now')),
            finished    TEXT
        );
        CREATE TABLE IF NOT EXISTS lore_snapshots (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            query   TEXT,
            data    TEXT,
            created TEXT DEFAULT (datetime('now'))
        );
    """)
    con.commit()
    return con

# ─── WebSocket helpers ────────────────────────────────────────────────────────

async def _send(payload: dict) -> bool:
    global _cd_ws
    if _cd_ws is None:
        return False
    try:
        await _cd_ws.send_text(json.dumps(payload))
        return True
    except Exception as exc:
        log.warning(f"[WS] Send failed: {exc}")
        _cd_ws = None
        return False

async def _drain_pending():
    while _pending:
        item = _pending[0]
        if await _send(item):
            _pending.pop(0)
        else:
            break

async def _send_result(experiment: str, summary: str, details: dict):
    payload = {
        "type":       "vml_experiment_result",
        "experiment": experiment,
        "summary":    summary,
        "details":    details,
        "agent":      "virtual_mod_lab",
        "ts":         datetime.now().isoformat(),
    }
    sent = await _send(payload)
    if not sent:
        _pending.append(payload)
        log.info(f"[QUEUE] Experiment result queued (CD offline): {experiment[:60]}")
    else:
        log.info(f"[SEND] Experiment result sent: {experiment[:60]}")
    return sent

# ─── Experiment runner ────────────────────────────────────────────────────────

# Known conflict patterns for common mods
_CONFLICT_PATTERNS: list[tuple[str, str, str]] = [
    ("sim_settlements_2", "sim_settlements_",  "SS2 replaces the base SS — load SS2 after or remove SS1"),
    ("true_storms",       "vivid_weathers",    "True Storms + Vivid Weathers conflict in weather records"),
    ("unofficial_patch",  "ufo4p",             "Duplicate Unofficial Patch detected — keep only one"),
    ("armorkeywords",     "armorsmith",        "AKF conflicts with Armorsmith Extended keyword records"),
]

def _normalise(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "_", name.lower())

def _check_conflicts(mods: list[str]) -> list[str]:
    normed = [_normalise(m) for m in mods]
    issues = []
    for a, b, msg in _CONFLICT_PATTERNS:
        has_a = any(a in n for n in normed)
        has_b = any(b in n for n in normed)
        if has_a and has_b:
            issues.append(msg)
    return issues

def _check_master_order(mods: list[str]) -> list[str]:
    """Flag obvious master-file ordering issues."""
    required_first = ["fallout4.esm", "dlcrobot.esm", "dlcworkshop01.esm",
                      "dlccoast.esm", "dlcworkshop02.esm", "dlcworkshop03.esm",
                      "dlcnukaworld.esm"]
    issues = []
    normed = [_normalise(m) for m in mods]
    for i, name in enumerate(normed):
        for master in required_first:
            if master in name and i > 6:
                issues.append(f"'{mods[i]}' should be near the top of the load order")
    return issues

def _classify_plugins(mods: list[str]) -> dict:
    esp = [m for m in mods if m.lower().endswith(".esp")]
    esm = [m for m in mods if m.lower().endswith(".esm")]
    esl = [m for m in mods if m.lower().endswith(".esl")]
    eslified = [m for m in esp if "[esl]" in m.lower() or "(esl)" in m.lower()]
    can_esl  = [m for m in esp if m not in eslified]
    return {
        "total": len(mods),
        "esm": len(esm),
        "esp": len(esp),
        "esl": len(esl),
        "eslified": len(eslified),
        "esp_slots_used": len(esp) - len(eslified),
        "esp_budget_remaining": 254 - (len(esp) - len(eslified)),
        "esl_candidates": can_esl[:10],
    }

def _run_experiment(name: str, mod_list: list[str], hypothesis: str) -> dict:
    """Synchronous experiment logic — runs in a thread pool executor."""
    conflicts    = _check_conflicts(mod_list)
    order_issues = _check_master_order(mod_list)
    plugin_info  = _classify_plugins(mod_list)

    all_issues = conflicts + order_issues
    passed = len(all_issues) == 0

    if passed:
        verdict = "PASS — no conflicts detected in the tested mod list"
    else:
        verdict = f"ISSUES FOUND — {len(all_issues)} problem(s) detected"

    summary_lines = [f"Experiment: {name}", f"Mods tested: {len(mod_list)}", f"Result: {verdict}"]
    if all_issues:
        summary_lines.append("Issues:")
        for issue in all_issues:
            summary_lines.append(f"  • {issue}")
    if plugin_info["esp_slots_used"] > 200:
        summary_lines.append(
            f"  ⚠ {plugin_info['esp_slots_used']}/254 ESP slots used — "
            f"only {plugin_info['esp_budget_remaining']} slots remain"
        )
    if plugin_info["esl_candidates"]:
        summary_lines.append(
            f"  ℹ {len(plugin_info['esl_candidates'])} ESP(s) may be ESL-flaggable to free slots"
        )

    return {
        "passed":      passed,
        "verdict":     verdict,
        "conflicts":   conflicts,
        "order_issues": order_issues,
        "plugin_info": plugin_info,
        "hypothesis":  hypothesis,
        "summary":     "\n".join(summary_lines),
    }

async def _process_experiment(exp_id: int, name: str, mods: list[str], hypothesis: str):
    log.info(f"[LAB] Running experiment #{exp_id}: {name}")
    result = await asyncio.get_running_loop().run_in_executor(None, _run_experiment, name, mods, hypothesis)

    finished = datetime.now().isoformat()
    status   = "pass" if result["passed"] else "issues"

    with _db() as con:
        con.execute(
            "UPDATE experiments SET status=?, result=?, summary=?, finished=? WHERE id=?",
            (status, json.dumps(result), result["summary"], finished, exp_id),
        )

    sent = await _send_result(name, result["summary"], result)
    with _db() as con:
        con.execute("UPDATE experiments SET sent=? WHERE id=?", (1 if sent else 0, exp_id))

    log.info(f"[LAB] Experiment #{exp_id} complete → {status.upper()}")

# ─── Message handler ──────────────────────────────────────────────────────────

async def _handle(ws: WebSocket, msg: dict):
    t = msg.get("type", "")

    if t == "peer_hello":
        agent = msg.get("agent", "unknown")
        caps  = msg.get("capabilities", [])
        log.info(f"[CD] Hello from '{agent}' | capabilities: {', '.join(caps[:4])}")
        await _drain_pending()

    elif t == "lore_response":
        query = msg.get("query", "")
        data  = json.dumps({
            "semantic": msg.get("semantic_results", []),
            "keyword":  msg.get("keyword_results", []),
        })
        log.info(f"[CD] Lore snapshot received for '{query[:50]}'")
        with _db() as con:
            con.execute(
                "INSERT INTO lore_snapshots (query, data) VALUES (?,?)", (query, data)
            )

    elif t == "ping":
        await ws.send_text(json.dumps({"type": "pong", "agent": "virtual_mod_lab"}))

    else:
        log.debug(f"[CD] Unhandled msg type: {t!r}")

# ─── FastAPI app ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def _lifespan(app: FastAPI):
    log.info(f"[VirtualModLab] WebSocket ready at ws://localhost:{PORT}")
    log.info(f"[VirtualModLab] REST API ready at http://localhost:{PORT}")
    log.info(f"[VirtualModLab] Waiting for Creative Director to connect...")
    _pending.append({
        "type":       "vml_experiment_result",
        "experiment": "VirtualModLab Online",
        "summary":    (
            "VirtualModLab is online. Submit mod experiments via POST /experiment "
            "or run a quick conflict check via POST /quick-check."
        ),
        "details":    {"status": "online"},
        "agent":      "virtual_mod_lab",
        "ts":         datetime.now().isoformat(),
    })
    yield

app = FastAPI(
    title       = "VirtualModLab",
    description = "Mod experiment peer service for Vault-Tec Creative Director (port 8768)",
    version     = "1.0.0",
    lifespan    = _lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── WebSocket endpoint (Creative Director connects here) ────────────────────

@app.websocket("/")
async def ws_root(ws: WebSocket):
    global _cd_ws
    await ws.accept()
    _cd_ws = ws
    peer = ws.client
    log.info(f"[WS] Creative Director connected from {peer}")

    await _drain_pending()

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
                await _handle(ws, msg)
            except json.JSONDecodeError:
                log.warning("[WS] Non-JSON message received")
    except WebSocketDisconnect:
        log.info("[WS] Creative Director disconnected")
    except Exception as exc:
        log.warning(f"[WS] Connection error: {exc}")
    finally:
        _cd_ws = None

# ── REST endpoints ───────────────────────────────────────────────────────────

@app.get("/status")
async def status():
    with _db() as con:
        total   = con.execute("SELECT COUNT(*) FROM experiments").fetchone()[0]
        pending = con.execute("SELECT COUNT(*) FROM experiments WHERE status='pending'").fetchone()[0]
        passed  = con.execute("SELECT COUNT(*) FROM experiments WHERE status='pass'").fetchone()[0]
        issues  = con.execute("SELECT COUNT(*) FROM experiments WHERE status='issues'").fetchone()[0]
    return {
        "service":      "virtual_mod_lab",
        "port":         PORT,
        "cd_connected": _cd_ws is not None,
        "queue":        len(_pending),
        "experiments": {
            "total": total, "pending": pending, "passed": passed, "issues": issues,
        },
        "ts": datetime.now().isoformat(),
    }

class ExperimentReq(BaseModel):
    name:       str
    mod_list:   list[str]
    hypothesis: str = "Check for conflicts and load order issues"

@app.post("/experiment")
async def run_experiment(req: ExperimentReq, background_tasks: BackgroundTasks):
    """Submit a mod list experiment. Results are sent to Creative Director when ready."""
    with _db() as con:
        cur = con.execute(
            "INSERT INTO experiments (name, mod_list, hypothesis, status) VALUES (?,?,?,?)",
            (req.name, json.dumps(req.mod_list), req.hypothesis, "running"),
        )
        exp_id = cur.lastrowid

    background_tasks.add_task(_process_experiment, exp_id, req.name, req.mod_list, req.hypothesis)
    return {"ok": True, "experiment_id": exp_id, "name": req.name, "mods": len(req.mod_list)}

@app.get("/experiments")
async def list_experiments(limit: int = 20, status: Optional[str] = None):
    """List all experiments and their results."""
    with _db() as con:
        if status:
            rows = con.execute(
                "SELECT * FROM experiments WHERE status=? ORDER BY created DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = con.execute(
                "SELECT * FROM experiments ORDER BY created DESC LIMIT ?", (limit,)
            ).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        if d.get("result"):
            d["result"] = json.loads(d["result"])
        if d.get("mod_list"):
            d["mod_list"] = json.loads(d["mod_list"])
        results.append(d)
    return {"experiments": results}

@app.get("/experiments/{exp_id}")
async def get_experiment(exp_id: int):
    with _db() as con:
        row = con.execute("SELECT * FROM experiments WHERE id=?", (exp_id,)).fetchone()
    if not row:
        return {"error": "not found"}, 404
    d = dict(row)
    if d.get("result"):   d["result"]   = json.loads(d["result"])
    if d.get("mod_list"): d["mod_list"] = json.loads(d["mod_list"])
    return d

class QuickCheckReq(BaseModel):
    mod_list: list[str]

@app.post("/quick-check")
async def quick_check(req: QuickCheckReq):
    """Synchronously check a mod list and return results immediately (no CD broadcast)."""
    result = _run_experiment("quick-check", req.mod_list, "Ad-hoc compatibility check")
    return result

# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    p = argparse.ArgumentParser(description="VirtualModLab — experiment peer for Creative Director")
    p.add_argument("--port", type=int, default=8768, help="Port for WebSocket + REST (default 8768)")
    args = p.parse_args()
    PORT = args.port
    uvicorn.run("virtual_mod_lab:app", host="127.0.0.1", port=PORT, log_level="info", reload=False)
