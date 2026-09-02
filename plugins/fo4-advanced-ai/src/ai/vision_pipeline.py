"""Vision helpers for Fallout 4 external AI pipelines."""

from __future__ import annotations

import base64
import time
from pathlib import Path

import requests

try:  # Optional dependencies for Windows capture.
    import cv2  # type: ignore
    import numpy as np  # type: ignore
    import win32con  # type: ignore
    import win32gui  # type: ignore
    import win32ui  # type: ignore
except (ImportError, ModuleNotFoundError):
    cv2 = None
    np = None
    win32con = None
    win32gui = None
    win32ui = None

VISION_AVAILABLE = bool(win32gui and win32ui and win32con and np and cv2)

OLLAMA_VISION_URL = "http://localhost:11434/api/generate"
KOBOLD_CONTROL_URL = "http://localhost:5001/api/v1/model"


def build_vision_prompt(npc_name: str, location: str, vision_data: dict) -> str:
    """Build a compact in-character prompt from semantic vision telemetry."""
    obj_name = vision_data.get("object_name", "unknown clutter")
    dist = int(float(vision_data.get("distance_to_target", 0)))

    proximity = "in the distance"
    if dist < 300:
        proximity = "right in front of your face"
    elif dist < 800:
        proximity = "a few steps away"

    return (
        f"You are {npc_name} exploring {location} in Fallout 4. "
        f"You stop and lock your eyes onto a {obj_name} which is located {proximity}. "
        "Comment out loud on this specific object in character using one short sentence."
    )


def capture_fallout4_window(
    window_title: str = "Fallout4",
    frame_path: str = "Data/F4AI/live_vision_frame.jpg",
) -> str | None:
    """Capture the Fallout 4 window to an image file."""
    if not VISION_AVAILABLE:
        print("[Vision Error] Missing capture dependencies (pywin32/opencv/numpy).")
        return None

    hwnd = win32gui.FindWindow(None, window_title)
    if not hwnd:
        print("[Vision Error] Fallout 4 window process not found.")
        return None

    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    width = right - left
    height = bottom - top

    hwnd_dc = win32gui.GetWindowDC(hwnd)
    mfc_dc = win32ui.CreateDCFromHandle(hwnd_dc)
    save_dc = mfc_dc.CreateCompatibleDC()
    save_bitmap = win32ui.CreateBitmap()

    try:
        save_bitmap.CreateCompatibleBitmap(mfc_dc, width, height)
        save_dc.SelectObject(save_bitmap)
        save_dc.BitBlt((0, 0), (width, height), mfc_dc, (0, 0), win32con.SRCCOPY)

        raw = save_bitmap.GetBitmapBits(True)
        image = np.frombuffer(raw, dtype="uint8")
        image.shape = (height, width, 4)
        output_image = cv2.cvtColor(image, cv2.COLOR_BGRA2RGB)

        out_path = Path(frame_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_path), output_image)
        return str(out_path)
    finally:
        win32gui.DeleteObject(save_bitmap.GetHandle())
        save_dc.DeleteDC()
        mfc_dc.DeleteDC()
        win32gui.ReleaseDC(hwnd, hwnd_dc)


def query_local_vision_model(
    image_path: str,
    npc_name: str,
    vision_url: str = OLLAMA_VISION_URL,
    model: str = "moondream",
) -> str:
    """Send frame image to local VLM endpoint and return short description."""
    path = Path(image_path)
    if not path.exists():
        return ""

    with path.open("rb") as image_file:
        encoded_image = base64.b64encode(image_file.read()).decode("utf-8")

    payload = {
        "model": model,
        "prompt": (
            "Describe the primary object or enemy currently centered in this game frame "
            f"from the perspective of an NPC named {npc_name}. Keep it to 15 words."
        ),
        "images": [encoded_image],
        "stream": False,
    }

    try:
        response = requests.post(vision_url, json=payload, timeout=10)
        if response.status_code == 200:
            return response.json().get("response", "")
    except (requests.RequestException, ValueError) as exc:
        return f"My visual receptors are blurred: {exc}"
    return ""


def execute_optimized_vision_loop(image_path: str, npc_name: str) -> str:
    """Serialize LLM and VLM work to reduce VRAM pressure."""
    try:
        requests.post(f"{KOBOLD_CONTROL_URL}/unload", json={"unload": True}, timeout=1)
    except requests.RequestException:
        pass

    time.sleep(0.1)
    print("[VRAM Optimizer] Memory pipeline cleared. Processing image via vision model...")
    return query_local_vision_model(image_path, npc_name)
