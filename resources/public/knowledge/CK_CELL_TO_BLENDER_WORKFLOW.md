# Creation Kit Cell → Blender → Fallout 4 Roundtrip Workflow

> **Mossy authoritative guide for the full CK cell export, Blender edit, and re-import pipeline.**
> Covers mesh extraction, reference position export, PyNifly import/export, NifSkope verification, and CK re-integration.

---

## Is It Possible?

**Yes.** The community has a working roundtrip for Fallout 4 cells using:
- **PyNifly** (Blender NIF import/export add-on — the modern standard)
- **F4RefToBlender** (GitHub: 6ooflames/F4RefToBlender — reconstructs full cell layouts in Blender from xEdit reference data)
- **BAE / Archive2** (asset extraction from BA2 archives)
- **xEdit** (extract REFR position/rotation/scale data from cells)
- **NifSkope** (verify exported NIFs before putting them back)

There is **no single-click roundtrip** for an entire cell — it is a scripted, multi-step workflow. Static objects (STAT, SCOL) work best. Dynamic objects (DOOR, ACTI, CONT) require extra work.

---

## Required Tools

| Tool | Where to Get | Purpose |
|---|---|---|
| **PyNifly 25.8** | Nexus #52319 / github.com/BadDogSkyrim/PyNifly | Blender NIF import/export (Blender Extensions) |
| **Blender 4.4+** | blender.org | Required for PyNifly 25+ Extensions system |
| **BAE (Bethesda Archive Extractor)** | Nexus search | Extract NIF/texture assets from BA2 |
| **xEdit 4.0.3+** | tes5edit.github.io | Extract REFR cell data |
| **NifSkope 2.0** | GitHub: hexabitz/nifskope | Verify exported NIFs |
| **F4RefToBlender** (optional) | github.com/6ooflames/F4RefToBlender | Auto-reconstruct cell in Blender |
| **Mossy cell_import_from_fo4.py** | scripts/blender/ (this app) | Import REFR JSON into Blender |

---

## Part 1 — Export Cell Data From Creation Kit / xEdit

### Step 1A: Extract Mesh Assets (BA2 → Loose Files)

The NIF files for vanilla statics are packed inside `Fallout4 - Meshes.ba2`. You must extract them before Blender can see them.

```
1. Open BAE (Bethesda Archive Extractor)
2. Open: <GameDir>\Data\Fallout4 - Meshes.ba2
3. Extract all to: <YourModProject>\Assets\Meshes\
```

For textures:
```
Open: Fallout4 - Textures1.ba2 through Fallout4 - Textures9.ba2
Extract to: <YourModProject>\Assets\Textures\
```

For mod-added assets that are already loose (in MO2/Vortex virtual filesystem): copy them directly from the mod's Meshes\ folder.

### Step 1B: Export REFR Data From xEdit

This gives you the list of every object placed in the cell with its position, rotation, and scale.

```
1. Open xEdit with your plugin (and all masters)
2. Expand your plugin → Worldspace (or Cell) → [Your Cell]
3. Right-click the cell → Apply Script
4. Run: "Export Cell References to JSON" (see Mossy's xEdit script below)
5. Save the output JSON to: <YourModProject>\cell_refs.json
```

