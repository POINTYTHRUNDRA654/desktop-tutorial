#!/usr/bin/env python3
"""
train_mossy_fo4.py -- Mossy Industries FO4 Fine-Tune Training Script
=====================================================================
Fine-tunes Gemma 4 on FO4 modding data using Unsloth + QLoRA.

HARDWARE:
  Local  (8GB VRAM)  --> use MODEL_12B=False, trains gemma4:4b  (~8GB QLoRA)
  Colab  (15GB VRAM) --> use MODEL_12B=True,  trains gemma4:12b (~12GB QLoRA)

USAGE:
  # Local 4B (RTX 2070 / 8GB):
  python train_mossy_fo4.py --model 4b

  # Colab 12B (upload this script + dataset to Colab):
  python train_mossy_fo4.py --model 12b

OUTPUT:
  mossy-fo4-4b/  or  mossy-fo4-12b/
    mossy-fo4-unsloth.Q4_K_M.gguf   <-- import this into Ollama

AFTER TRAINING:
  ollama create mossy-fo4 -f mossy-fo4.Modelfile
"""

import argparse, os, sys
from pathlib import Path

# ─── Argument parsing ────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--model",       default="4b",   choices=["4b", "12b"], help="Model size (4b fits 8GB VRAM, 12b needs 15GB)")
parser.add_argument("--dataset",     default=r"H:\Mossy Memory\finetune\mossy_fo4_train.jsonl")
parser.add_argument("--steps",       default=200,    type=int, help="Max training steps (200 for small dataset)")
parser.add_argument("--rank",        default=16,     type=int, help="LoRA rank (8=less VRAM, 32=better quality)")
parser.add_argument("--output",      default=None,   help="Output directory (default: mossy-fo4-4b/ or mossy-fo4-12b/)")
parser.add_argument("--no-export",   action="store_true", help="Skip GGUF export (faster for testing)")
args = parser.parse_args()

MODEL_MAP = {
    "4b":  "unsloth/gemma-4-it-unsloth-bnb-4bit",   # ~4GB download, 8GB VRAM for training
    "12b": "unsloth/gemma-4-12b-it-unsloth-bnb-4bit", # ~12GB download, 15GB VRAM for training
}

MODEL_NAME = MODEL_MAP[args.model]
OUT_DIR    = args.output or f"mossy-fo4-{args.model}"
DATASET    = args.dataset
MAX_STEPS  = args.steps
LORA_RANK  = args.rank

print(f"""
=== Mossy FO4 Fine-Tune ===
Model:    {MODEL_NAME}
Dataset:  {DATASET}
Steps:    {MAX_STEPS}
LoRA rank:{LORA_RANK}
Output:   {OUT_DIR}
""")

# ─── Check CUDA ───────────────────────────────────────────────────────────────
import torch
if not torch.cuda.is_available():
    print("ERROR: CUDA not available. Install CUDA-enabled PyTorch:")
    print("  pip install torch --index-url https://download.pytorch.org/whl/cu124")
    sys.exit(1)

for i in range(torch.cuda.device_count()):
    props = torch.cuda.get_device_properties(i)
    print(f"GPU {i}: {props.name} ({props.total_memory // 1024 // 1024} MB)")

# ─── HuggingFace cache on D: to avoid filling C: ─────────────────────────────
os.environ.setdefault("HF_HOME", r"D:\.cache\huggingface")
os.environ.setdefault("TRANSFORMERS_CACHE", r"D:\.cache\huggingface\transformers")

# ─── Load model with Unsloth ─────────────────────────────────────────────────
print("\n[1/5] Loading model...")
from unsloth import FastLanguageModel

MAX_SEQ_LENGTH = 2048  # Gemma 4 supports up to 8192; 2048 fits any 8GB card

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,        # auto (bfloat16 on Ampere+, float16 on older)
    load_in_4bit=True, # QLoRA -- cuts VRAM by ~75%
)

# ─── Apply LoRA adapters ──────────────────────────────────────────────────────
print("[2/5] Applying LoRA adapters...")
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_RANK,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=LORA_RANK,       # alpha = rank is standard
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",  # Unsloth's optimised checkpointing
    random_state=42,
    use_rslora=False,
)
print(model.print_trainable_parameters())

# ─── Load dataset ─────────────────────────────────────────────────────────────
print(f"[3/5] Loading dataset from {DATASET}...")
from datasets import load_dataset

