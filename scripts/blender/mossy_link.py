"""
mossy_link.py  —  Real Mossy AI connection for the Fallout 4 Tutorial Add-on
=============================================================================
Drop this file into your Blender-add-on folder, replacing the stub mossy_link.py,
to get live Mossy AI answers directly inside Blender.

How it works:
  Mossy's desktop app starts an HTTP bridge on http://127.0.0.1:8080 when it
  runs.  This module communicates with that bridge to share AI, paths, PyTorch,
  and structured logging between Blender and Mossy.

Features:
  • ask_mossy()        — query the Mossy AI from inside Blender
  • get_tool_paths()   — retrieve ALL tool/game paths from Mossy settings
  • get_tool_path()    — retrieve a single path by settings key
  • open_tool()        — launch any configured tool with a file (e.g. NifSkope)
  • open_in_nifskope() — convenience wrapper: open a .nif in NifSkope
  • get_pytorch_path() — retrieve the configured PyTorch directory
  • setup_pytorch()    — inject PyTorch path into sys.path for import
  • send_event()       — send structured events from Blender to Mossy UI
  • log_to_mossy()     — surface Blender log entries in Mossy's UI
  • get_status()       — check if Mossy is running

Requirements:
  • Mossy desktop app must be open and running.
  • A Groq API key must be configured in Mossy Settings.
  • For PyTorch: set the PyTorch folder path in Mossy → External Tools → PyTorch.
  • No extra Python packages needed — uses only the stdlib urllib/sys/json.

Usage (same API as the stub, drop-in compatible):
    from . import mossy_link as _ml
    answer = _ml.ask_mossy("How do I fix a deleted navmesh in xEdit?")
    if answer:
        print(answer)   # real AI answer
    else:
        print("Mossy not available")  # graceful fallback

PyTorch usage:
    from . import mossy_link
    if mossy_link.setup_pytorch():
        import torch   # works — path was injected from Mossy settings

Path sharing:
    from . import mossy_link
    paths = mossy_link.get_tool_paths()
    fo4_dir = paths.get('fallout4Path', '')  # e.g. D:\\Steam\\...\\Fallout 4

Logging back to Mossy:
    from . import mossy_link
    mossy_link.log_to_mossy('warning', 'Scale not applied', {'object': 'Mesh_01'})
    mossy_link.send_event('nif_exported', {'path': '/tmp/out.nif'})
"""

from __future__ import annotations

import json
import sys
import urllib.request
import urllib.error

_MOSSY_BASE_URL = "http://127.0.0.1:8080"
_AI_ENDPOINT    = f"{_MOSSY_BASE_URL}/mossy-ai"
_STATUS_ENDPOINT = f"{_MOSSY_BASE_URL}/status"
_PYTORCH_PATH_ENDPOINT = f"{_MOSSY_BASE_URL}/pytorch-path"
_TOOL_PATHS_ENDPOINT = f"{_MOSSY_BASE_URL}/tool-paths"
_OPEN_TOOL_ENDPOINT = f"{_MOSSY_BASE_URL}/open-tool"
_LOG_ENDPOINT = f"{_MOSSY_BASE_URL}/log"

# Default timeout for quick local-bridge calls (seconds)
_LOCAL_TIMEOUT = 2.0


def _is_mossy_running(timeout: float = _LOCAL_TIMEOUT) -> bool:
    """Quick check: is the Mossy HTTP bridge reachable?"""
    try:
        with urllib.request.urlopen(_STATUS_ENDPOINT, timeout=timeout) as r:
            return r.status == 200
    except Exception:
        return False


