# Generating Previsbines for inclusion in an existing Mod

Total views
3.5k

## Creating Precombine/Previs for a Mod

I have mentioned elsewhere that I think it is a better idea to create a seperate Previsbine Patch for your Mod, as it allows you to create multiple versions for different environments (i.e. those using PRP and those not), and is generally includes less Cells (so less conflicts), but you may want to include Previs in your actual Mod.

As you cannot rename precombine files after creating them (Clean), you will need to use your actual Mod name in the CreationKit previsbine build process.
Note - if you are building for xbox however,  then you must build "Filtered" - and these previsbines can be put in any mod (so simpler to merge).

You have 2 choices here - build precombines from a seed and them merge these back into your original mod (prefered method), or
"Prepare" your existing mod and feed it directly into the CK (risky).

---

## "Merge Seed" method (recommended)

### Clean your original Mod:
Follow the procedure listed below if your mod already has Previsbines (How to remove existing Previsbines...) - but basically:

1) Remove the Precombine/Previs files (Data\vis and Data\Meshes\Precombined directories) from the mod's <modname> - Main.ba2 archive.
2) Revert all the CELL records (only VISI, PCMB, XPRI, XCRI fields) in your mod to the current Fallout4/DLC values (ignore PRP).
    the Included script FO4RemovePrecombines.pas can do this - load JUST your mod in xEdit, then run this script against it.
3) Run xEdit quickAutoClean (-qac) against the mod to remove any ITM's now created.

### Build new Previsbines from the Cleaned Mod:

1) Rename the Mod (and all it's archives) - to say <modname>_prepatch (dont uses spaces or "-" in the name)
2) Load just this renamed mod (and PRP if you want to build against it - then your mod MUST  be lower/after PRP) into xEdit.
3) Select your renamed mod in xedit, right click, select "Apply script...", and choose FO4Check_Previsbines.pas.
4) Select the "Create Seed to Rebuild Previs in selected Plugin(s) to improve FPS" (or later) option and click "OK".
5) Review the resulting log, resolve any "Issue" messages, and rerun until you are happy.
6) Now run the GeneratePrevisbines.bat script, use your original <modname> as the patch name, and confirm using xPrevisPatch.esp to create it.
7) WAIT! It could take hours. Fix crashes/rerun the script until you have successfully created Precombines & Previs.
8) Load the resulting Patch (<modname>) only in xedit (it will also load your original renamed mod <modname>_prepatch and other masters)
9) [Optional] Select the patch (<modname>), right click, select "Apply script...", and choose FO4CheckPrevisbineAssets.pas to verify the build was a success.
10) [Optional] Select the patch (<modname>), right click, select "Apply script...", and choose FO4CleanPrevisPatchMasters.pas to remove unnecessary masters.
11) Save and exit.

### Merge the Previsbine changes back into your original Mod:

Via script:
1) Load the resulting Patch (<modname>) only in xedit (it will also load your original renamed mod and other masters)
2) Select the patch (<modname>) AND the Original Renamed Mod (<modname>_prepatch) via CTRL Click, right click and "Apply script...", choose FO4MergePrevisPatchIntoMaster.pas.
3) Once complete, Save and exit.

Or Manually:

Spoiler:  Show

1) In your original (renamed) Mod, right click it's name and select "Add Masters...". Tick all the masters that are in the patch mod.
2) Select the original mod name again and click "Sort Masters". Make sure it has the same master list as the Patch. Exit xEdit saving the changes.
3) Now you need to copy every CELL/WRLD record in the patch back into your original (renamed) mod with "override". Load (just) your patch mod in xEdit.
4) Right-click the top level Cell field of the patch (if it has one) , choose "Deep copy as override (with overwriting) into..." and select your renamed original Mod.
5) Do the same for the "Worldspace" field of the Patch Mod (if it has one). Save and exit xEdit.

