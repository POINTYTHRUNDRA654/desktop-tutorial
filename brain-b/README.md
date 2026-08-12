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

# 2. Copy this entire brain-b/ folder here (all of it — the knowledge
#    pipeline scripts are as load-bearing as the server itself now):
#    bootstrap_fallout4_knowledge.py, gemma_service_enhanced.py,
#    knowledge_manifest.py, reset_collection.py, build_knowledge_db.py,
#    ingest_ck_wiki.py, coverage_gaps.py, requirements.txt, knowledge/

# 3. Create virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# 4. Install PyTorch (match your CUDA version — see pytorch.org)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# 5. Install Brain B dependencies (includes waitress, the production server)
pip install -r requirements.txt

# 6. Build the curated knowledge base from committed sources (bootstrap
#    entries + brain-b/knowledge/**/*.jsonl) — do this before first start
python build_knowledge_db.py

# 7. Start the server
python gemma_service_enhanced.py
```

Step 6 is what actually populates the curated collection correctly (partitioned
from runtime content, embedded with the pinned model, manifest written). If
you skip it, `gemma_service_enhanced.py` still bootstraps the ~40 hand-authored
entries automatically on first run — but none of the ingested CK wiki content
in `knowledge/` will be there until you run `build_knowledge_db.py`.

The server will:
1. Auto-select the best Gemma model based on your VRAM
2. Serve the curated collection built in step 6 (or bootstrap it automatically
   if you skipped that step and it's still empty)
3. Build the knowledge graph
4. Start on `http://localhost:8766` via waitress (falls back to Flask's dev
   server with a warning if waitress isn't installed — check `/health`'s
   `server` field to see which one actually started)

## Configuration

Set environment variables before starting:

| Variable | Default | Description |
|---|---|---|
| `MOSSY_MODEL` | auto-selected | Override model (e.g. `google/gemma-2-9b-it`) |
| `CHROMA_CURATED_PATH` | `D:\Mossy-AI\data\chroma_curated` | The shippable knowledge pack — bootstrap + ingested wiki content. Rebuilt from scratch by `build_knowledge_db.py`; never hand-edit. |
| `CHROMA_RUNTIME_PATH` | `D:\Mossy-AI\data\chroma_runtime` | Local-only: auto-saved web results, manual `/knowledge/add` uploads. Never packaged, never shipped. |
| `MODELS_PATH` | `D:\Mossy-AI\models` | HuggingFace model cache |
| `MOSSY_PORT` | `8766` | API server port (8765 is claimed by Mossy's own Electron F4AI relay) |

> `CHROMA_PATH` (singular, no curated/runtime split) was the original variable
> before the knowledge base was partitioned — no code reads it anymore. If
> you have an old `D:\Mossy-AI\data\chroma\` from before this split, it's
> orphaned; safe to delete once `chroma_curated`/`chroma_runtime` exist.

> No external API keys are needed. HuggingFace model downloads are free (no account required for public models).

## API Endpoints

### `POST /infer`
Main inference with full LangGraph pipeline, the tutor response contract, and the learner model.
```json
{
  "question": "How do I fix texture flickering in FO4?",
  "use_langgraph": true,
  "mode": "teach",
  "session_id": "...",
  "user_id": "...",
  "experience_level_override": null
}
```
All five are optional. `mode` (`teach`/`answer`/`debug`) falls back to `classify_mode()`'s keyword
heuristic if omitted. **`session_id` and `user_id` are not interchangeable** — `session_id` scopes
one app launch (LocalAIEngine.ts generates a fresh `crypto.randomUUID()` per launch via
`APP_SESSION_ID`); `user_id` scopes one learner across every launch (generated once via
`getOrCreateUserId()`, persisted in settings as `mossyUserId`, reused forever after). The learner
model (`learner_state`, `answer_level`, `next_skill`) is keyed on `user_id` — send `session_id`
alone and it resets to "never seen this skill" every time the app restarts, since nothing ties the
new session back to the same learner. `learner_signals` rows log both. `experience_level_override`
(`beginner`/`intermediate`/`advanced`), if set, wins over the computed `answer_level`
unconditionally — no settings UI sets this yet, the parameter just exists so one can without a
server change.

Returns:
```json
{
  "answer": "...", "confidence": 0.85, "sources": [{"title": "...", "source_url": "...", "license": "..."}],
  "critique_applied": true,
  "mode": "teach",
  "diagnosis": "what the user actually needs, decided before generating",
  "check_question": "...",
  "answer_level": "beginner",
  "next_skill": "objectreference-api",
  "abstained": false
}
```
`sources` are citation objects (title/source_url/license), not bare chunk ids. `check_question`
is only ever non-null when `mode == "teach"`. `answer_level` and `next_skill` are computed from
`learner_state` — retrieval side-effects (which `skill_tags.py` tags came back, exposure counts,
debug-mode turns), not the model's own judgment of the user's skill (see
`compute_answer_level()`'s docstring for why). Both are `null` when `user_id` is omitted/`"unknown"`
— there's no learner to track without one — or when nothing retrieved carries a `skill_tags` value.
`abstained: true` means no documentation matched closely enough to answer — `answer` is already
the honest "I don't know" message in that case, not an error, and no learner_state update happens
for that turn ("corpus gap, not learner gap").

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
| `D:\Mossy-AI\data\chroma_curated\` | The shippable knowledge pack (build output — see `build_knowledge_db.py`). Contains `knowledge_manifest.json`: build version, pinned embedding model, source counts. |
| `D:\Mossy-AI\data\chroma_runtime\` | Local-only: web-search cache, manual uploads. Never shipped. |
| `D:\Mossy-AI\data\mossy_brain.db` | SQLite: episodes, feedback, training samples, `learner_signals` (see `coverage_gaps.py`), `contract_failures` |
| `D:\Mossy-AI\data\knowledge_graph.json` | NetworkX graph JSON |
| `D:\Mossy-AI\data\training_dataset.jsonl` | Training samples JSONL |
| `D:\Mossy-AI\models\mossy-lora\` | LoRA adapter (after fine-tuning) |
| `brain-b\knowledge\**\*.jsonl` | **Source of truth, committed to git** — reviewable per-page CK wiki content ingested via `ingest_ck_wiki.py`. `chroma_curated` is built FROM this, not the other way around. See `/LICENSING.md` — this content is CC BY-SA 2.5, not this repo's MIT license. |

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