def ask_mossy(
    query: str,
    context_data: dict | None = None,
    timeout: float = 30.0,
) -> str | None:
    """
    Send *query* to the Mossy AI and return its plain-text response.

    :param query:        Natural-language question or instruction.
    :param context_data: Optional dict with extra context (e.g. mesh stats,
                         current scene info) that Mossy can use.
    :param timeout:      Seconds to wait before giving up.
    :returns:            AI response string, or ``None`` if Mossy is
                         unreachable or returns an error.

    This is a drop-in replacement for the stub version's signature.
    """
    if not query or not query.strip():
        return None

    payload = {"query": query.strip()}
    if context_data:
        payload["context_data"] = context_data  # type: ignore[assignment]

    body = json.dumps(payload).encode("utf-8")
    req  = urllib.request.Request(
        _AI_ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read().decode("utf-8"))
            if data.get("success"):
                return data.get("response")
            # Server returned an error message
            print(f"[mossy_link] Server error: {data.get('message')}")
            return None
    except urllib.error.HTTPError as e:
        print(f"[mossy_link] HTTP {e.code}: {e.reason}")
        return None
    except urllib.error.URLError as e:
        # Mossy not running or unreachable — silent fail so UI degrades gracefully
        return None
    except Exception as e:
        print(f"[mossy_link] Unexpected error: {e}")
        return None


def get_status() -> dict:
    """
    Return the current Mossy bridge status as a dict.

    Keys:
        running (bool)   – whether the Mossy HTTP bridge is reachable
        version (str)    – Mossy app version (empty if not running)
        port (int)       – bridge port (8080)
    """
    try:
        with urllib.request.urlopen(_STATUS_ENDPOINT, timeout=_LOCAL_TIMEOUT) as r:
            if r.status == 200:
                data = json.loads(r.read().decode("utf-8"))
                return {
                    "running": True,
                    "version": data.get("version", ""),
                    "port": 8080,
                }
    except Exception:
        pass
    return {"running": False, "version": "", "port": 8080}


def get_pytorch_path() -> str | None:
    """
    Ask Mossy for the PyTorch installation directory configured in its settings.

    :returns: The directory path string (e.g. ``r"D:\\PyTorch"``), or ``None``
              if Mossy is not running or PyTorch is not configured.
    """
    try:
        with urllib.request.urlopen(_PYTORCH_PATH_ENDPOINT, timeout=_LOCAL_TIMEOUT) as r:
            data = json.loads(r.read().decode("utf-8"))
            if data.get("success"):
                return data.get("pytorch_path") or None
            print(f"[mossy_link] PyTorch path not set in Mossy: {data.get('message')}")
            return None
    except Exception as e:
        print(f"[mossy_link] Could not retrieve PyTorch path: {e}")
        return None


def setup_pytorch() -> bool:
    """
    Inject the Mossy-configured PyTorch directory into ``sys.path`` so that
    Blender's Python can ``import torch``.

    Call this once at the top of any operator or script that needs PyTorch::

        from . import mossy_link
        if mossy_link.setup_pytorch():
            import torch
        else:
            # handle PyTorch unavailable

    :returns: ``True`` if the path was successfully added (or was already
              present), ``False`` if Mossy returned no path.
    """
    pt_path = get_pytorch_path()
    if not pt_path:
        return False
    if pt_path not in sys.path:
        sys.path.append(pt_path)
        print(f"[mossy_link] Added PyTorch path to sys.path: {pt_path}")
    return True


def get_tool_paths() -> dict:
    """
    Return all tool and game paths configured in Mossy settings as a dict.

    Keys match the Mossy Settings field names, for example::

        {
            'fallout4Path':        'D:\\Steam\\...',
            'xeditPath':           'D:\\xEdit\\FO4Edit.exe',
            'creationKitPath':     'C:\\...',
            'blenderPath':         'C:\\...',
            'baePath':             'C:\\...',
            'papyrusCompilerPath': 'C:\\...',
            'pytorchPath':         'D:\\PyTorch',
            ...
        }

    Only paths that are non-empty in Mossy settings are included.
    Returns an empty dict if Mossy is not running.
    """
    try:
        with urllib.request.urlopen(_TOOL_PATHS_ENDPOINT, timeout=_LOCAL_TIMEOUT) as r:
            data = json.loads(r.read().decode("utf-8"))
            if data.get("success"):
                return data.get("paths") or {}
            return {}
    except Exception:
        return {}


def get_tool_path(name: str) -> str | None:
    """
    Return the Mossy-configured path for a single tool by its settings key.

    Common keys:
        ``'fallout4Path'``, ``'xeditPath'``, ``'creationKitPath'``,
        ``'blenderPath'``, ``'baePath'``, ``'nifSkopePath'``,
        ``'papyrusCompilerPath'``, ``'pytorchPath'``, ...

    :param name:    Settings key name (camelCase, matches Mossy Settings fields).
    :returns:       Path string, or ``None`` if not configured / Mossy not running.
    """
    return get_tool_paths().get(name) or None


