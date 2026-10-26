"""
Creative Director  v2.1  —  Mossy Vault-Tec Modding Suite
==========================================================
Fills the creative-content gap in the 3-AI network.
AI Helper + VirtualModLab handle research / testing.
This agent handles: quest writing, dialogue trees, NPC personalities,
worldspace design, lore memory, narrative debugging.

Stack
-----
FastAPI + Uvicorn          async REST API  (port 8767)
ChromaDB                   semantic vector search for lore
Ollama embeddings          local embeddings (nomic-embed-text; no cloud, no PyTorch)
Ollama                     optional local LLM generation
websockets                 async peer links to AI Helper + VML
SQLite                     structured records (NPCs, quests, factions …)
Rich                       pretty terminal output

Config  :  creative_director_config.json  (next to this file)
Docs    :  http://localhost:8767/docs  (when running)
"""

# ---------------------------------------------------------------------------
# stdlib
# ---------------------------------------------------------------------------
import asyncio
import json
import re
import shutil
import sqlite3
import sys
import threading
import time
import uuid
import zipfile
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape

# ---------------------------------------------------------------------------
# Required third-party  (exit with a helpful message if missing)
# ---------------------------------------------------------------------------
def _need(pkg: str, pip_hint: str = None):
    try:
        return __import__(pkg)
    except ImportError:
        print(f"[!] Missing package: {pip_hint or pkg}")
        print(f"    Fix: run  install_creative_director.bat")
        sys.exit(1)

_need("fastapi",  "fastapi")
_need("uvicorn",  "uvicorn[standard]")
_need("pydantic", "pydantic")

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Optional third-party  (degrade gracefully)
# ---------------------------------------------------------------------------
try:
    import chromadb
    from chromadb.utils import embedding_functions as _chroma_ef
    CHROMA_OK = True
except ImportError:
    CHROMA_OK = False

try:
    import ollama as _ollama_sdk
    OLLAMA_OK = True
except ImportError:
    OLLAMA_OK = False

try:
    import websockets as _ws_lib
    WS_OK = True
except ImportError:
    WS_OK = False

try:
    from rich.console import Console
    from rich.panel import Panel
    _console = Console()
    RICH_OK = True
    def log(msg: str): _console.print(msg)
except ImportError:
    RICH_OK = False
    Panel = None
    def log(msg: str): print(msg)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE     = Path(__file__).parent
CFG_FILE = BASE / "creative_director_config.json"

MOD_OUTPUT_DIR = BASE / "generated_mods"
MOD_OUTPUT_DIR.mkdir(exist_ok=True)

DEFAULTS: dict = {
    "port":          8767,
    "ai_helper_ws":  "ws://localhost:8769",   # 8766 is Brain B's port
    "vml_ws":        "ws://localhost:8768",
    "db_path":       str(BASE / "creative_director_lore.db"),
    "chroma_path":   str(BASE / "creative_director_chroma"),
    "ollama_model":  "mistral",
    "ollama_host":   "http://localhost:11434",
    "embed_model":   "nomic-embed-text",   # pulled through Ollama (ollama pull nomic-embed-text)
    "koboldcpp_host": "http://localhost:5001",
    "hub_host": "",   # optional shared lesson hub URL; empty = off
    "llm_engine":    "auto",                     # auto = Ollama first, then KoboldCpp; or "ollama" / "koboldcpp"
}

def _load_cfg() -> dict:
    cfg = dict(DEFAULTS)
    if CFG_FILE.exists():
        try:
            cfg.update(json.loads(CFG_FILE.read_text(encoding="utf-8")))
        except Exception as e:
            log(f"[WRN] Config error: {e}")
    return cfg

CFG = _load_cfg()

# ---------------------------------------------------------------------------
# SQLite  —  structured records
# ---------------------------------------------------------------------------
_SQL_SCHEMA = """
CREATE TABLE IF NOT EXISTS factions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT UNIQUE NOT NULL,
    summary   TEXT DEFAULT '', alignment TEXT DEFAULT '', notes TEXT DEFAULT '',
    created   TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS npcs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT UNIQUE NOT NULL,
    faction     TEXT DEFAULT '', role TEXT DEFAULT '',
    personality TEXT DEFAULT '', backstory TEXT DEFAULT '',
    voice_type  TEXT DEFAULT '', editor_id TEXT DEFAULT '',
    notes       TEXT DEFAULT '',
    created     TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS locations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT UNIQUE NOT NULL,
    type        TEXT DEFAULT '', region TEXT DEFAULT '',
    description TEXT DEFAULT '', encounters TEXT DEFAULT '',
    notes       TEXT DEFAULT '',
    created     TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS quests (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT NOT NULL,
    editor_id TEXT UNIQUE DEFAULT '',
    synopsis  TEXT DEFAULT '', stages TEXT DEFAULT '',
    factions  TEXT DEFAULT '', npcs TEXT DEFAULT '',
    status    TEXT DEFAULT 'planning',
    created   TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS lore_entries (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title    TEXT NOT NULL,
    content  TEXT NOT NULL,
    tags     TEXT DEFAULT '',
    source   TEXT DEFAULT 'manual',
    created  TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS peer_findings (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    peer      TEXT DEFAULT '',
    topic     TEXT DEFAULT '',
    content   TEXT DEFAULT '',
    processed INTEGER DEFAULT 0,
    created   TEXT DEFAULT (datetime('now'))
);
"""

_db_conn: Optional[sqlite3.Connection] = None
_db_lock = threading.Lock()

def _get_db() -> sqlite3.Connection:
    global _db_conn
    if _db_conn is None:
        _db_conn = sqlite3.connect(CFG["db_path"], check_same_thread=False)
        _db_conn.row_factory = sqlite3.Row
        _db_conn.executescript(_SQL_SCHEMA)
        _db_conn.commit()
    return _db_conn

def sql_rows(query: str, params: tuple = ()) -> List[dict]:
    with _db_lock:
        return [dict(r) for r in _get_db().execute(query, params).fetchall()]

def sql_exec(query: str, params: tuple = ()) -> int:
    with _db_lock:
        cur = _get_db().execute(query, params)
        _get_db().commit()
        return cur.lastrowid

# ---------------------------------------------------------------------------
# ChromaDB  —  semantic vector search
# ---------------------------------------------------------------------------
_chroma_col = None

def _init_chroma() -> None:
    global _chroma_col
    if not CHROMA_OK:
        log("[WRN] chromadb not installed — semantic search disabled")
        return
    try:
        log(f"[Chroma] Loading vector store at {CFG['chroma_path']} …")
        client = chromadb.PersistentClient(path=CFG["chroma_path"])
        # Embeddings come from the local Ollama server (no HuggingFace download, no PyTorch).
        embed  = _chroma_ef.OllamaEmbeddingFunction(url=CFG["ollama_host"], model_name=CFG["embed_model"])
        _chroma_col = client.get_or_create_collection(
            name="lore_memory",
            embedding_function=embed,
            metadata={"hnsw:space": "cosine"},
        )
        log(f"[Chroma] Ready  ({_chroma_col.count()} documents)")
    except Exception as exc:
        log(f"[Chroma] Init failed: {exc}")
        _chroma_col = None

def chroma_upsert(doc_id: str, text: str, meta: dict) -> None:
    if _chroma_col is None:
        return
    try:
        _chroma_col.upsert(documents=[text], metadatas=[meta], ids=[doc_id])
    except Exception as exc:
        log(f"[Chroma] Upsert error: {exc}")

def chroma_delete(doc_id: str) -> None:
    if _chroma_col is None:
        return
    try:
        _chroma_col.delete(ids=[doc_id])
    except Exception:
        pass

def chroma_query(query: str, n: int = 8) -> list:
    if _chroma_col is None or _chroma_col.count() == 0:
        return []
    try:
        n = min(n, _chroma_col.count())
        res = _chroma_col.query(
            query_texts=[query],
            n_results=n,
            include=["documents", "metadatas", "distances"],
        )
        return [
            {
                "content":  res["documents"][0][i],
                "metadata": res["metadatas"][0][i],
                "score":    round(1.0 - res["distances"][0][i], 3),
            }
            for i in range(len(res["documents"][0]))
        ]
    except Exception as exc:
        log(f"[Chroma] Query error: {exc}")
        return []

# ---------------------------------------------------------------------------
# Ollama  —  local LLM generation
# ---------------------------------------------------------------------------
_ollama_live   = False
_ollama_models: List[str] = []

