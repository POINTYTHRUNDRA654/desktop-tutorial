#!/usr/bin/env python3
"""
f4ai_scanner.py  —  F4AI Live Diagnostic Overlay
=================================================
A small always-on-top panel that floats over the game showing exactly
what the F4AI system is doing in real time.

Run this in a SECOND window while the bridge is already running:
    python f4ai_scanner.py

Drag it to any corner of the screen. Press X to close.
"""

import tkinter as tk
import threading
import time
import json
import sqlite3
import os
from pathlib import Path
from datetime import datetime

try:
    import requests
    _REQUESTS_OK = True
except ImportError:
    _REQUESTS_OK = False

try:
    import speech_recognition as sr
    _SR_OK = True
except ImportError:
    _SR_OK = False

try:
    import sounddevice as _sd
    import numpy as _np
    _SD_OK = True
except ImportError:
    _SD_OK = False

# Voice is available if we have speech_recognition + either pyaudio or sounddevice
_VOICE_OK = _SR_OK and (_SD_OK or _SR_OK)

# ─────────────────────────────────────────────────────────────────────────────
# Session log — written to H:\Mossy Memory\scanner_log.txt (or Documents)
# ─────────────────────────────────────────────────────────────────────────────

_MOSSY_LOG_DIR = Path(r"H:\Mossy Memory") if Path(r"H:\Mossy Memory").exists() \
                 else Path.home() / "Documents" / "My Games" / "Fallout4"
SESSION_LOG    = _MOSSY_LOG_DIR / "f4ai_session_log.txt"

