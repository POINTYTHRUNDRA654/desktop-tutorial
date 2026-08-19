"""
Stage 2: enhance.py — the AI-assisted step, and the only one allowed to touch
an external service or produce dimension/detail drift (fully corrected in
stage 3, composite_lock.py).

Reuses the exact ComfyUI img2img node graph already proven working in MOSSY.SPACE
itself (src/electron/main.ts's buildComfyImg2ImgWorkflow + comfyuiRunWorkflow,
the backend for the app's own "AI Detail Synthesis" Texture Enhancer stage) —
ported to Python rather than writing a second ComfyUI client from scratch:
CheckpointLoaderSimple -> LoadImage -> VAEEncode -> CLIPTextEncode (x2) ->
KSampler (img2img, denoise param) -> VAEDecode -> SaveImage. Same upload ->
queue -> poll /history -> fetch /view cycle too.

Usage: python enhance.py <input_dir> <output_dir>
"""
from __future__ import annotations

import base64
import sys
import time
from pathlib import Path

import requests
from PIL import Image

from common import dds_to_pil, list_input_textures, load_config, log

STAGE = "enhance"

# Real per-file limit, not a knob to raise casually — this stage is the paid/
# metered one (GPU time via ComfyUI). A stuck job shouldn't hang the batch.
GENERATION_TIMEOUT_S = 4 * 60
POLL_INTERVAL_S = 2.0
# Real rate limiting between files so a local ComfyUI instance (shared GPU,
# often also running the game/CK) isn't hammered back-to-back.
BETWEEN_FILES_DELAY_S = 1.5


def check_comfyui(base: str) -> tuple[bool, str]:
    try:
        r = requests.get(f"{base}/system_stats", timeout=3)
        return r.ok, "" if r.ok else f"ComfyUI returned {r.status_code}"
    except Exception as e:
        return False, str(e)


def pick_model(base: str, configured: str) -> tuple[str, str]:
    if configured:
        return configured, ""
    try:
        r = requests.get(f"{base}/object_info/CheckpointLoaderSimple", timeout=5)
        r.raise_for_status()
        info = r.json()
        models = info.get("CheckpointLoaderSimple", {}).get("input", {}).get("required", {}).get("ckpt_name", [[]])[0]
        if models:
            return models[0], ""
        return "", "No ComfyUI checkpoints found. Set comfyui_model in config.json, or download one in Mossy's AI Image Studio."
    except Exception as e:
        return "", f"Could not query ComfyUI models: {e}"


def upload_image(base: str, img: Image.Image, filename: str) -> tuple[str | None, str]:
    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    try:
        r = requests.post(
            f"{base}/upload/image",
            files={"image": (filename, buf, "image/png")},
            data={"overwrite": "true"},
            timeout=30,
        )
        if not r.ok:
            return None, f"Upload failed ({r.status_code}): {r.text[:200]}"
        name = r.json().get("name")
        return name, "" if name else "Upload succeeded but no name returned."
    except Exception as e:
        return None, f"Upload error: {e}"


def build_img2img_workflow(model: str, positive: str, negative: str, steps: int, cfg: float, denoise: float, seed: int, uploaded_image: str) -> dict:
    # Exact same node graph as main.ts's buildComfyImg2ImgWorkflow.
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": model}},
        "2": {"class_type": "LoadImage", "inputs": {"image": uploaded_image}},
        "3": {"class_type": "VAEEncode", "inputs": {"pixels": ["2", 0], "vae": ["1", 2]}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": positive}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": negative}},
        "6": {"class_type": "KSampler", "inputs": {
            "cfg": cfg, "denoise": denoise, "latent_image": ["3", 0], "model": ["1", 0],
            "negative": ["5", 0], "positive": ["4", 0], "sampler_name": "dpmpp_2m",
            "scheduler": "karras", "seed": seed, "steps": steps,
        }},
        "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["1", 2]}},
        "8": {"class_type": "SaveImage", "inputs": {"filename_prefix": "glowing_sea_enhance_", "images": ["7", 0]}},
    }


