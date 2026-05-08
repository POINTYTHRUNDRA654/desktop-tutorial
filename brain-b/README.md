# Mossy Brain B — Local Gemma AI Stack

Brain B is Mossy's optional local AI service: a Python/Flask server running a quantized Gemma model with advanced RAG, episodic memory, self-critique, LangGraph reasoning, and a fine-tune pipeline.

## Architecture

```
Brain A (always on)                    Brain B (optional, local)
─────────────────────────────          ──────────────────────────────────────
MossyBrain.ts (system prompt)          gemma_service_enhanced.py (Flask API)
ChatInterface → Groq Cloud API    ←→   ├── ChromaDB (vector store, RAG)
LocalAIEngine.ts                       ├── BM25 keyword index (hybrid search)
SettingsHub → AIEngineSettings         ├── Reciprocal Rank Fusion (RRF merging)
                                       ├── SQLite (episodes + feedback)
                                       ├── NetworkX knowledge graph
                                       ├── DuckDuckGo web search (free)
                                       ├── LangGraph multi-step workflow
                                       └── LoRA fine-tune pipeline
```

> **All Brain B components are free and open-source. No API keys required.**
> Model weights download from HuggingFace automatically on first run.

## Prerequisites

- Python 3.10+
- NVIDIA GPU with 8GB+ VRAM (for 9B model at 4-bit), 12GB+ for 12B, 24GB+ for 27B
- CUDA 12.1+ and cuDNN
- ~50GB disk space for model weights + data

## Quick Start

```powershell
# 1. Navigate to Brain B directory
cd D:\Mossy-AI

# 2. Copy these files here
#    bootstrap_fallout4_knowledge.py
#    gemma_service_enhanced.py
#    requirements.txt

# 3. Create virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# 4. Install PyTorch (match your CUDA version — see pytorch.org)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# 5. Install Brain B dependencies
pip install -r requirements.txt

# 6. Start the server
python gemma_service_enhanced.py
```

The server will:
1. Auto-select the best Gemma model based on your VRAM
2. Bootstrap ChromaDB with 100+ expert knowledge entries (first run only)
3. Build the knowledge graph
4. Start the Flask API on `http://localhost:8765`

## Configuration

Set environment variables before starting:

| Variable | Default | Description |
|---|---|---|
| `MOSSY_MODEL` | auto-selected | Override model (e.g. `google/gemma-2-9b-it`) |
| `CHROMA_PATH` | `D:\Mossy-AI\data\chroma` | ChromaDB persist directory |
| `MODELS_PATH` | `D:\Mossy-AI\models` | HuggingFace model cache |
| `MOSSY_PORT` | `8765` | API server port |

> No external API keys are needed. HuggingFace model downloads are free (no account required for public models).

## API Endpoints

### `POST /infer`
Main inference with full LangGraph pipeline.
```json
{ "question": "How do I fix texture flickering in FO4?", "use_langgraph": true }
```
Returns: `{ "answer": "...", "confidence": 0.85, "sources": [...], "critique_applied": true }`

### `POST /reflect`
Self-critique an answer.
```json
{ "question": "...", "answer": "..." }
```
Returns: `{ "critique": "...", "refined": "...", "improved": true }`

### `POST /feedback`
Submit thumbs up/down on an answer.
```json
{ "question": "...", "answer": "...", "rating": "good", "correction": "" }
```

### `POST /finetune`
Start LoRA fine-tuning on collected feedback data (runs async).
```json
{ "min_samples": 50, "epochs": 3, "lora_r": 16 }
```
Returns: `{ "status": "started", "sample_count": 73, "output_path": "D:\\Mossy-AI\\models\\mossy-lora" }`

### `POST /knowledge/add`
Add a new entry to the knowledge base.
```json
{ "title": "My Mod Notes", "content": "...", "tags": ["weapon", "patch"] }
```

### `GET /episodes`
List recent session episodes (episodic memory).

### `GET /health`
Check server status, model load state, VRAM usage, doc count.

## Model Selection

Brain B auto-selects based on VRAM:

| VRAM | Model | Quality |
|---|---|---|
| 7–9 GB | `google/gemma-2-9b-it` | Good |
| 10–21 GB | `google/gemma-3-12b-it` | Great |
| 22+ GB | `google/gemma-3-27b-it` | Best |

Override with `MOSSY_MODEL=google/gemma-3-27b-it` env var.

## Fine-Tuning Mossy's Brain

Every thumbs-up answer is automatically saved as a training sample. When you have 50+ samples:

1. In Mossy's UI, go to the Fine-Tuner panel
2. Click **"Tune Mossy's Brain"** — this calls `POST /finetune`
3. Training runs in the background (~30–90 minutes for 50 samples)
4. LoRA adapter saved to `D:\Mossy-AI\models\mossy-lora`
5. Restart the server to load the fine-tuned adapter

## Data Files

| Path | Contents |
|---|---|
| `D:\Mossy-AI\data\chroma\` | ChromaDB vector store |
| `D:\Mossy-AI\data\mossy_brain.db` | SQLite: episodes, feedback, training samples |
| `D:\Mossy-AI\data\knowledge_graph.json` | NetworkX graph JSON |
| `D:\Mossy-AI\data\training_dataset.jsonl` | Training samples JSONL |
| `D:\Mossy-AI\models\mossy-lora\` | LoRA adapter (after fine-tuning) |

## Result Ranking

Brain B uses **Reciprocal Rank Fusion (RRF)** to merge BM25 keyword results and semantic vector results. RRF is a proven rank-merging algorithm that requires no external API or paid service — it is implemented directly in the server. Result quality is comparable to commercial rerankers for domain-specific knowledge bases.

## Troubleshooting

**Out of VRAM:** Set `MOSSY_MODEL=google/gemma-2-9b-it` (smallest model, needs ~7GB VRAM)

**Slow first response:** Model is loading from disk (~2–5 minutes for 12B+) — subsequent queries are fast

**ChromaDB empty:** Run `python bootstrap_fallout4_knowledge.py` manually

**Port conflict:** Set `MOSSY_PORT=8766` and update the URL in Mossy's settings

**HuggingFace download slow:** Models cache to `MODELS_PATH` after first download. Move the cache folder to your fastest NVMe drive.

## Credits (Brain B Components — all free/open-source)

- **ChromaDB** — chroma-core (Apache 2.0)
- **Sentence Transformers / BAAI/bge-small-en** — UKP Lab / BAAI (Apache 2.0)
- **LangGraph / LangChain** — LangChain Inc (MIT)
- **Unsloth** — unslothai (Apache 2.0)
- **Transformers / PEFT / TRL** — HuggingFace (Apache 2.0)
- **BitsAndBytes** — Tim Dettmers (MIT)
- **rank_bm25** — Dorian Brown (Apache 2.0)
- **NetworkX** — NetworkX Developers (BSD)
- **DuckDuckGo Search** — Deepankar Kotnala (MIT)
- **Flask / Flask-CORS** — Pallets Project (BSD)
- **Gemma models** — Google DeepMind (Gemma Terms of Use — free for research and commercial use)