_CREATIVE_DIRECTOR_SYSTEM = """\
You are the Vault-Tec Creative Director — the narrative and creative AI in the \
MOSSY.SPACE Fallout 4 modding platform. You work in a 3-agent network alongside \
AI Helper (research, port 8769) and VirtualModLab (testing, port 8768).

Your domain is the creative layer: quest writing, branched dialogue trees, NPC \
personalities and backstories, worldspace and settlement design, lore consistency, \
and narrative debugging.

Behavioral rules:
- Be direct and professional. Never use emoji.
- Produce content that is lore-accurate to Fallout 4's setting (2287, Commonwealth).
- For dialogue: use FO4's INFO record format thinking — topic, player prompt variants, \
  NPC response, conditions (GetIsID, GetStage, GetItemCount). Flag lines needing \
  lip-sync (.lip files) or face animations.
- For quests: think in stages (QuestStage records), aliases (ReferenceAlias, \
  LocationAlias), and objectives. Note SEQ file requirement for auto-start quests.
- For NPCs: specify faction, voice type (e.g. MaleBoston, FemaleChild), editor ID \
  convention (MOD_NPC_Name), and keyword associations.
- Papyrus scripting: OnInit, OnEffectStart, OnActivate, OnStageSet events; \
  latent functions for async; avoid OnUpdate polling.
- Know Creation Kit Platform Extended (CKPE): LAA memory patch, lip-sync bug fix, \
  FaceGen stability improvements.
- Sim Settlements 2 (SS2): addon packs, KGsim_BuildingPlan, plot types, city plans, \
  SCOL performance, stage item spawns.
- Previs/Precombine: PJM scripts, XCRI records, previs culling, patching load orders.
- Room Bounds & Portals: interior occlusion, linking rooms, preventing rendering holes.

MOSSY INDUSTRIES — THE BRAND YOU ARE CREATING FOR:
Mossy Industries is a fictional in-universe biotech corporation and the identity of this \
mod project. Specialize all creative output in: biological overgrowth, genetic mutations, \
infectious spores, carnivorous plants, mutated creatures, mutated humans (spore carriers, \
advanced ghouls), mutated aquatic life (fish, mirelurks, gulpers), and rogue science / \
evil scientists. Aesthetic: crumbling pre-war buildings consumed by green/fungal growth, \
bioluminescence, acid pools, spore clouds. Lore anchor: FEV + radiation pushed further \
by Mossy Industries' unethical bioweapon experiments. \
Design pillars: biological horror, ecosystem depth, mutation spectrum (mild to grotesque), \
evil science narrative (hidden labs, field notes, failed experiments), aquatic expansion. \
All quests, NPCs, dialogue, and worldspace content you generate should fit this identity.

MOSSY.SPACE platform context:
- Part of MOSSY.SPACE, a Fallout 4 modding desktop app; its Creative Director panel is your front end
- Connected to AI Helper for research findings and VirtualModLab for experiment results
- Local LLM: Ollama at http://localhost:11434 (this service)
- Local LLM alternative: KoboldCpp at http://localhost:5001 (OpenAI-compatible, also does text-to-speech)
- Voice lip-sync: Runalip makes .LIP files (and .FUZ with -nfuz) from .WAV voice files plus a Lazy Voice Finder CSV: Runalip -genlips FO4 "file.csv" "SrcPath" "DstPath" [-nfuz] [-hq]. Needs tools\\FaceFXWrapper.exe. Paths must be English-only.
"""

async def _probe_ollama() -> None:
    global _ollama_live, _ollama_models
    if not OLLAMA_OK:
        log("[WRN] ollama SDK not installed — local generation disabled")
        return
    try:
        import httpx
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{CFG['ollama_host']}/api/tags", timeout=3.0)
            if r.status_code == 200:
                _ollama_models = [m["name"] for m in r.json().get("models", [])]
                _ollama_live   = True
                models_str = ", ".join(_ollama_models) if _ollama_models else "none pulled yet"
                log(f"[Ollama] Connected — models: {models_str}")
            else:
                log("[Ollama] Server responded unexpectedly")
    except Exception:
        log(f"[Ollama] Not running — start Ollama then: ollama pull {CFG['ollama_model']}")

async def _generate_koboldcpp(prompt: str) -> str:
    """Run prompt through a local KoboldCpp server (OpenAI-compatible API)."""
    import httpx
    base = CFG.get("koboldcpp_host", "http://localhost:5001").rstrip("/")
    payload = {
        "model": "koboldcpp",
        "messages": [
            {"role": "system", "content": _CREATIVE_DIRECTOR_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
    }
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{base}/v1/chat/completions", json=payload, timeout=120.0)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        raise RuntimeError(f"KoboldCpp not available at {base}: {exc}") from exc


async def hub_search(query: str, limit: int = 5) -> list:
    """Search the shared AI Hub (approved lessons rank first). Returns [] if the hub is not running."""
    import httpx
    base = str(CFG.get("hub_host") or "").rstrip("/")
    if not base:
        return []
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{base}/search", params={"q": query, "limit": limit}, timeout=3.0)
        r.raise_for_status()
        return r.json()
    except Exception:
        return []


async def hub_post(kind: str, title: str, body: str, project: str = "", tags: Optional[List[str]] = None) -> Optional[str]:
    """Post a lesson/task/message to the optional AI Hub as 'mossy'. Lessons stay pending until the hub's owner approves them."""
    import httpx
    base = str(CFG.get("hub_host") or "").rstrip("/")
    if not base:
        return None
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{base}/post", json={"kind": kind, "author": "mossy", "project": project,
                                                  "title": title, "body": body, "tags": tags or []}, timeout=3.0)
        r.raise_for_status()
        return r.json().get("id")
    except Exception:
        return None


async def generate_local(prompt: str, model: Optional[str] = None) -> str:
    """Run prompt through a local LLM: Ollama, or KoboldCpp as the other engine."""
    engine = str(CFG.get("llm_engine", "auto")).lower()
    try:
        notes = [h for h in await hub_search(prompt[:300], 3) if h.get("folder") == "lessons_approved"]
        if notes:
            prompt = "Approved lessons from the shared AI Hub (trusted):\n" + "\n".join(
                f"- {h['title']}: {h['body'][:400]}" for h in notes) + "\n\n" + prompt
    except Exception:
        pass
    if engine == "koboldcpp" or (engine == "auto" and (not OLLAMA_OK or not _ollama_live)):
        return await _generate_koboldcpp(prompt)
    if not OLLAMA_OK or not _ollama_live:
        raise RuntimeError("Ollama is not available")
    m = model or CFG["ollama_model"]
    loop = asyncio.get_running_loop()

    def _call():
        resp = _ollama_sdk.chat(
            model=m,
            messages=[
                {"role": "system", "content": _CREATIVE_DIRECTOR_SYSTEM},
                {"role": "user", "content": prompt},
            ],
        )
        # SDK >= 0.2 returns an object; older versions return a dict
        try:
            return resp.message.content
        except AttributeError:
            return resp["message"]["content"]

    try:
        return await loop.run_in_executor(None, _call)
    except Exception as exc:
        raise RuntimeError(f"Ollama generation error: {exc}") from exc

# ---------------------------------------------------------------------------
# WebSocket peer manager  —  connects to AI Helper & VirtualModLab
# ---------------------------------------------------------------------------
_peers: dict = {
    "ai_helper":      {"connected": False, "last_seen": None, "error": None, "url": CFG["ai_helper_ws"]},
    "virtual_mod_lab":{"connected": False, "last_seen": None, "error": None, "url": CFG["vml_ws"]},
}
_ws_sockets: dict = {}
_ws_lock: Optional[asyncio.Lock] = None   # created inside event loop

def _ws_lock_inst() -> asyncio.Lock:
    global _ws_lock
    if _ws_lock is None:
        _ws_lock = asyncio.Lock()
    return _ws_lock

HELLO = json.dumps({
    "type":         "peer_hello",
    "agent":        "creative_director",
    "capabilities": [
        "lore_check", "lore_search", "consistency_check",
        "dialogue_gen", "quest_gen", "npc_gen", "worldspace_gen", "narrative_debug",
    ],
    "api":     f"http://localhost:{CFG['port']}",
    "version": "2.1.0",
})