NOTE: When you merge the previsbine Cell info manually you may get Validation errors with "records disabling previsbines".
To fix those, Load just your mod into xEdit. Find the override of each of the reported records in your mod and revert their VCI1 timestamp to be the same as their previous override using my script "Copy_version_control_info_from_another_plugin_Redux.pas" run against that override to do this.

Why does this happen? Bethesda compares the VCI1 of LAND/REFR overrides to the PCMB for that Cell (even though LAND changes only effect Previs not
precombines). Blank/later VCI1 values need to be hacked so the VCI1 is <= the PCMB of that cell.
If you don't do this, and your mod's overrides are last in someone's load order, those cells will have disabled Precombines/previs.
Even Bethesda's own DLC's have this issue. Look at Cells 000083B1, 0000DF75, 0000DF34, 0000DF33 - all broken by LAND overrides in the DLCs.

### Merge Previsbine files into Archive:

1) Using the tool of your choice (BSArch, Archive2, etc) Extract all the files in the patch <modname> - Main.ba2 back to under your games 'Data' directory.
2) Rename any directory under data/vis, and data/meshes/Precombined, that matches the renamed mod (<modname>_prepatch.esp) to <modname>.esp
3) Merge the vis and Meshes/Precombined directories back into renamed Mods archive (<modname>_prepatch - Main.ba2). Create it if it doesn't have one.
4) Rename/delete the Patch Mod's esp and archives, and rename your original mod's files back to their correct name (<modname>*.*).
5) [optional] Validate this mod by loading just it into xEdit and run FO4Check_Previsbines.pas against it, select "Process selected Plugins only".
6) Done!

You should have the original <Modname>.esp (with updated CELL data), a <modname> - Main.ba2 (containing new Vis and Precombine files), the original <modname> - textures.ba2 (if it had one), <modname>.cdx, and <modname> - Geometry.csg files as your new mod with Precombines!

### Using BSArchPro (found in xEdit directory) for step 3 above:

Spoiler:  Show

1) Open the renamed mod's archive  (<modname>_prepatch - Main.ba2). with BSArchPro.exe, and drag the Vis and Meshes/Precombined into its Files screen.
2) Click "Pack", select "Fallout 4", and save the resulting archive somewhere.
3) Copy that archive back over the top of (replace) the orginal Archive (<modname> - Main.ba2) in the Data directory (saves renaming it in step 4).

---

## "Merge Seed" method (using Filtered previsbines - say for xbox)

This is simpler as you don't need to rename the original mod.

Spoiler:  Show

1) Clean the mod as described above.
2) DONT rename the mod, but build a normal patch as described above (calling it something like OriginalModnamePrevis.esp)
3) MAKE SURE you use the "xbox" or "Filtered" parameter when you run GeneratePrevisbines.bat
4) Merge the Previsbine Cell changes back into your original mod, via FO4MergePrevisPatchIntoMaster.pas, as above
5) Extract the Previsbine files from the patch's archive into the original Mod's "- Main.ba2" (or just rename the Patch's archive if it didn't have one).
6) [optional] Validate the resulting Mod as using FO4Check_Previsbines as above.
7) Done!

---

## "Building with your original Mod" Method (not recommended)

Spoiler:  Show
To use your actual mod to build precombines you must:

### 1) Preparing your Mod for Precombines:

The CreationKit has a number of flaws requiring you to prepare your Mod before generating Precombines from it. If you do not do this the resulting mod will have issues.

1) All Cells in your Mod, that have at least one REFR or LAND record (excluding the exterior Persistent Cell), need to have their XCRI and XPRI fields cleared.  Deleting the VISI and PCMB field is optional as these will be replaced anyway, however, DO NOT delete fields on Cells that won't get new precombines and/or Previs.

Why?

Spoiler:  Show

These Cells will get new Precombines. If the CK does not create any Precombines then it will not update these fields (so they will contain the old/incorrect Precombine details).

