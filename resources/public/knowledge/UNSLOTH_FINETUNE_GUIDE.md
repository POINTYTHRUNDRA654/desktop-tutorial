# Unsloth Fine-Tuning Guide — Build Your Own Mossy Model

**Version**: April 2026  
**Goal**: Fine-tune Gemma 4 locally (8 GB VRAM) with Unsloth, export to GGUF, and import into Mossy via Ollama.

---

## What is Unsloth?

[Unsloth](https://github.com/unslothai/unsloth) is an open-source fine-tuning library that makes training large language models **4× faster** with **~80% less VRAM** than standard HuggingFace methods. It achieves this through hand-written CUDA kernels and 4-bit QLoRA training.

**Supported models**: Gemma 4, Llama 3, Qwen 2.5, Mistral, Phi-4, and more.  
**Minimum hardware**: NVIDIA GPU with 8 GB VRAM (RTX 3070 / 4060 or better).  
**Free cloud option**: Google Colab T4 (15 GB VRAM free tier).

---

## Why Fine-Tune a Mossy Model?

A general-purpose LLM (Groq/Gemma/Llama) answers Fallout 4 modding questions by relying on:
1. General training data (limited FO4 coverage)
2. System prompt injection (what MossyBrain.ts provides)
3. Knowledge vault entries the user has saved

A **fine-tuned model** has FO4 modding knowledge *baked into its weights*. This means:
- More accurate answers about xEdit record types, Papyrus syntax, NIF structure
- Fewer hallucinations on game-specific details
- Faster responses (less context required)
- Fully offline — no API key needed

---

## Requirements

### Local Training
- NVIDIA GPU with ≥ 8 GB VRAM
- Python 3.10+ with CUDA 12.1 environment
- ~20 GB free disk space (model + dataset + checkpoints)

### Cloud Training (Free)
- Google account for Colab
- Use the official Unsloth Colab notebook: https://github.com/unslothai/unsloth

### Inference (after export)
- Ollama installed and running: https://ollama.com
- ~4 GB disk for q4_k_m GGUF model

---

## Installation

### Local (conda recommended)
```bash
conda create -n unsloth python=3.11
conda activate unsloth
conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install datasets trl peft transformers accelerate
```

### Google Colab
Open the official notebook and click **Copy to Drive**, then follow the steps.

---

## Step 1: Prepare Your Training Dataset

### Format (ShareGPT / JSONL)

Each line of your `.jsonl` file must be a JSON object with a `conversations` array:

```json
{"conversations": [{"from": "human", "value": "How do I add a new NPC to a cell in the Creation Kit?"}, {"from": "gpt", "value": "In the CK, open your target cell in the Cell View window. In the Object Window, find your NPC under Actors → NPC_. Drag it from the Object Window into the render window to create a placed reference (ACHR). Set the position/rotation with the Move/Rotate tools, then save and rebuild precombines if it's an exterior cell."}]}
{"conversations": [{"from": "human", "value": "What does LVLI mean in xEdit?"}, {"from": "gpt", "value": "LVLI stands for Leveled Item — the record type for loot lists. It defines a pool of possible items with individual chances. The engine rolls against Chance None first (if the roll fails, nothing spawns), then picks from the list entries based on their count values. Nested LVLI records allow probability trees. Always check for conflicts on LVLI records as multiple mods often edit the same lists."}]}
```

### Recommended Training Topics

| Category | Examples |
|---|---|
| xEdit record types | WEAP, ARMO, NPC_, CELL, WRLD, LVLI, LVLN, QUST, DIAL, COBJ, ALCH, INGR, KYWD |
| Papyrus scripting | Event handlers, Cast/SendModEvent, RegisterForRemoteEvent, Utility.Wait, Actor functions |
| Creation Kit workflows | Cell editing, NPC setup, quest scripting, package creation, condition functions |
| NIF mesh structure | NiNode hierarchy, NiTriShape, BSLightingShaderProperty, skin partitions, UV unwrap |
| BA2 archives | DDS formats (BC1/BC3/BC5/BC7), TextureSet, mipmaps, xWMAEncode |
| Load order | ESL/ESP/ESM differences, master file rules, conflict resolution, LOOT metadata |
| Common errors | Missing masters, dirty edits, ITMs, REFR form version mismatches, precombine breaks |
| Stability & tools | Addictol, Address Library, CLASSIC crash scanner, F4SE plugins |

### Quantity Target
- **Minimum**: 200 pairs (basic improvement)
- **Good**: 500–2000 pairs (solid domain knowledge)
- **Excellent**: 5000+ pairs (strong expert behavior)

### Data Sources
- Your own Mossy chat sessions (export from Knowledge Vault)
- [Fallout 4 Wiki](https://fallout.wiki/wiki/Fallout_4) — game mechanics and records
- [Creation Kit Wiki](https://ck.uesp.net/wiki/Main_Page) — CK function reference
- [xEdit documentation](https://tes5edit.github.io/docs/) — record structure reference
- Your own modding notes and Papyrus scripts

---

## Step 2: Fine-Tune with Unsloth

```python
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# 1. Load Gemma 4 in 4-bit (fits 8 GB VRAM)
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/gemma-4-it-unsloth-bnb-4bit",
    max_seq_length=4096,
    load_in_4bit=True,
)

# 2. Apply LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

# 3. Load your FO4 training data
dataset = load_dataset("json", data_files="fo4_training.jsonl", split="train")

# 4. Format into chat template
def format_chat(examples):
    convos = examples["conversations"]
    texts = [tokenizer.apply_chat_template(c, tokenize=False) for c in convos]
    return {"text": texts}

dataset = dataset.map(format_chat, batched=True)

# 5. Train
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=4096,
    args=TrainingArguments(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_steps=10,
        max_steps=200,           # increase for larger datasets
        learning_rate=2e-4,
        fp16=True,
        logging_steps=10,
        output_dir="outputs",
        optim="adamw_8bit",
        seed=42,
    ),
)
trainer.train()
```

---

## Step 3: Export to GGUF

```python
# Export with q4_k_m quantization (recommended — ~4 GB, runs on 8 GB VRAM)
model.save_pretrained_gguf("mossy-fo4", tokenizer, quantization_method="q4_k_m")

# The output file will be: mossy-fo4/mossy-fo4-unsloth.Q4_K_M.gguf
```

### Quantization Options

| Method | File Size | VRAM Required | Quality |
|---|---|---|---|
| q4_k_m | ~4 GB | 8 GB | ⭐⭐⭐ Best balance |
| q5_k_m | ~5 GB | 10 GB | ⭐⭐⭐⭐ Better quality |
| q8_0 | ~8 GB | 12 GB | ⭐⭐⭐⭐⭐ Near-lossless |
| f16 | ~14 GB | 24 GB | ⭐⭐⭐⭐⭐ Full precision |

---

## Step 4: Import into Mossy

1. Open Mossy → **Settings → Local Capabilities** (or navigate to `/capabilities`)
2. Scroll to the **GGUF / Unsloth Import** panel (amber border)
3. Click **Browse…** and select your `.gguf` file
4. Set a model name (e.g., `mossy-fo4`)
5. Optionally customize the system prompt (pre-filled with the Mossy FO4 prompt)
6. Click **Import to Ollama**

Mossy will:
- Write an Ollama `Modelfile` pointing to your GGUF with the system prompt and parameters
- Run `ollama create mossy-fo4 -f Modelfile`
- Auto-select the new model in the Ollama field
- Refresh the capabilities list

7. Click **Save** in Local Capabilities
8. Set **Preference** to **Ollama** (or **Auto**)

All future chat messages now route through your fine-tuned model.

---

## Generated Modelfile Format

When you click "Import to Ollama", Mossy generates this Modelfile:

```
FROM "/path/to/your/model.gguf"
SYSTEM "You are Mossy, a knowledgeable Fallout 4 modding assistant..."
PARAMETER temperature 0.7
PARAMETER num_ctx 4096
PARAMETER repeat_penalty 1.1
```

You can manually edit this in your Ollama models directory (`~/.ollama/models/`) after import if needed.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `ollama: command not found` | Ollama not installed | Install from https://ollama.com |
| `File not found: /path/to/model.gguf` | Wrong path selected | Browse to the actual `.gguf` file |
| `CUDA out of memory` | VRAM too low for training | Reduce `max_seq_length` or use `r=8` LoRA rank |
| Model responses are off-topic | System prompt not loaded | Check the Modelfile SYSTEM line in Ollama |
| Import takes >2 minutes | Normal for large GGUFs | Ollama is quantizing/indexing — wait for completion |

---

## Resources

- **Unsloth GitHub**: https://github.com/unslothai/unsloth
- **Unsloth Colab Notebooks**: https://github.com/unslothai/unsloth#-finetune-for-free
- **Ollama**: https://ollama.com
- **Gemma 4 on HuggingFace**: https://huggingface.co/google/gemma-4-it
- **Unsloth Discord**: https://discord.gg/unsloth

---

*This guide is part of Mossy's built-in knowledge base. See also: `SPRIGGIT_COLLABORATIVE_MODDING_GUIDE.md` for Git-based collaborative modding.*