async def _peer_loop(name: str, url: str) -> None:
    """Maintain a persistent outbound WebSocket connection to one peer."""
    if not WS_OK:
        _peers[name]["error"] = "websockets not installed"
        return

    while True:
        try:
            log(f"[WS:{name}] Connecting → {url}")
            async with _ws_lib.connect(url, ping_interval=25, ping_timeout=10) as ws:
                async with _ws_lock_inst():
                    _ws_sockets[name] = ws
                _peers[name].update(connected=True, error=None)
                log(f"[WS:{name}] Connected")
                await ws.send(HELLO)

                async for raw in ws:
                    _peers[name]["last_seen"] = datetime.now().isoformat()
                    try:
                        msg = json.loads(raw)
                        await _on_peer_msg(name, ws, msg)
                    except Exception as exc:
                        log(f"[WS:{name}] Msg error: {exc}")

        except Exception as exc:
            _peers[name].update(connected=False, error=str(exc))
            async with _ws_lock_inst():
                _ws_sockets.pop(name, None)
            log(f"[WS:{name}] Dropped ({exc}) — retry in 15 s")
            await asyncio.sleep(15)

async def _on_peer_msg(name: str, ws, msg: dict) -> None:
    t = msg.get("type", "")

    if t == "finding":
        # Only treat as "new/unread" if the sender marks it final (or omits status — backward compat).
        # Draft findings (status="draft"/"partial"/"streaming") are stored but pre-marked processed=1
        # so they don't pollute the unread count and won't trigger premature handoffs.
        status    = msg.get("status", "final").lower()
        is_draft  = status in ("draft", "partial", "streaming", "in_progress")
        processed = 1 if is_draft else 0
        sql_exec(
            "INSERT INTO peer_findings (peer, topic, content, processed) VALUES (?,?,?,?)",
            (name, msg.get("topic",""), msg.get("content",""), processed),
        )
        label = "[DRAFT] " if is_draft else ""
        log(f"[WS:{name}] Stored {label}finding: {msg.get('topic','')[:60]}")

    elif t == "lore_query":
        q       = msg.get("query", "")
        sem     = chroma_query(q, n=5)
        keyword = sql_rows(
            "SELECT id,category,title,content FROM lore_entries "
            "WHERE title LIKE ? OR content LIKE ? LIMIT 5",
            (f"%{q}%", f"%{q}%"),
        )
        await ws.send(json.dumps({
            "type": "lore_response", "query": q,
            "semantic_results": sem, "keyword_results": keyword,
            "agent": "creative_director",
        }))

    elif t == "consistency_check":
        result = _consistency_check(msg.get("content", ""))
        await ws.send(json.dumps({
            "type": "consistency_result", "result": result,
            "agent": "creative_director",
        }))

    elif t == "vml_experiment_result":
        body       = json.dumps(msg)
        exp_status = msg.get("status", "complete").lower()
        is_complete = exp_status in ("complete", "done", "finished", "final")

        # Always store in peer_findings; mark drafts as already-processed so they
        # don't show as unread actionable items.
        processed = 0 if is_complete else 1
        sql_exec(
            "INSERT INTO peer_findings (peer, topic, content, processed) VALUES (?,?,?,?)",
            ("virtual_mod_lab", f"Experiment: {msg.get('experiment','')}", body, processed),
        )

        # Only upsert into the lore/semantic index when the experiment is complete
        # AND a human-readable summary exists — never store raw protocol JSON in Chroma.
        summary = msg.get("summary", "").strip()
        if is_complete and summary:
            chroma_upsert(
                f"vml_{msg.get('experiment', int(time.time()))}",
                summary,
                {"source": "virtual_mod_lab", "category": "experiment",
                 "experiment": msg.get("experiment","")},
            )
        elif not summary and is_complete:
            log(f"[WS:virtual_mod_lab] Experiment result missing 'summary' — skipped Chroma upsert")

    elif t == "ping":
        await ws.send(json.dumps({"type": "pong", "agent": "creative_director"}))

async def _broadcast(payload: dict, targets: Optional[list] = None) -> None:
    async with _ws_lock_inst():
        sockets = dict(_ws_sockets)
    for n, ws in sockets.items():
        if targets and n not in targets:
            continue
        try:
            await ws.send(json.dumps(payload))
        except Exception as exc:
            log(f"[WS:{n}] Send error: {exc}")

# ---------------------------------------------------------------------------
# Lore consistency check
# ---------------------------------------------------------------------------
def _consistency_check(content: str) -> dict:
    warnings = []
    low = content.lower()
    for npc in sql_rows("SELECT name, faction FROM npcs"):
        if npc["name"].lower() in low and npc["faction"]:
            if npc["faction"].lower() not in low:
                warnings.append(
                    f"NPC '{npc['name']}' mentioned but faction '{npc['faction']}' is absent."
                )
    similar = chroma_query(content[:500], n=3)
    return {
        "consistent":    len(warnings) == 0,
        "warnings":      warnings,
        "similar_lore":  similar,
        "db_counts": {
            "npcs":         len(sql_rows("SELECT id FROM npcs")),
            "factions":     len(sql_rows("SELECT id FROM factions")),
            "locations":    len(sql_rows("SELECT id FROM locations")),
            "lore_entries": len(sql_rows("SELECT id FROM lore_entries")),
        },
    }

# ---------------------------------------------------------------------------
# Mod Build Pipeline  —  produces real deployable FO4 mod packages
# ---------------------------------------------------------------------------
_build_jobs: Dict[str, dict] = {}   # job_id → job dict

def _job_update(job_id: str, **kw) -> None:
    if job_id in _build_jobs:
        _build_jobs[job_id].update(kw)
        _build_jobs[job_id]["updated"] = datetime.now().isoformat()

# ── File generators ───────────────────────────────────────────────────────────

def _write_papyrus_quest(outdir: Path, mod_id: str, spec: dict) -> Path:
    """Generate the main quest Papyrus script (.psc)."""
    quest_name = spec.get("quest_name", "MainQuest")
    stages     = spec.get("stages", [{"index": 10, "label": "Quest Start"},
                                      {"index": 200, "label": "Quest Complete"}])

    # Pre-compute first and last stage indices for dynamic references
    first_idx = stages[0]["index"]  if stages else 10
    last_idx  = stages[-1]["index"] if stages else 200

    def _stage_fn(s: dict) -> str:
        idx   = s["index"]
        label = s.get("label", "Stage")
        # SetCurrentStageID advances the quest stage in the engine;
        # SetObjectiveDisplayed then shows the matching HUD objective.
        return (
            f"\nFunction Stage{idx}()\n"
            f"    ; {label}\n"
            f"    Self.SetCurrentStageID({idx})\n"
            f"    SetObjectiveDisplayed({idx}, True)\n"
            f"EndFunction"
        )
    stage_fns = "\n".join(_stage_fn(s) for s in stages)

    src = f""";/ ============================================================
   {mod_id} — Quest Script
   Auto-generated by Mossy Creative Director v2.1
   Compile: Fallout4/Tools/Papyrus Compiler/PapyrusCompiler.exe
   Flags:   Institute_Papyrus_Flags.flg
============================================================ /;

Scriptname {mod_id}_QuestScript extends Quest Hidden

; ── Properties ──────────────────────────────────────────────────────────────
; No PlayerRef property here on purpose — Game.GetPlayer() gets the player
; directly at runtime, so there's nothing left for VMAD attachment to forget
; to fill in. (A previous version used a Mandatory Actor Property for this,
; which would have silently failed to initialize if VMAD-attached without
; also wiring that property — Game.GetPlayer() removes that failure mode.)
Message Property QuestStartMsg Auto Const
Message Property QuestCompleteMsg Auto Const

; ── State ────────────────────────────────────────────────────────────────────
Bool _questStarted = False

; ── Events ───────────────────────────────────────────────────────────────────
Event OnInit()
    RegisterForRemoteEvent(Game.GetPlayer(), "OnLocationChange")
    If QuestStartMsg
        QuestStartMsg.Show()
    EndIf
    Debug.Notification("{quest_name} — Initialised")
EndEvent

Event Actor.OnLocationChange(Actor akActor, Location akOldLoc, Location akNewLoc)
    If !_questStarted
        _questStarted = True
        Stage{first_idx}()
    EndIf
EndEvent

; ── Quest Stage Functions ────────────────────────────────────────────────────
{stage_fns}

; ── Utility ──────────────────────────────────────────────────────────────────
Function CompleteQuest()
    Self.SetCurrentStageID({last_idx})
    SetObjectiveCompleted({first_idx}, True)
    If QuestCompleteMsg
        QuestCompleteMsg.Show()
    EndIf
    Debug.Notification("{quest_name} — Complete")
EndFunction
"""
    # Write under Data/ so the ZIP has the correct mod manager layout
    path = outdir / "Data" / "Scripts" / "Source" / "User" / f"{mod_id}_QuestScript.psc"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(src, encoding="utf-8")
    return path

