# Hunyuan3D-2 AI Integration Guide

## Overview

This add-on now supports optional AI-powered 3D mesh generation using Tencent's Hunyuan3D-2 model. This feature allows you to:

- **Generate 3D meshes from text descriptions** (e.g., "a medieval sword with ornate handle")
- **Convert 2D images to full 3D models** (beyond simple height maps)
- **Create game-ready assets with AI assistance**

**Important**: This is an **OPTIONAL** feature. The add-on works perfectly without it. Hunyuan3D-2 integration is for advanced users who want AI-powered generation.

## What is Hunyuan3D-2?

Hunyuan3D-2 is Tencent's state-of-the-art AI model for 3D generation. It can:
- Generate high-quality 3D meshes from text prompts
- Reconstruct 3D objects from 2D images
- Create textured models suitable for games and VR

**Project**: https://github.com/Tencent-Hunyuan/Hunyuan3D-2

## Requirements

### Hardware
- **GPU**: NVIDIA GPU with CUDA support (8GB+ VRAM recommended)
- **Disk Space**: 20GB+ free space for models and cache
- **RAM**: 16GB+ recommended
- **OS**: Windows 10/11, Linux, or macOS (with CUDA-capable GPU)

### Software
- Blender 3.0 or newer
- Python 3.8+
- CUDA Toolkit (for GPU acceleration)

## Installation

### Step 1: Install PyTorch

PyTorch is required for AI model inference. Install it in Blender's Python environment:

**Windows:**
```bash
# Navigate to Blender's Python directory
cd "C:\Program Files\Blender Foundation\Blender 3.6\3.6\python\bin"

# Install PyTorch with CUDA support
python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

**Linux:**
```bash
# Navigate to Blender's Python directory
cd /usr/share/blender/3.6/python/bin

# Install PyTorch
./python3.10 -m pip install torch torchvision
```

**macOS:**
```bash
# Navigate to Blender's Python directory
cd /Applications/Blender.app/Contents/Resources/3.6/python/bin

