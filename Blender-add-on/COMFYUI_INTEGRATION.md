# ComfyUI Integration for Fallout 4 Blender Add-on

This guide covers setting up ComfyUI and its extensions for advanced texture and image generation workflows with the Fallout 4 Blender Add-on.

## What is ComfyUI?

ComfyUI is a powerful and modular node-based interface for Stable Diffusion and other generative AI models. It's particularly useful for:
- Generating textures for 3D models
- Creating concept art for Fallout 4 mods
- Generating reference images
- Upscaling and enhancing textures

## Installation

### Step 1: Install ComfyUI

You have several options for installing ComfyUI:

#### Option A: Standard Installation (Recommended for developers)

**Using GitHub CLI:**
```bash
gh repo clone Comfy-Org/ComfyUI
cd ComfyUI
```

**Using Git:**
```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
```

#### Option B: Portable Installation (Windows users)

Download the portable version from ComfyUI releases. This includes:
- Embedded Python interpreter (`python_embeded` folder)
- All required dependencies pre-installed
- No system Python configuration needed

**Benefits:**
- ✅ No Python installation required
- ✅ Self-contained
- ✅ Easy to move/backup
- ✅ No conflicts with system Python

**Note:** When using portable version, use `.\python_embeded\python.exe` for all pip commands.

### Step 2: Install Dependencies

**For Standard Installation:**
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install PyTorch (if not already installed)
# For CUDA (NVIDIA GPU):
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# For CPU only:
pip install torch torchvision
```

**For Portable ComfyUI (Windows with embedded Python):**
```cmd
# ComfyUI portable versions include python_embeded folder
cd ComfyUI

# Install requirements using embedded Python
.\python_embeded\python.exe -s -m pip install -r requirements.txt

# Install PyTorch for embedded Python
# For CUDA:
.\python_embeded\python.exe -s -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# For CPU:
.\python_embeded\python.exe -s -m pip install torch torchvision
```

### Step 3: Install ComfyUI-GGUF Extension (Recommended)

The GGUF extension allows you to use quantized models for better performance with significantly reduced VRAM usage.

**Why ComfyUI-GGUF?**
- ✅ Reduced VRAM usage (up to 75% less)
- ✅ Smaller model sizes (easier storage)
- ✅ Faster loading times
- ✅ Minimal quality loss
- ✅ Perfect for FLUX models

**Installation:**

**For Standard Python Installation:**
```bash
# Clone directly to correct location (one command)
git clone https://github.com/city96/ComfyUI-GGUF ComfyUI/custom_nodes/ComfyUI-GGUF

# Install dependencies
cd ComfyUI/custom_nodes/ComfyUI-GGUF
pip install -r requirements.txt
```

**For Portable/Embedded Python (Windows):**
```cmd
# Clone to correct location
git clone https://github.com/city96/ComfyUI-GGUF ComfyUI/custom_nodes/ComfyUI-GGUF

# Install dependencies with embedded Python (from ComfyUI root)
cd ComfyUI
.\python_embeded\python.exe -s -m pip install -r .\custom_nodes\ComfyUI-GGUF\requirements.txt
```

**For System Python (Windows):**
```cmd
# Clone to correct location
git clone https://github.com/city96/ComfyUI-GGUF ComfyUI\custom_nodes\ComfyUI-GGUF

# Install dependencies
cd ComfyUI\custom_nodes\ComfyUI-GGUF
python -m pip install -r requirements.txt
```

### Step 3.5: Download T5 Text Encoder (GGUF Format)

For FLUX models with GGUF support, you'll need the T5 text encoder in GGUF format:

```bash
# Clone T5 encoder (place in ComfyUI models directory)
git clone https://huggingface.co/city96/t5-v1_1-xxl-encoder-gguf

# Move to correct location
# Linux/Mac:
mv t5-v1_1-xxl-encoder-gguf ComfyUI/models/text_encoders/

# Windows:
move t5-v1_1-xxl-encoder-gguf ComfyUI\models\text_encoders\
```

**What is T5?**
- Text encoder used by FLUX models
- GGUF version is much smaller (~4GB vs ~10GB)
- Required for FLUX.1 with ComfyUI-GGUF
- Quantized for efficiency without quality loss

### Step 4: Install Additional Useful Extensions (Optional)

These extensions significantly improve the ComfyUI experience:

```bash
cd ComfyUI/custom_nodes

