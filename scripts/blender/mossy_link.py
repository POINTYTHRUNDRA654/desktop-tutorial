"""
mossy_link.py  —  Real Mossy AI connection for the Fallout 4 Tutorial Add-on
=============================================================================
Drop this file into your Blender-add-on folder, replacing the stub mossy_link.py,
to get live Mossy AI answers directly inside Blender.

How it works:
  Mossy's desktop app starts an HTTP bridge on http://127.0.0.1:8080 when it
  runs.  This module sends your query to the POST /mossy-ai endpoint and
  returns the plain-text response, exactly like the stub's interface.

  It also exposes setup_pytorch() which queries GET /pytorch-path to retrieve
  the PyTorch installation directory configured in Mossy settings and injects
  it into sys.path — letting Blender's built-in Python use torch without any
  separate Blender-side install.

Requirements:
  • Mossy desktop app must be open and running.
  • A Groq API key must be configured in Mossy Settings.
  • For PyTorch: set the PyTorch folder path in Mossy → External Tools → PyTorch.
  • No extra Python packages needed — uses only the stdlib urllib/sys.

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


def register() -> None:  # noqa: D401
    """Called by Blender add-on register() — no-op for this module."""


def unregister() -> None:  # noqa: D401
    """Called by Blender add-on unregister() — no-op for this module."""