def _write_papyrus_npc(outdir: Path, mod_id: str, spec: dict) -> Path:
    """Generate the NPC activation script."""
    npc_name = spec.get("npc_name", "NPC")
    src = f""";/ ============================================================
   {mod_id} — NPC Activation Script
   Auto-generated by Mossy Creative Director v2.1
============================================================ /;

Scriptname {mod_id}_NPCScript extends Actor Hidden

; ── Properties ───────────────────────────────────────────────────────────────
Quest Property {mod_id}_Quest Auto Const
Message Property GreetingMsg Auto Const

; ── Events ───────────────────────────────────────────────────────────────────
Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        ; Trigger quest dialogue topic
        If {mod_id}_Quest
            {mod_id}_Quest.SetCurrentStageID(10)
        EndIf
        If GreetingMsg
            GreetingMsg.Show()
        EndIf
        Debug.Notification("{npc_name} activated by player")
    EndIf
EndEvent

Event OnDeath(Actor akKiller)
    Debug.Notification("{npc_name} has died")
    If {mod_id}_Quest
        {mod_id}_Quest.SetCurrentStageID(90)
    EndIf
EndEvent
"""
    # Write under Data/ so the ZIP has the correct mod manager layout
    path = outdir / "Data" / "Scripts" / "Source" / "User" / f"{mod_id}_NPCScript.psc"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(src, encoding="utf-8")
    return path

def _pas_escape(s: str) -> str:
    """Escape a Python string for safe embedding in a Pascal single-quoted
    string literal (Pascal escapes an embedded quote by doubling it: '' )."""
    return str(s).replace("'", "''")

def _write_xedit_script(outdir: Path, mod_id: str, spec: dict) -> Path:
    """
    Generate an xEdit automation Pascal script (.pas).
    Running this inside FO4Edit creates the ESP with all records.
    Usage: FO4Edit → Scripts → Run → select this file.

    Record layout verified against xEdit's real FO4 QUST definition
    (TES5Edit/TES5Edit Core/wbDefinitionsFO4.pas): a quest stage is NOT a
    QSDT/INDX pair added directly to the quest — it's nested three levels
    deep as Quest -> 'Stages' (array) -> Stage -> 'Log Entries' (array) ->
    Log Entry {QSDT = stage flags byte, CNAM = the actual log text}. Also,
    NNAM is not a top-level quest field at all — it only exists per-Objective
    ('Display Text'), so there is no real QUST field for a free-text
    description; that text goes in README.md / mod_spec.json instead.
    """
    quest_name  = _pas_escape(spec.get("quest_name",  "Unnamed Quest"))
    npc_name    = _pas_escape(spec.get("npc_name",    "Unnamed NPC"))
    voice_type  = _pas_escape(spec.get("voice_type",  "MaleBoston"))
    stages      = spec.get("stages", [{"index": 10, "label": "Start"},
                                       {"index": 200,"label": "Complete"}])
    npc_id      = spec.get("npc_name", "Unnamed NPC").replace(" ", "_")
    npc_id      = re.sub(r"[^A-Za-z0-9_]", "", npc_id) or "NPC"

    def _xedit_stage(s: dict) -> str:
        idx = int(s["index"])
        lbl = _pas_escape(s.get("label", "Stage"))
        return (
            f"stageEntry := ElementAssign(ElementByPath(quest, 'Stages'), HighInteger, nil, False);\n"
            f"  SetElementEditValues(stageEntry, 'Stage Index\\Stage Index', '{idx}');\n"
            f"  logEntry := ElementAssign(ElementByPath(stageEntry, 'Log Entries'), HighInteger, nil, False);\n"
            f"  SetElementEditValues(logEntry, 'CNAM', '{lbl}');"
        )
    stage_lines = "\n  ".join(_xedit_stage(s) for s in stages)
    src = f"""{{
  {mod_id} xEdit Build Script
  Auto-generated by Mossy Creative Director v2.1

  HOW TO USE:
    1. Open FO4Edit (xEdit for Fallout 4)
    2. Load Fallout4.esm (let it finish loading)
    3. Go to Tools → Apply Script
    4. Browse to this file and click Run
    5. A new {mod_id}.esp will be created in your Data folder, WITH the NPC
       already placed in the world and both Papyrus scripts already attached
    6. Compile {mod_id}_QuestScript.psc and {mod_id}_NPCScript.psc with the
       Papyrus Compiler (Data/Scripts/Source/User/*.psc -> Data/Scripts/*.pex)
    7. Activate the ESP in your mod manager

  REMAINING MANUAL STEP (the only one left — everything else above is now
  automatic): this script does not set up a custom face, so the NPC uses
  whatever the default appearance is for its Race. If you want a unique look,
  open the ESP in Creation Kit, use LooksMenu's in-game preset system
  (console: showlooksmenu <refid> 1 -> Presets tab) instead of native CK
  FaceGen where possible, or run CK's "Export Face Gen Data" if you do need
  a fully custom face. See F4AssetGuide's ck_facegen_workflow notes.
}}

unit {mod_id}_Build;

uses xEditAPI;

function Initialize: Integer;
var
  modFile, quest, npc, stageEntry, logEntry: IInterface;
  vmad, scr, cellGrp, cell, refrGrp, refr: IInterface;
begin
  Result := 0;

  // ── Create plugin ──────────────────────────────────────────────────────────
  modFile := FileByName('{mod_id}.esp');
  if not Assigned(modFile) then begin
    modFile := AddNewFile;
    if not Assigned(modFile) then begin
      AddMessage('[{mod_id}] ERROR: Could not create ESP file');
      Exit;
    end;
    SetFileName(modFile, '{mod_id}.esp');
    AddMasters(modFile, 'Fallout4.esm');
  end;
  AddMessage('[{mod_id}] Plugin created: ' + GetFileName(modFile));

  // ── Create QUST (Quest) record ─────────────────────────────────────────────
  quest := wbCopyElementToFile(Add(GroupBySignature(modFile, 'QUST'), 'QUST', True), modFile, False);
  SetElementEditValues(quest, 'EDID', '{mod_id}_MainQuest');
  SetElementEditValues(quest, 'FULL', '{quest_name}');
  SetElementEditValues(quest, 'DNAM\\Priority', '60');
  SetElementEditValues(quest, 'DNAM\\Flags\\Start Game Enabled', '1');
  // NOTE: QUST has no top-level free-text description field in the real schema
  // (NNAM only exists per-Objective) — full description lives in README.md /
  // mod_spec.json instead of a nonexistent quest field.
  AddMessage('[{mod_id}] Quest record created: {quest_name}');

  // ── Quest stages: Stages(array) -> Stage -> Log Entries(array) -> Log Entry ─
  {stage_lines}
  AddMessage('[{mod_id}] Quest stages created');

  // ── Attach the quest script (VMAD) ──────────────────────────────────────────
  // extends Quest -> attaches to a QUST record's own VMAD, never to NPC_/REFR.
  // {mod_id}_QuestScript has no Mandatory properties (it calls Game.GetPlayer()
  // internally instead), so no Properties entries are required for it to load.
  try
    vmad := Add(quest, 'VMAD', True);
    Add(vmad, 'Scripts', True);
    scr := ElementAssign(ElementByPath(vmad, 'Scripts'), HighInteger, nil, False);
    SetElementEditValues(scr, 'scriptName', '{mod_id}_QuestScript');
    AddMessage('[{mod_id}] Quest script attached: {mod_id}_QuestScript');
  except
    on E: Exception do
      AddMessage('[{mod_id}] WARNING: could not attach quest script automatically (' + E.Message + '). Attach {mod_id}_QuestScript to the quest manually in CK''s VMAD/Scripts tab.');
  end;

  // ── Create NPC_ record ─────────────────────────────────────────────────────
  npc := wbCopyElementToFile(Add(GroupBySignature(modFile, 'NPC_'), 'NPC_', True), modFile, False);
  SetElementEditValues(npc, 'EDID', '{mod_id}_NPC_{npc_id}');
  SetElementEditValues(npc, 'FULL', '{npc_name}');
  SetElementEditValues(npc, 'VTCK', '{voice_type}');
  // Race must be set for the NPC to be a valid spawnable humanoid actor —
  // HumanRace is Fallout4.esm's base human race, always present.
  SetElementEditValues(npc, 'RNAM', 'HumanRace');
  AddMessage('[{mod_id}] NPC record created: {npc_name}');

  // ── Attach the NPC script (VMAD) ────────────────────────────────────────────
  // extends Actor -> attaches to an NPC_ record's own VMAD, never to QUST/REFR.
  // {mod_id}_NPCScript's own Quest/Message properties are optional (checked with
  // 'If' before use in the script), so leaving them unset is safe — it just
  // means OnActivate won't advance the quest stage until you wire the
  // {mod_id}_Quest property to this quest in CK's Properties tab.
  try
    vmad := Add(npc, 'VMAD', True);
    Add(vmad, 'Scripts', True);
    scr := ElementAssign(ElementByPath(vmad, 'Scripts'), HighInteger, nil, False);
    SetElementEditValues(scr, 'scriptName', '{mod_id}_NPCScript');
    AddMessage('[{mod_id}] NPC script attached: {mod_id}_NPCScript');
  except
    on E: Exception do
      AddMessage('[{mod_id}] WARNING: could not attach NPC script automatically (' + E.Message + '). Attach {mod_id}_NPCScript to the NPC manually in CK''s VMAD/Scripts tab.');
  end;

  // ── Place the NPC in the world (REFR in QASmoke) ────────────────────────────
  // QASmoke is Bethesda's own always-present, always-empty QA test interior
  // cell (shipped in Fallout4.esm) — the standard safe default drop location
  // for a placed reference that doesn't have a designed location yet. Move
  // this REFR to a real location in CK once you've decided where it belongs.
  try
    cellGrp := GroupBySignature(modFile, 'CELL');
    cell := MainRecordByEditorID(FileByIndex(0), 'QASmoke');
    if Assigned(cell) then begin
      refrGrp := Add(cell, 'Persistent', True);
      refr := wbCopyElementToFile(Add(GroupBySignature(modFile, 'REFR'), 'REFR', True), modFile, False);
      SetElementEditValues(refr, 'EDID', '{mod_id}_NPC_{npc_id}_REF');
      SetElementEditValues(refr, 'NAME', '{mod_id}_NPC_{npc_id}');
      SetElementEditValues(refr, 'DATA\\Position\\X', '0');
      SetElementEditValues(refr, 'DATA\\Position\\Y', '0');
      SetElementEditValues(refr, 'DATA\\Position\\Z', '0');
      AddMessage('[{mod_id}] NPC placed in QASmoke — move to a real location in CK before release.');
    end else begin
      AddMessage('[{mod_id}] WARNING: QASmoke cell not found (unexpected) — place the NPC manually in CK''s render window.');
    end;
  except
    on E: Exception do
      AddMessage('[{mod_id}] WARNING: could not auto-place the NPC (' + E.Message + '). Place it manually in CK''s render window.');
  end;

  AddMessage('[{mod_id}] Build complete. ESP saved to Data folder.');
  AddMessage('[{mod_id}] Remaining manual step: appearance/FaceGen only (see header comment).');
end;

function Finalize: Integer;
begin
  Result := 0;
end;

function Process(e: IInterface): Integer;
begin
  Result := 0;
end;

end.
"""
    path = outdir / f"{mod_id}_build.pas"
    path.write_text(src, encoding="utf-8")
    return path

