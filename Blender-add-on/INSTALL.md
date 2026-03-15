# Quick Install

1. Create a zip from this folder **contents** (so `__init__.py` sits at the zip root).
2. In Blender: Edit → Preferences → Add-ons → Install… and pick the zip, then enable "Fallout 4 Tutorial Helper".
3. Set Havok2FBX folder: Preferences → Add-ons → Fallout 4 Tutorial Helper → Havok2FBX Folder, or via the Fallout 4 sidebar → Havok2FBX panel.
4. Optional deps: Hunyuan3D-2 and HY-Motion are optional; warnings are expected if missing. ZoeDepth/Gradio are already present; torch 2.2.2+cpu and numpy 1.26.4 are bundled in the environment.
5. Verify quickly (headless):
   ```
   "D:\Blender Foundation\Blender 4.5.4\blender.exe" -b --factory-startup --python-expr "import sys,importlib.util,pathlib;addon_path=pathlib.Path(r'C:\Users\billy\Blender-add-on');spec=importlib.util.spec_from_file_location('fo4addon', addon_path/'__init__.py', submodule_search_locations=[str(addon_path)]);mod=importlib.util.module_from_spec(spec);sys.modules['fo4addon']=mod;spec.loader.exec_module(mod);mod.register();print('REGISTER_OK');mod.unregister();print('UNREGISTER_OK')"
   ```

Notes
- Havok2FBX status is shown in the Fallout 4 sidebar Export/Havok2FBX panels; configure the folder to remove the not-found warning.
- Optional: Hunyuan3D-2 is cloned at `C:\Users\billy\Hunyuan3D-2` and on the Python path. HY-Motion has been disabled (path file removed) to avoid dependency churn; if you need it, install in a separate venv and add its path manually.
- If you see optional dependency warnings, they are informational unless you need those features.
