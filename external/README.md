# External Dependencies

This directory contains cloned repositories for advanced AI features and utilities.

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

### 3. electron-store
- **Repository**: https://github.com/sindresorhus/electron-store
- **Purpose**: Type-safe settings storage for Electron
- **Usage**: Better settings management
- **License**: MIT

To use electron-store:
```bash
npm install electron-store
```

See `ELECTRON_STORE_GUIDE.md` for integration details.

### 4. NVIDIA Cosmos Predict 2.5
- **Repository**: https://github.com/nvidia-cosmos/cosmos-predict2.5
- **Purpose**: Video prediction and world simulation
- **Usage**: Future frame prediction, physics simulation
- **License**: NVIDIA
- **Size**: ~154 MB

### 5. NVIDIA Cosmos Transfer 2.5
- **Repository**: https://github.com/nvidia-cosmos/cosmos-transfer2.5
- **Purpose**: Video tokenization and encoding
- **Usage**: Video understanding and representation
- **License**: NVIDIA
- **Size**: ~224 MB

### 6. NVIDIA Cosmos Reason 2
- **Repository**: https://github.com/nvidia-cosmos/cosmos-reason2
- **Purpose**: Physical AI reasoning VLM
- **Usage**: Scene understanding, spatial reasoning
- **License**: NVIDIA
- **Size**: ~22 MB

### 7. NVIDIA Cosmos Cookbook
- **Repository**: https://github.com/nvidia-cosmos/cosmos-cookbook
- **Purpose**: Recipes and examples for Cosmos models
- **Usage**: Step-by-step guides, post-training scripts
- **License**: NVIDIA
- **Size**: ~1.5 GB (includes examples)

### 8. NVIDIA Cosmos RL
- **Repository**: https://github.com/nvidia-cosmos/cosmos-rl
- **Purpose**: Reinforcement learning with world models
- **Usage**: Agent training, policy optimization
- **License**: NVIDIA
- **Size**: ~36 MB

### 9. NVIDIA Cosmos Dependencies
- **Repository**: https://github.com/nvidia-cosmos/cosmos-dependencies
- **Purpose**: Shared libraries and utilities
- **Usage**: Common dependencies for all Cosmos models
- **License**: NVIDIA
- **Size**: ~12 MB

### 10. NVIDIA Cosmos Curate
- **Repository**: https://github.com/nvidia-cosmos/cosmos-curate
- **Purpose**: Data curation and processing pipeline
- **Usage**: Prepare and process training data
- **License**: NVIDIA
- **Size**: ~17 MB

### 11. NVIDIA Cosmos Xenna
- **Repository**: https://github.com/nvidia-cosmos/cosmos-xenna
- **Purpose**: High-performance video decoding
- **Usage**: Fast video I/O and processing
- **License**: NVIDIA
- **Size**: ~3.3 MB

See `COSMOS_INTEGRATION_GUIDE.md` for complete setup and usage of all Cosmos models.

### 12. Phoenix LiveView
- **Repository**: https://github.com/plausible/phoenix_live_view
- **Purpose**: Real-time server-rendered UI framework
- **Usage**: Live dashboards, monitoring interfaces, collaborative features
- **License**: MIT
- **Size**: ~24 MB

To use Phoenix LiveView:
```bash
# Install Elixir
brew install elixir  # macOS
# or choco install elixir  # Windows

# Create Phoenix app
mix archive.install hex phx_new
mix phx.new mossy_web --live
```

See `PHOENIX_LIVEVIEW_GUIDE.md` for integration details.

## Setup

These repositories are cloned for reference and integration. They are excluded from git tracking via `.gitignore`.

### Installation

The repositories are cloned with:
```bash
git clone --depth 1 https://github.com/chroma-core/chroma.git
git clone --depth 1 https://github.com/langchain-ai/langchain.git
git clone --depth 1 https://github.com/sindresorhus/electron-store.git
git clone https://github.com/nvidia-cosmos/cosmos-predict2.5.git
git clone https://github.com/nvidia-cosmos/cosmos-transfer2.5.git
git clone https://github.com/nvidia-cosmos/cosmos-reason2.git
git clone https://github.com/nvidia-cosmos/cosmos-cookbook.git
git clone https://github.com/nvidia-cosmos/cosmos-rl.git
git clone https://github.com/nvidia-cosmos/cosmos-dependencies.git
git clone https://github.com/nvidia-cosmos/cosmos-curate.git
git clone https://github.com/nvidia-cosmos/cosmos-xenna.git
git clone https://github.com/plausible/phoenix_live_view.git
```

### Integration

- See `ADVANCED_AI_INTEGRATION.md` for AI tools
- See `ELECTRON_STORE_GUIDE.md` for settings management
- See `COSMOS_INTEGRATION_GUIDE.md` for NVIDIA Cosmos platform
- See `PHOENIX_LIVEVIEW_GUIDE.md` for real-time web UI

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
- Size: ~2.5GB combined
- Python, Node.js, and Elixir required for full functionality
- See main documentation for usage examples