# ComfyUI Manager (highly recommended)
git clone https://github.com/ltdrdata/ComfyUI-Manager.git

# ComfyUI Custom Scripts (UI improvements)
git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git

# Z-Tipo Extension (quality improvements)
git clone https://github.com/KohakuBlueleaf/z-tipo-extension.git
```

**Benefits:**
- **ComfyUI Manager**: Install/update extensions from UI
- **Custom Scripts**: Autocomplete, better UI, workflow management
- **Z-Tipo**: Better type handling, improved quality

### Step 4: Download Models

ComfyUI requires at least one generative model. We recommend starting with FLUX.1-dev:

#### FLUX.1-dev (Recommended - State of the Art)

FLUX.1-dev is one of the most advanced text-to-image models available:

```bash
# Clone FLUX.1-dev from Hugging Face
git clone https://huggingface.co/black-forest-labs/FLUX.1-dev

# Or download specific files:
# Place in: ComfyUI/models/checkpoints/
```

**FLUX.1-dev Features:**
- ✅ Exceptional image quality
- ✅ Better text rendering
- ✅ Improved prompt understanding
- ✅ Great for textures and concepts
- ✅ 12B parameter model

**Requirements:**
- VRAM: 12GB+ recommended (8GB minimum with optimizations)
- Storage: ~24GB
- GGUF quantized versions available for lower VRAM

#### Alternative Models

**Stable Diffusion Models:**
- Stable Diffusion 1.5 (4GB VRAM)
- Stable Diffusion XL (8GB VRAM)
- Realistic Vision
- DreamShaper

**Where to Download:**
- [Hugging Face](https://huggingface.co/models)
- [Civitai](https://civitai.com/)

**Model Locations:**
```
ComfyUI/models/
├── checkpoints/        # Main models (SD, FLUX, etc.)
├── loras/             # LoRA adapters
├── vae/               # VAE models
├── controlnet/        # ControlNet models
└── upscale_models/    # Upscalers
```

## Running ComfyUI

### Start the Server

```bash
# From ComfyUI directory
python main.py

# Or with custom port:
python main.py --port 8188

# For listening on all interfaces:
python main.py --listen 0.0.0.0
```

### Access the Interface

Open your browser and navigate to:
```
http://localhost:8188
```

## Integration with Blender Add-on

### Workflow 1: Generate Textures

1. **In ComfyUI:**
   - Load a workflow for texture generation
   - Set prompt: "rusty metal texture, post-apocalyptic, weathered"
   - Generate texture
   - Save image

2. **In Blender:**
   - Select your mesh
   - Go to Fallout 4 panel
   - Use "Smart Material Setup" operator
   - Browse to generated texture
   - Apply to model

### Workflow 2: Concept to 3D

1. **Generate concept art in ComfyUI:**
   - Prompt: "fallout 4 style weapon, rifle, side view, white background"
   - Save image

2. **Convert to 3D in Blender:**
   - Go to AI Generation panel
   - Use Shap-E "Image to 3D" feature
   - Select concept art image
   - Generate 3D mesh

3. **Refine and export:**
   - Use mesh optimization tools
   - Apply materials
   - Export for Fallout 4

### Workflow 3: Texture Enhancement

1. **Export UV map from Blender:**
   - UV unwrap your mesh
   - Export UV layout as image

2. **Generate texture in ComfyUI:**
   - Use UV map as control input
   - Generate texture matching UV layout
   - Prompt: "vault-tec texture, blue and yellow, metal panels"

3. **Apply in Blender:**
   - Import generated texture
   - Apply to mesh using UV mapping

## ComfyUI-GGUF Benefits

### Why Use GGUF Format?

**Traditional Models:**
- Size: 5-7 GB (FP16)
- VRAM: 6-8 GB required
- Speed: ~5-10 seconds per image

**GGUF Models:**
- Size: 2-4 GB (quantized)
- VRAM: 3-5 GB required
- Speed: ~3-8 seconds per image
- Quality: Minimal loss with proper quantization

### Quantization Levels

| Level | Size Reduction | Quality | Best For |
|-------|----------------|---------|----------|
| Q4_0  | 75% smaller    | Good    | Fast iteration |
| Q5_0  | 65% smaller    | Better  | Balanced |
| Q8_0  | 50% smaller    | Excellent | Production |
| FP16  | Original       | Perfect | Reference |

### Using GGUF Models

1. Download GGUF models from Hugging Face
2. Place in `models/checkpoints/`
3. Load in ComfyUI (GGUF loader node)
4. Works with all standard workflows

## Useful ComfyUI Extensions

### Essential Extensions

Install in `custom_nodes/` directory:

```bash
# 1. ComfyUI Manager (highly recommended - must-have!)
git clone https://github.com/ltdrdata/ComfyUI-Manager.git ComfyUI/custom_nodes/ComfyUI-Manager

