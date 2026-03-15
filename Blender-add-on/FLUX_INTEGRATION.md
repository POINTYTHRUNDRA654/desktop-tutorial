# FLUX.1 Integration Guide for Fallout 4 Modding

This guide covers using Black Forest Labs' FLUX.1 models with ComfyUI for texture and concept art generation for Fallout 4 mods.

## What is FLUX.1?

FLUX.1 is a state-of-the-art text-to-image model by Black Forest Labs, representing the cutting edge of AI image generation:

**Key Features:**
- 🎨 Exceptional image quality
- 📝 Superior text rendering capabilities
- 🎯 Excellent prompt understanding
- ⚡ Fast generation (with proper hardware)
- 🔧 Highly controllable
- 🎭 Great style consistency

**Versions:**
- **FLUX.1-dev**: Development version, best quality, open for research
- **FLUX.1-schnell**: Fast variant, optimized for speed (~4 steps vs 30+)
- **FLUX.1-pro**: Professional version (API only)

For Fallout 4 modding:
- Use **FLUX.1-dev** for final production assets (best quality)
- Use **FLUX.1-schnell** for rapid iteration and testing (10x faster)

## Why FLUX.1 for FO4 Modding?

### Superior Texture Generation

FLUX.1 excels at creating:
- High-quality PBR textures
- Consistent material styles
- Weathered/damaged surfaces
- Post-apocalyptic aesthetics
- Metal, concrete, wood textures

### Model Comparison

| Feature | FLUX.1-dev | FLUX.1-schnell | SD 3.5 Large | SD 3.5 Medium | SDXL | SD 1.5 |
|---------|------------|----------------|--------------|---------------|------|--------|
| Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Text in Images | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Prompt Following | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Consistency | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Speed (GPU) | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| VRAM Usage | High (12GB+) | Med (8GB+) | Med (8GB+) | Low-Med (6GB+) | Med (8GB) | Low (4GB) |
| Model Size | ~24GB | ~24GB | ~12GB | ~5GB | ~7GB | ~4GB |
| Steps Required | 25-35 | 4-8 | 20-30 | 20-30 | 25-35 | 20-30 |
| Best For | Final assets | Iteration | Balanced | Budget+ | Mid-range | Budget |
| License | Apache 2.0 | Apache 2.0 | Stability AI | Stability AI | CreativeML | CreativeML |

## Installation

### Prerequisites

**Hardware Requirements:**

**Minimum:**
- GPU: 8GB VRAM (with optimizations)
- RAM: 16GB system RAM
- Storage: 30GB free space

**Recommended:**
- GPU: 12GB+ VRAM (RTX 3060 12GB, RTX 4070, or better)
- RAM: 32GB system RAM
- Storage: SSD with 50GB+ free space

**Optimal:**
- GPU: 24GB VRAM (RTX 3090/4090, A5000)
- RAM: 64GB system RAM
- Storage: NVMe SSD

### Step 1: Install ComfyUI

If not already installed:

```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Install dependencies
pip install -r requirements.txt

# Install PyTorch with CUDA (NVIDIA GPU)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### Step 2: Download FLUX Models

You can install one or both models depending on your needs:

#### FLUX.1-dev (Best Quality)

**Option A: Using Git LFS (Recommended)**
```bash
# Install Git LFS if not installed
git lfs install

# Clone FLUX.1-dev
git clone https://huggingface.co/black-forest-labs/FLUX.1-dev

# Move to ComfyUI models directory
# Copy relevant files to: ComfyUI/models/checkpoints/
```

**Option B: Manual Download**
1. Visit: https://huggingface.co/black-forest-labs/FLUX.1-dev/tree/main
2. Download required files:
   - `flux1-dev.safetensors` (~24GB)
   - Config files (if available)
3. Place in: `ComfyUI/models/checkpoints/`

**Option C: Using Hugging Face CLI**
```bash
# Install Hugging Face CLI
pip install huggingface-hub

