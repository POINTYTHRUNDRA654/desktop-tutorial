# Compatibility Guide

## Blender Version Compatibility

### Fully Supported Blender Versions

✅ **Blender 2.80 - 4.5+ (All Modern Versions)**

This add-on is compatible with ALL modern versions of Blender, including the very latest:

| Version Range | Status | Notes |
|---------------|--------|-------|
| **Blender 2.80 - 2.93** | ✅ Fully Compatible | Tested and working |
| **Blender 3.0 - 3.6** | ✅ Fully Compatible | Recommended for stability |
| **Blender 4.0 - 4.2** | ✅ Fully Compatible | Latest LTS features |
| **Blender 4.3 - 4.5+** | ✅ Fully Compatible | **Including 4.5.5** ⭐ |
| **Blender 5.0+ (experimental)** | ⚠ Untested / In progress | Report any errors with console log |

**✨ Confirmed Working on Blender 4.5.5!** (User tested)

### Version-Specific Notes

**Blender 2.80 - 2.93:**
- ✅ All core features work
- ✅ Mesh tools fully functional
- ✅ Export system works
- ⚠️ Some AI features require newer Python (manually installable)
- 💡 Tip: Blender 2.93 LTS recommended for this range

**Blender 3.0 - 3.6:**
- ✅ Optimal performance
- ✅ All features work perfectly
- ✅ Best tested version range
- ✅ Geometry Nodes support
- 💡 Tip: Blender 3.6 LTS recommended

**Blender 4.0+:**
- ✅ Latest API fully supported
- ✅ Enhanced performance
- ✅ New UI features work
- ✅ Future-proof implementation
- ✅ **Blender 4.5.5 confirmed working** ⭐
- 💡 Tip: All 4.x versions fully supported

**Blender 5.x:**
- ⚠ First releases of 5.x may introduce breaking API changes
- ✅ Add-on should work exactly like 4.x, but there is no official
  validation yet
- 📋 If you see errors on Blender 5, copy the System Console output and
  open an issue at the GitHub repository; the enhanced import/registration
  logging will show which module failed

### Installation on Any Blender Version

**Universal Installation Steps:**
1. Download the add-on
2. Open Blender (any version 2.80+)
3. Go to Edit → Preferences → Add-ons
4. Click "Install..."
5. Select `__init__.py`
6. Enable "Fallout 4 Tutorial Helper"
7. Done! ✓

**No special configuration needed for different versions!**

---

## Platform Compatibility

### Operating Systems

✅ **All Major Platforms Supported**

| Platform | Status | Versions |
|----------|--------|----------|
| **Windows** | ✅ Fully Compatible | Windows 10, 11 |
| **macOS** | ✅ Fully Compatible | macOS 10.15+ (Intel & Apple Silicon) |
| **Linux** | ✅ Fully Compatible | All major distributions |

**Platform-Specific Features:**
- **Windows**: Full feature set, embedded Python support
- **macOS**: Full feature set, Homebrew integration
- **Linux**: Full feature set, native package managers

---

## Physics Systems

### Will this work with NVIDIA PhysX?

**No. This add-on is NOT compatible with NVIDIA PhysX, and PhysX is not used in Fallout 4 modding.**

### Understanding Physics Systems

There are two major physics engines in game development:

1. **NVIDIA PhysX** (by NVIDIA)
   - Used in: Unreal Engine games, some Unity games, various other titles
   - Repositories: NVIDIA-Omniverse/PhysX
   - **NOT used in Bethesda games**

2. **Havok Physics** (by Havok/Microsoft)
   - Used in: Bethesda Creation Engine games (Skyrim, Fallout 4, Fallout 76, Starfield)
   - Commercial physics engine
   - **This is what Fallout 4 uses**

### Fallout 4's Physics System

Fallout 4 exclusively uses **Havok Physics**:
- All collision detection uses Havok
- All dynamic physics uses Havok
- All animations with physics use Havok
- PhysX is not present in the game engine

### What This Add-on Does

This Blender add-on is specifically designed for **Fallout 4 modding**:

✅ **Creates meshes compatible with Fallout 4's Havok system**
- Exports to FBX format (convertible to .nif with Havok collision data)
- Generates basic collision meshes (simplified geometry)
- Optimizes meshes for Fallout 4's engine limits

❌ **Does NOT support NVIDIA PhysX**
- PhysX is incompatible with Fallout 4
- PhysX libraries are not used
- PhysX simulations cannot be exported to Fallout 4

❌ **Does NOT provide full Havok simulation**
- Advanced physics require Havok Content Tools (separate software)
- This add-on creates the geometry; Havok tools create the physics

---

## Python & Dependency Compatibility

### Python Version Requirements

| Blender Version | Python Version | Status |
|----------------|----------------|--------|
| 2.80 - 2.93 | Python 3.7 - 3.9 | ✅ Compatible |
| 3.0 - 3.6 | Python 3.10 - 3.11 | ✅ Compatible |
| 4.0+ | Python 3.11+ | ✅ Compatible |

**Note:** Python is bundled with Blender - no separate installation needed!

### Optional Dependencies