def open_tool(tool_key: str, file_path: str) -> tuple[bool, str]:
    """
    Ask Mossy to launch a configured external tool with *file_path* as its argument.

    Useful when Blender just exported (or is about to import) a mesh and you want a
    real look at it in a tool Blender's own viewport can't substitute for — e.g. after
    exporting a NIF via PyNifly, open it in NifSkope to check materials, collision,
    and texture paths before it goes in-game.

    :param tool_key:  Mossy settings key for the tool, e.g. ``'nifSkopePath'``,
                       ``'xeditPath'``, ``'creationKitPath'``. Must be configured
                       in Mossy → Settings → External Tools.
    :param file_path: Absolute path to the file to open in that tool.
    :returns:         ``(True, "")`` on success, or ``(False, message)`` — Mossy not
                       running, tool not configured, or file not found.

    Example::

        from . import mossy_link
        ok, msg = mossy_link.open_tool('nifSkopePath', r"C:\\mods\\MyMesh.nif")
        if not ok:
            mossy_link.log_to_mossy('warning', f'Could not open NifSkope: {msg}')
    """
    if not tool_key or not file_path:
        return False, "tool_key and file_path are both required"

    payload = {"toolKey": tool_key, "filePath": file_path}
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        _OPEN_TOOL_ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=_LOCAL_TIMEOUT) as r:
            data = json.loads(r.read().decode("utf-8"))
            if data.get("success"):
                return True, ""
            return False, data.get("message", "Unknown error")
    except urllib.error.URLError:
        return False, "Mossy is not running"
    except Exception as e:
        return False, str(e)


def open_in_nifskope(nif_path: str) -> tuple[bool, str]:
    """
    Convenience wrapper: ``open_tool('nifSkopePath', nif_path)``.

    Example::

        from . import mossy_link
        ok, msg = mossy_link.open_in_nifskope(exported_nif_path)
        if not ok:
            print(f"Could not open NifSkope: {msg}")
    """
    return open_tool("nifSkopePath", nif_path)


def send_event(event_type: str, data: dict | None = None) -> bool:
    """
    Send a structured event from the Blender add-on to Mossy.

    Mossy relays the event to its renderer UI via the ``blender-event`` IPC
    channel, where any panel listening for it will be notified.

    :param event_type: Short identifier (e.g. ``'export_complete'``, ``'collision_generated'``).
    :param data:       Optional dict payload with additional context.
    :returns:          ``True`` on success, ``False`` if Mossy is unreachable.

    Example::

        mossy_link.send_event('nif_exported', {'object': 'Weapon_Gun', 'path': '/tmp/out.nif'})
    """
    payload = {"type": event_type, "data": data or {}}
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{_MOSSY_BASE_URL}/event",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=_LOCAL_TIMEOUT) as r:
            return r.status == 200
    except Exception:
        return False


def log_to_mossy(level: str, message: str, context: dict | None = None) -> None:
    """
    Send a log entry from the Blender add-on to Mossy's UI.

    The entry appears in Mossy's Blender log panel under the Neural Link view.
    Silently ignored if Mossy is not running — safe to call unconditionally.

    :param level:   Severity — one of ``'info'``, ``'warning'``, ``'error'``.
    :param message: Human-readable log message.
    :param context: Optional dict with extra detail (operator name, object, etc.).

    Example::

        mossy_link.log_to_mossy('warning', 'Scale not applied', {'object': 'Mesh_01'})
        mossy_link.log_to_mossy('info', 'NIF export check passed', {'count': 3})
    """
    payload: dict = {"level": level, "message": message}
    if context:
        payload["context"] = context
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        _LOG_ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=_LOCAL_TIMEOUT) as _r:
            pass  # fire-and-forget
    except Exception:
        pass  # don't break Blender if Mossy is not running


def register() -> None:  # noqa: D401
    """Called by Blender add-on register() — no-op for this module."""


def unregister() -> None:  # noqa: D401
    """Called by Blender add-on unregister() — no-op for this module."""
