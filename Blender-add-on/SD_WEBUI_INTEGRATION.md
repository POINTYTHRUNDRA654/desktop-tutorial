# Stable Diffusion WebUI (AUTOMATIC1111) Integration

This guide covers setting up and using AUTOMATIC1111's Stable Diffusion WebUI for texture and image generation for Fallout 4 modding.

## What is SD WebUI?

Stable Diffusion WebUI (by AUTOMATIC1111) is the most popular web interface for Stable Diffusion. It's known for:
- 🎨 User-friendly interface
- 🔧 Extensive features and settings
- 🔌 Huge extension ecosystem
- 📚 Large community support
- 💾 Easy model management
- ⚡ Optimized performance

## SD WebUI vs ComfyUI

### Comparison

| Feature | SD WebUI | ComfyUI |
|---------|----------|---------|
| **Interface** | Form-based, intuitive | Node-based, technical |
| **Learning Curve** | Easy | Moderate |
| **Workflow** | Simple prompts | Visual programming |
| **Extensions** | 1000+ available | Growing ecosystem |
| **Community** | Very large | Growing |
| **Best For** | Beginners, quick work | Advanced workflows |
| **Models** | Easy management | Manual setup |

### When to Use SD WebUI

**Choose SD WebUI when:**
- ✅ You want an easy-to-use interface
- ✅ You're new to AI image generation
- ✅ You need quick texture generation
- ✅ You want extensive extensions
- ✅ You prefer form-based input
- ✅ You want img2img, inpainting built-in

### When to Use ComfyUI

**Choose ComfyUI when:**
- ✅ You need complex custom workflows
- ✅ You want node-based programming
- ✅ You need precise control over generation
- ✅ You're technically inclined
- ✅ You want workflow reusability

**Recommended:** Install both! Use SD WebUI for quick work, ComfyUI for complex workflows.

## Installation

### Prerequisites

**Hardware:**
- GPU: 4GB+ VRAM (6GB+ recommended)
- RAM: 8GB minimum (16GB+ recommended)
- Storage: 20GB+ free space (SSD recommended)

**Software:**
- Python 3.10.6 (recommended version)
- Git
- CUDA Toolkit (for NVIDIA GPUs)

### Installation Steps

#### Windows (Recommended Method)

**1. Clone Repository:**
```cmd
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui
```

**2. Run Automatic Setup:**
```cmd
# Double-click webui-user.bat
# OR run from command line:
webui-user.bat
```

The first run will:
- Download Python dependencies
- Install PyTorch
- Download default model
- Launch web interface

**3. Access UI:**
```
http://localhost:7860
```

#### Linux

**1. Clone and Setup:**
```bash
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Run setup script
./webui.sh
```

**2. Access UI:**
```
http://localhost:7860
```

#### macOS

**1. Install Homebrew dependencies:**
```bash
brew install cmake protobuf rust python@3.10 git wget
```

**2. Clone and Run:**
```bash
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

./webui.sh
```

### Configuration

Edit `webui-user.bat` (Windows) or `webui-user.sh` (Linux/macOS):

**Common Settings:**
```bash
# Use specific Python version
set PYTHON=C:\Python310\python.exe

# Command line arguments
set COMMANDLINE_ARGS=--medvram --xformers --api

# For low VRAM (4-6GB)
set COMMANDLINE_ARGS=--lowvram --xformers

# For very low VRAM (3-4GB)
set COMMANDLINE_ARGS=--lowvram --always-batch-cond-uncond --xformers

# Enable API for Blender integration
set COMMANDLINE_ARGS=--api --cors-allow-origins=*
```

**Useful Arguments:**
- `--medvram`: Optimize for 6-8GB VRAM
- `--lowvram`: Optimize for 4-6GB VRAM
- `--xformers`: Enable xformers (faster, less VRAM)
- `--api`: Enable REST API
- `--no-half`: Disable half precision (for older GPUs)
- `--skip-torch-cuda-test`: Skip CUDA test
- `--listen`: Allow external connections
- `--port 7860`: Change port

