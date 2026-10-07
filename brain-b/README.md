# Mossy Brain B (Nexus edition)

Brain B is Mossy's local knowledge service: retrieval over a curated Fallout 4 modding
knowledge pack, mode routing, and the tutoring contract (check_question, learner signal).

Everything runs on your own computer:

- Retrieval and citations run locally on CPU (ChromaDB + fastembed).
- Answers are written by your own local AI (Ollama). Mossy starts Brain B with your Ollama
  address and model. If Ollama is not running, Brain B says so and still returns
  retrieval results and citations.
- No API keys, tokens or cloud AI services are used anywhere in this edition.

Layout:

- `nexus/brain_b_slim.py` - the service that ships (port 8766).
- `nexus/` - build scripts for the packaged distribution (`build_nexus_package.py`).
- `knowledge/` - the curated, reviewed knowledge pack and approved lessons.

Dev run: `cd brain-b/nexus && pip install -r requirements-nexus.txt && python brain_b_slim.py`