def _log(tag: str, msg: str):
    """Append a timestamped line to the session log file."""
    try:
        ts   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{ts}] [{tag}] {msg}\n"
        with open(SESSION_LOG, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass

# Write session header on start
_log("SCANNER", f"=== F4AI Scanner session started ===")

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────

BRIDGE_URL  = "http://localhost:28485"
OLLAMA_URL  = "http://localhost:11434"
REFRESH_MS  = 2000   # update every 2 seconds

_MOSSY_MEM  = Path(r"H:\Mossy Memory")
_DOCS_MEM   = Path.home() / "Documents" / "My Games" / "Fallout4"
MEMORY_DB   = (_MOSSY_MEM / "AdvancedAI_Memory.db") if _MOSSY_MEM.exists() else (_DOCS_MEM / "AdvancedAI_Memory.db")
PAPYRUS_LOG = Path.home() / "Documents" / "My Games" / "Fallout4" / "Logs" / "Script" / "Papyrus.0.log"

MO2_OVERWRITES = Path(r"E:\Mod.Organizer-2.5.2 Overwrites\F4AI")
MO2_MOD_F4AI   = Path(r"E:\Mod.Organizer-2.5.2 Game Mods\Fallout 4 Advanced AI - Mossy Industries\F4AI")
WATCH_DIRS     = [MO2_OVERWRITES, MO2_MOD_F4AI, Path(r"E:\Steam\steamapps\common\Fallout 4\Data\F4AI")]

# ─────────────────────────────────────────────────────────────────────────────
# Colours
# ─────────────────────────────────────────────────────────────────────────────

BG          = "#0d1117"
BG2         = "#161b22"
BG3         = "#21262d"
GREEN       = "#3fb950"
RED         = "#f85149"
YELLOW      = "#d29922"
BLUE        = "#58a6ff"
PURPLE      = "#bc8cff"
GREY        = "#8b949e"
WHITE       = "#e6edf3"
ORANGE      = "#d18616"

# ─────────────────────────────────────────────────────────────────────────────
# Data collection (runs in background thread)
# ─────────────────────────────────────────────────────────────────────────────

_prev_state = {}   # track changes so we only log when something changes

_state = {
    "bridge_ok":        False,
    "bridge_version":   "?",
    "bridge_actors":    0,
    "bridge_errors":    0,
    "mod_enabled":      False,
    "quest_active":     False,
    "game_running":     False,
    "modules":          {},
    "last_log":         "",

    "ollama_ok":        False,
    "ollama_models":    [],
    "ollama_active":    "",

    "memory_ok":        False,
    "npc_count":        0,
    "dialogue_count":   0,
    "last_npc":         "",
    "last_npc_line":    "",
    "last_player_line": "",
    "last_dialogue_ts": "",

    "pending_request":  False,
    "pending_npc":      "",
    "pending_loc":      "",

    "file_activity":    "",
    "file_activity_ts": "",

    "aai_lines":        [],

    "errors":           [],

    "voice_state":      "idle",   # idle | listening | transcribing | sending | done | error
    "voice_player":     "",       # what the player said
    "voice_npc_name":   "Stranger",
    "voice_response":   "",       # what NPC said back
    "voice_error":      "",
}
_lock = threading.Lock()


def _safe_get(url, timeout=2):
    if not _REQUESTS_OK:
        return None
    try:
        r = requests.get(url, timeout=timeout)
        if r.ok:
            return r.json()
    except Exception:
        pass
    return None


def _poll_bridge():
    status   = _safe_get(f"{BRIDGE_URL}/status")
    pending  = _safe_get(f"{BRIDGE_URL}/request/pending")
    log_data = _safe_get(f"{BRIDGE_URL}/log?n=8")

    with _lock:
        was_ok = _state["bridge_ok"]
        if status:
            _state["bridge_ok"]      = True
            _state["bridge_version"] = status.get("bridge_version", "?")
            _state["bridge_actors"]  = status.get("actors_overridden", 0)
            _state["bridge_errors"]  = status.get("session_errors", 0)
            _state["mod_enabled"]    = status.get("mod_enabled", False)
            _state["game_running"]   = status.get("game_running", False)
            _state["modules"]        = status.get("modules", {})
            _state["last_log"]       = status.get("last_log_line", "")
            _state["quest_active"]   = status.get("mod_enabled", False)
            if not was_ok:
                _log("BRIDGE", f"CONNECTED — v{_state['bridge_version']}")
        else:
            _state["bridge_ok"] = False
            if was_ok:
                _log("BRIDGE", "DISCONNECTED — bridge stopped or crashed")

        if pending:
            was_pending = _prev_state.get("pending_request", False)
            is_pending  = pending.get("pending", False)
            _state["pending_request"] = is_pending
            payload = pending.get("payload", {})
            _state["pending_npc"] = payload.get("npc_name", "")
            _state["pending_loc"] = payload.get("location", "")
            if is_pending and not was_pending:
                _log("REQUEST", f"NPC={_state['pending_npc']} loc={_state['pending_loc']}")
            _prev_state["pending_request"] = is_pending

        if log_data:
            lines = log_data.get("lines", [])
            new_lines = [l.get("line", "") for l in lines[-5:]]
            old_lines = _state.get("aai_lines", [])
            _state["aai_lines"] = new_lines
            for line in new_lines:
                if line and line not in old_lines:
                    _log("AAI", line)


def _poll_ollama():
    data = _safe_get(f"{OLLAMA_URL}/api/tags", timeout=2)
    preferred = ["llama3.1:8b", "llama3:8b", "llama3:latest", "mistral:7b",
                 "gemma2:9b", "phi4-mini", "llama3.2:3b", "tinyllama"]
    with _lock:
        was_ok = _state["ollama_ok"]
        if data:
            models = [m["name"] for m in data.get("models", [])]
            _state["ollama_ok"]     = True
            _state["ollama_models"] = models
            active = next((m for p in preferred
                           for m in models if p in m), models[0] if models else "")
            _state["ollama_active"] = active
            if not was_ok:
                _log("OLLAMA", f"CONNECTED — {len(models)} models. Active: {active}")
        else:
            _state["ollama_ok"]     = False
            _state["ollama_models"] = []
            _state["ollama_active"] = ""
            if was_ok:
                _log("OLLAMA", "DISCONNECTED")


def _poll_memory():
    if not MEMORY_DB.exists():
        with _lock:
            _state["memory_ok"] = False
        return
    try:
        conn = sqlite3.connect(str(MEMORY_DB), timeout=2)
        conn.row_factory = sqlite3.Row

        # Count NPCs
        npc_count = conn.execute(
            "SELECT COUNT(*) FROM npc_identities"
        ).fetchone()[0]

        # Count dialogue lines
        try:
            dial_count = conn.execute(
                "SELECT COUNT(*) FROM dialogue_history"
            ).fetchone()[0]
        except Exception:
            try:
                dial_count = conn.execute(
                    "SELECT COUNT(*) FROM npc_dialogue_history"
                ).fetchone()[0]
            except Exception:
                dial_count = 0

        # Last dialogue entry
        last_npc = last_npc_line = last_player = last_ts = ""
        try:
            row = conn.execute("""
                SELECT npc_name, npc_line, player_line, timestamp
                FROM npc_dialogue_history
                ORDER BY timestamp DESC LIMIT 1
            """).fetchone()
            if row:
                last_npc        = row[0] or ""
                last_npc_line   = (row[1] or "")[:60]
                last_player     = (row[2] or "")[:60]
                last_ts         = row[3] or ""
        except Exception:
            try:
                row = conn.execute("""
                    SELECT npc_id, line, real_time
                    FROM dialogue_history
                    ORDER BY real_time DESC LIMIT 1
                """).fetchone()
                if row:
                    last_npc        = row[0] or ""
                    last_npc_line   = (row[1] or "")[:60]
                    last_ts         = row[2] or ""
            except Exception:
                pass

        conn.close()
        with _lock:
            prev_count = _state.get("dialogue_count", 0)
            _state["memory_ok"]        = True
            _state["npc_count"]        = npc_count
            _state["dialogue_count"]   = dial_count
            _state["last_npc"]         = last_npc
            _state["last_npc_line"]    = last_npc_line
            _state["last_player_line"] = last_player
            _state["last_dialogue_ts"] = last_ts
            if dial_count > prev_count and last_npc:
                _log("MEMORY", f"Saved dialogue — NPC: {last_npc} | {last_npc_line[:60]}")
    except Exception as e:
        with _lock:
            _state["memory_ok"] = False


def _poll_files():
    """Check for recent bridge_input / text_out file activity."""
    now = time.time()
    for d in WATCH_DIRS:
        if not d.exists():
            continue
        for f in d.iterdir():
            if f.name.startswith("bridge_input") and f.suffix == ".json":
                age = now - f.stat().st_mtime
                if age < 10:
                    ts  = datetime.now().strftime("%H:%M:%S")
                    msg = f"IN:  {f.name} ({age:.1f}s ago)"
                    with _lock:
                        if _state["file_activity"] != msg:
                            _log("FILE", msg)
                        _state["file_activity"]    = msg
                        _state["file_activity_ts"] = ts
                    return
            if f.name.startswith("text_out") and f.suffix == ".txt":
                age = now - f.stat().st_mtime
                if age < 10:
                    content = ""
                    try:
                        content = f.read_text(encoding="utf-8", errors="replace")[:80]
                    except Exception:
                        pass
                    ts  = datetime.now().strftime("%H:%M:%S")
                    msg = f"OUT: {f.name} → {content}"
                    with _lock:
                        if _state["file_activity"] != msg:
                            _log("FILE", msg)
                            _log("RESPONSE", content)
                        _state["file_activity"]    = msg
                        _state["file_activity_ts"] = ts
                    return


def _poll_papyrus():
    """Tail the last 30 lines of Papyrus.0.log for [AAI] or [F4AI] lines."""
    if not PAPYRUS_LOG.exists():
        return
    try:
        with open(PAPYRUS_LOG, "r", encoding="utf-8", errors="replace") as f:
            # Read last 4KB
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 4096))
            tail = f.read()
        aai = [l.strip() for l in tail.splitlines()
               if "[AAI" in l or "[F4AI]" in l or "Advanced AI" in l]
        with _lock:
            if aai:
                _state["aai_lines"] = aai[-5:]
                _state["quest_active"] = True
    except Exception:
        pass