## Installing Models

### Model Locations

```
stable-diffusion-webui/
├── models/
│   ├── Stable-diffusion/     # Main models (.safetensors, .ckpt)
│   ├── Lora/                  # LoRA models
│   ├── VAE/                   # VAE models
│   ├── hypernetworks/         # Hypernetwork models
│   ├── embeddings/            # Textual inversions
│   └── ControlNet/            # ControlNet models
```

### Installing FLUX Models

**FLUX.1-dev:**
```bash
# Download to models directory
cd stable-diffusion-webui/models/Stable-diffusion

# Clone from Hugging Face
git clone https://huggingface.co/black-forest-labs/FLUX.1-dev
```

**FLUX.1-schnell:**
```bash
git clone https://huggingface.co/black-forest-labs/FLUX.1-schnell
```

### Installing SD 3.5 Models

**SD 3.5 Large:**
```bash
git clone https://huggingface.co/stabilityai/stable-diffusion-3.5-large
```

**SD 3.5 Medium:**
```bash
git clone https://huggingface.co/stabilityai/stable-diffusion-3.5-medium
```

### Other Popular Models

Download from:
- [Civitai](https://civitai.com/) - Largest model repository
- [Hugging Face](https://huggingface.co/models)

Place `.safetensors` or `.ckpt` files in `models/Stable-diffusion/`

## Essential Extensions

### Installing Extensions

**Method 1: From UI (Recommended)**
1. Go to `Extensions` tab
2. Click `Install from URL`
3. Paste extension URL
4. Click `Install`
5. Restart UI

**Method 2: Manual**
```bash
cd stable-diffusion-webui/extensions
git clone [extension-url]
```

### Top Extensions for FO4 Modding

#### 1. ControlNet ⭐⭐⭐⭐⭐
```bash
git clone https://github.com/Mikubill/sd-webui-controlnet.git
```
- **Purpose**: Guided generation with control images
- **Use**: Match textures to geometry, depth-based generation
- **Essential for**: Professional texture work

#### 2. Ultimate SD Upscale ⭐⭐⭐⭐⭐
```bash
git clone https://github.com/Coyote-A/ultimate-upscale-for-automatic1111.git
```
- **Purpose**: High-quality upscaling
- **Use**: Generate 1K, upscale to 4K
- **Essential for**: Production textures

#### 3. Additional Networks (LoRA) ⭐⭐⭐⭐⭐
```bash
git clone https://github.com/kohya-ss/sd-webui-additional-networks.git
```
- **Purpose**: Load LoRA models
- **Use**: Style transfer, specific object training
- **Essential for**: Consistent style

#### 4. Canvas Zoom ⭐⭐⭐⭐
```bash
git clone https://github.com/richrobber2/canvas-zoom.git
```
- **Purpose**: Zoom and pan in generation area
- **Use**: Precise inpainting and editing

#### 5. Aspect Ratio Helper ⭐⭐⭐⭐
```bash
git clone https://github.com/thomasasfk/sd-webui-aspect-ratio-helper.git
```
- **Purpose**: Quick aspect ratio selection
- **Use**: Match texture dimensions

#### 6. Prompt Translator ⭐⭐⭐
```bash
git clone https://github.com/butaixianran/Stable-Diffusion-Webui-Prompt-Translator.git
```
- **Purpose**: Translate prompts to English
- **Use**: Non-English speakers

#### 7. TagComplete ⭐⭐⭐⭐
```bash
git clone https://github.com/DominikDoom/a1111-sd-webui-tagcomplete.git
```
- **Purpose**: Tag autocomplete
- **Use**: Faster prompt writing

## Using SD WebUI for FO4 Textures

### Workflow 1: Generate Tileable Textures

**Settings:**
1. Go to `txt2img` tab
2. Select model (FLUX.1, SD 3.5, etc.)
3. Set prompt: `"rusty metal texture, post-apocalyptic, weathered, seamless tile, 4k"`
4. Set resolution: 1024x1024
5. Sampling steps: 25-30
6. CFG Scale: 7
7. Click `Generate`

**For Seamless Tiles:**
1. Install "Tiling" extension OR
2. Add to prompt: "seamless tile, tileable, repeating pattern"
3. Use img2img with tiling mode enabled

### Workflow 2: Texture from Concept

**1. Generate Concept:**
```
Prompt: fallout 4 style laser rifle, side view, white background, game asset
Steps: 30, CFG: 7, Resolution: 1024x1024
```

**2. Use in Blender:**
```python
# Load concept in Shap-E
bpy.context.scene.fo4_shap_e_image_path = "laser_rifle.png"
bpy.ops.fo4.generate_shap_e_image()
```

**3. Generate Texture:**
```
Export UV layout from Blender
Use img2img + ControlNet with UV layout
Prompt: laser rifle texture, sci-fi metal, glowing blue parts
```

### Workflow 3: Texture Upscaling

**1. Generate at Low Resolution:**
```
Resolution: 512x512 (fast)
Generate multiple variations
Select best one
```

**2. Upscale with Extension:**
```
Use "Ultimate SD Upscale"
Target: 2048x2048 or 4096x4096
Denoising: 0.3-0.5
```

### Workflow 4: Inpainting for Details

**1. Generate Base Texture:**
```
Create basic texture
1024x1024 resolution
```

**2. Add Details with Inpainting:**
```
Go to img2img > Inpaint
Upload base texture
Mask area for details
Prompt: "bullet holes, damage, rust spots"
Inpaint
```

## Prompting for FO4 Assets

### Effective Prompts

**Structure:**
```
[Subject] [Material] texture, [Style/Era], [Condition], [Properties], [Quality]
```

**Examples:**

**Textures:**
```
✅ corrugated metal sheet texture, post-apocalyptic, heavily rusted, bullet holes, seamless tile, 4k, photorealistic

✅ vault-tec wall panel texture, retro-futuristic, blue and yellow, art deco pattern, worn edges, tileable, high detail

✅ concrete wall texture, damaged, cracks and bullet impacts, weathered, post-nuclear wasteland, seamless, 2k
```

**Concept Art:**
```
✅ fallout 4 laser rifle, side view orthographic, white background, game asset, technical drawing style, detailed

✅ power armor helmet, T-51b style, front view, white background, concept art, military green paint, weathered

✅ nuka cola machine, red and white, retro 1950s vending machine, post-apocalyptic, rust and damage, game prop
```

**Negative Prompts:**
```
Common: blurry, low quality, watermark, text, signature, distorted, ugly, pixelated, jpeg artifacts

For textures: visible seam, pattern break, repetition obvious, inconsistent lighting

For concepts: multiple views, angled view, perspective distortion
```

### Settings for Quality

**Fast Iteration:**
- Steps: 20
- CFG: 6
- Resolution: 512x512
- Time: ~5-10 seconds

**Production Quality:**
- Steps: 30-40
- CFG: 7-8
- Resolution: 1024x1024+
- Time: ~20-40 seconds

**Maximum Quality:**
- Steps: 40-50
- CFG: 7
- Resolution: 2048x2048
- Upscale afterward
- Time: ~60-120 seconds

## Integration with Blender Add-on

### Option 1: Manual Export/Import

**1. Generate in SD WebUI:**
- Create texture
- Save to file

**2. In Blender:**
```python
import bpy
bpy.ops.fo4.smart_material_setup()
# Browse to saved texture
```

### Option 2: API Integration

**Enable API:**
```bash
# In webui-user.bat
set COMMANDLINE_ARGS=--api --cors-allow-origins=*
```

**Use from Blender:**
```python
import requests

# Generate texture
payload = {
    "prompt": "rusty metal texture, seamless tile",
    "steps": 25,
    "width": 1024,
    "height": 1024,
}

response = requests.post(
    "http://localhost:7860/sdapi/v1/txt2img",
    json=payload
)

# Get image and use in Blender
```

### Option 3: Batch Processing

**1. Generate Multiple Textures:**
- Use batch size in SD WebUI
- Generate 10-20 variations

**2. Import to Blender:**
```python
# Use preset library
for texture in textures:
    bpy.ops.fo4.save_preset(
        preset_name=texture.name,
        category='TEXTURE'
    )
```

## Performance Optimization

### For 4-6GB VRAM

**Settings:**
```bash
--lowvram --xformers --opt-sub-quad-attention
```

**In UI:**
- Use SD 1.5 or SD 3.5 Medium
- Resolution: 512x512
- Batch size: 1
- Close other applications

### For 6-8GB VRAM

**Settings:**
```bash
--medvram --xformers
```

**In UI:**
- Use SD 3.5 Large or FLUX.1-schnell
- Resolution: 1024x1024
- Batch size: 1-2

### For 8-12GB VRAM

**Settings:**
```bash
--xformers
```

**In UI:**
- Use FLUX.1-dev or SD 3.5 Large
- Resolution: 1024x1024 or higher
- Batch size: 2-4

### For 12GB+ VRAM

**Settings:**
```bash
--xformers --no-half-vae
```

**In UI:**
- Use any model
- Resolution: 2048x2048
- Batch size: 4+
- SDXL or FLUX.1 at full quality

## Troubleshooting

### SD WebUI Won't Start

**Check Python version:**
```cmd
python --version
# Should be 3.10.6 or 3.10.x
```

**Reinstall:**
```cmd
# Delete venv folder
rmdir /s venv

# Run webui-user.bat again
```

### Out of Memory Errors

**Solutions:**
1. Add `--lowvram` or `--medvram`
2. Reduce resolution
3. Reduce batch size
4. Close other applications
5. Restart computer

### Slow Generation

**Optimizations:**
1. Add `--xformers` flag
2. Update GPU drivers
3. Use smaller models
4. Reduce steps to 20-25
5. Disable unnecessary extensions

### Models Not Loading

**Checks:**
1. File in correct directory
2. File not corrupted (re-download)
3. Sufficient disk space
4. Compatible model format (.safetensors or .ckpt)
5. Restart WebUI

## Best Practices

### For FO4 Texture Generation

1. **Start with References:**
   - Study vanilla FO4 textures
   - Use reference images
   - Match art style

2. **Use Consistent Prompts:**
   - Save working prompts
   - Create style templates
   - Use same negative prompts

3. **Iterate Quickly:**
   - Generate at 512x512 first
   - Test many variations
   - Upscale best results

4. **Test in Blender:**
   - Apply to model quickly
   - Check tiling
   - Verify in lighting

5. **Optimize for FO4:**
   - Use smart material setup
   - Validate mesh
   - Export properly

## Resources

### Official Resources
- **Repository**: https://github.com/AUTOMATIC1111/stable-diffusion-webui
- **Wiki**: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki
- **Reddit**: r/StableDiffusion

### Model Sources
- **Civitai**: https://civitai.com/
- **Hugging Face**: https://huggingface.co/models

### Extensions
- **Extension Index**: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Extensions

## Summary

SD WebUI provides:
- ✅ Easy-to-use interface
- ✅ Extensive features
- ✅ Huge extension ecosystem
- ✅ Great for beginners
- ✅ Perfect for FO4 modding

**Recommended Setup:**
1. Install SD WebUI for quick work
2. Install ComfyUI for complex workflows
3. Use both depending on task
4. Integrate with Blender add-on

**Complete Workflow:**
```
Concept → SD WebUI → Texture
       ↓
Blender + FO4 Add-on → Optimize → Export → FO4
```

---

**Version:** 1.0  
**Last Updated:** 2026-02-17  
**Compatible with:** SD WebUI latest
