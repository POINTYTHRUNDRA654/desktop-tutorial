# External Dependencies

This directory contains cloned repositories for advanced AI features.

## Included Repositories

### 1. Chroma Vector Database
- **Repository**: https://github.com/chroma-core/chroma
- **Purpose**: Vector storage and semantic search
- **Usage**: Powers Memory Vault and knowledge base
- **License**: Apache 2.0

To use Chroma:
```bash
cd chroma
python -m pip install chromadb
python -m chromadb.server
```

### 2. LangChain Framework
- **Repository**: https://github.com/langchain-ai/langchain
- **Purpose**: AI application framework
- **Usage**: Chains, agents, and RAG
- **License**: MIT

To use LangChain:
```bash
npm install langchain
```

### 3. NVIDIA Cosmos
- **Repository**: https://github.com/NVIDIA/cosmos
- **Purpose**: Video generation and analysis
- **Usage**: Future video features
- **License**: NVIDIA

## Setup

These repositories are cloned for reference and integration. They are excluded from git tracking via `.gitignore`.

### Installation

The repositories are cloned with:
```bash
git clone --depth 1 https://github.com/chroma-core/chroma.git
git clone --depth 1 https://github.com/langchain-ai/langchain.git
```

### Integration

See `ADVANCED_AI_INTEGRATION.md` for details on how these are integrated into Mossy.

## Why External?

These large repositories are:
- Cloned for reference and development
- Not included in the main git tree
- Independently versioned
- Updated as needed

## Updates

To update a repository:
```bash
cd <repo-name>
git pull origin main
```

## Notes

- These directories are in `.gitignore`
- Size: ~500MB combined
- Python and Node.js required for full functionality
- See main documentation for usage examples