# Download FLUX.1-dev
huggingface-cli download black-forest-labs/FLUX.1-dev --local-dir ./FLUX.1-dev
```

#### FLUX.1-schnell (Fast Iteration)

**Recommended for:** Quick prototyping, testing concepts, lower-end hardware

**Using Git LFS:**
```bash
# Clone FLUX.1-schnell
git clone https://huggingface.co/black-forest-labs/FLUX.1-schnell

# Copy to ComfyUI models directory
# Place in: ComfyUI/models/checkpoints/
```

**Using Hugging Face CLI:**
```bash
# Download FLUX.1-schnell
huggingface-cli download black-forest-labs/FLUX.1-schnell --local-dir ./FLUX.1-schnell
```

**FLUX.1-schnell Benefits:**
- ⚡ 10x faster generation (4 steps vs 30+)
- 💾 Lower VRAM usage
- 🎯 Good quality for iteration
- 🚀 Perfect for rapid prototyping

#### Stable Diffusion 3.5 Large (Alternative)

**Recommended for:** Mid-range hardware, good balance of quality and speed

**Using Git LFS:**
```bash
# Clone SD 3.5 Large
git clone https://huggingface.co/stabilityai/stable-diffusion-3.5-large

# Copy to ComfyUI models directory
# Place in: ComfyUI/models/checkpoints/
```

**Using Hugging Face CLI:**
```bash
# Download SD 3.5 Large
huggingface-cli download stabilityai/stable-diffusion-3.5-large --local-dir ./stable-diffusion-3.5-large
```

**SD 3.5 Large Features:**
- ✅ Excellent quality (improved over SDXL)
- ✅ 8GB VRAM compatible
- ✅ Good prompt understanding
- ✅ Faster than FLUX.1-dev
- ✅ Great for textures

#### Stable Diffusion 3.5 Medium (Budget-Friendly)

**Recommended for:** Budget hardware, 6-8GB VRAM, good quality

**Using Git LFS:**
```bash
# Clone SD 3.5 Medium
git clone https://huggingface.co/stabilityai/stable-diffusion-3.5-medium

# Copy to ComfyUI models directory
# Place in: ComfyUI/models/checkpoints/
```

**Using Hugging Face CLI:**
```bash
# Download SD 3.5 Medium
huggingface-cli download stabilityai/stable-diffusion-3.5-medium --local-dir ./stable-diffusion-3.5-medium
```

**SD 3.5 Medium Features:**
- ✅ Good quality (better than SD 1.5)
- ✅ 6GB VRAM compatible
- ✅ Smaller model size (~5GB vs ~12GB)
- ✅ Faster generation
- ✅ Lower system requirements

### Step 3: Install GGUF Extension (Optional but Recommended)

For better memory efficiency:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/city96/ComfyUI-GGUF.git
cd ComfyUI-GGUF
pip install -r requirements.txt
```

### Step 4: Verify Installation

Start ComfyUI:
```bash
cd ComfyUI
python main.py
```

Access UI: http://localhost:8188

Check if FLUX.1-dev appears in model selector.

## Using FLUX.1 for FO4 Textures

### Workflow 1: Generate Tileable Textures

**Prompts for FO4 Textures:**

```
Metal Textures:
- "rusty corrugated metal texture, post-apocalyptic, weathered, seamless tile"
- "scratched steel plate texture, industrial, worn, seamless"
- "oxidized copper texture, green patina, aged, tileable"

Concrete/Stone:
- "damaged concrete wall texture, bullet holes, cracks, seamless tile"
- "weathered brick texture, post-apocalyptic, broken, tileable"
- "rubble texture, broken concrete, debris, seamless pattern"

Wood:
- "old wooden planks texture, rotted, weathered, seamless tile"
- "splintered wood texture, damaged, abandoned building, tileable"

Vault-Tec:
- "vault-tec wall panel texture, blue and yellow, sci-fi metal, worn, seamless"
- "retro-futuristic metal panel texture, art deco, 1950s aesthetic, tileable"
```

