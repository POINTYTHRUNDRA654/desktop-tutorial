"""
AI Helper — peer service for the Vault-Tec Creative Director Network
Port 8766 (WebSocket + REST on same port via FastAPI)

Creative Director connects to ws://localhost:8766 and sends a peer_hello.
AI Helper stores research findings and forwards them to CD via WebSocket.
REST endpoints let the Vault-Tec UI submit research tasks.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import argparse
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
    API_OK = True
except ImportError:
    API_OK = False
    print("ERROR: fastapi/uvicorn not installed.  Run: pip install fastapi 'uvicorn[standard]' pydantic")
    raise SystemExit(1)

# ─── Config ──────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("ai_helper")

PORT = int(os.environ.get("AI_HELPER_PORT", 8766))
DB_PATH = Path(__file__).parent / "ai_helper.db"

# ─── State ───────────────────────────────────────────────────────────────────

_cd_ws: Optional[WebSocket] = None          # active Creative Director connection
_pending: list[dict] = []                   # findings queued before CD connects

# ─── Database ────────────────────────────────────────────────────────────────

def _db() -> sqlite3.Connection:
    con = sqlite3.connect(str(DB_PATH))
    con.row_factory = sqlite3.Row
    con.execute("""
        CREATE TABLE IF NOT EXISTS findings (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            topic    TEXT,
            content  TEXT,
            sent     INTEGER DEFAULT 0,
            created  TEXT DEFAULT (datetime('now'))
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS lore_responses (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            query    TEXT,
            results  TEXT,
            created  TEXT DEFAULT (datetime('now'))
        )
    """)
    con.commit()
    return con

def _save_finding(topic: str, content: str, sent: bool = False):
    with _db() as con:
        con.execute(
            "INSERT INTO findings (topic, content, sent) VALUES (?,?,?)",
            (topic, content, 1 if sent else 0),
        )

def _mark_sent(topic: str):
    with _db() as con:
        con.execute("UPDATE findings SET sent=1 WHERE topic=? AND sent=0", (topic,))

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
            _mark_sent(item.get("topic", ""))
        else:
            break

async def _send_finding(topic: str, content: str):
    payload = {
        "type":    "finding",
        "topic":   topic,
        "content": content,
        "agent":   "ai_helper",
        "ts":      datetime.now().isoformat(),
    }
    sent = await _send(payload)
    _save_finding(topic, content, sent=sent)
    if not sent:
        _pending.append(payload)
        log.info(f"[QUEUE] Finding queued (CD not connected): {topic[:60]}")

# ─── Message handler ──────────────────────────────────────────────────────────

async def _handle(ws: WebSocket, msg: dict):
    t = msg.get("type", "")

    if t == "peer_hello":
        agent = msg.get("agent", "unknown")
        caps  = msg.get("capabilities", [])
        log.info(f"[CD] Hello from '{agent}' | capabilities: {', '.join(caps[:4])}")
        await _drain_pending()

    elif t == "lore_response":
        query   = msg.get("query", "")
        results = msg.get("semantic_results", []) + msg.get("keyword_results", [])
        log.info(f"[CD] Lore response for '{query[:50]}' — {len(results)} results")
        with _db() as con:
            con.execute(
                "INSERT INTO lore_responses (query, results) VALUES (?,?)",
                (query, json.dumps(results)),
            )

    elif t == "consistency_result":
        result = msg.get("result", {})
        ok     = result.get("consistent", "?")
        warns  = result.get("warnings", [])
        log.info(f"[CD] Consistency check → consistent={ok}, warnings={len(warns)}")

    elif t == "ping":
        await ws.send_text(json.dumps({"type": "pong", "agent": "ai_helper"}))

    else:
        log.debug(f"[CD] Unhandled msg type: {t!r}")

# ─── FastAPI app ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def _lifespan(app: FastAPI):
    log.info(f"[AI Helper] WebSocket ready at ws://localhost:{PORT}")
    log.info(f"[AI Helper] REST API ready at http://localhost:{PORT}")
    log.info(f"[AI Helper] Waiting for Creative Director to connect...")
    intro = (
        "AI Helper is online and connected to the Creative Director network. "
        "Submit research findings via POST /finding or lore queries via POST /lore-query."
    )
    _pending.append({
        "type":    "finding",
        "topic":   "AI Helper Online",
        "content": intro,
        "agent":   "ai_helper",
        "ts":      datetime.now().isoformat(),
    })
    _save_finding("AI Helper Online", intro, sent=False)
    yield

app = FastAPI(
    title       = "AI Helper",
    description = "Research peer service for Vault-Tec Creative Director (port 8766)",
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

    # Drain any findings that were queued while CD was offline
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
    pending = len(_pending)
    with _db() as con:
        total   = con.execute("SELECT COUNT(*) FROM findings").fetchone()[0]
        unsent  = con.execute("SELECT COUNT(*) FROM findings WHERE sent=0").fetchone()[0]
    return {
        "service":      "ai_helper",
        "port":         PORT,
        "cd_connected": _cd_ws is not None,
        "queue":        pending,
        "findings_total":  total,
        "findings_unsent": unsent,
        "ts": datetime.now().isoformat(),
    }

class FindingReq(BaseModel):
    topic:   str
    content: str

@app.post("/finding")
async def add_finding(req: FindingReq):
    """Submit a research finding to be forwarded to Creative Director."""
    await _send_finding(req.topic, req.content)
    return {"ok": True, "queued": _cd_ws is None}

class LoreQueryReq(BaseModel):
    query: str

@app.post("/lore-query")
async def lore_query(req: LoreQueryReq):
    """Ask Creative Director to look up lore and cache the response."""
    payload = {
        "type":  "lore_query",
        "query": req.query,
        "agent": "ai_helper",
    }
    sent = await _send(payload)
    return {"ok": sent, "query": req.query, "note": "Response will be stored in ai_helper.db"}

class ConsistencyReq(BaseModel):
    content: str

@app.post("/consistency-check")
async def consistency_check(req: ConsistencyReq):
    """Ask Creative Director to run a lore consistency check on content."""
    payload = {
        "type":    "consistency_check",
        "content": req.content,
        "agent":   "ai_helper",
    }
    sent = await _send(payload)
    return {"ok": sent, "note": "Result will be logged when Creative Director responds"}

@app.get("/findings")
async def get_findings(limit: int = 20, unsent_only: bool = False):
    """Browse stored research findings."""
    with _db() as con:
        if unsent_only:
            rows = con.execute(
                "SELECT * FROM findings WHERE sent=0 ORDER BY created DESC LIMIT ?", (limit,)
            ).fetchall()
        else:
            rows = con.execute(
                "SELECT * FROM findings ORDER BY created DESC LIMIT ?", (limit,)
            ).fetchall()
    return {"findings": [dict(r) for r in rows]}

@app.get("/lore-cache")
async def get_lore_cache(limit: int = 10):
    """Browse cached lore query responses."""
    with _db() as con:
        rows = con.execute(
            "SELECT * FROM lore_responses ORDER BY created DESC LIMIT ?", (limit,)
        ).fetchall()
    return {"responses": [dict(r) for r in rows]}

# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    p = argparse.ArgumentParser(description="AI Helper — research peer for Creative Director")
    p.add_argument("--port", type=int, default=8766, help="Port for WebSocket + REST (default 8766)")
    args = p.parse_args()
    PORT = args.port
    uvicorn.run("ai_helper:app", host="127.0.0.1", port=PORT, log_level="info", reload=False)