def _write_fomod(outdir: Path, mod_id: str, spec: dict) -> None:
    """Create FOMOD installer metadata."""
    # escape() handles &, <, > — required because these fields are free-text
    # (quest concept/description) embedded directly into XML content
    name    = escape(spec.get("quest_name", mod_id))
    desc    = escape(spec.get("description", "A Mossy Industries mod for Fallout 4."))
    version = "1.0.0"
    fomod_dir = outdir / "fomod"
    fomod_dir.mkdir(exist_ok=True)

    info_xml = f"""<fomod>
  <Name>{name}</Name>
  <Author>Mossy Industries (Creative Director)</Author>
  <Version>{version}</Version>
  <Description>{desc}</Description>
  <Website>https://mossy.space</Website>
</fomod>"""

    module_xml = f"""<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">
  <moduleName>{name}</moduleName>
  <installSteps order="Explicit">
    <installStep name="Install">
      <optionalFileGroups order="Explicit">
        <group name="{name}" type="SelectExactlyOne">
          <plugins order="Explicit">
            <plugin name="Install {name}">
              <description>{desc}</description>
              <files>
                <folder source="Data" destination="" priority="0"/>
              </files>
              <typeDescriptor><type name="Recommended"/></typeDescriptor>
            </plugin>
          </plugins>
        </group>
      </optionalFileGroups>
    </installStep>
  </installSteps>
</config>"""
    (fomod_dir / "info.xml").write_text(info_xml, encoding="utf-8")
    (fomod_dir / "ModuleConfig.xml").write_text(module_xml, encoding="utf-8")

def _write_readme(outdir: Path, mod_id: str, spec: dict, files: List[str]) -> None:
    quest_name  = spec.get("quest_name",  mod_id)
    description = spec.get("description", "")
    npc_name    = spec.get("npc_name",    "Unknown")
    faction     = spec.get("faction",     "")
    stages      = spec.get("stages", [])
    stage_lines = "\n".join(f"  - Stage {s['index']}: {s.get('label','')}" for s in stages)
    file_list   = "\n".join(f"  - {f}" for f in files)

    readme = f"""# {quest_name}
*Generated by Mossy Vault-Tec Creative Director v2.1*

## Description
{description}

## Mod ID
`{mod_id}`

## Contents
{file_list}

## NPC
- Name: {npc_name}
- Faction: {faction or 'Independent'}

## Quest Stages
{stage_lines or '  (see mod_spec.json for full details)'}

## Installation
### Option A — FOMOD (Recommended)
Install with Mod Organizer 2 or Vortex. The fomod/ folder provides an
automatic installer. Place the `Data/` folder contents in your FO4 Data folder.

### Option B — Manual
1. Copy the `Data/` folder into your Fallout 4 directory.
2. Activate `{mod_id}.esp` in your mod manager.

## Creating the ESP (Required — one-time setup)
The `.esp` file must be created using xEdit before playing:

1. Download FO4Edit: https://www.nexusmods.com/fallout4/mods/2737
2. Load Fallout4.esm in FO4Edit
3. Go to Tools → Apply Script
4. Select `{mod_id}_build.pas` from this folder
5. Click Run — your `{mod_id}.esp` will be created in your Data folder with
   the NPC already placed (in the QASmoke test cell — move it to a real
   location in CK) and both Papyrus scripts already attached via VMAD
6. Compile the Papyrus scripts (see below), then optionally open Creation
   Kit only if you want a custom NPC appearance (native FaceGen) or want to
   move the NPC's placement — neither is required for the mod to load

## Compiling Papyrus Scripts
Scripts are in `Data/Scripts/Source/User/`. Compile with:
```
PapyrusCompiler.exe {mod_id}_QuestScript.psc -f="Institute_Papyrus_Flags.flg" -i="." -o="../"
PapyrusCompiler.exe {mod_id}_NPCScript.psc   -f="Institute_Papyrus_Flags.flg" -i="." -o="../"
```
The compiler is at: `Fallout4/Tools/Papyrus Compiler/PapyrusCompiler.exe`

## Mossy Industries Brand Notes
This mod is designed around the Mossy Industries identity:
biological overgrowth, genetic mutations, spore carriers, rogue science.
All content fits the FEV + radiation + bioweapon experiment lore anchor.

---
*Built with Mossy Vault-Tec AI Network — Creative Director + AI Helper + VirtualModLab*
"""
    (outdir / "README.md").write_text(readme, encoding="utf-8")

def _write_seq(outdir: Path, mod_id: str) -> Path:
    """
    Write an empty placeholder .seq file.
    The real SEQ must be generated in Creation Kit (Gameplay → Generate SEQ File)
    after the ESP is loaded. This placeholder ensures the path exists so mod managers
    see the file and the README reminder is accurate.
    """
    seq_path = outdir / "Data" / "Scripts" / f"{mod_id}_MainQuest.seq"
    seq_path.parent.mkdir(parents=True, exist_ok=True)
    # Empty file — must be replaced with CK-generated version before release
    seq_path.write_bytes(b"")
    return seq_path

def _zip_mod(job_dir: Path, job_id: str) -> Path:
    """
    Pack everything under job_dir into a ZIP using job_dir as the root.
    Result layout inside the ZIP:
      Data/Scripts/Source/User/{mod_id}_QuestScript.psc
      Data/Scripts/Source/User/{mod_id}_NPCScript.psc
      Data/Scripts/{mod_id}_MainQuest.seq  (placeholder — regenerate in CK)
      {mod_id}_build.pas
      fomod/info.xml
      fomod/ModuleConfig.xml
      README.md
      mod_spec.json
    """
    zip_path = MOD_OUTPUT_DIR / f"{job_id}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in job_dir.rglob("*"):
            if f.is_file():
                zf.write(f, f.relative_to(job_dir))
    return zip_path