# 2. ComfyUI-GGUF (efficient model loading) ⭐ Essential for FLUX
git clone https://github.com/city96/ComfyUI-GGUF ComfyUI/custom_nodes/ComfyUI-GGUF
# Install dependencies:
cd ComfyUI/custom_nodes/ComfyUI-GGUF && pip install -r requirements.txt && cd ../../..

# 3. ComfyUI-Custom-Scripts (quality of life improvements)
git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git ComfyUI/custom_nodes/ComfyUI-Custom-Scripts

# 4. Z-Tipo Extension (quality improvements & type handling)
git clone https://github.com/KohakuBlueleaf/z-tipo-extension.git ComfyUI/custom_nodes/z-tipo-extension

# 5. IPAdapter_plus (image conditioning & style transfer)
git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git ComfyUI/custom_nodes/ComfyUI_IPAdapter_plus

# 6. ControlNet Auxiliary Preprocessors
git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git

# 7. WAS Node Suite (image processing utilities)
git clone https://github.com/WASasquatch/was-node-suite-comfyui.git

# 8. Ultimate SD Upscale
git clone https://github.com/ssitu/ComfyUI_UltimateSDUpscale.git
```

Restart ComfyUI after installing extensions.

### Extension Details

#### ComfyUI Manager ⭐ (Essential)
- **Purpose**: Install/update extensions from within ComfyUI UI
- **Why**: Makes managing extensions much easier
- **Features**: One-click install, update all, missing nodes detection

#### ComfyUI-GGUF ⭐ (Essential for FLUX)
- **Purpose**: Load quantized GGUF models
- **Why**: Use FLUX and other large models with less VRAM
- **Features**: Q4/Q5/Q8 quantization support

#### ComfyUI-Custom-Scripts ⭐ (Quality of Life)
- **Purpose**: UI improvements and workflow enhancements
- **Why**: Better user experience, autocomplete, history
- **Features**:
  - Node autocomplete
  - Image feed
  - Show text in workflow
  - Better organization
  - Workflow management

#### Z-Tipo Extension ⭐ (Quality Improvements)
- **Purpose**: Type handling and quality improvements
- **Why**: Better data flow between nodes, cleaner workflows
- **Features**:
  - Improved type conversion
  - Better node compatibility
  - Quality enhancements
  - Automatic casting

#### IPAdapter_plus ⭐⭐ (Image Prompting - Essential for FO4!)
- **Purpose**: Use images as prompts alongside text (IP-Adapter = Image Prompt Adapter)
- **Why**: Maintain consistent style, character appearance, and design language
- **Repository**: https://github.com/cubiq/ComfyUI_IPAdapter_plus
- **Key Features**:
  - **Style Transfer**: Match the aesthetic of reference images
  - **Composition Control**: Use image structure as guide
  - **Face Consistency**: Keep character faces consistent across generations
  - **Multi-reference**: Combine multiple reference images
  - **Adjustable Influence**: Control how much the image affects generation (weight 0.0-1.0)

**IPAdapter Models Required:**
You'll need to download IPAdapter model files:
```bash
# SD 1.5 IPAdapter models:
# Download from: https://huggingface.co/h94/IP-Adapter
# Place in: ComfyUI/models/ipadapter/

