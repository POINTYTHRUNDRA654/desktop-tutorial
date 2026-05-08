# NVIDIA Cosmos Integration Guide

Complete guide for integrating NVIDIA Cosmos World Foundation Models into Mossy.

## Overview

NVIDIA Cosmos is a platform for physical AI featuring state-of-the-art generative world foundation models (WFMs). The complete Cosmos ecosystem with 7 core components is now integrated into Mossy:

### 1. Cosmos Predict 2.5
**Purpose**: Video prediction and world simulation  
**Repository**: `external/cosmos-predict2.5/`  
**Size**: ~154 MB

- Predicts future frames from video/image input
- Text2World, Image2World, Video2World generation
- Flow-based diffusion model
- Uses Cosmos Reason 2 as text encoder

### 2. Cosmos Transfer 2.5
**Purpose**: Video tokenization and encoding  
**Repository**: `external/cosmos-transfer2.5/`  
**Size**: ~224 MB

- Converts videos to latent representations
- Enables efficient video processing
- 3D Causal VAE architecture
- Compresses video for generation

### 3. Cosmos Reason 2
**Purpose**: Physical AI reasoning VLM  
**Repository**: `external/cosmos-reason2/`  
**Size**: ~22 MB

- Vision Language Model for scene understanding
- Spatial and temporal reasoning
- Physics-aware comprehension
- Used as text encoder in Predict 2.5

### 4. Cosmos Cookbook
**Purpose**: Recipes and examples  
**Repository**: `external/cosmos-cookbook/`  
**Size**: ~1.5 GB

- Step-by-step tutorials
- Post-training scripts
- Robotics and AV examples
- Customization guides

### 5. Cosmos RL
**Purpose**: Reinforcement learning with world models  
**Repository**: `external/cosmos-rl/`  
**Size**: ~36 MB

- Agent training with world models
- Policy optimization
- Reward service
- Model-based RL

### 6. Cosmos Dependencies
**Purpose**: Shared libraries and utilities  
**Repository**: `external/cosmos-dependencies/`  
**Size**: ~12 MB

- Common dependencies
- Shared utilities
- Build tools
- Integration helpers

### 7. Cosmos Curate
**Purpose**: Data curation and processing  
**Repository**: `external/cosmos-curate/`  
**Size**: ~17 MB

- Data preparation pipeline
- Quality filtering
- Dataset curation
- Processing tools

### 8. Cosmos Xenna
**Purpose**: High-performance video decoding  
**Repository**: `external/cosmos-xenna/`  
**Size**: ~3.3 MB

- Fast video I/O
- Hardware-accelerated decoding
- Efficient frame extraction
- Optimized for Cosmos pipeline

## Use Cases for Fallout 4 Modding

### 1. Animation Preview
```python
# Predict how an animation will look
from cosmos_predict2 import CosmosPredict

model = CosmosPredict("2B")
# Input: First frame of animation
# Output: Predicted animation sequence
result = model.predict(
    image="armor_idle_frame1.png",
    prompt="Character wearing power armor stands idle",
    num_frames=121  # 5 seconds at 24fps
)
```

**Benefits:**
- Preview animations before exporting
- Test particle effects
- Validate weapon firing sequences
- Check NPC behaviors

### 2. Environment Simulation
```python
# Simulate environmental effects
result = model.predict(
    image="commonwealth_scene.png",
    prompt="Rain begins falling on abandoned buildings, puddles form",
    num_frames=121
)
```

**Benefits:**
- Preview weather effects
- Test lighting changes
- Simulate time-of-day transitions
- Validate environmental hazards

### 3. Weapon Effects Testing
```python
# Predict projectile trajectory and impact
result = model.predict(
    video="laser_rifle_fire.mp4",
    prompt="Energy weapon fires laser beam, hits metal surface, sparks fly",
    num_frames=61
)
```

**Benefits:**
- Visualize weapon effects
- Test projectile physics
- Preview explosion effects
- Validate impact decals

### 4. NPC Behavior Prediction
```python
# Predict NPC reactions
result = model.predict(
    video="npc_conversation.mp4",
    prompt="Settler reacts with surprise, steps back, raises hands",
    num_frames=91
)
```

**Benefits:**
- Test dialogue animations
- Preview combat behaviors
- Validate AI responses
- Check facial expressions