**ComfyUI Setup:**
1. Load FLUX.1-dev model
2. Set prompt (examples above)
3. Resolution: 1024x1024 (for seamless tiling)
4. Steps: 20-30
5. CFG Scale: 3.5-7.0
6. Enable tiling options if available

### Workflow 2: Concept Art Generation

**Prompts for FO4 Assets:**

```
Weapons:
- "fallout 4 style laser rifle, side view, white background, game asset"
- "post-apocalyptic makeshift rifle, rust and metal, technical drawing style"
- "sci-fi plasma weapon, retro-futuristic design, concept art"

Armor:
- "power armor helmet, fallout style, front view, white background"
- "raider armor pieces, makeshift metal plates, leather straps"

Props:
- "rusty barrel with nuclear warning symbol, fallout 4 style"
- "vintage computer terminal, retro-futuristic, 1950s aesthetic"
- "nuka cola vending machine, red and white, weathered, post-apocalyptic"
```

### Workflow 3: Reference Images

Generate reference images for manual modeling:

```
- "post-apocalyptic building facade, multiple angles"
- "ruined interior room, debris, dramatic lighting"
- "wasteland landscape with destroyed buildings, concept art"
```

## ComfyUI Workflows for FLUX.1

### Basic Texture Generation Workflow

**Nodes:**
1. **FLUX Loader** → Load flux1-dev.safetensors
2. **CLIP Text Encoder** → Input your prompt
3. **Empty Latent Image** → Set size (1024x1024)
4. **KSampler** → Generate image
5. **VAE Decode** → Convert to image
6. **Save Image** → Export result

### Advanced Workflow with ControlNet

For matching existing geometry:

1. **Load FLUX.1 model**
2. **Load ControlNet model** (depth, normal, etc.)
3. **Input control image** (UV layout, depth map)
4. **CLIP Text Encoder** (texture description)
5. **KSampler with ControlNet**
6. **VAE Decode**
7. **Save Image**

### Batch Generation Workflow

Generate multiple texture variations:

1. **FLUX Loader**
2. **CLIP Text Encoder** with prompt variations
3. **Batch processing node**
4. **Loop through different seeds**
5. **Save all outputs**

## GGUF Quantization for Lower VRAM

If you have limited VRAM (8-10GB), use GGUF quantized models:

### Available Quantizations

| Version | Size | VRAM | Quality |
|---------|------|------|---------|
| FP16 | ~24GB | 12GB+ | Perfect |
| Q8_0 | ~12GB | 8-10GB | Excellent |
| Q5_K | ~8GB | 6-8GB | Very Good |
| Q4_K | ~6GB | 4-6GB | Good |

### Download GGUF Models

```bash
# Search for FLUX.1-dev GGUF on Hugging Face
# Example (check for latest versions):
git clone https://huggingface.co/city96/FLUX.1-dev-gguf

# Place in ComfyUI/models/checkpoints/
```

### Using GGUF in ComfyUI

1. Install ComfyUI-GGUF extension (see installation section)
2. Load GGUF file instead of full model
3. Use same workflow as regular FLUX.1
4. Slightly slower generation but uses less VRAM

## Optimizations for Performance

### For 8GB VRAM

**ComfyUI Launch Options:**
```bash
python main.py --lowvram
```

**In Workflow:**
- Use Q5_K or Q4_K GGUF models
- Generate at 512x512, upscale later
- Fewer sampling steps (15-20)
- Close other applications

### For 12GB VRAM

**Standard settings work well:**
- Use full FP16 model or Q8_0 GGUF
- Generate at 1024x1024
- 20-30 sampling steps
- Can batch 2-3 images

### For 24GB+ VRAM

**Maximum quality:**
- Full FP16 model
- Generate at 2048x2048
- 30-50 sampling steps
- Batch 4+ images
- Use ControlNet simultaneously

## Integration with Blender Add-on

### Complete Workflow: Texture Pipeline

**1. Generate Base Texture in ComfyUI:**
```
Prompt: "rusty metal wall texture, post-apocalyptic, weathered, seamless tile, 4k"
Resolution: 2048x2048
Save: weapon_diffuse.png
```