# SDXL IPAdapter models:
# Download from: https://huggingface.co/h94/IP-Adapter
# Files needed:
# - ip-adapter_sd15.safetensors (for SD 1.5)
# - ip-adapter-plus_sd15.safetensors (enhanced version)
# - ip-adapter_sdxl.safetensors (for SDXL)
```

**FO4 Modding Use Cases:**
1. **Weapon Set Consistency**
   - Generate multiple weapons matching your custom style
   - Reference: Your hero weapon design
   - Output: Variants (pistol, rifle, melee) in same style

2. **Vanilla Style Matching**
   - Reference: Screenshot of vanilla FO4 assets
   - Output: New props that blend seamlessly with vanilla
   - Perfect for lore-friendly mods

3. **Texture Families**
   - Reference: One wall/floor texture
   - Output: Matching textures for full interior set
   - Consistent weathering and color palette

4. **NPC Appearance**
   - Reference: Character concept art
   - Output: Same character from multiple angles
   - Consistent for character creation

5. **Armor Set Design**
   - Reference: Chest piece design
   - Output: Helmet, arms, legs matching same design
   - Unified armor set aesthetic

**IPAdapter Node Types:**
- **IPAdapter**: Basic image conditioning
- **IPAdapter Plus**: Enhanced version with better detail preservation
- **IPAdapter Face**: Specialized for facial consistency
- **IPAdapter Advanced**: Multiple references, per-region control

**Best Practices for FO4:**
- Use weight 0.4-0.7 for style guidance (not copying)
- Combine with text prompts for specific details
- Use multiple references for complex styles
- Lower weight (0.2-0.4) for loose style matching
- Higher weight (0.7-0.9) for strict consistency

**Example Workflow:**
```
1. Load SD/SDXL model
2. Add "IPAdapter Apply" node
3. Load your reference image (FO4 screenshot or concept)
4. Set weight: 0.5
5. Add text prompt: "rusty robot, military design"
6. Generate → Output matches reference style + text description
```

#### ControlNet Auxiliary
- **Purpose**: Preprocessors for ControlNet
- **Why**: Generate control images (depth, normal, canny, etc.)
- **Use Case**: Match textures to geometry

#### WAS Node Suite
- **Purpose**: Image processing utilities
- **Why**: Text rendering, color correction, batch operations
- **Use Case**: Post-processing generated textures

#### Ultimate SD Upscale
- **Purpose**: High-quality upscaling
- **Why**: Generate at low res, upscale for details
- **Use Case**: Create 4K textures from 1K generations

### Advanced Extensions

#### T2I-Adapter ⭐⭐ (Efficient Control - Alternative to ControlNet)
- **Purpose**: Lightweight control over image generation using depth, sketch, pose, etc.
- **Why**: More efficient than ControlNet (smaller models, faster, less VRAM)
- **Repository**: TencentARC on Hugging Face
- **Key Features**:
  - **Depth Control**: 3D-aware generation from depth maps
  - **Sketch Control**: Line art and rough sketches
  - **Canny Edge**: Precise edge-based control
  - **OpenPose**: Character pose consistency
  - **Smaller Models**: ~300MB vs ControlNet's 1-2GB
  - **Faster**: 20-30% faster than ControlNet
  - **Lower VRAM**: Works on 6GB+ GPUs

**Installation:**
```bash
cd ComfyUI/models/t2i_adapter

# Depth adapter for 3D-aware generation
git clone https://huggingface.co/TencentARC/t2i-adapter-depth-midas-sdxl-1.0

# Other adapters as needed
git clone https://huggingface.co/TencentARC/t2i-adapter-sketch-sdxl-1.0
git clone https://huggingface.co/TencentARC/t2i-adapter-canny-sdxl-1.0
git clone https://huggingface.co/TencentARC/t2i-adapter-openpose-sdxl-1.0
```

**FO4 Use Cases:**
- **3D-Aware Textures**: Export depth from Blender → Generate texture matching geometry
- **Weapon Silhouette Control**: Sketch weapon shape → Generate detailed design
- **Character Poses**: Use pose references for consistent NPC concepts
- **Architecture Layout**: Control interior layout precisely

**See**: T2I_ADAPTER_INTEGRATION.md for complete guide

#### Hotshot-XL ⭐⭐ (Animated GIFs & Video Generation)
- **Purpose**: Generate animated GIFs and short videos from text prompts
- **Why**: Create animated holotape content, weapon effects, UI elements
- **Repository**: https://huggingface.co/hotshotco/Hotshot-XL
- **Key Features**:
  - **Text-to-GIF**: Create animations from descriptions
  - **Image-to-GIF**: Animate existing images
  - **Temporal Consistency**: Smooth, flicker-free animations
  - **High Resolution**: 512x512 to 1024x1024
  - **Customizable Frames**: 1-16 frames (8 recommended)

**Installation:**
```bash
# Install via diffusers
pip install diffusers transformers accelerate

