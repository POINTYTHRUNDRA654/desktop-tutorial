# Advanced AI Integration

This document describes the integration of LM Studio, Chroma, and LangChain into Mossy.

## Overview

Mossy now supports advanced AI capabilities through three powerful tools:

1. **LM Studio** - Local LLM runtime for privacy-focused AI
2. **Chroma** - Vector database for semantic search and RAG
3. **LangChain** - Framework for building AI applications

## LM Studio Integration

### What It Does
LM Studio allows you to run large language models locally without sending data to cloud services.

### Setup
1. Install LM Studio from https://lmstudio.ai/
2. Download models (e.g., Llama 3, Mistral, CodeLlama)
3. Start the LM Studio server
4. Configure in Mossy settings

### Features
- **Local inference** - No data leaves your machine
- **Model management** - Download and switch models
- **OpenAI-compatible API** - Drop-in replacement
- **Hardware acceleration** - GPU support

### Usage in Mossy
```typescript
// LM Studio is available as an AI provider
// Select it in Settings → AI Provider → LM Studio
// Default endpoint: http://localhost:1234/v1
```

### Models Supported
- Llama 3 (8B, 70B)
- Mistral 7B
- CodeLlama (7B, 13B, 34B)
- Phi-2
- Mixtral 8x7B
- And many more...

## Chroma Vector Database

### What It Does
Chroma stores embeddings for semantic search, enabling powerful knowledge base features.

### Setup
```bash
# Chroma is cloned to external/chroma/
# Start Chroma server (Python required)
cd external/chroma
python -m pip install chromadb
```

### Features
- **Vector storage** - Store document embeddings
- **Similarity search** - Find related content
- **Collections** - Organize by topic
- **Persistence** - Embedded or server mode

### Usage in Mossy
```typescript
// Chroma powers the Memory Vault
// Automatically indexes uploaded documents
// Provides semantic search in knowledge base
```

### Use Cases
- Store mod documentation
- Index tutorial PDFs
- Search by meaning, not keywords
- Find similar assets
- Contextual AI responses

## LangChain Framework

### What It Does
LangChain provides tools for building AI applications with chains, agents, and tools.

### Setup
```bash
# LangChain is cloned to external/langchain/
# TypeScript bindings available
npm install langchain
```

### Features
- **Chains** - Sequence AI operations
- **Agents** - Autonomous AI assistants
- **Tools** - Give AI access to functions
- **Memory** - Conversational context
- **Retrieval** - RAG implementation

### Usage in Mossy
```typescript
// LangChain powers advanced AI features
// - Multi-step reasoning
// - Tool calling
// - Document Q&A
// - Code generation
```

### Chains Available
- **Sequential Chain** - Step-by-step processing
- **Retrieval QA** - Question answering over docs
- **Code Chain** - Code generation and analysis
- **Summary Chain** - Document summarization

## Integration Architecture

```
┌─────────────────────────────────────────┐
│           Mossy Frontend                │
│  (React + TypeScript)                   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│        AI Service Layer                  │
│  - Provider selection                    │
│  - Request routing                       │
│  - Response handling                     │
└─────────────┬───────────────────────────┘
              │
     ┌────────┴────────┬─────────────┐
     │                 │             │
     ▼                 ▼             ▼
┌─────────┐    ┌──────────┐   ┌──────────┐
│ OpenAI  │    │ LM Studio│   │   Groq   │
│ (Cloud) │    │ (Local)  │   │ (Cloud)  │
└─────────┘    └─────┬────┘   └──────────┘
                     │
              ┌──────┴────────┐
              │               │
              ▼               ▼
        ┌─────────┐    ┌──────────┐
        │ Chroma  │    │LangChain │
        │(Vectors)│    │(Chains)  │
        └─────────┘    └──────────┘
```

## Configuration

### Settings UI
Navigate to: **Settings → AI Configuration**

Options:
- Select AI Provider (OpenAI / Groq / LM Studio)
- LM Studio endpoint URL
- Chroma collection name
- LangChain chain templates

### Environment Variables
```env
# .env.local
LMSTUDIO_ENDPOINT=http://localhost:1234/v1
CHROMA_ENDPOINT=http://localhost:8000
LANGCHAIN_TRACING=true
```

## API Examples

### Using LM Studio
```typescript
import { LMStudioClient } from '@lmstudio/sdk';

const client = new LMStudioClient({
  baseUrl: 'http://localhost:1234/v1'
});

const response = await client.chat.completions.create({
  model: 'llama-3-8b-instruct',
  messages: [
    { role: 'user', content: 'Help me create a Fallout 4 mod' }
  ]
});
```