# Install PyTorch (MPS for Apple Silicon)
./python3.10 -m pip install torch torchvision
```

### Step 2: Clone Hunyuan3D-2 Repository

**Using GitHub CLI (recommended):**
```bash
gh repo clone Tencent-Hunyuan/Hunyuan3D-2
```

**Or using git:**
```bash
git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git
```

Place the repository in one of these locations:
- `~/Hunyuan3D-2` (home directory)
- `~/Projects/Hunyuan3D-2`
- `/opt/Hunyuan3D-2` (Linux)

### Step 3: Install Hunyuan3D-2 Dependencies

```bash
cd Hunyuan3D-2
pip install -r requirements.txt
```

### Step 4: Download Model Weights

Follow the instructions in the Hunyuan3D-2 README to download model weights:

1. Register/login at their model hosting service (usually Hugging Face)
2. Download the required checkpoint files
3. Place them in the `checkpoints/` directory

Model weights are typically several GB in size.

### Step 5: Verify Installation

1. Restart Blender
2. Open the Fallout 4 add-on panel (press `N` → "Fallout 4" tab)
3. Expand "AI Generation (Optional)" panel
4. Check the status indicator:
   - ✓ "Status: Available" = Ready to use
   - ✗ "Status: Not Installed" = Need to complete installation

## Usage

### Checking AI Availability

In the "AI Generation (Optional)" panel:
- Click "Installation Info" button
- Console will show:
  - Current status
  - Missing components
  - Installation instructions

### Text to 3D Generation

1. Expand "AI Generation (Optional)" panel
2. Click "Generate from Text"
3. Enter a description:
   - "a rusty iron sword"
   - "wooden barrel with metal bands"
   - "stone statue of a warrior"
4. Set resolution (128-512)
5. Click OK
6. Wait for generation (may take 30 seconds to several minutes)

**Tips for good prompts:**
- Be specific but concise
- Include materials: "wooden", "metal", "stone"
- Include style: "medieval", "sci-fi", "fantasy"
- Mention key features: "with ornate carvings", "battle-worn"

### Image to 3D Generation

1. Prepare your image:
   - Clear, well-lit object photo
   - Solid background preferred
   - Object centered in frame
   - PNG or JPG format

2. Click "Generate from Image (AI)"
3. Select your image file
4. Set resolution (128-512)
5. Wait for generation

**Difference from Height Map:**
- Height map: Creates terrain/surface from grayscale
- AI Image-to-3D: Creates full 3D object from any image

### Post-Processing

Generated meshes may need:
1. **Optimization**: Click "Optimize for FO4"
2. **Validation**: Click "Validate Mesh"
3. **Scaling**: Adjust size for Fallout 4
4. **Texturing**: Apply FO4-compatible materials
5. **Cleanup**: Remove unnecessary geometry

## Troubleshooting

### "Hunyuan3D-2 not available"

**Check PyTorch:**
```python
# In Blender's Python console
import torch
print(torch.__version__)
print(torch.cuda.is_available())  # Should be True for GPU
```

**Check repository location:**
- Verify the Hunyuan3D-2 folder exists
- Check for `infer.py` in the root directory
- Try placing it in `~/Hunyuan3D-2`

### "Text-to-3D generation not yet implemented"

This message appears because the actual inference integration is a placeholder. To use Hunyuan3D-2 directly:

1. Open terminal/command prompt
2. Navigate to Hunyuan3D-2 directory
3. Run their inference script:
   ```bash
   python infer.py --prompt "your description" --output output.obj
   ```
4. Import the generated mesh into Blender:
   - File → Import → Wavefront (.obj)

### Slow Generation

- **Use GPU**: Verify CUDA is available
- **Reduce resolution**: Try 128 or 256 instead of 512
- **Close other GPU applications**: Free up VRAM
- **Check cooling**: GPU throttling can slow inference

### Out of Memory Errors

- Reduce generation resolution
- Close other applications
- Restart Blender to clear VRAM
- Consider upgrading GPU (8GB+ VRAM recommended)

### Model Not Found

- Verify model weights are downloaded
- Check the `checkpoints/` directory
- Re-download weights if corrupted
- Follow Hunyuan3D-2's setup guide exactly

## Current Limitations

### Beta Status

This integration is in **beta/experimental** state:
- Full inference pipeline not yet integrated
- Requires manual setup of Hunyuan3D-2
- May need direct use of their scripts

### Performance

- **GPU Required**: CPU inference is too slow for practical use
- **Generation Time**: 30 seconds to 5 minutes per model
- **VRAM Usage**: 4-8GB per generation
- **Quality**: Varies based on prompt/image quality

### Fallout 4 Compatibility

Generated meshes may need manual adjustment:
- Polygon count can exceed FO4 limits
- Textures may need conversion
- Scale might be incorrect
- Collision meshes must be added

## Advanced Usage

### Batch Generation

For multiple models:
1. Use Hunyuan3D-2's batch inference scripts
2. Generate multiple OBJ files
3. Import them into Blender in batch
4. Process with add-on's optimization tools

### Custom Model Training

If you have your own Hunyuan3D-2 checkpoint:
1. Place it in the `checkpoints/` directory
2. Update the path in helper functions
3. Follow Hunyuan3D-2's documentation

### Integration with Pipeline

Workflow suggestion:
1. Generate base mesh with AI
2. Refine in Blender's sculpt mode
3. Retopologize for game use
4. Apply FO4-compatible materials
5. Optimize and validate
6. Export to Fallout 4

## Alternatives

If Hunyuan3D-2 is too complex:

**Free Alternatives:**
- **3D Shape Generators**: Using simple primitives
- **Image to Height Map**: Our built-in feature (simpler)
- **Photogrammetry**: Meshroom (free, open-source)
- **Procedural Generation**: Blender's geometry nodes

**Commercial Services:**
- Meshy.ai
- Luma AI
- Kaedim3D
- Various other text/image-to-3D services

## Support

**For Add-on Issues:**
- Check this documentation
- Review README.md troubleshooting
- Report issues on GitHub

**For Hunyuan3D-2 Issues:**
- Visit: https://github.com/Tencent-Hunyuan/Hunyuan3D-2
- Read their documentation
- Check their issues page
- Follow their support channels

## Future Plans

Planned improvements:
- Full inference integration
- Simplified installation
- Pre-configured model downloads
- Batch processing UI
- Quality presets (speed vs quality)
- Direct FO4 optimization

## Summary

**Pros:**
- Powerful AI generation
- High-quality results possible
- Text and image input supported
- Free and open-source

**Cons:**
- Complex installation
- Requires powerful GPU
- Large disk space needed
- Beta integration status
- Manual setup required

**Recommendation:**
- **Beginners**: Use traditional mesh creation tools
- **Intermediate**: Try image-to-height-map feature
- **Advanced**: Experiment with AI generation
- **Developers**: Contribute to integration!

---

## Quick Reference Commands

**Check Installation:**
```python
# In Blender console
from hunyuan3d_helpers import Hunyuan3DHelpers
print(Hunyuan3DHelpers.get_status_message())
```

**Clone Repository:**
```bash
gh repo clone Tencent-Hunyuan/Hunyuan3D-2
```

**Install PyTorch:**
```bash
pip install torch torchvision
```

**Direct Inference:**
```bash
cd Hunyuan3D-2
python infer.py --prompt "your text" --output model.obj
```

---

For the latest updates and detailed integration instructions, visit the Hunyuan3D-2 GitHub repository.