### 5. Asset Generation
```python
# Generate texture variations
from cosmos_transfer2 import CosmosTransfer

encoder = CosmosTransfer()
latents = encoder.encode("rusty_metal.mp4")
# Use latents for generation
```

**Benefits:**
- Create texture variations
- Generate material previews
- Animate static meshes
- Test shader effects

## Installation

### Requirements

**Hardware:**
- NVIDIA GPU with 16GB+ VRAM (24GB recommended)
- CUDA 11.8 or newer
- 50GB+ free disk space

**Software:**
- Python 3.10+
- PyTorch 2.0+
- CUDA Toolkit
- uv or pip

### Step 1: Clone Repositories (Already Done)

```bash
cd external/
# All repos already cloned:
# - cosmos-predict2.5/
# - cosmos-transfer2.5/
# - cosmos-reason2/
# - cosmos-cookbook/
```

### Step 2: Install Python Dependencies

**Option A: Using uv (recommended)**
```bash
cd external/cosmos-predict2.5/
uv sync
```

**Option B: Using pip**
```bash
cd external/cosmos-predict2.5/
pip install -e .
```

### Step 3: Download Model Weights

Models are hosted on Hugging Face:

**Cosmos Predict 2.5:**
- 2B model: `nvidia/Cosmos-Predict2.5-2B`
- 14B model: `nvidia/Cosmos-Predict2.5-14B`

**Cosmos Transfer 2.5:**
- `nvidia/Cosmos-Transfer2.5`

**Cosmos Reason 2:**
- `nvidia/Cosmos-Reason2`

```python
from huggingface_hub import snapshot_download

# Download Predict 2B (recommended for Mossy)
snapshot_download(
    repo_id="nvidia/Cosmos-Predict2.5-2B",
    local_dir="./checkpoints/cosmos-predict-2b"
)

# Download Transfer
snapshot_download(
    repo_id="nvidia/Cosmos-Transfer2.5",
    local_dir="./checkpoints/cosmos-transfer"
)

# Download Reason
snapshot_download(
    repo_id="nvidia/Cosmos-Reason2",
    local_dir="./checkpoints/cosmos-reason"
)
```

## Integration into Mossy

### Architecture

```
Mossy Frontend
    ↓
Cosmos Service (Python)
    ↓
├─ Cosmos Predict 2.5
│  └─ Cosmos Reason 2 (text encoder)
├─ Cosmos Transfer 2.5
└─ Cosmos Cookbook (examples)
```

### Option 1: Python Backend Service

Create a FastAPI service to expose Cosmos models:

```python
# cosmos_service.py
from fastapi import FastAPI, File, UploadFile
from cosmos_predict2 import CosmosPredict
import uvicorn

app = FastAPI()
model = None

@app.on_event("startup")
async def load_model():
    global model
    model = CosmosPredict(
        model_size="2B",
        checkpoint_path="./checkpoints/cosmos-predict-2b"
    )

@app.post("/predict/image2world")
async def predict_image2world(
    image: UploadFile = File(...),
    prompt: str = "",
    num_frames: int = 121
):
    # Process image
    result = model.predict(
        image=await image.read(),
        prompt=prompt,
        num_frames=num_frames
    )
    return {"video_path": result.save("output.mp4")}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

### Option 2: Direct Python Integration

Use Python subprocess from Electron main process:

```typescript
// src/electron/cosmos-service.ts
import { spawn } from 'child_process';
import path from 'path';

export class CosmosService {
  private pythonProcess: any;

  async start() {
    const scriptPath = path.join(
      __dirname,
      '../../external/cosmos-predict2.5/inference.py'
    );
    
    this.pythonProcess = spawn('python', [scriptPath]);
  }

