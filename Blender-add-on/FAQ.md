# Frequently Asked Questions (FAQ)

## General Questions

### Q: What version of Blender do I need?
**A:** Blender 3.0 or higher is required. The add-on is tested with Blender 3.x and 4.x.

### Q: Is this add-on free?
**A:** Yes, it's released under the MIT License and is completely free to use.

### Q: Can I use this for commercial mods?
**A:** Yes, you can use this add-on for any purpose, including commercial projects.

### Q: Does this work on Mac/Linux/Windows?
**A:** Yes, the add-on works on all platforms that support Blender.

## Installation Issues

### Q: The add-on doesn't appear in the add-ons list
**A:** Make sure you're installing the entire folder or a proper ZIP file containing all Python files. The main file should be `__init__.py`.

### Q: I get an error when enabling the add-on
**A:** Check the Blender console (Window > Toggle System Console) for error messages. Make sure you have Blender 3.0 or higher.

### Q: The "Fallout 4" tab doesn't appear in the sidebar
**A:** Press `N` to toggle the sidebar visibility. Make sure the add-on is enabled in preferences.

## Usage Questions

### Q: What file format does this export?
**A:** The add-on currently exports to FBX format, which can be converted to NIF (Fallout 4's native format) using external tools like NifSkope or Outfit Studio.

### Q: Why can't I directly export to NIF?
**A:** Direct NIF export requires additional libraries (PyNifly) that aren't included by default. We plan to add this in a future version.

### Q: Do I need to learn Python to use this add-on?
**A:** No! The add-on provides a user-friendly interface with buttons. Python scripting is optional for advanced users.

### Q: Can I use this with existing Blender models?
**A:** Yes! You can use the optimization and validation tools on any existing mesh in Blender.

## Mesh Questions

### Q: What's the maximum polygon count for Fallout 4?
**A:** The game engine limit is 65,535 polygons (triangles) per mesh. The add-on will warn you if you exceed this.

### Q: Why does my mesh have triangles instead of quads?
**A:** Fallout 4 uses triangulated meshes. The "Optimize for FO4" function automatically triangulates your mesh.

### Q: Do I need to apply scale before exporting?
**A:** Yes! Always apply scale (Ctrl+A > Scale). The validation tools will warn you if scale isn't applied.

### Q: What's a UV map and why do I need one?
**A:** A UV map tells the engine how to wrap textures onto your 3D model. It's required for texturing. Use `U > Unwrap` in Edit Mode to create one.

## Texture Questions

### Q: What texture types does Fallout 4 use?
**A:** Fallout 4 typically uses:
- Diffuse (color/albedo)
- Normal (surface detail)
- Specular (shininess)

### Q: What's the best texture size?
**A:** Use power-of-2 dimensions: 512x512, 1024x1024, or 2048x2048. Larger textures (4096) should be used sparingly for performance.

### Q: Can I use PNG textures?
**A:** Yes, but Fallout 4 uses DDS format in-game. Convert your PNG textures to DDS before final packaging.

### Q: My textures look wrong in Blender
**A:** Switch viewport shading to "Material Preview" (3rd sphere icon in top-right) to see textures properly.

## Animation Questions

### Q: How many bones can I have?
**A:** Fallout 4 supports up to 256 bones per skeleton, though fewer is better for performance.

### Q: Can I import Fallout 4's vanilla skeleton?
**A:** The add-on creates a basic skeleton. For more complex animations, you may want to import the game's skeleton using other tools.

### Q: What frame rate should I use?
**A:** Fallout 4 typically uses 30 or 60 FPS. Set this in your scene properties before animating.

## Export Questions

### Q: Where should I export my mod files?
**A:** Export to a temporary location first. After converting to NIF, place files in your Fallout 4 Data directory structure.

### Q: What's the typical folder structure for FO4 mods?
**A:** 
```
Fallout 4/Data/
├── Meshes/
│   └── YourMod/
│       └── yourfile.nif
└── Textures/
    └── YourMod/
        └── yourfile.dds
```

### Q: Do I need the Creation Kit?
**A:** Not for creating meshes, but you'll need it to integrate your mod into the game (create records, place objects, etc.).

### Q: Can I package multiple meshes at once?
**A:** Yes! Use "Export Complete Mod" to export all scene objects at once.

## Validation Questions

### Q: What does "scale not applied" mean?
**A:** It means your object's scale isn't 1,1,1. Press Ctrl+A and select "Scale" to fix this.

### Q: Why is my mesh "not manifold"?
**A:** Manifold means the mesh has holes or overlapping geometry. Use Blender's mesh analysis tools to find and fix issues.

### Q: What are "loose vertices"?
**A:** Vertices not connected to any edges or faces. Select them in Edit Mode and delete them or connect them to the mesh.

## Tutorial System Questions

### Q: How do I start a tutorial?
**A:** Click "Start Tutorial" in the main panel and select which tutorial you want to follow.

### Q: Can I skip tutorial steps?
**A:** Yes, tutorials are non-blocking. They're there to guide you, but you can work at your own pace.

### Q: Are there video tutorials?
**A:** The built-in tutorials are text-based. Check the modding community for video tutorials on using this add-on.

## Workflow Questions

### Q: What's the recommended workflow?
**A:** 
1. Create/import mesh
2. Optimize for FO4
3. Validate mesh
4. Setup materials
5. Install textures
6. Validate textures
7. Setup animation (if needed)
8. Validate everything
9. Export
10. Convert to NIF
11. Test in-game

### Q: Should I model in Blender or import?
**A:** Either works! This add-on helps with both new models and importing existing ones.

### Q: How do I test my mod in-game?
**A:** After converting to NIF, place files in Fallout 4 Data folder, enable your mod in a mod manager, and launch the game.

## Troubleshooting

### Q: My mesh looks broken in Fallout 4
**A:** Common causes:
- Missing UV map
- Scale not applied
- Normals facing wrong direction
- Missing textures
Run all validation tools before exporting.

### Q: Export fails with an error
**A:** Check that:
- Object is selected
- Mesh is valid (run validation)
- You have write permissions to the export location

### Q: Textures don't appear in-game
**A:** Verify:
- Textures are in DDS format
- Textures are in correct folder structure
- Material paths in NIF are correct
- Files are packaged correctly

### Q: Performance is slow in-game
**A:** Reduce:
- Polygon count (use Decimate modifier)
- Texture sizes
- Number of materials
- Bone count in animations

## Physics and Compatibility Questions

### Q: Will this work with NVIDIA PhysX?
**A:** **No, this add-on is not compatible with NVIDIA PhysX**, and PhysX is not used in Fallout 4 modding. Here's why:

**Fallout 4 uses Havok Physics:**
- Fallout 4 (and all Bethesda Creation Engine games) use Havok physics, not NVIDIA PhysX
- PhysX is NVIDIA's proprietary physics engine used in other games (Unreal Engine games, some Unity games, etc.)
- These are completely different physics systems and are not interchangeable

**What this add-on does:**
- This add-on helps create meshes, textures, and animations for Fallout 4
- It includes a basic collision mesh generator (simplified geometry for collision bounds)
- It does NOT create actual Havok physics simulations or files
- For physics in Fallout 4, you need the game's native Havok system

**If you need physics for Fallout 4 mods:**
- Use Havok Content Tools (available from Bethesda)
- Use NifSkope to edit collision properties in .nif files
- Use the Creation Kit for setting up physics properties in-game
- This add-on can create collision meshes, but full physics integration requires the tools above

**Bottom line:** PhysX from NVIDIA-Omniverse is not compatible with Fallout 4 modding. Stick with Havok-based tools for physics in Fallout 4.

### Q: Does this add-on support physics simulation?
**A:** This add-on provides **basic collision mesh generation** for Fallout 4 objects, but does not implement full Havok physics simulation. The collision mesh feature creates simplified geometry that defines collision boundaries. For advanced physics (ragdolls, cloth, etc.), you need external Havok Content Tools and the Creation Kit.

### Q: What's the difference between collision meshes and physics?
**A:** 
- **Collision mesh:** A simplified 3D shape that defines where objects collide (this add-on can create these)
- **Physics simulation:** Complex calculations for movement, gravity, forces, etc. (requires Havok Content Tools)
- **In-game physics:** How objects behave in Fallout 4 (set up in Creation Kit with Havok properties)

This add-on handles the geometry part. Full physics requires additional tools.

### Q: Are there any NVIDIA repositories that can help with this add-on?
**A:** **Yes!** While NVIDIA PhysX is not compatible with Fallout 4, many other NVIDIA repositories are very useful:

**Highly Recommended:**
- **NVIDIA Texture Tools** - Convert textures to DDS format (essential for FO4)
- **Real-ESRGAN** - AI upscaling for textures (improve quality)
- **StyleGAN2/3** - Generate unique textures with AI

**Also Useful:**
- **GET3D** - Generate 3D meshes from images using AI
- **InstantNGP** - Create 3D models from photos
- **Kaolin** - Advanced mesh processing library

**NOT Compatible:**
- **PhysX** - Not used in Fallout 4 (use Havok tools instead)

See **[NVIDIA_RESOURCES.md](NVIDIA_RESOURCES.md)** for a complete list with installation instructions and use cases.

## Advanced Questions

### Q: Can I script custom workflows?
**A:** Yes! Check API_REFERENCE.md for scripting documentation and example_script.py for examples.

### Q: Can I contribute to the add-on?
**A:** Yes! The add-on is open-source. Feel free to submit improvements.

### Q: Will you add feature X?
**A:** Check the GitHub issues page to suggest features or vote on existing suggestions.

### Q: Can I modify the add-on for my needs?
**A:** Yes! Under the MIT License, you can modify it freely.

## Resources

### Q: Where can I learn more about Fallout 4 modding?
**A:** 
- Creation Kit Wiki
- Nexus Mods forums
- /r/FalloutMods subreddit
- Modding Discord servers

### Q: What external tools do I need?
**A:** For complete workflow:
- NifSkope (NIF viewing/editing)
- Outfit Studio (body/armor work)
- Havok Content Tools (animation)
- Paint.NET/GIMP (texture editing)
- Creation Kit (game integration)

### Q: Are there example mods I can study?
**A:** Yes, many modders release their source files. Check Nexus Mods for mods with source files included.

## Still Need Help?

- Check the full README.md
- Read TUTORIALS.md for detailed guides
- Look at example_script.py
- Visit the GitHub issues page
- Ask in Fallout 4 modding communities

---

**Didn't find your question?** Open an issue on GitHub or ask in the modding community forums!