# -- Build worker --------------------------------------------------------------

async def _run_mod_build(job_id: str, spec: dict) -> None:
    """Background task: generate all mod files, zip, mark done."""
    mod_id  = spec.get("mod_id", "MossyMod_" + job_id[:8])
    job_dir = MOD_OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    try:
        _job_update(job_id, status="running", progress=0, message="Generating Papyrus quest script...")
        psc_quest = _write_papyrus_quest(job_dir, mod_id, spec)
        _job_update(job_id, progress=20, message="Generating Papyrus NPC script...")
        psc_npc = _write_papyrus_npc(job_dir, mod_id, spec)
        _job_update(job_id, progress=40, message="Generating xEdit Pascal build script...")
        pas = _write_xedit_script(job_dir, mod_id, spec)
        _job_update(job_id, progress=60, message="Generating FOMOD installer...")
        _write_fomod(job_dir, mod_id, spec)
        _job_update(job_id, progress=68, message="Writing SEQ placeholder...")
        seq = _write_seq(job_dir, mod_id)
        _job_update(job_id, progress=75, message="Writing README...")
        files_list = [
            str(psc_quest.relative_to(job_dir)),
            str(psc_npc.relative_to(job_dir)),
            str(seq.relative_to(job_dir)) + "  ← regenerate in CK before release",
            str(pas.relative_to(job_dir)),
            "fomod/info.xml",
            "fomod/ModuleConfig.xml",
            "README.md",
            "mod_spec.json",
        ]
        _write_readme(job_dir, mod_id, spec, files_list)
        (job_dir / "mod_spec.json").write_text(
            json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        _job_update(job_id, progress=88, message="Zipping package...")
        zip_path = _zip_mod(job_dir, job_id)
        _job_update(
            job_id, status="complete", progress=100, message="Done.",
            zip_path=str(zip_path), mod_id=mod_id, files=files_list,
        )
        log(f"[ModBuild] Job {job_id} complete -> {zip_path.name}")
    except Exception as exc:
        _job_update(job_id, status="error", message=str(exc))
        log(f"[ModBuild] Job {job_id} FAILED: {exc}")

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ModBuildReq(BaseModel):
    concept:     str
    faction:     str = "Mossy Industries"
    theme:       str = "biological horror"
    mod_id:      Optional[str] = None
    model:       Optional[str] = None
    quest_name:  Optional[str] = None
    npc_name:    Optional[str] = None
    description: Optional[str] = None
    stages:      Optional[List[dict]] = None

class QuestSave(BaseModel):
    title:    str
    editor_id: str = ""
    synopsis: str = ""
    stages:   str = ""
    factions: str = ""
    npcs:     str = ""
    status:   str = "planning"

class NPCSave(BaseModel):
    name:        str
    faction:     str = ""
    role:        str = ""
    personality: str = ""
    backstory:   str = ""
    voice_type:  str = "MaleBoston"
    editor_id:   str = ""
    notes:       str = ""

class LoreEntry(BaseModel):
    category: str
    title:    str
    content:  str
    tags:     str = ""
    source:   str = "manual"

class FactionSave(BaseModel):
    name:      str
    summary:   str = ""
    alignment: str = ""
    notes:     str = ""

class LocationSave(BaseModel):
    name:        str
    type:        str = ""
    region:      str = ""
    description: str = ""
    encounters:  str = ""
    notes:       str = ""

class GenerateReq(BaseModel):
    prompt: str
    model:  Optional[str] = None

class ConsistencyReq(BaseModel):
    content: str

class BroadcastReq(BaseModel):
    type:    str
    payload: dict = {}

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

@asynccontextmanager
async def _lifespan(application):
    log("[CD] Starting Creative Director v2.1...")
    _init_chroma()
    await _probe_ollama()
    if WS_OK:
        asyncio.create_task(_peer_loop("ai_helper",       CFG["ai_helper_ws"]))
        asyncio.create_task(_peer_loop("virtual_mod_lab", CFG["vml_ws"]))
    else:
        log("[WRN] websockets not installed -- peer networking disabled")
    if RICH_OK and Panel:
        _console.print(Panel.fit(
            "[bold cyan]Creative Director v2.1[/bold cyan]  port " + str(CFG["port"]) + "\n"
            "Chroma: " + ("ON" if CHROMA_OK else "OFF") + "  "
            "Ollama: " + ("LIVE" if _ollama_live else "offline") + "  "
            "WS: " + ("ON" if WS_OK else "OFF") + "\n"
            "Docs: http://localhost:" + str(CFG["port"]) + "/docs",
            title="MOSSY INDUSTRIES",
        ))
    yield
    log("[CD] Shutting down...")

app = FastAPI(
    title="Vault-Tec Creative Director",
    version="2.1.0",
    description="FO4 narrative AI",
    lifespan=_lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# -- Health -------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status":  "online",
        "agent":   "creative_director",
        "version": "2.1.0",
        "chroma":  CHROMA_OK and _chroma_col is not None,
        "ollama":  _ollama_live,
        "ollama_models": _ollama_models,
        "websockets": WS_OK,
        "peers": {k: {"connected": v["connected"], "error": v["error"]} for k, v in _peers.items()},
        "db_counts": {
            "npcs":      len(sql_rows("SELECT id FROM npcs")),
            "factions":  len(sql_rows("SELECT id FROM factions")),
            "locations": len(sql_rows("SELECT id FROM locations")),
            "quests":    len(sql_rows("SELECT id FROM quests")),
            "lore_entries": len(sql_rows("SELECT id FROM lore_entries")),
            "peer_findings_unread": len(sql_rows("SELECT id FROM peer_findings WHERE processed=0")),
        },
    }

@app.get("/peers")
async def peers():
    return _peers

# -- Generate -----------------------------------------------------------------

@app.post("/generate")
async def generate(req: GenerateReq):
    try:
        text = await generate_local(req.prompt, req.model)
        return {"output": text, "model": req.model or CFG["ollama_model"]}
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

# -- Lore ---------------------------------------------------------------------

@app.get("/lore/search")
async def lore_search(q: str = Query(..., min_length=1), n: int = 8):
    return {
        "semantic": chroma_query(q, n=n),
        "keyword": sql_rows(
            "SELECT * FROM lore_entries WHERE title LIKE ? OR content LIKE ? LIMIT 20",
            ("%" + q + "%", "%" + q + "%"),
        ),
    }

@app.get("/lore")
async def lore_list():
    return sql_rows("SELECT * FROM lore_entries ORDER BY created DESC")

@app.post("/lore")
async def lore_add(entry: LoreEntry):
    row_id = sql_exec(
        "INSERT INTO lore_entries (category,title,content,tags,source) VALUES (?,?,?,?,?)",
        (entry.category, entry.title, entry.content, entry.tags, entry.source),
    )
    chroma_upsert("lore_" + str(row_id), entry.content,
                  {"id": row_id, "category": entry.category, "title": entry.title,
                   "tags": entry.tags, "source": entry.source})
    return {"id": row_id, "status": "saved"}

@app.delete("/lore/{entry_id}")
async def lore_delete(entry_id: int):
    sql_exec("DELETE FROM lore_entries WHERE id=?", (entry_id,))
    chroma_delete("lore_" + str(entry_id))
    return {"status": "deleted"}

# -- Consistency --------------------------------------------------------------

@app.post("/consistency")
async def consistency(req: ConsistencyReq):
    return _consistency_check(req.content)

# -- NPCs ---------------------------------------------------------------------

@app.get("/npcs")
async def npc_list():
    return sql_rows("SELECT * FROM npcs ORDER BY created DESC")

@app.post("/npcs")
async def npc_save(npc: NPCSave):
    editor_id = npc.editor_id.strip() or None
    try:
        row_id = sql_exec(
            "INSERT INTO npcs (name,faction,role,personality,backstory,voice_type,editor_id,notes) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (npc.name, npc.faction, npc.role, npc.personality,
             npc.backstory, npc.voice_type, editor_id, npc.notes),
        )
    except sqlite3.IntegrityError:
        row = sql_rows("SELECT id FROM npcs WHERE name=?", (npc.name,))
        if not row:
            raise HTTPException(409, "NPC name conflict")
        row_id = row[0]["id"]
        sql_exec(
            "UPDATE npcs SET faction=?,role=?,personality=?,backstory=?,voice_type=?,editor_id=?,notes=? WHERE id=?",
            (npc.faction, npc.role, npc.personality, npc.backstory,
             npc.voice_type, editor_id, npc.notes, row_id),
        )
    bio = npc.name + " (" + npc.faction + ") -- " + npc.personality + ". " + npc.backstory
    chroma_upsert("npc_" + str(row_id), bio,
                  {"id": row_id, "name": npc.name, "faction": npc.faction, "category": "npc"})
    return {"id": row_id, "status": "saved"}