# Clone model (optional, diffusers can auto-download)
git clone https://huggingface.co/hotshotco/Hotshot-XL

# For ComfyUI integration
cd ComfyUI/custom_nodes
git clone https://github.com/kijai/ComfyUI-HotshotXL.git
```

**FO4 Use Cases:**
- **Animated Holotapes**: Looping screens for terminals (512x512)
- **Weapon Effects**: Energy weapon glow, muzzle flash animations
- **Environmental FX**: Fire, smoke, water animations for textures
- **UI Elements**: Animated HUD elements, loading screens
- **Marketing**: Mod showcase GIFs for social media
- **Tutorial Content**: Animated feature demonstrations

**See**: HOTSHOT_XL_INTEGRATION.md for complete guide

## Workflows for FO4 Modding

### Pre-made Workflow Ideas

1. **Texture Generator**
   - Input: Text prompt
   - Output: Tileable texture
   - Nodes: Text encoder, SD model, tiling

2. **Concept Art Generator**
   - Input: Description + style
   - Output: Concept image
   - Nodes: Text encoder, SD model, post-processing

3. **Texture Upscaler**
   - Input: Low-res texture
   - Output: High-res texture
   - Nodes: Upscale model, detail enhancement

4. **PBR Material Generator**
   - Input: Base texture
   - Output: Diffuse, normal, roughness maps
   - Nodes: Multiple generators, image processing

5. **Style-Consistent Asset Generator (IPAdapter)**
   - Input: Reference image + text prompt
   - Output: New asset matching style
   - Nodes: IPAdapter, text encoder, SD model
   - **FO4 Use**: Generate weapon variants matching your mod's style

6. **Texture Variation Generator (IPAdapter)**
   - Input: Existing texture + variation prompt
   - Output: Similar but different texture
   - Nodes: IPAdapter, SD model, image processing
   - **FO4 Use**: Create texture variations for LODs or variants

### IPAdapter_plus Workflow Examples

#### Example 1: Style-Consistent Weapon Set
```
Goal: Create 5 weapon variants with consistent design language

Workflow:
1. Load your first weapon concept/texture as reference
2. Add IPAdapter_plus node
3. Connect reference image to IPAdapter
4. Text prompt: "assault rifle, military green, worn"
5. Generate → Rifle
6. Change prompt: "pistol, military green, worn"  
7. Generate → Pistol (matching style!)
8. Repeat for: shotgun, sniper, SMG
Result: Complete weapon set with unified aesthetic
```

#### Example 2: Matching Vanilla FO4 Style
```
Goal: Generate new props that fit vanilla Fallout 4 aesthetic

Workflow:
1. Screenshot vanilla FO4 prop (e.g., desk, chair)
2. Use as IPAdapter reference
3. Text prompt: "rusty filing cabinet, post-apocalyptic"
4. IPAdapter ensures Fallout 4 art style
5. Generate multiple variations
6. Select best matches
Result: Props that blend perfectly with vanilla game
```

#### Example 3: Character/NPC Consistency
```
Goal: Generate same character from multiple angles

Workflow:
1. Create or find character concept art (front view)
2. Load as IPAdapter reference
3. Text prompt: "character side view, same person"
4. Generate side view
5. Text prompt: "character back view, same person"
6. Generate back view
Result: Consistent character from all angles for NPC creation
```

#### Example 4: Texture Variation with Style Lock
```
Goal: Create wall texture variations maintaining style

