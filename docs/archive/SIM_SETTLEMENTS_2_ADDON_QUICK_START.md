# Sim Settlements 2 Addon Creator Quick Start

**Learn to create content in 30 minutes**

## What You'll Create

- Building skins (recolored buildings)
- Simple buildings
- City plans from your designs
- HQ room variations
- Much more!

---

## Install Tools (15 minutes)

### Step 1: Creation Kit
1. Steam Store → Search "Fallout 4: Creation Kit"
2. Free "purchase" and install (same Steam folder as FO4)
3. Launch and let it unpack scripts
4. Close, then edit `CreationKitCustom.ini` in Fallout 4 folder:
   ```
   [General]
   bAllowMultipleEditors=1
   bAllowMultipleMasterLoads=1
   ```

### Step 2: XEdit
1. Download [FO4Edit from Nexus](https://www.nexusmods.com/fallout4/mods/2737)
2. Extract to own folder
3. Download [Addon Maker's Toolkit](https://www.nexusmods.com/fallout4/mods/68620)
4. Copy XEdit scripts to FO4Edit's "Edit Scripts" folder

### Step 3: Nifskope
1. Download [Nifskope 2 Dev 7](https://github.com/niftools/nifskope)
2. Extract 7z file to folder
3. Open Nifskope → Options → Settings
4. Resources tab: Add Fallout 4 data folders (for textures)
5. Archives tab: Click Auto Detect Archives
6. Click Apply and Save

### Step 4: Optional but Helpful
- Open Office Calc (free Excel alternative) - [Download](https://www.openoffice.org)
- Addon Maker's Toolkit (already downloaded above)

✅ **All setup complete!**

---

## Your First Addon (15 minutes)

### Fastest Path: Building Skin

**Time:** 30 minutes

1. **Open Creation Kit**
   - File → Data Files → Check "Sim Settlements 2 - All Chapters Pack.esm"
   - Click OK

2. **Find a Building**
   - Object Window → Filter: `ss2*ind*build`
   - Expand WorldObjects → Click Static
   - Find: `SS2_Industrial2x2_BuildingMaterials01_L1`

3. **Recolor It**
   - Right-click → Duplicate
   - Double-click the copy
   - Change ID to: `yourPrefix_BuildingMaterials01_SkinTest_L1`
   - Click "Edit" button next to Model field
   - Material Swap dropdown → Select `kgSIM_WH_ShackWoodPlanks_Gold`
   - Click OK twice
   - Answer "No" to new form, "Yes" to rename

4. **Create Skin Form**
   - Object Window → Filter: `SS2_Template_BuildingSkin`
   - Expand Items → Click Weapon
   - Right-click `SS2_Template_BuildingSkin` → Duplicate
   - Double-click copy
   - Change ID to: `yourPrefix_BuildingSkin_BuildingMaterials01_Gold`
   - Change Name to: `Gold Paintjob by Your Name`
   - Click OK, answer No/Yes

5. **Register with SS2**
   - Object Window → Filter: `SS2_SkinList_Industrial_2x2_AddonTemplate`
   - Expand Items → Click Weapon
   - Right-click → Duplicate
   - Double-click copy
   - Change ID to: `yourPrefix_SkinList_Industrial_2x2`
   - Drag your skin form into the white area
   - Click OK, answer No/Yes

6. **Create Config**
   - Object Window → Filter: `SS2_Template_AddonConfig`
   - Expand Items → Click Weapon
   - Right-click → Duplicate
   - Double-click copy
   - Change ID to: `yourPrefix_AddonConfig`
   - Double-click Scripts section entry
   - Double-click MyItems property
   - Click Add, find your formlist
   - Click OK

7. **Create Quest**
   - Object Window → Filter: `SS2_AddonTemplate`
   - Expand Characters → Click Quest
   - Right-click → Duplicate
   - Double-click copy
   - Change ID to: `yourPrefix_Addon`
   - Go to Scripts tab
   - Double-click the script entry
   - Double-click MyAddonConfig property
   - Find your addon config
   - Click OK

8. **Save**
   - File → Save
   - Name it: `SS2_Addon_YourName`

9. **Test In-Game**
   - Install mod with your mod manager
   - Load game, build 2x2 Industrial plot
   - Use holotape → Change Building Skin
   - Select your new skin
   - Should see gold recolored building!

**Congratulations! You made your first addon!**

---

## Next Steps

| What | Time | Guide |
|------|------|-------|
| **Create full buildings** | 2-4 hours | "Your First Building Model" |
| **Add decorations** | 2-3 hours | "Decorating Your Buildings" |
| **Multi-level buildings** | 2-4 hours | "Supporting Upgrades" |
| **Design city plans** | 2-4 hours | "Your First City Plan" |
| **Create HQ content** | 2-3 hours | "Your First Room Design" |
| **Release addon** | 1-2 hours | "Making a Building Pack" |

---

## Essential Tips

✨ **Test Frequently** - Get content in-game as often as possible

✨ **Start Small** - Simple skins → buildings → city plans

✨ **Use Spreadsheets** - Import tool saves hours of manual work

✨ **Ask for Help** - Join Discord for real-time support

✨ **Iterate Quickly** - Small changes keep motivation high

✨ **Share Early** - Get feedback before final release

---

## Common Issues Quick Fix

| Problem | Solution |
|---------|----------|
| **Can't find mod in load order** | Check plugins.txt, restart mod manager |
| **Weapon records won't open** | Make sure SS2 is loaded in Creation Kit |
| **Export file not found** | Close Creation Kit before using import tool |
| **Building doesn't appear in-game** | Verify addon config points to correct formlist |
| **Duplicate ID error** | Use unique prefix for all your forms |

---

## Tools Checklist

- [ ] Creation Kit installed
- [ ] CreationKitCustom.ini configured  
- [ ] FO4Edit extracted
- [ ] XEdit scripts copied to Edit Scripts folder
- [ ] Nifskope extracted
- [ ] Nifskope textures configured
- [ ] Addon Maker's Toolkit downloaded
- [ ] (Optional) Open Office Calc installed

---

## Learning Resources

| Resource | Type |
|----------|------|
| [Sim Settlements Forums](https://simsettlements.com/forums) | Official discussion + help |
| [Addon Creator Discord](https://simsettlements.com) | Real-time support |
| [Addon Database](https://simsettlements.com/site) | Browse existing addons |
| Video Tutorials | On official website |
| Companion Guides | With each tutorial |

---

**Ready to create?** Pick the "Your First Addon" guide and follow along!

For detailed guides, see [SIM_SETTLEMENTS_2_ADDON_CREATOR_GUIDE.md](SIM_SETTLEMENTS_2_ADDON_CREATOR_GUIDE.md)