**2. In Blender with FO4 Add-on:**
```python
import bpy

# Select mesh
obj = bpy.context.active_object

# Use smart material setup
bpy.ops.fo4.smart_material_setup()
# Browse to weapon_diffuse.png

# Optimize for FO4
bpy.ops.fo4.optimize_mesh()
bpy.ops.fo4.validate_mesh()

# Export
bpy.ops.fo4.export_mesh()
```

### Workflow: Concept to 3D

**1. Generate concept in ComfyUI:**
```
Prompt: "fallout 4 laser rifle, side view orthographic, white background, technical drawing"
Save: laser_rifle_concept.png
```

**2. Convert to 3D in Blender:**
```python
# Use Shap-E image-to-3D
bpy.context.scene.fo4_shap_e_image_path = "laser_rifle_concept.png"
bpy.ops.fo4.generate_shap_e_image()
```

**3. Generate detailed texture:**
```
# Export UV layout from Blender
# Use as ControlNet input in ComfyUI
Prompt: "laser rifle texture, glowing blue energy cells, metal and plastic, worn"
```

**4. Apply and export:**
```python
bpy.ops.fo4.smart_material_setup()  # Apply generated texture
bpy.ops.fo4.export_mesh()
```

## Best Practices

### Prompt Engineering for FO4

**Structure:**
```
[Subject] [Material/Surface] texture, [style/era], [condition], [properties], [quality]
```

**Examples:**
```
✅ Good: "corrugated metal texture, post-apocalyptic, heavily rusted, bullet damage, seamless tile, 4k, high detail"

✅ Good: "vault-tec wall panel texture, retro-futuristic, blue and yellow color scheme, worn edges, art deco pattern, tileable"

❌ Avoid: "texture" (too vague)
❌ Avoid: "make it cool" (subjective)
```

**Negative Prompts:**
```
Common negatives: "blurry, low quality, watermark, text, signature, distorted, ugly, pixelated, jpeg artifacts"

For textures: "seamless, pattern break, visible seam, repetition obvious"
```

### Resolution Guidelines

**For FO4 Textures:**
- Small props: 512x512 → 1024x1024
- Weapons/armor: 1024x1024 → 2048x2048
- Large objects: 2048x2048 → 4096x4096
- Environments: 2048x2048+

Generate at target resolution or slightly higher, then optimize.

### Quality Settings

**Ultra-fast iteration (FLUX.1-schnell):**
- Steps: 4-8
- CFG: N/A (guidance-free)
- Resolution: 512x512 or 1024x1024
- Time: ~3-8 seconds
- Use for: Quick testing, concept exploration

**Fast iteration (FLUX.1-dev):**
- Steps: 15-20
- CFG: 3.5
- Resolution: 512x512
- Time: ~10-20 seconds
- Use for: Testing ideas

**Production quality (FLUX.1-dev):**
- Steps: 25-35
- CFG: 5.0-7.0
- Resolution: 1024x1024+
- Time: ~30-60 seconds
- Use for: Final assets

### Consistency Tips

For related textures (same object set):
- Use same seed across generations
- Keep prompt structure similar
- Use style keywords consistently
- Generate all variations in one session

## Troubleshooting

### Out of Memory Errors

**Solutions:**
1. Use GGUF quantized model (Q5_K or Q4_K)
2. Launch with `--lowvram` flag
3. Reduce resolution (512x512)
4. Fewer sampling steps
5. Close other GPU applications
6. Generate one image at a time

### Slow Generation

**Optimizations:**
1. Update GPU drivers
2. Use GGUF Q5_K (faster than FP16)
3. Enable xformers: `--xformers`
4. Reduce steps to 20-25
5. Generate at lower resolution, upscale later

### Poor Quality Results

**Improvements:**
1. Use full FP16 or Q8_0 model (not Q4_K)
2. Increase steps to 30-40
3. Adjust CFG scale (try 5-7)
4. Improve prompt detail
5. Use negative prompts
6. Try different seeds