def run_workflow(base: str, workflow: dict) -> tuple[bytes | None, str]:
    try:
        r = requests.post(f"{base}/prompt", json={"prompt": workflow}, timeout=15)
    except Exception as e:
        return None, f"Queue request failed: {e}"
    if not r.ok:
        return None, f"ComfyUI error {r.status_code}: {r.text[:200]}"
    prompt_id = r.json().get("prompt_id")
    if not prompt_id:
        return None, "ComfyUI accepted the request but returned no prompt_id."

    deadline = time.time() + GENERATION_TIMEOUT_S
    while time.time() < deadline:
        time.sleep(POLL_INTERVAL_S)
        try:
            hr = requests.get(f"{base}/history/{prompt_id}", timeout=5)
            if not hr.ok:
                continue
            history = hr.json()
            job = history.get(prompt_id)
            if not job or "outputs" not in job:
                continue
            if job.get("error"):
                return None, f"ComfyUI: {str(job['error'])[:200]}"
            for node_out in job["outputs"].values():
                images = node_out.get("images")
                if images:
                    img_info = images[0]
                    vr = requests.get(
                        f"{base}/view",
                        params={"filename": img_info["filename"], "subfolder": img_info.get("subfolder", ""), "type": img_info.get("type", "output")},
                        timeout=30,
                    )
                    if not vr.ok:
                        return None, "Failed to fetch generated image from ComfyUI."
                    return vr.content, ""
        except Exception:
            continue  # transient poll error — keep waiting, matches main.ts's behavior
    return None, "Generation timed out."


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python enhance.py <input_dir> <output_dir>")
        return 1
    input_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)

    cfg = load_config()
    base = cfg["comfyui_base"]

    online, reason = check_comfyui(base)
    if not online:
        log(STAGE, f"ComfyUI not reachable at {base} ({reason}). Start it (AI Image Studio or External Integrations Hub in Mossy) and retry. Nothing was processed.")
        return 1

    model, err = pick_model(base, cfg.get("comfyui_model", ""))
    if not model:
        log(STAGE, err)
        return 1
    log(STAGE, f"Using ComfyUI model: {model}")

    files = list_input_textures(input_dir)
    if not files:
        log(STAGE, f"No textures found in {input_dir}.")
        return 1

    failures: list[str] = []
    for i, f in enumerate(files):
        out_path = output_dir / (f.stem + ".png")
        try:
            img = dds_to_pil(f) if f.suffix.lower() == ".dds" else Image.open(f).convert("RGBA")
            uploaded_name, upload_err = upload_image(base, img, f.name + ".png")
            if not uploaded_name:
                raise RuntimeError(upload_err)

            workflow = build_img2img_workflow(
                model=model, positive=cfg["positive_prompt"], negative=cfg["negative_prompt"],
                steps=cfg["steps"], cfg=cfg["cfg"], denoise=cfg["denoise"],
                seed=int(time.time() * 1000) % (2**31), uploaded_image=uploaded_name,
            )
            image_bytes, run_err = run_workflow(base, workflow)
            if image_bytes is None:
                raise RuntimeError(run_err)

            out_path.write_bytes(image_bytes)
            log(STAGE, f"[{i+1}/{len(files)}] {f.name} -> {out_path.name}")
        except Exception as e:
            # Per-file error handling: one bad response doesn't kill the batch.
            log(STAGE, f"[{i+1}/{len(files)}] FAILED {f.name}: {e}")
            failures.append(f.name)
        time.sleep(BETWEEN_FILES_DELAY_S)

    log(STAGE, f"Done. {len(files) - len(failures)}/{len(files)} succeeded.")
    if failures:
        log(STAGE, f"Failed ({len(failures)}): {', '.join(failures)} — these will be missing from Enhanced/ and skipped by composite_lock.py.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