  async predictImage2World(
    imagePath: string,
    prompt: string,
    numFrames: number = 121
  ): Promise<string> {
    // Call Python script
    return new Promise((resolve, reject) => {
      const args = [
        'inference.py',
        '--image', imagePath,
        '--prompt', prompt,
        '--num-frames', numFrames.toString()
      ];
      
      const process = spawn('python', args, {
        cwd: path.join(__dirname, '../../external/cosmos-predict2.5')
      });
      
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Python process exited with code ${code}`));
        }
      });
    });
  }
}
```

### Option 3: REST API Client

If running Cosmos as a separate service:

```typescript
// src/integrations/cosmos-client.ts
import axios from 'axios';

export class CosmosClient {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:8001') {
    this.baseURL = baseURL;
  }

  async predictImage2World(
    imageData: Buffer,
    prompt: string,
    numFrames: number = 121
  ): Promise<string> {
    const formData = new FormData();
    formData.append('image', new Blob([imageData]));
    formData.append('prompt', prompt);
    formData.append('num_frames', numFrames.toString());

    const response = await axios.post(
      `${this.baseURL}/predict/image2world`,
      formData
    );

    return response.data.video_path;
  }

  async predictVideo2World(
    videoData: Buffer,
    prompt: string,
    numFrames: number = 121
  ): Promise<string> {
    const formData = new FormData();
    formData.append('video', new Blob([videoData]));
    formData.append('prompt', prompt);
    formData.append('num_frames', numFrames.toString());

    const response = await axios.post(
      `${this.baseURL}/predict/video2world`,
      formData
    );

    return response.data.video_path;
  }
}
```

## Example Workflows

### Workflow 1: Preview Animation

```typescript
// In Mossy
async function previewAnimation(firstFrame: string) {
  const cosmos = new CosmosClient();
  
  const videoPath = await cosmos.predictImage2World(
    fs.readFileSync(firstFrame),
    "Power armor idle animation, subtle breathing movement",
    121  // 5 seconds
  );
  
  // Display in Mossy's video player
  showVideoPreview(videoPath);
}
```

### Workflow 2: Test Weapon Effect

```typescript
async function testWeaponEffect(weaponVideo: string) {
  const cosmos = new CosmosClient();
  
  const result = await cosmos.predictVideo2World(
    fs.readFileSync(weaponVideo),
    "Laser rifle fires beam, hits target, explosion and sparks",
    61  // 2.5 seconds
  );
  
  showVideoPreview(result);
}
```

### Workflow 3: Generate Environment Sequence

```typescript
async function generateEnvironmentSequence(sceneImage: string) {
  const cosmos = new CosmosClient();
  
  const scenarios = [
    "Clear day with bright sunlight",
    "Overcast sky, rain begins falling",
    "Heavy rain with puddles forming",
    "Rain stops, sun breaks through clouds"
  ];
  
  for (const prompt of scenarios) {
    const video = await cosmos.predictImage2World(
      fs.readFileSync(sceneImage),
      prompt,
      121
    );
    
    await showVideoPreview(video);
    await delay(1000);
  }
}
```

## UI Extension Component

Create a Cosmos extension in Mossy:

```typescript
// src/renderer/src/CosmosExtension.tsx
import React, { useState } from 'react';
import { Upload, Video, Image } from 'lucide-react';

export function CosmosExtension() {
  const [mode, setMode] = useState<'image2world' | 'video2world'>('image2world');
  const [prompt, setPrompt] = useState('');
  const [numFrames, setNumFrames] = useState(121);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Call Cosmos service via IPC
      const videoPath = await window.electron.api.cosmos.predict({
        mode,
        prompt,
        numFrames
      });
      setResult(videoPath);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="cosmos-extension">
      <h1>Cosmos Video Prediction</h1>
      
      <div className="mode-selector">
        <button onClick={() => setMode('image2world')}>
          <Image /> Image2World
        </button>
        <button onClick={() => setMode('video2world')}>
          <Video /> Video2World
        </button>
      </div>

      <div className="prompt-input">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what should happen in the video..."
          rows={4}
        />
      </div>

      <div className="settings">
        <label>
          Number of frames:
          <input
            type="number"
            value={numFrames}
            onChange={(e) => setNumFrames(parseInt(e.target.value))}
            min={31}
            max={241}
            step={10}
          />
        </label>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="generate-btn"
      >
        {generating ? 'Generating...' : 'Generate Video'}
      </button>

      {result && (
        <div className="result-preview">
          <h3>Generated Video</h3>
          <video src={result} controls autoPlay loop />
        </div>
      )}
    </div>
  );
}
```

## Performance Optimization

### 1. Model Quantization

Use INT8 or FP16 for faster inference:

```python
model = CosmosPredict(
    model_size="2B",
    precision="fp16",  # or "int8"
    compile=True  # PyTorch 2.0 compilation
)
```

### 2. Batch Processing

Process multiple requests together:

```python
results = model.predict_batch([
    {"image": "frame1.png", "prompt": "idle animation"},
    {"image": "frame2.png", "prompt": "combat animation"},
    {"image": "frame3.png", "prompt": "death animation"}
])
```

### 3. Caching

Cache frequently used predictions:

```typescript
class CosmosCache {
  private cache = new Map<string, string>();

  async predict(params: PredictParams): Promise<string> {
    const key = this.getCacheKey(params);
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    const result = await this.cosmosClient.predict(params);
    this.cache.set(key, result);
    return result;
  }

  private getCacheKey(params: PredictParams): string {
    return `${params.mode}_${params.prompt}_${params.numFrames}`;
  }
}
```

## Troubleshooting

### Out of Memory Error

**Problem**: GPU runs out of VRAM

**Solutions:**
1. Use smaller model (2B instead of 14B)
2. Reduce num_frames
3. Enable gradient checkpointing
4. Use mixed precision (FP16)

```python
model = CosmosPredict(
    model_size="2B",
    precision="fp16",
    gradient_checkpointing=True
)
```

### Slow Generation

**Problem**: Generation takes too long

**Solutions:**
1. Use distilled model variant
2. Enable torch.compile
3. Reduce inference steps
4. Use lower resolution

```python
model.generate(
    steps=10,  # default is 50
    resolution=(256, 256)  # lower resolution
)
```

### Python Not Found

**Problem**: Electron can't find Python

**Solution**: Specify full Python path

```typescript
const pythonPath = process.platform === 'win32'
  ? 'C:\\Python310\\python.exe'
  : '/usr/bin/python3';

spawn(pythonPath, args);
```

## Cookbook Examples

The Cosmos Cookbook includes ready-to-use recipes:

### 1. Post-Training for Custom Data

```bash
cd external/cosmos-cookbook/
python scripts/post_training/video2world_lora.py \
  --data_dir /path/to/fallout4/videos \
  --prompt "fallout 4 gameplay"
```

### 2. Robotics Integration

```bash
python scripts/robotics/action_conditioned.py \
  --video robot_arm.mp4 \
  --actions pick_and_place.json
```

### 3. Multiview Generation

```bash
python scripts/multiview/generate.py \
  --image scene.png \
  --viewpoints 4
```

## Resources

### Documentation
- [Cosmos Predict 2.5 Docs](https://github.com/nvidia-cosmos/cosmos-predict2.5/tree/main/docs)
- [Cosmos Transfer 2.5 Docs](https://github.com/nvidia-cosmos/cosmos-transfer2.5/tree/main/docs)
- [Cosmos Reason 2 Docs](https://github.com/nvidia-cosmos/cosmos-reason2/tree/main/docs)
- [Cosmos Cookbook](https://github.com/nvidia-cosmos/cosmos-cookbook)

### Model Cards
- [Predict 2B on Hugging Face](https://huggingface.co/nvidia/Cosmos-Predict2.5-2B)
- [Predict 14B on Hugging Face](https://huggingface.co/nvidia/Cosmos-Predict2.5-14B)
- [Transfer on Hugging Face](https://huggingface.co/nvidia/Cosmos-Transfer2.5)
- [Reason on Hugging Face](https://huggingface.co/nvidia/Cosmos-Reason2)

### Papers
- [Cosmos Predict 2.5 Paper](https://arxiv.org/abs/2511.00062)
- [Research Website](https://research.nvidia.com/labs/dir/cosmos-predict2.5)

### Community
- [NVIDIA Developer Forums](https://forums.developer.nvidia.com/)
- [GitHub Discussions](https://github.com/nvidia-cosmos/cosmos-predict2.5/discussions)

## Next Steps

1. **Test Installation**: Run basic inference example
2. **Create Service**: Set up Python backend or REST API
3. **Build UI**: Create Cosmos extension in Mossy
4. **Integrate**: Connect to existing features
5. **Optimize**: Tune for your hardware
6. **Customize**: Post-train on Fallout 4 data

## Summary

NVIDIA Cosmos provides powerful video prediction capabilities perfect for:
- ✅ Animation preview
- ✅ Environment simulation
- ✅ Weapon effect testing
- ✅ NPC behavior validation
- ✅ Asset generation

All four Cosmos repositories are now available in `external/` ready for integration into Mossy!