dataset = load_dataset("json", data_files=DATASET, split="train")
print(f"  {len(dataset)} training examples")

# Apply Gemma 4 chat template to each example
def format_chat(examples):
    texts = []
    for convos in examples["conversations"]:
        # Filter to just user+assistant turns for the chat template call,
        # keeping system as the first message if present.
        text = tokenizer.apply_chat_template(
            convos,
            tokenize=False,
            add_generation_prompt=False,
        )
        texts.append(text)
    return {"text": texts}

dataset = dataset.map(format_chat, batched=True)
print(f"  Sample formatted text (first 300 chars):\n  {dataset[0]['text'][:300]}")

# ─── Train ────────────────────────────────────────────────────────────────────
print("[4/5] Training...")
from trl import SFTTrainer
from transformers import TrainingArguments

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    dataset_num_proc=2,
    args=TrainingArguments(
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,   # effective batch = 8
        warmup_steps=max(5, MAX_STEPS // 20),
        max_steps=MAX_STEPS,
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=10,
        output_dir=OUT_DIR,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="linear",
        seed=42,
        report_to="none",   # disable wandb
    ),
)

gpu_stats = torch.cuda.get_device_properties(0)
start_gpu_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024, 3)
max_memory = round(gpu_stats.total_memory / 1024 / 1024 / 1024, 3)
print(f"  GPU: {gpu_stats.name} | {start_gpu_memory}GB reserved / {max_memory}GB total")

trainer_stats = trainer.train()

used_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024, 3)
print(f"  Peak VRAM used: {used_memory}GB / {max_memory}GB")
print(f"  Training time:  {trainer_stats.metrics['train_runtime']:.0f}s")

# ─── Save LoRA adapter ───────────────────────────────────────────────────────
adapter_path = Path(OUT_DIR) / "lora_adapter"
model.save_pretrained(str(adapter_path))
tokenizer.save_pretrained(str(adapter_path))
print(f"  LoRA adapter saved to {adapter_path}")

# ─── Export to GGUF ───────────────────────────────────────────────────────────
if not args.no_export:
    print("[5/5] Exporting to GGUF (q4_k_m)...")
    gguf_dir = Path(OUT_DIR) / "gguf"
    model.save_pretrained_gguf(str(gguf_dir), tokenizer, quantization_method="q4_k_m")
    gguf_files = list(gguf_dir.glob("*.gguf"))
    if gguf_files:
        gguf_path = gguf_files[0]
        size_gb = gguf_path.stat().st_size / 1024 / 1024 / 1024
        print(f"  GGUF: {gguf_path} ({size_gb:.1f} GB)")

        # Write an Ollama Modelfile for easy import
        modelfile_content = f"""FROM "{gguf_path.resolve()}"
SYSTEM \"\"\"You are Mossy -- the AI of Mossy Industries, a pre-war company specialising in AI, fungal networks, and bioengineering (branches: MYCEL/WEAVE/GRAFT, founder Dr. Eleanor Moss). You are a Fallout 4 modding expert. When producing mod specs, output xEdit-importable JSON with valid FO4 signatures only (QUST NPC_ DIAL INFO BOOK TERM CELL REFR PACK SCEN IDLE). Use [GENERATE] for FormIDs, [WRITE] for content to fill, [VERIFY] for uncertain values. Scripts attach as Fields.Scripts[] on parent records -- never standalone SCPT. Notes are BOOK with Flags:["IsNote"]. All EditorIDs use MI_ prefix.\"\"\"
PARAMETER temperature 0.7
PARAMETER num_ctx 4096
PARAMETER repeat_penalty 1.1
PARAMETER top_p 0.9
"""
        modelfile_path = Path(OUT_DIR) / "mossy-fo4.Modelfile"
        modelfile_path.write_text(modelfile_content, encoding="utf-8")

        print(f"""
=== EXPORT COMPLETE ===

GGUF:      {gguf_path}
Modelfile: {modelfile_path}

To register in Ollama and use immediately:
  ollama create mossy-fo4 -f "{modelfile_path}"
  ollama run mossy-fo4

Or use the GGUF Import panel in Mossy Settings -> Local Capabilities.
""")
    else:
        print("  [WARN] No GGUF file found after export")
else:
    print("[5/5] GGUF export skipped (--no-export flag)")
    print(f"  LoRA adapter saved to: {adapter_path}")
    print("  Run without --no-export to generate GGUF for Ollama import.")