**Mossy-provided xEdit Pascal script** (paste into xEdit's Edit Scripts folder as `ExportCellRefsToJSON.pas`):

```pascal
unit ExportCellRefsToJSON;

interface

implementation

uses xEditAPI, SysUtils, Classes;

function Initialize: integer;
begin
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  sl: TStringList;
  i: integer;
  ref, base: IInterface;
  edid, modelPath: string;
  posX, posY, posZ, rotX, rotY, rotZ, scale: string;
  outputPath: string;
begin
  Result := 0;
  if Signature(e) <> 'CELL' then Exit;

  sl := TStringList.Create;
  try
    sl.Add('[');
    for i := 0 to Pred(ChildCount(e)) do begin
      ref := ChildByIndex(e, i);
      if Signature(ref) <> 'REFR' then Continue;

      base := LinksTo(ElementBySignature(ref, 'NAME'));
      if not Assigned(base) then Continue;

      edid      := GetElementEditValues(base, 'EDID');
      modelPath := GetElementEditValues(base, 'Model\MODL');
      posX      := GetElementEditValues(ref, 'DATA\Position\X');
      posY      := GetElementEditValues(ref, 'DATA\Position\Y');
      posZ      := GetElementEditValues(ref, 'DATA\Position\Z');
      rotX      := GetElementEditValues(ref, 'DATA\Rotation\X');
      rotY      := GetElementEditValues(ref, 'DATA\Rotation\Y');
      rotZ      := GetElementEditValues(ref, 'DATA\Rotation\Z');
      scale     := GetElementEditValues(ref, 'XSCL');
      if scale = '' then scale := '1.0';

      sl.Add('  {');
      sl.Add('    "editorID": "' + edid + '",');
      sl.Add('    "model": "' + StringReplace(modelPath, '\', '\\', [rfReplaceAll]) + '",');
      sl.Add('    "pos": [' + posX + ', ' + posY + ', ' + posZ + '],');
      sl.Add('    "rot": [' + rotX + ', ' + rotY + ', ' + rotZ + '],');
      sl.Add('    "scale": ' + scale);
      sl.Add('  },');
    end;
    sl.Add(']');

    outputPath := ProgramPath + 'cell_refs.json';
    sl.SaveToFile(outputPath);
    AddMessage('Exported ' + IntToStr(sl.Count) + ' refs to: ' + outputPath);
  finally
    sl.Free;
  end;
end;

function Finalize: integer;
begin
  Result := 0;
end;

end.
```

---

## Part 2 — Import Into Blender

### Step 2A: Install PyNifly 25 in Blender 4.4+

```
1. Download PyNifly 25.8 from Nexus #52319 or github.com/BadDogSkyrim/PyNifly/releases
2. Blender 4.4+ uses the Extensions system:
   Edit → Preferences → Extensions → "Install from Disk" → select the PyNifly .zip
3. Enable the extension. You should now see:
   File → Import → NIF (PyNifly)
   File → Export → NIF (PyNifly)
   
Note: PyNifly 25 also supports TRI morph files (body morphs, head parts)
and full MOPP collision round-tripping — new in v25.7+.
```

### Step 2B: Import the Cell Reference Layout (Mossy Script)

Mossy includes `scripts/blender/cell_import_from_fo4.py`. Run it in Blender's Scripting workspace:

```python
# In Blender Scripting tab, open cell_import_from_fo4.py
# Set the two variables at the top:
CELL_JSON_PATH = r"C:\YourModProject\cell_refs.json"
ASSETS_ROOT    = r"C:\YourModProject\Assets"
# Then click Run Script
```

This imports every NIF from the JSON, positions and rotates it exactly as it is in the game cell, and names each object by its EditorID.

### Step 2C: Manual NIF Import (Single Object)

For individual NIFs without the helper script:

```
File → Import → NIF (PyNifly)
→ Browse to the extracted NIF file
→ Ensure "Game Type" is set to "FO4" in the import options
→ Import
```

---

## Part 3 — Edit in Blender

### What You Can Change
- Vertex positions, geometry, UV maps
- Material assignments (PyNifly will write BSLightingShaderProperty data on export)
- Collision meshes (prefix with `bhkConvexVerticesShape` or `bhkBoxShape` naming for PyNifly)
- New static objects composited from multiple NIFs

### What Requires Care
- **Do not break UV seams** — Fallout 4 uses UV-based LOD blending
- **Apply all transforms** (`Ctrl+A → All Transforms`) before export — PyNifly needs clean transforms
- **Keep face normals consistent** — flip normals cause black surfaces in-game
- **Scale**: Scene should be set to `1.0 unit = 1 unit` (Mossy's FO4 setup script enforces this)
- **Don't remove the root NiNode** — PyNifly needs the hierarchy intact

### FO4 Scene Standards (enforce before exporting)
```
Scale:   1.0 (Metric, centimeters)
FPS:     30
Normals: Face normals outward
LOD:     Keep _lod0, _lod1, _lod2 meshes separate if present
```

Mossy's `f4_setup.py` and the Tutorial Helper panel enforce these automatically.

---

## Part 4 — Export Back to NIF (PyNifly)

### Export a Single Object
```
1. Select the mesh object(s) in Blender
2. File → Export → NetImmerse/Gamebryo (.nif)
3. Set Game: Fallout 4
4. Output path: <YourModProject>\Data\Meshes\<YourMod>\<ObjectName>.nif
5. Export
```

### Export Settings Checklist
- ✅ Game: `Fallout 4`
- ✅ Scale: `1.0`
- ✅ Apply Modifiers: `On`
- ✅ Export Collision: `On` (if you have bhk* collision objects)
- ✅ Max Bones Per Partition: `80` (for skinned meshes; leave default for statics)

### Verify in NifSkope
Before putting the NIF back in the game, always open it in NifSkope and check:
1. **BSTriShape** nodes exist at the expected hierarchy level
2. **Shader flags** are correct (`SLSF1_Specular`, `SLSF2_ZBuffer_Test` at minimum for statics)
3. **Texture paths** are relative (e.g., `textures/YourMod/foo_d.dds`) — never absolute
4. **Collision**: If you have collision, verify `bhkCollisionObject` is present under the root NiNode
5. **Bounding sphere**: Right-click root → Spell → Mesh → Update Bounds

---

## Part 5 — Re-Import to Creation Kit

### For Modified Static Objects
```
1. Copy your exported NIF to: <GameDir>\Data\Meshes\<YourMod>\<ObjectName>.nif
2. Open CK with your plugin
3. Object Window → Static → find the original record
4. Edit → change Model path to your new NIF
5. Save the plugin
6. If the NIF replaces a vanilla static: test that the new mesh lines up with navmesh
```

### For New Objects From a Cell Reconstruction
```
1. Create a new STAT record in CK → set Model to your new NIF
2. Place it in the cell using CK's reference editor
3. Use the position/rotation values from your cell_refs.json as a reference
   to match the original placement exactly
4. Run navmesh check (CK → Navmesh → Find Navmesh Errors) if you moved geometry
5. Regenerate Previs/Precombines if you changed static positions in an exterior cell
```

### Precombine / Previs After Cell Changes
If you moved, added, or removed static references in an exterior cell, you **must** regenerate precombines or install PRP 81.5+ with a compatibility patch. Failing to do this causes visual artifacts (floating or missing geometry) and performance degradation.

```
Quick option: Install PRP 81.5 and create a PRP compatibility patch for your mod
Full option: Regenerate PreCombines and PreVis in CK (slow but exact)
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| NIF imports but appears invisible in-game | Missing or absolute texture path | Open in NifSkope → check BSLightingShaderProperty texture slots → make paths relative |
| Mesh appears black in CK / in-game | Missing shader flags or wrong BSShaderType | In NifSkope: BSLightingShaderProperty → set Shader Type to `Default`, enable `SLSF2_ZBuffer_Test` |
| Collision missing after export | bhk* objects not named correctly or not selected | Use PyNifly naming conventions for collision; select collision objects along with mesh on export |
| CTD after placing new NIF | Node hierarchy broken or missing bounds | Verify root is `NiNode`, run Update Bounds in NifSkope, check BSX flags |
| Objects not lining up with navmesh | Scale mismatch (1 game unit ≠ 1 Blender unit) | Ensure scene scale is 1.0 before export; check PyNifly export scale setting |
| Creation Kit crashes opening NIF | Unsupported NIF version or corrupt block | Re-export from Blender; open in NifSkope and check for unknown block types |
| F4RefToBlender positions are wrong | Coordinate system mismatch | FO4 uses Z-up; Blender uses Z-up too — but rotation offsets by 90° on X may be needed |

---

## Community Resources

| Resource | Link |
|---|---|
| PyNifly 25.8 GitHub | github.com/BadDogSkyrim/PyNifly |
| PyNifly 25.8 Nexus | nexusmods.com/fallout4/mods/52319 — requires Blender 4.4+ |
| F4RefToBlender | github.com/6ooflames/F4RefToBlender |
| NifSkope GitHub | github.com/hexabitz/nifskope |
| YouTube: Blender → FO4 NIF (constructible objects) | youtube.com/watch?v=UMZMUY08znQ |
| Steam Guide: Settlement border meshes workflow | steamcommunity.com/sharedfiles/filedetails/?id=2916458232 |
| PRP 81.5 (Nexus #46403) | nexusmods.com/fallout4/mods/46403 |

---

*Last updated: March 2026.*