@app.delete("/npcs/{npc_id}")
async def npc_delete(npc_id: int):
    sql_exec("DELETE FROM npcs WHERE id=?", (npc_id,))
    chroma_delete("npc_" + str(npc_id))
    return {"status": "deleted"}

# -- Quests -------------------------------------------------------------------

@app.get("/quests")
async def quest_list():
    return sql_rows("SELECT * FROM quests ORDER BY created DESC")

@app.post("/quests")
async def quest_save(quest: QuestSave):
    editor_id = quest.editor_id.strip() or None
    try:
        row_id = sql_exec(
            "INSERT INTO quests (title,editor_id,synopsis,stages,factions,npcs,status) VALUES (?,?,?,?,?,?,?)",
            (quest.title, editor_id, quest.synopsis, quest.stages,
             quest.factions, quest.npcs, quest.status),
        )
    except sqlite3.IntegrityError:
        row = sql_rows("SELECT id FROM quests WHERE editor_id=?", (editor_id,))
        if not row:
            raise HTTPException(409, "Quest editor_id conflict")
        row_id = row[0]["id"]
        sql_exec(
            "UPDATE quests SET title=?,synopsis=?,stages=?,factions=?,npcs=?,status=? WHERE id=?",
            (quest.title, quest.synopsis, quest.stages,
             quest.factions, quest.npcs, quest.status, row_id),
        )
    chroma_upsert("quest_" + str(row_id), quest.title + ": " + quest.synopsis,
                  {"id": row_id, "title": quest.title, "status": quest.status, "category": "quest"})
    return {"id": row_id, "status": "saved"}

@app.delete("/quests/{quest_id}")
async def quest_delete(quest_id: int):
    sql_exec("DELETE FROM quests WHERE id=?", (quest_id,))
    chroma_delete("quest_" + str(quest_id))
    return {"status": "deleted"}

# -- Factions -----------------------------------------------------------------

@app.get("/factions")
async def faction_list():
    return sql_rows("SELECT * FROM factions ORDER BY created DESC")

@app.post("/factions")
async def faction_save(faction: FactionSave):
    try:
        row_id = sql_exec(
            "INSERT INTO factions (name,summary,alignment,notes) VALUES (?,?,?,?)",
            (faction.name, faction.summary, faction.alignment, faction.notes),
        )
    except sqlite3.IntegrityError:
        row = sql_rows("SELECT id FROM factions WHERE name=?", (faction.name,))
        row_id = row[0]["id"]
        sql_exec(
            "UPDATE factions SET summary=?,alignment=?,notes=? WHERE id=?",
            (faction.summary, faction.alignment, faction.notes, row_id),
        )
    chroma_upsert("faction_" + str(row_id), faction.name + ": " + faction.summary,
                  {"id": row_id, "name": faction.name, "category": "faction"})
    return {"id": row_id, "status": "saved"}

@app.delete("/factions/{faction_id}")
async def faction_delete(faction_id: int):
    sql_exec("DELETE FROM factions WHERE id=?", (faction_id,))
    chroma_delete("faction_" + str(faction_id))
    return {"status": "deleted"}

# -- Locations ----------------------------------------------------------------

@app.get("/locations")
async def location_list():
    return sql_rows("SELECT * FROM locations ORDER BY created DESC")

@app.post("/locations")
async def location_save(loc: LocationSave):
    try:
        row_id = sql_exec(
            "INSERT INTO locations (name,type,region,description,encounters,notes) VALUES (?,?,?,?,?,?)",
            (loc.name, loc.type, loc.region, loc.description, loc.encounters, loc.notes),
        )
    except sqlite3.IntegrityError:
        row = sql_rows("SELECT id FROM locations WHERE name=?", (loc.name,))
        row_id = row[0]["id"]
        sql_exec(
            "UPDATE locations SET type=?,region=?,description=?,encounters=?,notes=? WHERE id=?",
            (loc.type, loc.region, loc.description, loc.encounters, loc.notes, row_id),
        )
    chroma_upsert("loc_" + str(row_id),
                  loc.name + " (" + loc.type + ", " + loc.region + "): " + loc.description,
                  {"id": row_id, "name": loc.name, "type": loc.type, "category": "location"})
    return {"id": row_id, "status": "saved"}

@app.delete("/locations/{loc_id}")
async def location_delete(loc_id: int):
    sql_exec("DELETE FROM locations WHERE id=?", (loc_id,))
    chroma_delete("loc_" + str(loc_id))
    return {"status": "deleted"}

# -- Peer findings (Network Feed) ---------------------------------------------

@app.get("/findings")
async def findings_list(unread_only: bool = False):
    if unread_only:
        return sql_rows("SELECT * FROM peer_findings WHERE processed=0 ORDER BY created DESC")
    return sql_rows("SELECT * FROM peer_findings ORDER BY created DESC LIMIT 100")

@app.post("/findings/{finding_id}/read")
async def finding_mark_read(finding_id: int):
    sql_exec("UPDATE peer_findings SET processed=1 WHERE id=?", (finding_id,))
    return {"status": "marked_read"}

@app.post("/findings/read_all")
async def findings_mark_all_read():
    sql_exec("UPDATE peer_findings SET processed=1 WHERE processed=0")
    return {"status": "all_marked_read"}

# -- Narrative debug ----------------------------------------------------------

@app.post("/debug/narrative")
async def debug_narrative(req: ConsistencyReq):
    check = _consistency_check(req.content)
    suggestions = []
    if not check["consistent"]:
        for w in check["warnings"]:
            suggestions.append("Fix: " + w)
    if check["similar_lore"]:
        top = check["similar_lore"][0]
        suggestions.append(
            "Similar existing lore (score " + str(top["score"]) + "): " + top["metadata"].get("title","")
        )
    return {**check, "suggestions": suggestions}


# -- Mossy panel API ------------------------------------------------------------
# The routes Mossy's Creative Director panel calls (CreativeDirectorPanel.tsx).
# Each answers from the local LLM / lore store, or fails with an HTTP error the
# panel already handles by falling back to its offline template; none invents a
# result when the model is unavailable.

def _papyrus_checks(script: str) -> list:
    """Static Fallout 4 Papyrus checks. FO4 has no RegisterForSingleUpdate/OnUpdate
    (those are Skyrim); FO4 timers are StartTimer/CancelTimer + Event OnTimer."""
    out = []
    if not script.strip():
        return [{"level": "error", "msg": "No script provided - paste your Papyrus script above."}]
    if not re.search(r"(?im)^\s*scriptname\s+\w+", script):
        out.append({"level": "error", "msg": "Missing 'Scriptname <Name> extends <Type>' header - the script will not compile."})
    if re.search(r"\bRegisterForSingleUpdate\b|\bRegisterForUpdate\b|\bEvent\s+OnUpdate\b", script):
        out.append({"level": "error", "msg": "RegisterForSingleUpdate / RegisterForUpdate / OnUpdate do not exist in Fallout 4 Papyrus (Skyrim only). Use StartTimer(seconds, id) and Event OnTimer(int aiTimerID)."})
    if re.search(r"Game\.GetForm\(\s*0x", script):
        out.append({"level": "warn", "msg": "Hard-coded FormID in Game.GetForm() - load-order dependent. Use a property, or Game.GetFormFromFile(id, \"Plugin.esp\")."})
    if re.search(r"(?is)Event\s+On\w+.*?Utility\.Wait\(", script):
        out.append({"level": "warn", "msg": "Utility.Wait() inside an event handler blocks that event; repeated triggers queue up. Use a timer (StartTimer) or a state."})
    if "GetStage" in script and "SetStage" not in script:
        out.append({"level": "warn", "msg": "Reads the quest stage but never calls SetStage - stages may never advance."})
    if not out:
        out.append({"level": "ok", "msg": "No issues found by the static checks. Compile with PapyrusCompiler to confirm."})
    return out

def _strip_fences(text: str) -> str:
    m = re.search(r"```[a-zA-Z]*\n(.*?)```", text, re.S)
    return (m.group(1) if m else text).strip()