2) All Precombine Meshes and Physics files for those cells need to be removed from your Mod's Archive. Don't leave loose files in Data\Meshes\Precombined either.

Why?

Spoiler:  Show

It will be hard to tell what is new and what is obsolete otherwise, so your Archive size will be bigger than necessary.

3) All Exterior Clusters, that have at least one Cell getting new Precombines, need to have the XPRI field cleared on all their member Cells. If such a Cluster member is NOT in your mod (and doesn't have a blank XPRI) then you need to create an ITM for it so you can clear the XPRI.

Why?

Spoiler:  Show

These Clusters will get new Previs, but the CK will not clear this field if it does not generate any XPRI data (leaving the old Data). Any reference in the XPRI that is not in the Cluster Previs will become invisible in-game.

4) All Exterior Clusters (or Interior Cells) with new precombines need to have their previs file (CellID.uvd) removed from your Mod's Archive. Don't leave loose files in Data\vis either.

Why?

Spoiler:  Show

These will be getting new Previs files, and sometimes the CK failes to generate such a Previs file. It is better to be missing that Previs file
(which will just disable Previs) rather than having a wrong (old) one - which will cause occlusion issues.

5) Any Exterior Cells that will be getting new Previs should be present in your Mod (even as an ITM). If they are still ITM when you have completed building you previs then you can always remove them via FO4Edit QuickAutoClean.

Why?

Spoiler:  Show

The CK will create ITM's of these Cells anyway, but it often gets the Masters wrong if the Cell it is copying has a different master list to your Mod (i.e. not all the DLC's are in your Master List). This results in broken ID's in the copied Cell - particularly in the XPRI field.

6) Any references (of base type STAT), in a Cell getting new Precombines, that has a Material Swap on it's Base object (Model/MODS), but NOT on the Reference (XMSP),  needs to have an ITM created of that reference with that Material Swap.

Why?

Spoiler:  Show

The CK ignores the Material swap on the Base Object when building Precombines, so those references will revert to the texture built into the Mesh itself (rather than what was specified in the Material Swap). This commonly manifests as buildings being the wrong colour.

7) Also, any references with Alpha Blending XALP (example - weathered Pictures on Walls) need to be excluded from Precombines by creating an ITM of them and adding a Location Ref Type of NoPrecombineRefType.

Why?

Spoiler:  Show

The CK ignores Alpha Blend so will precombine these objects at full Alpha. They will look either pristine or blank (depending on how they were set up).

8) Make sure your Mod has all the Masters it requires in it's Masters List. For instance, If you building "PRP compatible" Previsbines then make sure PRP.esp is a Master.

Why?

Spoiler:  Show

When the CK runs to create Precombines/Previs it will only load those plugines in your Mod's Masters List. If some of your Precombines will use Static meshes from another Mod (say one that overrides a Mesh) then your Precombines will use the wrong mesh because the CK did not see that override.

There is currently no script which will do all this for you (I am considering it), except for step 3 which you can find a script called "Apply Material Swap.pas". Be careful, as the one called "50_FixMaterialSwap.pas" does nothing.

### 2) Building Your Precombines/Previs:

Once you have prepared you Mod you can feed it into any "Previsbine builder" Command script to generate Precombines/Previs.
Just be careful that the script will handle merging the generated Precombines/previs into your existing Archive (if your mod has one).
Currently my script (GeneratePrevisbines.bat) does NOT support this (and will exit saying "Mod has existing Archive").

### 3) To build your Previsbines manually you need to do the following:

1) Clean your Mod as instructed above.
2) Generate Precombines via the command "<creationkit> -GeneratePrecombined:<your mod name>.esp Clean All".
Replace <Creationkit> with your creationkit exe path (or the CKPE/CKfixes loader as the CK does not like ENB or any mods that replace d3d11.dll).
3) Merge "CombinedObjects.esp" into your Mod via FO4Edit script (see Note 1)
4) Move the Precombine meshes under Data\Meshes\Precombined\* into your Mod's archive ("<your mod name> - Main.ba2"), and delete those files.
5) Compress the PSG file via the CK command "<creationkit> -CompressPSG:<your mod name>.esp"
6) Build the CDX file via the CK command "<creationkit> -BuildCDX:<your mod name>.esp"
7) Generate Previs via the CK command "<creationkit> -GeneratePreVisData:<your mod name>.esp Clean All"
8) Merge "Previs.esp" into your Mod via a FO4Edit Script (see note 2, 3)
9) Move all the Previs files under Data\vis\* into your Mod's Archive ("<your mod name> - Main.ba2"), and delete those files.
10) Delete the following files from your Data directory - Previs.esp, CombinedObjects.esp, "<your Mod name>  - Geometry.psg".
11) (Re)Package up your Mod files (<mod name>.esp, <mod name>.cdx, "<mod name> - Geometry.csg", "<mod name> - Main.ba2", and "<mod name> - Textures.ba2") and install in your Mod manager as normal.

Note 1: The old version of this script was "03_MergeCombinedObjects.pas". This has problems with some edge cases so I would recommend my version
FO4MergeCombinedObjectsAndCheck.pas. Either way you need to bring Up FO4Edit, clear the mod list except for "CombinedObjects.pas" (which will load your Mod and it's Masters too), right click ON YOUR MOD and choose "Run Script..." to run your script of choice.

Note 2: The old version of this script was "05_MergePreVis.pas". This also has issues so I recommend my version FO4MergePreVisandCleanRefr.pas. Bring up FO4Edit, clear the Mod list except for "Previs.esp" (again your Mod and it's masters will also be loaded), right click ON YOUR MOD and choose "Run Script..." to run your script of choice.

Note 3: Once you have finished building Precombines/Previs for you mod you should probably remove any ITM records you added to make it work properly.
 i.e. ITM of References to exclude them from Precombines, or for Material Swap purposes. My script will remove such reference overrides if they have an EditorID starting "PleaseRemove". Consider this when adding them.

---

## How to remove existing Previsbines from a mod (e.g. so new ones can be added)

Spoiler:  Show

1) Load only the mod to be cleaned into xEdit (it's masters will automatically be loaded as well).
2) Revert all the CELL records (only VISI, PCMB, XPRI, XCRI fields) in your mod to the current Fallout4/DLC values (ignore PRP).
    Included script FO4RemovePrecombines.pas can do this - just right-click on your mod, then run this script against it.
3) save and exit.
4) Now you can do QuickAutoClean (Fo4edit -qac) of the mod to get rid of any ITM Cells (Cells without REFRs etc).
5) Delete all  the Meshes\Precombined\* and vis\* files from the mod's "modname - Main.ba2" archive.

---

Updated: PJM Feb 2025 (Merge precombine files part was wrong)

---

## References

- See [PJM_PRECOMBINE_PREVIS_PATCHING_SCRIPTS.md](PJM_PRECOMBINE_PREVIS_PATCHING_SCRIPTS.md) for setup, tooling, and patch workflows.
- See [PRECOMBINE_PREVIS_DEEP_DIVE.md](PRECOMBINE_PREVIS_DEEP_DIVE.md) for fundamentals and CK crash guidance.
- See [CREATING_LIGHTING_ENVIRONMENT_PATCHES.md](CREATING_LIGHTING_ENVIRONMENT_PATCHES.md) for handling CELL-config conflicts without breaking Previs.

---

## Acknowledgements

- PJM: Author of the recommended “merge seed” workflow and helper scripts.
- xEdit/FO4Edit team: Essential APIs for merging and validation.
- CKPE maintainers: Enabling stable CK automation.
- PRP contributors: DoubleYou, Glitchfinder, Exoclyps, Vozhou, Emiral, CrunchyBiscuit007.
- Archive tools (BSArch/Archive2): Reliable asset packaging for previsbines.
