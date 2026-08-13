# Mossy Brain B — Local Retrieval + Router Service

Brain B is Mossy's optional local AI service: a Python/Flask server that owns retrieval
(ChromaDB, BM25, RRF merging) and episodic memory locally — and calls out to Mossy's own
shared Render backend for ALL generation, including the tutoring-contract logic
(mode routing, need-diagnosis, check_question) as well as long-form answers. That's the
same backend the Electron app itself calls (`src/backend/`, deployed at
`mossy.onrender.com`), which holds the real Groq API key server-side; Brain B
authenticates with a shared token instead, the same way the Electron client does.

**This is a deliberate architecture choice, not a limitation being worked around** — for
two independent, both real, reasons verified on real hardware:

1. **VRAM.** On an 8GB card, this service's local 9B model (Gemma-2, Unsloth 4-bit) has
   ~7GB of fixed weight+overhead footprint before a single token generates. Long-form
   generation OOMs well under 100 tokens of real RAG context, and doesn't move much with
   prompt trimming or KV-cache quantization.
2. **Checkpoint quality.** Independent of VRAM, this exact quantized checkpoint produced
   garbage or empty output on every small JSON call (classify_mode/diagnose/
   contract_fields) all night, on trivial prompts that don't come close to the VRAM
   ceiling — ruled out double-BOS, missing chat template, wrong attention_mask/pad_token,
   and fp16-vs-bf16 as causes. The same prompts sent to the cloud backend produced
   correct output immediately in every case.

Both point the same direction: this local model isn't reliable for generation on this
hardware, period, not just for long answers. **The local model is not decorative** — it
remains available as an automatic offline/degraded fallback (shrinking-budget retry,
degrading to an honest message rather than crashing) when the backend is unreachable, and
retrieval stays fully local regardless.

## Architecture

```
Brain A (always on)                    Brain B (optional, local)
─────────────────────────────          ──────────────────────────────────────
MossyBrain.ts (system prompt)          gemma_service_enhanced.py (Flask API)
ChatInterface ─┐                       ├── ChromaDB (vector store, RAG) — local
LocalAIEngine.ts│                      ├── BM25 keyword index (hybrid search) — local
SettingsHub     │                      ├── Reciprocal Rank Fusion (RRF merging) — local
                │                      ├── SQLite (episodes + feedback) — local
                ▼                      ├── NetworkX knowledge graph — local
   mossy.onrender.com/v1/chat  ←───────┤   DuckDuckGo web search (free) — local
   (src/backend/, holds the            ├── LangGraph multi-step workflow — orchestration
    real Groq key server-side)         ├── ALL generation — mode routing, diagnosis,
                                       │   tutoring contract fields, long-form answers —
                                       │   shared Render backend by default; local 9B
                                       │   model as degrading fallback
                                       └── LoRA fine-tune pipeline
```

> Retrieval and episodic memory are fully local and free — no token needed for either.
> **Everything that involves generation needs `MOSSY_BACKEND_TOKEN`** to run reliably;
> without it, Brain B falls back to the local model's degrading-budget retry, and mode
> routing keeps working via a keyword heuristic even then — but diagnosis and
> check_question will likely come back null on this specific local checkpoint (see
> Configuration below).

## Prerequisites

- Python 3.10+
- NVIDIA GPU with 8GB+ VRAM for the local fallback model (9B at 4-bit), 12GB+ for 12B,
  24GB+ for 27B. **Not required for normal operation** — with `MOSSY_BACKEND_TOKEN` set,
  the local model only loads when the cloud backend is unavailable.
- CUDA 12.1+ and cuDNN (for the local fallback model)
- ~50GB disk space for model weights + data (for the local fallback model)
- `MOSSY_BACKEND_TOKEN` for reliable operation — the same shared-secret the Electron
  app sends to `mossy.onrender.com`. This is a separate Python process with its own
  environment; the Electron app's encrypted settings-file value isn't readable here, so
  the token needs to be provided to this process directly (see Configuration below). This
  is NOT a Groq API key — the backend already holds that server-side.

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

# 7. Set MOSSY_BACKEND_TOKEN so long-form answers use the shared Render backend
#    instead of the local model's degrading fallback. This is a separate process
#    from the Electron app, so its own encrypted settings-file value doesn't carry
#    over. Easiest: copy .env.example to .env in this directory and fill it in —
#    it's gitignored and loads automatically. Or set the env var directly:
$env:MOSSY_BACKEND_TOKEN = "..."

# 8. Start the server
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
| `MOSSY_BACKEND_URL` | `https://mossy.onrender.com` | The shared Render backend base URL. Matches `main.ts`'s own fallback — only override if you're running your own deployment. |
| `MOSSY_BACKEND_TOKEN` | *(none)* | Required for full-quality long-form answers. Without it, generation falls back to the local model's shrinking-budget retry — see the architecture note above for why. NOT a Groq key; it's the shared secret that authenticates against the Render backend, which holds the real Groq key. Not read from the Electron app's encrypted settings; set it directly in this process's environment, or via `.env` (see `.env.example`). |
| `BRAINB_GENERATION_BACKEND` | `cloud` | Set to `local` to force local-only generation (same shrinking-budget retry) — e.g. for an offline demo, or if you'd rather not configure the backend token at all. |

> `CHROMA_PATH` (singular, no curated/runtime split) was the original variable
> before the knowledge base was partitioned — no code reads it anymore. If
> you have an old `D:\Mossy-AI\data\chroma\` from before this split, it's
> orphaned; safe to delete once `chroma_curated`/`chroma_runtime` exist.

> Retrieval, routing, diagnosis, and the tutoring contract need no token and never will.
> HuggingFace model downloads are free (no account required for public models). Only
> long-form answer generation needs `MOSSY_BACKEND_TOKEN` to run at full quality — see
> the architecture note at the top of this file.

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

Brain B auto-selects a local model based on VRAM. This model handles routing, diagnosis,
retrieval, and the tutoring contract in every configuration — it does **not** need to be
large enough for long-form generation, since that's Groq's job by default:

| VRAM | Model | Local long-form generation (fallback only, capped at 120 tokens) |
|---|---|---|
| 7–9 GB | `google/gemma-2-9b-it` | Tight — this is the configuration that motivated routing generation to Groq |
| 10–21 GB | `google/gemma-3-12b-it` | Untested; likely still tight for uncapped generation |
| 22+ GB | `google/gemma-3-27b-it` | Untested; more headroom, but Groq is still the default primary path |

Override with `MOSSY_MODEL=google/gemma-3-27b-it` env var. A bigger local model doesn't
change whether Groq is used by default — it only changes how good the capped local
fallback is when Groq isn't available.

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

**Out of VRAM during generation (not routing/diagnosis):** Expected on 8GB cards if
`MOSSY_BACKEND_TOKEN` isn't set — you're hitting the local fallback path, which retries
at shrinking token budgets and degrades to an honest message rather than crashing if
even the smallest budget OOMs. Set `MOSSY_BACKEND_TOKEN` for real answers; don't try to
fix this by raising `max_new_tokens` on the local path, it will OOM again (verified —
see architecture note above).

**Out of VRAM (routing/diagnosis, not generation):** Set `MOSSY_MODEL=google/gemma-2-9b-it` (smallest model, needs ~7GB VRAM)

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