@app.get("/status")
async def mossy_status():
    return {"service": "creative_director", "port": CFG.get("port", 8767), "ollama": _ollama_live,
            "model": CFG.get("ollama_model") or None, "lore_search": _chroma_col is not None}

@app.post("/api/quest/generate")
async def mossy_quest_generate(quest: Dict[str, Any]):
    stages = "\n".join(f"- Stage {s.get('index')}: {s.get('description','')}" for s in quest.get("stages", []))
    prompt = (
        "Write a Fallout 4 Papyrus quest script (Scriptname <Name>QuestScript extends Quest) for this quest. "
        "Use only real Fallout 4 Papyrus functions; FO4 has no RegisterForSingleUpdate/OnUpdate (use StartTimer/OnTimer). "
        "Use properties for forms, never hard-coded FormIDs. Return only the script.\n\n"
        f"Name: {quest.get('name','')}\nType: {quest.get('type','')}\nLocation: {quest.get('location','')}\n"
        f"Description: {quest.get('description','')}\nStages:\n{stages}\n"
        f"Rewards: {quest.get('rewards',{}).get('caps',0)} caps, {quest.get('rewards',{}).get('xp',0)} XP"
    )
    try:
        script = _strip_fences(await generate_local(prompt))
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    return {"script": f"; UNVERIFIED DRAFT from a local AI model ({CFG.get('ollama_model') or 'local'}).\n; Local models often write Papyrus that does not compile (invented syntax or functions).\n; Treat this as an outline: check every line against the Creation Kit wiki and compile it with PapyrusCompiler.\n{script}"}

@app.post("/api/dialogue/generate")
async def mossy_dialogue_generate(req: Dict[str, Any]):
    existing = "\n".join(f"{l.get('speaker')}: {l.get('text')}" for l in req.get("existingLines", []))
    prompt = (
        "Write the next 4 to 6 lines of a Fallout 4 dialogue exchange. Return ONLY a JSON array of objects with keys "
        "speaker ('player' or 'npc'), text, condition (a real FO4 condition function such as GetStage or GetIsID, or ''). "
        f"NPC: {req.get('npcName','')} (voice type {req.get('voiceType','')}).\nContext: {req.get('context','')}\n"
        f"Lines so far:\n{existing or '(none)'}"
    )
    try:
        raw = _strip_fences(await generate_local(prompt))
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    m = re.search(r"\[.*\]", raw, re.S)
    try:
        items = json.loads(m.group(0) if m else raw)
    except Exception:
        raise HTTPException(502, "The model did not return valid JSON dialogue lines; try again or use a larger model.")
    lines = []
    for it in items if isinstance(items, list) else []:
        if isinstance(it, dict) and str(it.get("text", "")).strip():
            lines.append({"id": uuid.uuid4().hex[:8], "speaker": "player" if it.get("speaker") == "player" else "npc",
                          "text": str(it["text"]).strip(), "condition": str(it.get("condition") or "")})
    if not lines:
        raise HTTPException(502, "The model returned no usable dialogue lines.")
    return {"lines": lines}

@app.post("/api/npc/backstory")
async def mossy_npc_backstory(npc: Dict[str, Any]):
    prompt = (
        "Write a 2-paragraph backstory for this Fallout 4 NPC, consistent with the Commonwealth in 2287. Plain text only.\n"
        f"Name: {npc.get('name','')}\nRace: {npc.get('race','')}\nGender: {npc.get('gender','')}\n"
        f"Factions: {', '.join(npc.get('factions', []))}\nTraits: {', '.join(npc.get('personalityTraits', []))}\n"
        f"Voice type: {npc.get('voiceType','')}"
    )
    try:
        return {"backstory": _strip_fences(await generate_local(prompt))}
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

@app.post("/api/lore/search")
async def mossy_lore_search(req: Dict[str, Any]):
    q = str(req.get("query", "")).strip()
    if not q:
        return {"results": []}
    results = [f"{h['metadata'].get('title','')}: {h['content'][:220]} (match {h['score']})" for h in chroma_query(q, n=8)]
    seen = {r.split(':', 1)[0] for r in results}
    for row in sql_rows("SELECT title, content FROM lore_entries WHERE title LIKE ? OR content LIKE ? LIMIT 10", ("%" + q + "%", "%" + q + "%")):
        if row["title"] not in seen:
            results.append(f"{row['title']}: {row['content'][:220]}")
    return {"results": results}

@app.post("/api/world/design")
async def mossy_world_design(req: Dict[str, Any]):
    prompt = (
        "Write a Fallout 4 level design brief for this location: layout, environmental storytelling, enemy placement, "
        "navmesh and precombine/previs notes. Plain text.\n" + "\n".join(f"{k}: {v}" for k, v in req.items())
    )
    try:
        return {"brief": _strip_fences(await generate_local(prompt))}
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

@app.post("/api/debug/narrative")
async def mossy_debug_narrative(req: Dict[str, Any]):
    return {"results": _papyrus_checks(str(req.get("script", "")))}

# -- Broadcast ----------------------------------------------------------------

@app.post("/broadcast")
async def broadcast(req: BroadcastReq):
    payload = {"type": req.type, "agent": "creative_director", **req.payload}
    await _broadcast(payload)
    return {"status": "sent", "type": req.type, "peers": list(_ws_sockets.keys())}

# -- Mod Build Pipeline -------------------------------------------------------

@app.post("/mod/build")
async def mod_build(req: ModBuildReq):
    concept = req.concept.strip()
    if not concept:
        raise HTTPException(400, "concept is required")
    job_id = str(uuid.uuid4())
    raw_mod_id = req.mod_id or ("Mossy_" + concept[:20].replace(" ", "_"))
    # mod_id is used as a Papyrus Scriptname, a Pascal unit name, and a filename —
    # all three reject punctuation, so strip anything that isn't safe in any of them
    # (previously this was raw user/concept text, e.g. an apostrophe in the concept
    # would break the generated .psc/.pas syntax and could produce an invalid filename)
    mod_id = re.sub(r"[^A-Za-z0-9_]", "", raw_mod_id).strip("_") or ("Mossy_" + job_id[:8])
    if mod_id[0].isdigit():
        mod_id = "Mossy_" + mod_id
    spec = {
        "mod_id":      mod_id,
        "quest_name":  req.quest_name  or ("The " + concept),
        "npc_name":    req.npc_name    or (req.faction + " Agent"),
        "description": req.description or ("A " + req.faction + " quest: " + concept + ". Theme: " + req.theme + "."),
        "faction":     req.faction,
        "theme":       req.theme,
        "voice_type":  "MaleBoston",
        "stages": req.stages or [
            {"index": 10,  "label": "Quest Begins"},
            {"index": 20,  "label": "Investigate"},
            {"index": 50,  "label": "Confrontation"},
            {"index": 100, "label": "Resolution"},
            {"index": 200, "label": "Complete"},
        ],
    }
    _build_jobs[job_id] = {
        "job_id":   job_id,
        "status":   "queued",
        "progress": 0,
        "message":  "Queued",
        "spec":     spec,
        "created":  datetime.now().isoformat(),
        "updated":  datetime.now().isoformat(),
        "zip_path": None,
        "files":    [],
        "mod_id":   mod_id,
    }
    asyncio.create_task(_run_mod_build(job_id, spec))
    return {"job_id": job_id, "status": "queued", "mod_id": mod_id}

@app.get("/mod/jobs")
async def mod_jobs_list():
    return list(_build_jobs.values())

@app.get("/mod/jobs/{job_id}")
async def mod_job_get(job_id: str):
    job = _build_jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job

@app.get("/mod/download/{job_id}")
async def mod_download(job_id: str):
    from fastapi.responses import FileResponse
    job = _build_jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "complete":
        raise HTTPException(409, "Job not complete (status: " + job["status"] + ")")
    zip_path = Path(job["zip_path"])
    if not zip_path.exists():
        raise HTTPException(404, "ZIP file missing")
    return FileResponse(str(zip_path), media_type="application/zip", filename=zip_path.name)

@app.delete("/mod/jobs/{job_id}")
async def mod_job_delete(job_id: str):
    job = _build_jobs.pop(job_id, None)
    if not job:
        raise HTTPException(404, "Job not found")
    job_dir  = MOD_OUTPUT_DIR / job_id
    zip_path = MOD_OUTPUT_DIR / (job_id + ".zip")
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)
    if zip_path.exists():
        zip_path.unlink(missing_ok=True)
    return {"status": "deleted"}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "creative_director:app",
        host="127.0.0.1",
        port=CFG["port"],
        reload=False,
        log_level="info",
    )
