# Bundled Dependencies

## PyNifly (io_scene_nifly) — V27.0.0

**Author:** BadDog (BadDogSkyrim)  
**Repository:** https://github.com/BadDogSkyrim/PyNifly  
**License:** MIT  

PyNifly is the primary NIF import/export addon for Blender, supporting Fallout 4,
Skyrim, and other Bethesda games.  It is bundled here with the kind permission of
BadDog (BadDogSkyrim).  Full credit goes to BadDog for this excellent tool.

The bundled zip (`io_scene_nifly_V27.0.0.zip`) is installed automatically into
Blender when the Mossy FO4 addon loads for the first time.  It is not modified in
any way from the original release.

See also: `CONTRIBUTORS.md` in the addon root for full attribution.

---

## PyMeshLab — on-demand install

**Authors:** Alessandro Muntoni and the VCLab team at ISTI-CNR  
**Repository:** https://github.com/cnr-isti-vclab/PyMeshLab  
**License:** GPL-3.0  
**PyPI:** https://pypi.org/project/pymeshlab/

Built on MeshLab:
> P. Cignoni, M. Callieri, M. Corsini, M. Dellepiane, F. Ganovelli, G. Ranzuglia  
> "MeshLab: an Open-Source Mesh Processing Tool"  
> Sixth Eurographics Italian Chapter Conference, pp. 129–136, 2008

PyMeshLab is **not bundled** (compiled C-extension wheels are ~80 MB and
platform-specific).  It is installed on demand via `pip` into
`<addon>/lib/ml/` the first time the user clicks **Install PyMeshLab** in the
FO4 Tools → Mesh Tools panel.  No modification is made to the PyMeshLab source.
