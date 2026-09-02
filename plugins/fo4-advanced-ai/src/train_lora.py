"""Unsloth DPO fine-tuning template for local Fallout 4 adapter training."""

from __future__ import annotations

import os
from pathlib import Path

import torch
from datasets import load_dataset
from trl import DPOConfig, DPOTrainer
from unsloth import FastLanguageModel

DATA_DIR = Path(os.getenv("F4AI_DATA_DIR", Path(__file__).resolve().parent))
TRAINING_DATA_FILE = DATA_DIR / "Training_Cache" / "Settler_training_pool.jsonl"
OUTPUT_LORA_DIR = DATA_DIR / "Adapters" / "Settler_lora"
BASE_MODEL_PATH = "unsloth/llama-3-8b-Instruct-bnb-4bit"


def run_local_dpo_training() -> None:
    """Run short local DPO pass and output LoRA adapter."""
    if not TRAINING_DATA_FILE.exists():
        print("[ML Engine] No new training logs found. Skipping optimization cycle.")
        return

    print("[ML Engine] Initializing GPU hardware for Unsloth training...")
    max_seq_length = 1024

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=BASE_MODEL_PATH,
        max_seq_length=max_seq_length,
        load_in_4bit=True,
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        lora_alpha=16,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing=True,
    )

    print("[ML Engine] Loading dataset log vectors...")
    dataset = load_dataset("json", data_files=str(TRAINING_DATA_FILE), split="train")

    dpo_config = DPOConfig(
        output_dir=str(OUTPUT_LORA_DIR),
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        learning_rate=5e-6,
        lr_scheduler_type="cosine",
        max_steps=20,
        save_steps=0,
        beta=0.1,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
    )

    trainer = DPOTrainer(
        model=model,
        ref_model=None,
        args=dpo_config,
        beta=0.1,
        train_dataset=dataset,
        processing_class=tokenizer,
        max_length=max_seq_length,
        max_prompt_length=512,
    )

    print("[ML Engine] Executing neural pathway adjustment optimization...")
    trainer.train()

    os.makedirs(OUTPUT_LORA_DIR, exist_ok=True)
    model.save_pretrained_merged(str(OUTPUT_LORA_DIR), tokenizer, save_method="lora")
    print(f"[ML Engine] Training complete. Evolved weights saved to: {OUTPUT_LORA_DIR}")


if __name__ == "__main__":
    run_local_dpo_training()