def _background_loop():
    while True:
        try:
            _poll_bridge()
            _poll_ollama()
            _poll_memory()
            _poll_files()
            if not _state["bridge_ok"]:
                _poll_papyrus()
        except Exception as e:
            with _lock:
                _state["errors"] = [str(e)]
        time.sleep(REFRESH_MS / 1000)


# ─────────────────────────────────────────────────────────────────────────────
# GUI
# ─────────────────────────────────────────────────────────────────────────────

class Scanner(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("F4AI Scanner")
        self.configure(bg=BG)
        self.attributes("-topmost", True)
        self.attributes("-alpha", 0.92)
        self.resizable(False, False)
        self.overrideredirect(True)   # no title bar — we draw our own

        # Position: top-right corner
        sw = self.winfo_screenwidth()
        self.geometry(f"310x660+{sw - 325}+10")

        self._drag_x = 0
        self._drag_y = 0

        self._build_ui()
        self._start_bg()
        self._schedule_refresh()

    # ── Window drag ──────────────────────────────────────────────────────────

    def _on_drag_start(self, event):
        self._drag_x = event.x
        self._drag_y = event.y

    def _on_drag(self, event):
        x = self.winfo_x() + event.x - self._drag_x
        y = self.winfo_y() + event.y - self._drag_y
        self.geometry(f"+{x}+{y}")

    # ── Build layout ─────────────────────────────────────────────────────────

    def _build_ui(self):
        # Title bar
        title_bar = tk.Frame(self, bg=BG3, height=28)
        title_bar.pack(fill="x")
        title_bar.bind("<ButtonPress-1>",   self._on_drag_start)
        title_bar.bind("<B1-Motion>",       self._on_drag)

        tk.Label(title_bar, text="⚙  F4AI SCANNER", bg=BG3, fg=PURPLE,
                 font=("Consolas", 10, "bold")).pack(side="left", padx=8, pady=4)
        tk.Button(title_bar, text="✕", bg=BG3, fg=GREY,
                  relief="flat", font=("Consolas", 9),
                  command=self.destroy, cursor="hand2").pack(side="right", padx=6)

        body = tk.Frame(self, bg=BG, padx=8, pady=4)
        body.pack(fill="both", expand=True)

        # ── System status row ─────────────────────────────────────────────────
        self._mk_section(body, "SYSTEM STATUS")
        row1 = tk.Frame(body, bg=BG)
        row1.pack(fill="x", pady=(0, 4))

        self.lbl_bridge  = self._dot_label(row1, "Bridge")
        self.lbl_ollama  = self._dot_label(row1, "Ollama")
        self.lbl_quest   = self._dot_label(row1, "Quest")
        self.lbl_game    = self._dot_label(row1, "Game")

        # ── Quest modules ─────────────────────────────────────────────────────
        row2 = tk.Frame(body, bg=BG)
        row2.pack(fill="x", pady=(0, 6))
        self.lbl_mods = tk.Label(row2, text="Modules: —", bg=BG, fg=GREY,
                                 font=("Consolas", 8))
        self.lbl_mods.pack(side="left")

        # ── Ollama model ──────────────────────────────────────────────────────
        self._mk_section(body, "AI ENGINE")
        self.lbl_engine = tk.Label(body, text="Checking...", bg=BG, fg=GREY,
                                   font=("Consolas", 8), wraplength=290, justify="left")
        self.lbl_engine.pack(fill="x", pady=(0, 6))

        # ── File activity ─────────────────────────────────────────────────────
        self._mk_section(body, "BRIDGE FILE ACTIVITY")
        self.lbl_files = tk.Label(body, text="No activity yet", bg=BG2, fg=GREY,
                                  font=("Consolas", 8), wraplength=290, justify="left",
                                  padx=6, pady=4)
        self.lbl_files.pack(fill="x", pady=(0, 6))

        # ── Last interaction ──────────────────────────────────────────────────
        self._mk_section(body, "LAST NPC INTERACTION")
        self.lbl_npc = tk.Label(body, text="None yet", bg=BG2, fg=GREY,
                                font=("Consolas", 8), wraplength=290, justify="left",
                                padx=6, pady=4)
        self.lbl_npc.pack(fill="x", pady=(0, 6))

        # ── Memory stats ──────────────────────────────────────────────────────
        self._mk_section(body, "MEMORY DATABASE")
        self.lbl_mem = tk.Label(body, text="Checking...", bg=BG, fg=GREY,
                                font=("Consolas", 8), justify="left")
        self.lbl_mem.pack(fill="x", pady=(0, 6))

        # ── Recent AAI log ────────────────────────────────────────────────────
        self._mk_section(body, "PAPYRUS LOG  [AAI lines]")
        self.lbl_log = tk.Label(body, text="No [AAI] lines yet — quest may not be running",
                                bg=BG2, fg=GREY, font=("Consolas", 7),
                                wraplength=290, justify="left", padx=6, pady=4)
        self.lbl_log.pack(fill="x", pady=(0, 4))

        # ── Voice Chat ────────────────────────────────────────────────────────
        self._mk_section(body, "VOICE CHAT  (Push-to-Talk)")

        vc_top = tk.Frame(body, bg=BG)
        vc_top.pack(fill="x", pady=(2, 2))
        tk.Label(vc_top, text="NPC:", bg=BG, fg=GREY,
                 font=("Consolas", 8)).pack(side="left")
        self.entry_npc = tk.Entry(vc_top, bg=BG3, fg=WHITE, insertbackground=WHITE,
                                  font=("Consolas", 8), relief="flat", width=22)
        self.entry_npc.insert(0, "Stranger")
        self.entry_npc.pack(side="left", padx=4)

        if _SR_OK and _SD_OK:
            self.btn_talk = tk.Button(
                body, text="  PUSH TO TALK  ",
                bg=GREEN, fg=BG, activebackground="#2ea043",
                font=("Consolas", 10, "bold"), relief="flat",
                cursor="hand2", command=self._start_talk)
        elif not _SR_OK:
            self.btn_talk = tk.Button(
                body, text="pip install SpeechRecognition",
                bg=BG3, fg=YELLOW, font=("Consolas", 7), relief="flat",
                state="disabled")
        else:
            self.btn_talk = tk.Button(
                body, text="pip install sounddevice numpy",
                bg=BG3, fg=YELLOW, font=("Consolas", 7), relief="flat",
                state="disabled")
        self.btn_talk.pack(fill="x", pady=(2, 4))

        self.lbl_voice_status = tk.Label(body, text="Click the button above to speak",
                                         bg=BG, fg=GREY, font=("Consolas", 8))
        self.lbl_voice_status.pack(anchor="w")

        self.lbl_voice_exchange = tk.Label(body, text="", bg=BG2, fg=WHITE,
                                           font=("Consolas", 8), wraplength=290,
                                           justify="left", padx=6, pady=4)
        self.lbl_voice_exchange.pack(fill="x", pady=(2, 6))

        # ── Bottom row: log path + open button ───────────────────────────────
        bot = tk.Frame(body, bg=BG)
        bot.pack(fill="x", pady=(4, 0))
        tk.Button(bot, text="Open Log", bg=BG3, fg=BLUE, relief="flat",
                  font=("Consolas", 8), cursor="hand2",
                  command=self._open_log).pack(side="left")
        self.lbl_ts = tk.Label(bot, text="", bg=BG, fg="#444c56",
                               font=("Consolas", 7))
        self.lbl_ts.pack(side="right")

    def _open_log(self):
        import subprocess
        try:
            subprocess.Popen(["notepad.exe", str(SESSION_LOG)])
        except Exception:
            pass

    # ── Voice capture ─────────────────────────────────────────────────────────

    def _start_talk(self):
        """Called when user clicks PUSH TO TALK."""
        if not (_SR_OK and _SD_OK):
            return
        vs = _state.get("voice_state", "idle")
        if vs in ("listening", "transcribing", "sending"):
            return  # already in progress
        npc = self.entry_npc.get().strip() or "Settler"
        with _lock:
            _state["voice_state"]    = "listening"
            _state["voice_npc_name"] = npc
            _state["voice_player"]   = ""
            _state["voice_response"] = ""
            _state["voice_error"]    = ""
        self.btn_talk.config(text="  LISTENING...  ", bg=RED, fg=WHITE, state="disabled")
        self.lbl_voice_status.config(text="Speak now...", fg=RED)
        t = threading.Thread(target=self._voice_thread, args=(npc,), daemon=True)
        t.start()

    def _record_with_sounddevice(self, seconds: int = 5) -> "sr.AudioData":
        """Record `seconds` of audio via sounddevice and return an sr.AudioData object.
        Does NOT call self.after or _sd.sleep — safe to run in a background thread."""
        import io, wave
        samplerate = 16000
        # Record all audio at once — non-blocking start, blocking wait at the end.
        # Do NOT use _sd.sleep() here: it blocks the audio driver and fights FO4.
        frames = _sd.rec(int(seconds * samplerate), samplerate=samplerate,
                         channels=1, dtype="int16")
        _sd.wait()  # block until the recording finishes (runs in C, not Python GIL)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(samplerate)
            wf.writeframes(frames.tobytes())
        buf.seek(0)
        return sr.AudioData(buf.read(), samplerate, 2)

    def _voice_thread(self, npc_name: str):
        try:
            recognizer = sr.Recognizer()

            # Use sounddevice (no pyaudio needed) to capture the mic
            with _lock:
                _state["voice_state"] = "listening"
            audio = self._record_with_sounddevice(seconds=5)

            with _lock:
                _state["voice_state"] = "transcribing"
            self.after(0, lambda: self.lbl_voice_status.config(
                text="Transcribing...", fg=YELLOW))

            # Try Google STT (free, no API key required)
            player_text = ""
            try:
                player_text = recognizer.recognize_google(audio)
            except sr.UnknownValueError:
                pass
            except Exception:
                # Fallback: Windows built-in (offline, less accurate)
                try:
                    player_text = recognizer.recognize_whisper(audio, model="base")
                except Exception:
                    pass

            if not player_text:
                with _lock:
                    _state["voice_state"] = "error"
                    _state["voice_error"] = "Couldn't understand — speak clearly and try again"
                return

            with _lock:
                _state["voice_player"] = player_text
                _state["voice_state"]  = "sending"

            _log("VOICE", f"Player said: {player_text}")

            # Write bridge_input to MO2 Overwrites so the bridge processes it
            payload = {
                "npc_name":   npc_name,
                "npc_race":   "human",
                "location":   "Commonwealth",
                "player_speech": player_text,
                "npc_form_id": "voice",
            }
            import json as _json
            write_dir = None
            for d in [MO2_OVERWRITES, MO2_MOD_F4AI,
                      Path(r"E:\Steam\steamapps\common\Fallout 4\Data\F4AI")]:
                if d.exists():
                    write_dir = d
                    break
            if write_dir is None:
                write_dir = _MOSSY_MEM

            input_file = write_dir / "bridge_input_voice.json"

            # Bridge writes response to the MOD FOLDER, not Overwrites.
            # Check all candidate output dirs in order.
            output_candidates = [
                MO2_MOD_F4AI   / "text_out_voice.txt",
                MO2_OVERWRITES / "text_out_voice.txt",
                Path(r"E:\Steam\steamapps\common\Fallout 4\Data\F4AI") / "text_out_voice.txt",
            ]

            # Remove any stale responses first
            for oc in output_candidates:
                try:
                    oc.unlink(missing_ok=True)
                except Exception:
                    pass

            input_file.write_text(_json.dumps(payload, ensure_ascii=False), encoding="utf-8")

            # Poll up to 25 seconds for bridge response
            for _ in range(50):
                time.sleep(0.5)
                for oc in output_candidates:
                    if oc.exists():
                        response = oc.read_text(encoding="utf-8", errors="replace").strip()
                        if response:
                            with _lock:
                                _state["voice_response"] = response
                                _state["voice_state"]    = "done"
                            _log("VOICE", f"{npc_name}: {response}")
                            try:
                                oc.unlink(missing_ok=True)
                                input_file.unlink(missing_ok=True)
                            except Exception:
                                pass
                            return

            with _lock:
                _state["voice_error"] = "Bridge timed out — is the bridge running?"
                _state["voice_state"] = "error"

        except Exception as e:
            with _lock:
                _state["voice_error"] = str(e)[:80]
                _state["voice_state"] = "error"

    def _mk_section(self, parent, title):
        f = tk.Frame(parent, bg=BG3, height=1)
        f.pack(fill="x", pady=(4, 2))
        tk.Label(parent, text=title, bg=BG, fg=BLUE,
                 font=("Consolas", 8, "bold")).pack(anchor="w")

    def _dot_label(self, parent, name):
        f = tk.Frame(parent, bg=BG)
        f.pack(side="left", padx=4)
        dot = tk.Label(f, text="●", bg=BG, fg=GREY, font=("Consolas", 9))
        dot.pack(side="left")
        tk.Label(f, text=name, bg=BG, fg=GREY, font=("Consolas", 8)).pack(side="left")
        return dot

    # ── Background thread ─────────────────────────────────────────────────────

    def _start_bg(self):
        t = threading.Thread(target=_background_loop, daemon=True)
        t.start()

    # ── Refresh loop ──────────────────────────────────────────────────────────

    def _schedule_refresh(self):
        self._refresh_ui()
        self.after(REFRESH_MS, self._schedule_refresh)

    def _refresh_ui(self):
        with _lock:
            s = dict(_state)

        # System status dots
        self.lbl_bridge.config(fg=GREEN if s["bridge_ok"]   else RED)
        self.lbl_ollama.config(fg=GREEN if s["ollama_ok"]   else RED)
        self.lbl_quest.config( fg=GREEN if s["quest_active"] else YELLOW)
        self.lbl_game.config(  fg=GREEN if s["game_running"] else GREY)

        # Modules
        mods = s.get("modules", {})
        active_mods = [k for k, v in mods.items() if v]
        mod_str = "  ".join(active_mods) if active_mods else "none active"
        self.lbl_mods.config(text=f"Modules: {mod_str}",
                             fg=GREEN if active_mods else YELLOW)

        # AI engine
        if s["ollama_ok"]:
            active = s["ollama_active"]
            all_m  = ", ".join(s["ollama_models"][:4])
            self.lbl_engine.config(
                text=f"Ollama ● READY\nActive: {active}\nAll: {all_m}",
                fg=GREEN)
        else:
            self.lbl_engine.config(
                text="Ollama ✕ NOT RUNNING\nFallback: KoboldCPP / Mossy app",
                fg=RED)

        # File activity
        if s["file_activity"]:
            age_colour = GREEN if "OUT:" in s["file_activity"] else BLUE
            self.lbl_files.config(
                text=f"{s['file_activity_ts']}  {s['file_activity']}",
                fg=age_colour)
        else:
            self.lbl_files.config(
                text="Watching MO2 Overwrites\\F4AI\\ ...\n(will light up when NPC talks)",
                fg=GREY)

        # Last NPC interaction
        if s["last_npc"] or s["pending_request"]:
            if s["pending_request"]:
                text = f"⏳ WAITING  {s['pending_npc']} @ {s['pending_loc']}"
                col  = YELLOW
            else:
                npc  = s["last_npc"] or "NPC"
                line = s["last_npc_line"] or "..."
                pl   = s["last_player_line"]
                ts   = s["last_dialogue_ts"]
                text = f"NPC: {npc}\n"
                if pl:
                    text += f"You: {pl[:55]}\n"
                text += f"NPC: {line[:55]}"
                if ts:
                    text += f"\n{ts}"
                col = WHITE
            self.lbl_npc.config(text=text, fg=col)
        else:
            self.lbl_npc.config(
                text="No interactions recorded yet\nTalk to an NPC in-game",
                fg=GREY)

        # Memory DB
        if s["memory_ok"]:
            self.lbl_mem.config(
                text=(f"H:\\Mossy Memory\\AdvancedAI_Memory.db\n"
                      f"NPCs remembered: {s['npc_count']}   "
                      f"Dialogue lines: {s['dialogue_count']}"),
                fg=GREEN)
        else:
            self.lbl_mem.config(
                text="Memory DB not accessible (H: drive disconnected?)",
                fg=RED)

        # Papyrus [AAI] log lines
        if s["aai_lines"]:
            self.lbl_log.config(
                text="\n".join(s["aai_lines"]),
                fg=GREEN)
        elif s["bridge_ok"] and s["game_running"]:
            self.lbl_log.config(
                text="Bridge connected, game running\nNo [AAI] log lines yet\n→ The F4AI quest may not have started\n→ Check if the mod is enabled in MO2",
                fg=YELLOW)
        else:
            self.lbl_log.config(
                text="No [AAI] lines — waiting for game...",
                fg=GREY)

        # Pre-fill NPC entry with last known NPC name if field is still default
        last_npc_known = s.get("last_npc", "") or s.get("pending_npc", "")
        if last_npc_known and hasattr(self, "entry_npc"):
            cur = self.entry_npc.get()
            if cur in ("Stranger", "", "Settler"):
                self.entry_npc.delete(0, "end")
                self.entry_npc.insert(0, last_npc_known)

        # Voice Chat state
        vs = s.get("voice_state", "idle")
        if vs == "idle":
            self.lbl_voice_status.config(text="Click the button above to speak", fg=GREY)
            self.btn_talk.config(text="  PUSH TO TALK  ", bg=GREEN, fg=BG, state="normal")
        elif vs == "listening":
            self.lbl_voice_status.config(text="Listening... speak now", fg=RED)
            self.btn_talk.config(text="  LISTENING...  ", bg=RED, fg=WHITE, state="disabled")
        elif vs == "transcribing":
            self.lbl_voice_status.config(text="Transcribing...", fg=YELLOW)
            self.btn_talk.config(text="  PROCESSING...  ", bg=YELLOW, fg=BG, state="disabled")
        elif vs == "sending":
            self.lbl_voice_status.config(text="Waiting for NPC response...", fg=BLUE)
            self.btn_talk.config(text="  WAITING NPC...  ", bg=BLUE, fg=WHITE, state="disabled")
        elif vs == "done":
            npc  = s.get("voice_npc_name", "NPC")
            you  = s.get("voice_player", "")
            resp = s.get("voice_response", "")
            self.lbl_voice_status.config(text="Done — click to talk again", fg=GREEN)
            self.btn_talk.config(text="  PUSH TO TALK  ", bg=GREEN, fg=BG, state="normal")
            exch = f"You: {you}\n{npc}: {resp}" if you else f"{npc}: {resp}"
            self.lbl_voice_exchange.config(text=exch, fg=WHITE)
            with _lock:
                _state["voice_state"] = "idle"
        elif vs == "error":
            err = s.get("voice_error", "Unknown error")
            self.lbl_voice_status.config(text=f"Error: {err}", fg=RED)
            self.btn_talk.config(text="  TRY AGAIN  ", bg=ORANGE, fg=WHITE, state="normal")
            with _lock:
                _state["voice_state"] = "idle"

        if not (_SR_OK and _SD_OK) and hasattr(self, "lbl_voice_exchange"):
            missing = []
            if not _SR_OK: missing.append("SpeechRecognition")
            if not _SD_OK: missing.append("sounddevice numpy")
            self.lbl_voice_exchange.config(
                text=f"Install:  pip install {' '.join(missing)}\nThen restart scanner.",
                fg=YELLOW)

        # Timestamp
        self.lbl_ts.config(text=datetime.now().strftime("%H:%M:%S"))


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("F4AI Scanner — drag the overlay to any corner of your screen.")
    print("Press X in the overlay to close it.")
    app = Scanner()
    app.mainloop()
