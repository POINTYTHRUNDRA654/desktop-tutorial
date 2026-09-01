# Nemotron Integration for Mossy

This document describes how to build, deploy, and integrate the NVIDIA Nemotron-3-Super model into Mossy as a backend service.

## Overview

Nemotron is integrated via a containerized Flask API that runs as a separate service. This approach:
- ✅ Solves Windows build dependency issues (megatron_core, CUDA)
- ✅ Enables GPU acceleration in containers
- ✅ Keeps the Electron app lightweight
- ✅ Is production-deployable (Docker, Kubernetes, cloud)

## Architecture

```
┌─────────────────────────────┐
│   Mossy Electron App        │
│   (React + TypeScript)      │
└──────────────┬──────────────┘
               │ HTTP/REST
               ↓
┌─────────────────────────────┐
│  Nemotron Flask API Service │
│  (NeMo + Transformers)      │
└──────────────┬──────────────┘
               │ GPU
               ↓
    ┌────────────────────┐
    │  Nemotron Model    │
    │  (8B parameters)   │
    └────────────────────┘
```

## Quick Start (Development)

### 1. Build Docker image

```bash
docker build -f Dockerfile.nemotron -t mossy-nemotron:latest .
```

### 2. Run with Docker Compose

```bash
docker-compose -f docker-compose.nemotron.yml up -d
```

Service will be available at `http://localhost:5000`

### 3. Verify health check

```bash
curl http://localhost:5000/health
# Expected response:
# {
#   "status": "ok",
#   "model_loaded": true,
#   "device": "cuda"
# }
```

### 4. Test generation

```bash
curl -X POST http://localhost:5000/nemotron \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing in simple terms.",
    "max_tokens": 100
  }'
```

## Integrating with Mossy UI

### Renderer (React Component)

```typescript
import { useEffect, useState } from 'react';

function NemotronChat() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electron.api.invoke('nemotron-generate', {
        prompt,
        maxTokens: 200,
        temperature: 0.7,
      });

      setResponse(result.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check health on mount
    window.electron.api.invoke('nemotron-health').then(status => {
      console.log('Nemotron status:', status);
    });
  }, []);

  return (
    <div className="nemotron-chat">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt..."
      />
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate'}
      </button>
      {error && <div className="error">{error}</div>}
      {response && <div className="response">{response}</div>}
    </div>
  );
}

export default NemotronChat;
```

### Preload (IPC Setup)

Add to your preload script:

```typescript
const { contextBridge, ipcMain } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  api: {
    invoke: (channel: string, ...args: any[]) => 
      ipcRenderer.invoke(channel, ...args),
  },
});
```

## Deployment

### For Windows Users (No NVIDIA GPU)

Use CPU mode (slow but works):

```bash
docker build -f Dockerfile.nemotron \
  --build-arg BASE_IMAGE=python:3.11 \
  -t mossy-nemotron:cpu .
```

### For Cloud Deployment

**AWS (ECS + GPU)**:

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker tag mossy-nemotron:latest <account>.dkr.ecr.us-east-1.amazonaws.com/mossy-nemotron:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/mossy-nemotron:latest
```

**GCP (Cloud Run + GPU)**: 
- Use [Vertex AI](https://cloud.google.com/vertex-ai) for managed inference

**Azure (Container Instances + GPU)**:
```bash
az container create \
  --resource-group mygroup \
  --name mossy-nemotron \
  --image <registry>.azurecr.io/mossy-nemotron:latest \
  --gpu 1 \
  --ports 5000 \
  --cpu 4 \
  --memory 16
```

### Production Checklist

- [ ] Set `FLASK_ENV=production` in environment
- [ ] Use a production WSGI server (Gunicorn, uWSGI) instead of Flask dev server
- [ ] Enable HTTPS/TLS for remote connections
- [ ] Add request authentication (API key or OAuth)
- [ ] Set resource limits in Docker (CPU, memory, GPU)
- [ ] Configure model caching/persistence volume
- [ ] Monitor service health and latency
- [ ] Set up auto-restart policy
- [ ] Document API rate limits

## Versioning & Updates

### Pin specific NeMo/model versions

Edit `requirements-docker.txt`:
```
transformers==4.37.2  # Pin specific version
nemo-toolkit==2.8.0
```

### Rebuild and redeploy

```bash
docker build --no-cache -f Dockerfile.nemotron -t mossy-nemotron:v2.0 .
docker-compose -f docker-compose.nemotron.yml up -d --build
```

## Troubleshooting

### Container won't start

```bash
docker logs mossy-nemotron-api-1
```

### Model too slow (CPU mode)

- Ensure Docker has sufficient CPU/memory allocation
- Consider quantized models (ONNX, int8) for faster inference
- Use GPU instance instead

### Out of memory

```bash
# Increase Docker memory limit
docker-compose -f docker-compose.nemotron.yml config | \
  sed 's/memory:.*/memory: 32G/' > docker-compose.updated.yml
```

### Can't connect from Electron app

```typescript
// Add debug logging in renderer
console.log('Attempting to connect to:', 'http://localhost:5000/health');
window.electron.api.invoke('nemotron-health')
  .then(status => console.log('Status:', status))
  .catch(err => console.error('Error:', err));
```

## Performance Benchmarks

Approximate performance on different hardware:

| Device | Model | Speed | Memory |
|--------|-------|-------|--------|
| NVIDIA A100 | Nemotron-3-Super | ~50 tokens/sec | 20GB |
| NVIDIA RTX 4090 | Nemotron-3-Super | ~30 tokens/sec | 24GB |
| CPU (8c/16t) | Nemotron-3-Super | ~1 token/sec | 32GB+ |
| NVIDIA T4 | Nemotron-3-Super (quantized) | ~10 tokens/sec | 8GB |

## API Reference

### POST /nemotron

Generate text completion.

**Request**:
```json
{
  "prompt": "string",
  "max_tokens": 100,
  "temperature": 0.7,
  "top_p": 0.9
}
```

**Response**:
```json
{
  "prompt": "...",
  "response": "...",
  "tokens": 100
}
```

### GET /health

Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cuda"
}
```

## References

- [NVIDIA NeMo GitHub](https://github.com/NVIDIA/NeMo)
- [Transformers Library](https://huggingface.co/docs/transformers/)
- [Docker NVIDIA Runtime](https://github.com/NVIDIA/nvidia-docker)
- [Nemotron Model Card](https://huggingface.co/nvidia/Nemotron-3-Super)

---

**Questions?** See `src/integrations/README.md` for additional integration patterns in Mossy.
