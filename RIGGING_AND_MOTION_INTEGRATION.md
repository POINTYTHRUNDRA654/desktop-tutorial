# Auto-Rigging and Motion Generation Integration Summary

This document summarizes the auto-rigging and motion generation capabilities added to the Blender Fallout 4 add-on.

## Overview

We have integrated support for multiple state-of-the-art auto-rigging and motion generation systems:

### Auto-Rigging Systems

1. **RigNet** (AI-powered skeleton prediction)
2. **libigl** (Algorithmic skinning weight computation)

### Motion Generation Systems

1. **HY-Motion-1.0** (Tencent's production model)
2. **MotionDiffuse** (Diffusion-based text-to-motion)
3. **MotionDiffuse-SMPLX** (Extended with face & hand support)
4. **ComfyUI-MotionDiff** (Multiple models in ComfyUI format)

## Auto-Rigging Integration

### 1. RigNet Integration

**Repositories:**
- Primary: `gh repo clone govindjoshi12/rignet-gj` (Joint prediction reimplementation)
- Original: `gh repo clone zhan-xu/RigNet` (Complete pipeline)

**Features:**
- AI-powered automatic skeleton generation
- Joint position prediction using graph neural networks
- Bone connectivity and hierarchy prediction
- Automatic skinning weight computation
- Works best with 1K-5K vertex meshes
- Optimal for humanoid and animal characters

**Implementation:**
- Module: `rignet_helpers.py`
- Operators:
  - `FO4_OT_CheckRigNetInstallation` - Check if RigNet is available
  - `FO4_OT_ShowRigNetInfo` - Show installation instructions
  - `FO4_OT_PrepareForRigNet` - Prepare mesh (simplify to 1K-5K vertices)
  - `FO4_OT_AutoRigMesh` - Run automatic rigging
  - `FO4_OT_ExportForRigNet` - Export for external processing

**UI Panel:** "Auto-Rigging (RigNet)" in Fallout 4 sidebar

**Status:** Beta integration - recommends external tools (brignet, Rignet_blender_addon) for production use

### 2. libigl Integration

**Repository:** 
- `gh repo clone libigl/libigl` (Main C++ library)
- `gh repo clone libigl/libigl-python-bindings` (Python bindings - recommended)

**Features:**
- Bounded Biharmonic Weights (BBW) for automatic skinning
- Fast C++ implementation with Python interface
- Works with any existing armature/skeleton
- No vertex count limitations
- Additional: mesh repair, UV unwrapping, geodesic distances

**Implementation:**
- Module: `rignet_helpers.py` (shared with RigNet)
- Operators:
  - `FO4_OT_CheckLibiglInstallation` - Check if libigl is available
  - `FO4_OT_ComputeBBWSkinning` - Compute BBW weights for existing skeleton

**UI Panel:** Integrated into "Auto-Rigging (RigNet)" panel

**Installation:** `pip install libigl` (easiest method)

**Status:** Placeholder implementation - BBW algorithm integration in progress

### Auto-Rigging Workflow

**Option A: Full Auto-Rigging with RigNet**
1. Select character mesh
2. Click "Prepare Mesh" (simplifies to optimal vertex count)
3. Click "Auto-Rig" (predicts skeleton + skinning)

**Option B: Auto-Skinning with libigl**
1. Create or select armature
2. Select mesh and parent to armature
3. Click "Compute BBW Weights" (calculates skinning for existing skeleton)

**Option C: Combined Approach**
1. Use RigNet for skeleton prediction
2. Refine weights with libigl BBW algorithm

## Motion Generation Integration

### 1. HY-Motion-1.0

**Repository:** Already integrated in `hymotion_helpers.py`

**Features:**
- Production-ready motion generation from Tencent
- Text-to-motion capabilities
- Requires git-lfs for model weights

**Status:** Existing integration maintained

### 2. MotionDiffuse (Original)

**Repository:** `gh repo clone MotrixLab/MotionDiffuse`

**Features:**
- Text-driven human motion with diffusion models
- High-quality motion synthesis
- HumanML3D dataset (20 fps)
- Research-grade quality

**Implementation:**
- Module: `motion_generation_helpers.py`
- Detection: Checks for repository and text2motion directory

**Paper:** https://arxiv.org/abs/2208.15001
**Demo:** https://huggingface.co/spaces/mingyuan/MotionDiffuse

### 3. MotionDiffuse-SMPLX Extension

**Repository:** `gh repo clone ellemcfarlane/MotionDiffuse`

**Features:**
- Extended MotionDiffuse with SMPL-X pose support
- **Facial expressions** in generated motion
- **Fully articulated hand movements**
- Better for emotion and detailed object interaction
- Based on Motion-X dataset

**Why Important:** 
- Original MotionDiffuse only generates body motion
- SMPL-X adds face (expression) and hand (finger) articulation
- Critical for realistic character animation

**Implementation:**
- Module: `motion_generation_helpers.py` (shared detection)
- Automatically detects SMPL-X variant and prefers it over original

### 4. ComfyUI-MotionDiff

**Repository:** `gh repo clone Fannovel16/ComfyUI-MotionDiff`

**Features:**
- Multiple motion models in one package:
  - MotionDiffuse
  - MDM (Motion Diffusion Model)
  - MotionGPT
  - ReMoDiffuse
  - 4DHuman (3D pose estimation)
- SMPL mesh generation and rendering
- Export to 3D software (Blender, Unity, Unreal)
- Depth map and OpenPose output
- ComfyUI node-based workflow

**Implementation:**
- Module: `motion_generation_helpers.py`
- Operators:
  - `FO4_OT_CheckAllMotionSystems` - Check all available systems
  - `FO4_OT_ShowMotionGenerationInfo` - Show installation guide
  - `FO4_OT_GenerateMotionAuto` - Generate using best available system

**Status:** Detection and documentation complete, inference integration pending

### Motion Generation Workflow

1. **Check Available Systems:**
   - Click "Check Motion Systems" to see what's installed

2. **Generate Motion:**
   - Click "Generate Motion (Auto)" 
   - Enter text description (e.g., "person walking forward")
   - System automatically uses best available motion generator

3. **Apply to Armature:**
   - Generated motion data can be imported as .bvh or .fbx
   - Apply to Blender armatures using standard import

## System Comparison

### Auto-Rigging

| System | Type | Skeleton | Skinning | Vertex Limit | Best For |
|--------|------|----------|----------|--------------|----------|
| **RigNet** | AI | ✓ Predicts | ✓ Predicts | 1K-5K | Full auto-rigging |
| **libigl** | Algorithm | ✗ Needs existing | ✓ Computes | None | Weight computation |

**Recommendation:** Use RigNet for full auto-rigging, libigl for skinning existing skeletons

### Motion Generation

| System | Body | Face | Hands | Dataset | Best For |
|--------|------|------|-------|---------|----------|
| **HY-Motion-1.0** | ✓ | ? | ? | Custom | Production use |
| **MotionDiffuse** | ✓ | ✗ | ✗ | HumanML3D | Body motion |
| **MotionDiffuse-SMPLX** | ✓ | ✓ | ✓ | Motion-X | Expressive motion |
| **ComfyUI-MotionDiff** | ✓ | ✓ | ✓ | Multiple | Advanced workflows |

**Recommendation:** 
- Simple text-to-motion: MotionDiffuse
- Facial expressions needed: MotionDiffuse-SMPLX
- Multiple models/workflows: ComfyUI-MotionDiff

## Installation Quick Reference

### Auto-Rigging

```bash
# RigNet (joint prediction)
gh repo clone govindjoshi12/rignet-gj
cd rignet-gj
pip install -r requirements.txt

# libigl (skinning)
pip install libigl
```

### Motion Generation

```bash
# MotionDiffuse-SMPLX (recommended)
gh repo clone ellemcfarlane/MotionDiffuse
cd MotionDiffuse
pip install -r requirements.txt

# ComfyUI-MotionDiff (advanced)
gh repo clone Fannovel16/ComfyUI-MotionDiff
cd ComfyUI-MotionDiff
pip install -r requirements.txt
```

## Files Modified/Created

### New Files:
- `rignet_helpers.py` - RigNet and libigl integration
- `motion_generation_helpers.py` - Motion generation systems
- `RIGGING_AND_MOTION_INTEGRATION.md` - This document

### Modified Files:
- `operators.py` - Added auto-rigging and motion operators
- `ui_panels.py` - Added Auto-Rigging panel
- `__init__.py` - Registered new modules
- `README.md` - Updated with new features and installation

## Future Enhancements

### Short Term:
1. Complete BBW skinning integration with libigl
2. Implement motion data import from generation systems
3. Add motion preview/visualization
4. Improve error handling and user feedback

### Long Term:
1. Direct inference integration (currently placeholder)
2. Motion retargeting to different armatures
3. Motion blending and interpolation
4. Real-time motion preview
5. Custom model fine-tuning support

## References

### Research Papers:
- **RigNet:** "Neural Rigging for Articulated Characters" (SIGGRAPH 2020)
  - https://doi.org/10.1145/3386569.3392379
- **MotionDiffuse:** "Text-Driven Human Motion Generation with Diffusion Model"
  - https://arxiv.org/abs/2208.15001

### GitHub Repositories:
- RigNet: https://github.com/zhan-xu/RigNet
- rignet-gj: https://github.com/govindjoshi12/rignet-gj
- libigl: https://github.com/libigl/libigl
- libigl-python-bindings: https://github.com/libigl/libigl-python-bindings
- MotionDiffuse: https://github.com/MotrixLab/MotionDiffuse
- MotionDiffuse-SMPLX: https://github.com/ellemcfarlane/MotionDiffuse
- ComfyUI-MotionDiff: https://github.com/Fannovel16/ComfyUI-MotionDiff
- HY-Motion-1.0: https://github.com/Tencent-Hunyuan/HY-Motion-1.0

### Alternative Blender Add-ons:
- brignet: https://github.com/pKrime/brignet (RigNet for Blender)
- Rignet_blender_addon: https://github.com/L-Medici/Rignet_blender_addon

## Support

For installation issues or questions:
1. Check the installation guide: Click "Installation Guide" in UI panels
2. Review console output: Window > Toggle System Console
3. Refer to original repository documentation
4. For production use, consider tested alternatives (brignet, etc.)

## License

This integration follows the licenses of the integrated systems:
- RigNet: GPL-3.0
- libigl: MPL-2.0
- MotionDiffuse: Check original repository
- ComfyUI-MotionDiff: Check original repository

---

**Status:** Integration complete - Detection and UI ready. Inference integration pending for production use.

**Last Updated:** 2026-02-15
