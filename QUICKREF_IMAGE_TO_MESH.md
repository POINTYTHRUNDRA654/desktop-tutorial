# Quick Reference: Image to Mesh

## Installation (One-Time Setup)

Install required Python packages in Blender's Python environment:

### Windows
```bash
cd "C:\Program Files\Blender Foundation\Blender 3.6\3.6\python\bin"
python.exe -m pip install Pillow numpy
```

### macOS
```bash
cd /Applications/Blender.app/Contents/Resources/3.6/python/bin
./python3.10 -m pip install Pillow numpy
```

### Linux
```bash
cd /usr/share/blender/3.6/python/bin
./python3.10 -m pip install Pillow numpy
```

Note: Adjust version numbers to match your Blender installation.

## Quick Start

### Method 1: Image to Mesh
1. Press `N` to open sidebar
2. Go to "Fallout 4" tab
3. Expand "Image to Mesh" panel
4. Click "Image to Mesh (Height Map)"
5. Select your height map image
6. Adjust parameters if needed
7. Done! Your mesh is created

### Method 2: Displacement Map
1. Select an existing mesh
2. Go to "Image to Mesh" panel
3. Click "Apply Displacement Map"
4. Select your displacement image
5. Adjust strength
6. Done! Displacement applied

## Best Free Resources

### Get Height Maps:
- **terrain.party** - Real-world terrain (FREE)
- **polyhaven.com** - PBR textures with height maps (FREE)
- **cgbookcase.com** - Free PBR textures (FREE)

### Edit Height Maps:
- **GIMP** - gimp.org (FREE)
- **Blender** - Built-in texture painting (FREE)

## Tips

✓ Use grayscale images (bright = high, dark = low)
✓ Square images work best (512x512, 1024x1024)
✓ Higher contrast = more dramatic terrain
✓ Start with lower resolution to test

## Common Issues

**"PIL/Pillow not installed"**
→ Run the installation command above

**"Mesh looks flat"**
→ Increase "Displacement Strength"

**"Too many polygons"**
→ Reduce "Subdivisions" or use smaller image

**"Unsupported format"**
→ Use PNG, JPG, BMP, TIFF, or TGA

## Workflow Example

```python
# In Blender's Python console or script:
import bpy

# Create mesh from height map
bpy.ops.fo4.image_to_mesh(filepath="/path/to/terrain.png")

# Optimize for Fallout 4
bpy.ops.fo4.optimize_mesh()

# Validate
bpy.ops.fo4.validate_mesh()

# Export
bpy.ops.fo4.export_mesh(filepath="/path/to/output.nif")
```

## Parameters Explained

### Image to Mesh
- **Mesh Width**: Physical width in Blender units (default: 2.0)
- **Mesh Height**: Physical height in Blender units (default: 2.0)
- **Displacement Strength**: How much height affects Z-axis (default: 0.5)
- **Subdivisions**: Mesh resolution, 0=auto (default: 0, max: 256)

### Displacement Map
- **Strength**: Displacement intensity (default: 0.5)

## Supported Formats

✓ PNG - Best for lossless height maps
✓ JPG/JPEG - Good for photos
✓ BMP - Uncompressed format
✓ TIFF/TIF - Professional format
✓ TGA - Game development standard

## More Help

- See **TUTORIALS.md** for detailed walkthrough
- See **API_REFERENCE.md** for scripting
- See **example_image_to_mesh.py** for code examples
- See **README.md** for full documentation

---

**Quick Links:**
- GIMP: https://www.gimp.org/
- terrain.party: http://terrain.party/
- Poly Haven: https://polyhaven.com/
- CG Bookcase: https://www.cgbookcase.com/
- 3D Textures: https://3dtextures.me/