Workflow:
1. Load existing wall texture as reference
2. Add IPAdapter with low strength (0.3-0.5)
3. Text prompt: "concrete wall, damaged, different pattern"
4. Generate variations
5. All maintain base style/color/weathering
Result: Diverse but cohesive texture set for interior cells
```

### Save Workflows

1. Create workflow in ComfyUI
2. Click "Save" button
3. Store in your project folder
4. Load anytime with "Load" button

## Performance Optimization

### For Texture Generation

**Fast iteration:**
```
- Use GGUF Q4_0 models
- Reduce image resolution (512x512)
- Fewer sampling steps (20-25)
- Simple prompts
```

**High quality:**
```
- Use GGUF Q8_0 or FP16 models
- Higher resolution (1024x1024+)
- More sampling steps (30-50)
- Detailed prompts with negative prompts
```

### Memory Management

**Low VRAM (4GB):**
- Use GGUF Q4_0 models
- Enable `--lowvram` flag
- Generate smaller images
- Close other applications

**Medium VRAM (8GB):**
- Use GGUF Q5_0/Q8_0 models
- Standard settings work well
- Can generate 1024x1024

**High VRAM (12GB+):**
- Use any models
- Can use SDXL models
- Batch generation
- High resolution

## Troubleshooting

### ComfyUI Won't Start

**Check Python version:**
```bash
python --version  # Should be 3.8+
```

**Reinstall dependencies:**
```bash
pip install -r requirements.txt --force-reinstall
```

### Models Not Loading

**GGUF models:**
- Ensure ComfyUI-GGUF extension is installed
- Check model is in correct directory
- Restart ComfyUI

**Standard models:**
- Verify file isn't corrupted
- Check file extension (.safetensors or .ckpt)
- Ensure sufficient disk space

### Out of Memory Errors

**Solutions:**
1. Use GGUF quantized models (Q4_0)
2. Reduce image resolution
3. Add `--lowvram` flag when starting ComfyUI
4. Close other GPU applications
5. Use CPU mode if necessary: `--cpu`

### Slow Generation

**Optimizations:**
1. Enable xformers: `--xformers`
2. Use GGUF models
3. Reduce sampling steps
4. Use smaller resolution
5. Upgrade GPU (if possible)

## Integration Examples

### Example 1: Weapon Texture Pipeline

```bash
# 1. Start ComfyUI
python main.py

# 2. In ComfyUI interface:
#    - Load texture generation workflow
#    - Prompt: "rusty assault rifle texture, military green, worn"
#    - Generate and save to: textures/weapon_diffuse.png

# 3. In Blender (with add-on):
import bpy
bpy.ops.fo4.smart_material_setup()
# Browse to weapon_diffuse.png
# Material automatically created

# 4. Export mesh
bpy.ops.fo4.export_mesh()
```

### Example 2: Environment Prop Creation

```bash
# 1. Generate concept in ComfyUI
#    Prompt: "post-apocalyptic barrel, side view, game asset"

# 2. Use Shap-E in Blender
import bpy
bpy.context.scene.fo4_shap_e_image_path = "concept_barrel.png"
bpy.ops.fo4.generate_shap_e_image()

# 3. Generate texture in ComfyUI
#    Upload UV layout, generate detailed texture

# 4. Apply and optimize
bpy.ops.fo4.optimize_mesh()
bpy.ops.fo4.smart_material_setup()
bpy.ops.fo4.validate_mesh()
```

## Best Practices

### For Fallout 4 Textures

1. **Resolution:**
   - Small props: 512x512 or 1024x1024
   - Weapons/armor: 2048x2048
   - Large objects: 4096x4096

2. **Format:**
   - Generate as PNG (lossless)
   - Convert to DDS for FO4

3. **Style matching:**
   - Use reference images from FO4
   - Include style keywords: "fallout 4 style", "post-apocalyptic"
   - Study vanilla game textures

4. **PBR workflow:**
   - Generate base color (diffuse)
   - Create normal map
   - Generate roughness/metallic maps
   - Test in Blender before export

### Prompting Tips

**Good prompts for FO4:**
- "rusty metal texture, weathered, post-apocalyptic, high detail"
- "vault-tec panel texture, blue and yellow, sci-fi, worn"
- "concrete wall texture, damaged, bullet holes, wasteland"

**Negative prompts:**
- "blurry, low quality, watermark, text"
- "modern, clean, pristine, new"

## Resources

### Model Sources

- **Hugging Face**: https://huggingface.co/models
- **Civitai**: https://civitai.com/
- **GGUF Models**: Search for "[model name] GGUF" on Hugging Face

### Tutorials

- ComfyUI official examples
- YouTube tutorials for ComfyUI
- Fallout 4 modding texture guides

### Community

- ComfyUI Discord
- r/StableDiffusion
- Fallout 4 modding forums

## Summary

ComfyUI with GGUF support provides:
- ✅ Professional texture generation
- ✅ Efficient memory usage
- ✅ Fast iteration for mod development
- ✅ High-quality results
- ✅ Flexible workflow creation

Combined with the Fallout 4 Blender Add-on, you have a complete pipeline from concept to in-game asset!

---

**Version:** 1.0
**Last Updated:** 2026-02-17
**Compatible with:** ComfyUI latest, GGUF extension latest
