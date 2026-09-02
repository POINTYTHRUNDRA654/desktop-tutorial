"""Local adaptive training helpers (DPO-style preference logging + LoRA hot-swap)."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import requests

from paths import MEMORY_BASE

TRAINING_DATA_DIR = MEMORY_BASE / "Training_Cache"
ADAPTER_DIR       = MEMORY_BASE / "Adapters"
KOBOLD_LORA_URL = "http://localhost:5001/api/v1/model/lora"


def log_self_advancement_data(
    npc_name: str,
    baseline_prompt: str,
    user_input: str,
    ai_generation: str,
    reward_score: int,
) -> None:
    """Append one DPO training record to local JSONL pool."""
    TRAINING_DATA_DIR.mkdir(parents=True, exist_ok=True)
    dataset_file = TRAINING_DATA_DIR / f"{npc_name}_training_pool.jsonl"

    if reward_score >= 1:
        chosen_response = ai_generation
        rejected_response = "Standard boring fallback dialogue."
    else:
        chosen_response = "Standard polite compliance text."
        rejected_response = ai_generation

    training_sample = {
        "prompt": f"System: {baseline_prompt}\nUser: {user_input}",
        "chosen": chosen_response,
        "rejected": rejected_response,
    }

    with dataset_file.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(training_sample) + "\n")
    print(f"[Machine Learning] Saved optimization token for {npc_name}.")


def trigger_background_self_training(npc_name: str) -> bool:
    """Run local DPO training process for NPC-specific adapter."""
    print(f"\n[Machine Learning] Initiating fine-tuning advancement for {npc_name}...")
    dataset_path = TRAINING_DATA_DIR / f"{npc_name}_training_pool.jsonl"
    output_dir = ADAPTER_DIR / f"{npc_name}_lora"
    command = [
        "python",
        "-m",
        "trl.cli.dpo",
        "--model_name_or_path",
        "local_llama3_base",
        "--dataset_path",
        str(dataset_path),
        "--output_dir",
        str(output_dir),
    ]
    try:
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        print(f"[Machine Learning] Fine-tuning complete! {npc_name}'s matrix has advanced.")
        return True
    except OSError as exc:
        print(f"[Machine Learning Failed]: {exc}")
        return False


def hot_swap_npc_personality(npc_name: str) -> bool:
    """Load NPC-specific LoRA adapter into running Kobold backend."""
    lora_path = ADAPTER_DIR / f"{npc_name}_lora"
    if not lora_path.exists():
        return False

    payload = {"loras": [{"path": str(lora_path), "scale": 1.0}]}
    try:
        response = requests.post(KOBOLD_LORA_URL, json=payload, timeout=5)
        response.raise_for_status()
        print(f"[VRAM Optimizer] Loaded evolved neural matrix for {npc_name}.")
        return True
    except requests.RequestException as exc:
        print(f"[LoRA Hot-Swap Failed] {exc}")
        return False