**Core Add-on (No dependencies required!):**
- ✅ Works out of the box
- ✅ No pip install needed
- ✅ No external packages required

**Optional AI Features:**
- PIL/Pillow - Image processing
- NumPy - Numerical operations
- PyTorch - AI/ML models
- *Installation instructions in SETUP_GUIDE.md*

---

## Game Compatibility

### Fallout 4
✅ **Full Support** - This add-on is designed specifically for Fallout 4
- Mesh optimization for FO4 limits (65,535 polygons)
- Material setup compatible with FO4 shaders
- Collision mesh generation for Havok physics
- Export to FBX (convertible to .nif)

### Other Games

❌ **Not designed for:**
- Fallout 3 (uses GameBryo, different limits)
- Fallout: New Vegas (uses GameBryo, different limits)
- Skyrim (similar but different workflow)
- Starfield (Creation Engine 2, different workflow)
- Games using PhysX (Unreal, Unity, etc.)

⚠️ **May work with modifications:**
- The tools are generic enough that they could help with other Bethesda games
- However, limits, material setups, and workflows differ
- Not officially supported for non-FO4 games

## External Tool Compatibility

### Required for Full Fallout 4 Workflow

This add-on works **with** these tools (not a replacement):

1. **NifSkope** - View/edit .nif files
   - ✅ Compatible - Export FBX, convert to NIF, edit in NifSkope
   - Required for final .nif adjustments

2. **Creation Kit** - Bethesda's official modding tool
   - ✅ Compatible - Use this add-on to create assets, then import in CK
   - Required for in-game integration

3. **Outfit Studio** - Body/armor editing
   - ✅ Compatible - Meshes from this add-on can be used
   - Optional, for body/armor mods

4. **Havok Content Tools** - Physics simulation
   - ✅ Compatible - Create meshes here, add physics in Havok tools
   - Required for complex physics (ragdolls, cloth, etc.)

5. **Mod Organizer 2** / **Vortex** - Mod managers
   - ✅ Compatible - Exported mods work with all mod managers

### Optional Dependencies

**For Image to Mesh feature:**
- PIL/Pillow (Python library)
- NumPy (Python library)

**For AI features (optional):**
- PyTorch
- Tencent Hunyuan3D-2
- Gradio (for web interface)

**For Motion features (optional):**
- git-lfs
- Tencent HY-Motion-1.0

## Common Compatibility Questions

### Q: Can I clone NVIDIA-Omniverse/PhysX to use with this add-on?
**A:** No. PhysX is not compatible with Fallout 4. Fallout 4 uses Havok physics, which is a completely different system. Cloning the PhysX repository will not help with Fallout 4 modding.

### Q: Does Blender's physics system work with this add-on?
**A:** Blender's built-in physics (rigid body, cloth, fluid) is for preview/animation only. It does not export to Fallout 4. For in-game physics, you need Havok Content Tools after creating your mesh in Blender.

### Q: Can I convert PhysX files to Havok?
**A:** No. PhysX and Havok use completely different file formats and are not interchangeable. They are proprietary, competing physics engines.

### Q: Will this work with Unreal Engine / Unity?
**A:** No. This add-on is specifically designed for Fallout 4 (Creation Engine with Havok). For Unreal/Unity, use their native pipelines and PhysX support (if applicable).

### Q: Can I export to formats other than FBX?
**A:** Currently, FBX is the primary export format (for conversion to .nif). Direct .nif export may be added in the future with PyNifly integration.

## Technical Specifications

### Fallout 4 Limits (What This Add-on Enforces)
- Maximum polygons: 65,535 per mesh
- Maximum bones: 256 per skeleton
- Texture dimensions: Power-of-2 recommended (512, 1024, 2048, 4096)
- File format: .nif (exported as FBX, then converted)

### Physics System
- Engine: Havok Physics
- Collision: Simplified geometry (created by this add-on)
- Physics properties: Set in Creation Kit or NifSkope
- Simulation: Havok Content Tools (for advanced features)

### Not Supported
- PhysX physics
- Direct .nif export (requires external conversion)
- Real-time in-Blender preview of Havok physics
- Automatic physics property setup

## Summary

| Feature | Supported | Notes |
|---------|-----------|-------|
| Fallout 4 mesh creation | ✅ Yes | Primary purpose |
| Collision mesh generation | ✅ Yes | Basic geometry |
| Havok physics compatibility | ✅ Yes | Via export workflow |
| NVIDIA PhysX support | ❌ No | Not used in FO4 |
| Direct .nif export | ❌ No | Use FBX → NIF conversion |
| Full Havok simulation | ❌ No | Requires Havok Content Tools |
| Blender 3.0+ | ✅ Yes | Fully supported |
| Windows/Mac/Linux | ✅ Yes | All platforms |

## Getting Help

If you have compatibility questions:
1. Check the FAQ.md
2. Read the README.md
3. See INSTALLATION.md for setup issues
4. Ask in Fallout 4 modding communities
5. Open an issue on GitHub

---

**Remember:** This add-on is for **Fallout 4 modding with Havok physics**. PhysX from NVIDIA is not compatible with Fallout 4.
