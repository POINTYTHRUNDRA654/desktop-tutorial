# Creative Director AI helpers

Optional local services for Mossy's **Vault-Tec Creative Director** panel. Mossy installs them for you from **Settings > Your PC** (or the first-run "Your PC" step), into a folder you choose, and starts and stops them from the Creative Director panel.

| Service | Port | What it does |
|---|---|---|
| `creative_director.py` | 8767 | Drafts quest scripts, dialogue lines, NPC backstories and world design briefs with your local AI model; lore store with semantic search; static Papyrus checks |
| `ai_helper.py` | 8769 | Research peer the Creative Director talks to |
| `virtual_mod_lab.py` | 8768 | Experiment peer the Creative Director talks to |

## Local only

- All three listen on `127.0.0.1`, so they can't be reached from the network.
- Text generation uses your local Ollama (or KoboldCpp at `localhost:5001`). There are no cloud APIs and no keys.
- Lore search embeds text through Ollama's `nomic-embed-text` model. Mossy pulls that model once, when you install.
- The optional shared lesson hub (`hub_host` in the config) is off unless you set it.

## Generated Papyrus is a draft

Local models often write Papyrus that does not compile. They invent syntax, or use Skyrim-only functions like `RegisterForSingleUpdate`, which doesn't exist in Fallout 4. Quest scripts come back marked **UNVERIFIED DRAFT**. Check every line against the Creation Kit wiki, then compile it with PapyrusCompiler.

## Manual install (without Mossy)

You need Python 3.10 or newer and Ollama.

```
python -m venv venv
venv\Scripts\python -m pip install -r requirements.txt
ollama pull nomic-embed-text
venv\Scripts\python ai_helper.py
venv\Scripts\python virtual_mod_lab.py
venv\Scripts\python creative_director.py
```

To use a model other than the default, set `ollama_model` in `creative_director_config.json` to any model you have pulled.