### Using Chroma
```typescript
import { ChromaClient } from 'chromadb';

const client = new ChromaClient();
const collection = await client.getOrCreateCollection('fallout4-docs');

// Add documents
await collection.add({
  ids: ['doc1'],
  documents: ['How to create a new weapon in Fallout 4'],
  metadatas: [{ category: 'weapons' }]
});

// Search
const results = await collection.query({
  queryTexts: ['weapon creation'],
  nResults: 5
});
```

### Using LangChain
```typescript
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { LLMChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';

const model = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7
});

const template = new PromptTemplate({
  template: 'Create a {type} mod for Fallout 4: {description}',
  inputVariables: ['type', 'description']
});

const chain = new LLMChain({ llm: model, prompt: template });

const result = await chain.call({
  type: 'weapon',
  description: 'energy rifle with unique beam effects'
});
```

## Benefits

### Privacy
- **LM Studio**: All data stays local
- **Chroma**: Embedded mode for local storage
- **LangChain**: Use any LLM provider

### Performance
- **LM Studio**: GPU acceleration
- **Chroma**: Fast vector search
- **LangChain**: Optimized chains

### Flexibility
- **Multiple providers**: Switch between cloud and local
- **Customizable**: Configure to your needs
- **Extensible**: Add new tools and chains

## Use Cases in Mossy

### 1. Enhanced Memory Vault
- Store documents in Chroma
- Semantic search with embeddings
- Contextual retrieval for AI
- Better than keyword search

### 2. Local AI Chat
- Use LM Studio for privacy
- No API costs
- Offline capability
- Full control over model

### 3. Advanced Workflows
- LangChain chains for complex tasks
- Multi-step mod creation
- Autonomous agents
- Tool integration

### 4. Knowledge Base
- Index all Fallout 4 documentation
- Search by concept
- Find related tutorials
- Contextual help

## Troubleshooting

### LM Studio Not Connecting
1. Ensure LM Studio is running
2. Check endpoint URL (default: http://localhost:1234)
3. Verify model is loaded
4. Test in LM Studio's built-in chat

### Chroma Connection Failed
1. Start Chroma server
2. Check port (default: 8000)
3. Verify Python environment
4. Check firewall settings

### LangChain Errors
1. Ensure dependencies installed
2. Check provider API keys
3. Verify chain configuration
4. Review LangChain docs

## Performance Tips

### LM Studio
- Use quantized models (GGUF format)
- Enable GPU acceleration
- Adjust context length
- Choose appropriate model size

### Chroma
- Use persistent storage
- Batch insert documents
- Index periodically
- Limit collection size

### LangChain
- Cache common chains
- Use streaming responses
- Optimize prompts
- Limit chain steps

## Security Considerations

### LM Studio
- ✅ Local inference (no data sent)
- ✅ No API keys needed
- ⚠️ Resource intensive
- ⚠️ Model updates manual

### Chroma
- ✅ Can run embedded
- ✅ Local vector storage
- ⚠️ No built-in auth
- ⚠️ Protect endpoint if exposed

### LangChain
- ⚠️ Requires API keys for cloud LLMs
- ⚠️ Tool execution can be dangerous
- ✅ Works with local LLMs
- ✅ Audit chain logic

## Future Enhancements

### Planned Features
- [ ] LM Studio model downloader UI
- [ ] Chroma collection browser
- [ ] LangChain chain builder
- [ ] Vector search UI
- [ ] Agent playground
- [ ] Custom tool creation

### Integration Ideas
- Fine-tune models on Fallout 4 data
- Semantic mod search
- AI-powered mod recommendations
- Automated compatibility checks
- Knowledge graph construction

## Resources

### Official Documentation
- **LM Studio**: https://lmstudio.ai/docs
- **Chroma**: https://docs.trychroma.com/
- **LangChain**: https://js.langchain.com/docs/

### Model Sources
- **Hugging Face**: https://huggingface.co/models
- **LM Studio Discover**: Built-in model browser
- **Ollama Library**: https://ollama.ai/library

### Community
- **LM Studio Discord**: https://discord.gg/lmstudio
- **Chroma Discord**: https://discord.gg/MMeYNTmh3x
- **LangChain Discord**: https://discord.gg/langchain

## Summary

Mossy now has enterprise-grade AI capabilities:
- **LM Studio**: Privacy-first local AI
- **Chroma**: Semantic search and RAG
- **LangChain**: Advanced AI workflows

All three integrate seamlessly to provide:
- Better knowledge base
- Smarter AI assistance
- More powerful features
- Greater flexibility

**Status**: Integrated and ready to use! ✅