### FLUX.1 Model Not Loading

**Checks:**
1. Verify model file is complete (~24GB)
2. Check file is in correct directory
3. Restart ComfyUI
4. Check console for errors
5. Verify sufficient disk space

## Resources

### Official Resources
- **FLUX.1 Repository**: https://huggingface.co/black-forest-labs/FLUX.1-dev
- **Black Forest Labs**: https://blackforestlabs.ai/
- **ComfyUI**: https://github.com/comfyanonymous/ComfyUI

### Community Resources
- FLUX.1 workflows on ComfyUI forums
- Texture generation examples
- Fallout 4 modding communities

### Model Selection Guide

**Choose FLUX.1-dev when:**
- ✅ You need the absolute highest quality
- ✅ Creating final production assets
- ✅ You have 12GB+ VRAM
- ✅ Quality > Speed
- ✅ Budget allows for powerful hardware

**Choose FLUX.1-schnell when:**
- ✅ You need fast iteration
- ✅ Testing concepts quickly
- ✅ You have 8GB VRAM
- ✅ Speed > Quality (but still great quality!)
- ✅ Generating many variations

**Choose Stable Diffusion 3.5 Large when:**
- ✅ You want excellent quality without huge VRAM requirements
- ✅ You have 8GB VRAM
- ✅ You want good prompt understanding
- ✅ Balance between FLUX and older SD models
- ✅ Good texture generation capabilities

**Choose Stable Diffusion 3.5 Medium when:**
- ✅ You have 6-8GB VRAM
- ✅ You want good quality with smaller model size
- ✅ Faster generation than Large variant
- ✅ Budget-conscious setup
- ✅ Good balance of quality and performance

**Choose SDXL when:**
- ✅ You have 8GB VRAM
- ✅ Proven track record needed
- ✅ Extensive LoRA/fine-tune ecosystem
- ✅ Community support important

**Choose Stable Diffusion 1.5 when:**
- ✅ You have limited VRAM (4-6GB)
- ✅ Budget hardware
- ✅ Basic texture needs
- ✅ Access to many trained models/LoRAs
- ✅ Maximum speed needed

**Recommended Multi-Model Workflow:**
1. Use **FLUX.1-schnell** for ultra-fast prototyping (100+ variations in minutes)
2. Use **SD 3.5 Medium** for budget-friendly good quality iterations
3. Use **SD 3.5 Large** for balanced speed/quality production work
4. Use **FLUX.1-dev** to regenerate finals at highest quality
5. Use **SD 1.5** if you need specific style LoRAs

**Hardware-Based Recommendations:**

| VRAM | Recommended Models | Usage Pattern |
|------|-------------------|---------------|
| 4-6GB | SD 1.5, SD 3.5 Medium (low res) | Basic work |
| 6-8GB | SD 3.5 Medium, FLUX.1-schnell | Good quality |
| 8-10GB | SD 3.5 Large, FLUX.1-schnell | Balanced |
| 10-12GB | SD 3.5 Large, FLUX.1-dev (optimized) | High quality |
| 12GB+ | FLUX.1-dev, All models | Maximum quality |

## Summary

FLUX.1-dev provides:
- ✅ Best-in-class texture quality
- ✅ Superior prompt understanding
- ✅ Excellent for FO4 aesthetics
- ✅ Great consistency
- ✅ Professional results

**Recommended Specs:**
- 12GB+ VRAM for comfortable use
- Use GGUF Q5_K for 8GB VRAM
- NVMe SSD for faster loading

**Perfect for:**
- High-quality texture generation
- Concept art creation
- Reference image generation
- Professional FO4 mod development

Combined with the Fallout 4 Blender Add-on, you have a complete professional pipeline from concept to in-game asset!

---

**Version:** 1.0  
**Last Updated:** 2026-02-17  
**Model Version:** FLUX.1-dev  
**Minimum VRAM:** 8GB (with optimizations), 12GB recommended
