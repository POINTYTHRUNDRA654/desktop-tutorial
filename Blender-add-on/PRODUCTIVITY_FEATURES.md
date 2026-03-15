# Productivity Features Guide

## Overview

This guide covers the powerful productivity features that help you work faster and smarter with the Fallout 4 add-on.

## 🗂️ Preset Library

### What is it?
The Preset Library allows you to save any creation (meshes, materials, vegetation setups, etc.) and reuse them instantly in future projects.

### How to Use

#### Saving a Preset
1. Select the object(s) you want to save
2. Open **Preset Library** panel
3. Click **"Save Current Objects"**
4. Choose a name, category, and description
5. Add tags for easier searching
6. Click **Save**

Your preset is now stored and can be reused anytime!

#### Loading a Preset
1. Open **Preset Library** panel
2. Browse by category or use search
3. Find your preset in **Recent** or **Most Used**
4. Click the import icon
5. The preset is loaded into your scene!

#### Categories
- **Mesh**: Base meshes and geometry
- **Material**: Material setups
- **Vegetation**: Trees, bushes, grass combinations
- **Weapon**: Weapon templates
- **Armor**: Armor pieces
- **NPC**: NPC configurations
- **Item**: Item presets
- **World**: World building elements
- **Workflow**: Complete multi-step workflows

#### Smart Features
- **Usage Tracking**: See which presets you use most
- **Recent Presets**: Quick access to recently used presets
- **Search**: Find presets by name, description, or tags
- **Category Filtering**: Filter by type

### Use Cases

**Example 1: Weapon Parts Library**
```
1. Create a weapon barrel
2. Save as preset (category: Weapon, tags: "barrel, rifle")
3. Create a grip
4. Save as preset (category: Weapon, tags: "grip, pistol")
5. Later: Load and combine presets to build new weapons faster
```

**Example 2: Vegetation Library**
```
1. Create and scatter 100 trees
2. Combine into optimized mesh
3. Save as preset (category: Vegetation, tags: "forest, pine")
4. Reuse in multiple locations instantly!
```

## 🤖 Automation & Macros

### What is it?
The Automation System records your actions and replays them, automating repetitive tasks. Like having a robot assistant!

### Recording a Macro

1. Open **Automation & Macros** panel
2. Click **"Start Recording"** (red button)
3. Perform your actions (create mesh, apply textures, optimize, etc.)
4. Click **"Stop Recording"**
5. Click **"Save as Macro"**
6. Give it a name and description
7. Done! Your macro is saved

### Executing a Macro

1. Open **Automation & Macros** panel
2. Find your macro in the **Saved Macros** list
3. Click the play button
4. Watch it execute all steps automatically!

### Workflow Templates

Pre-built automation templates for common tasks:

#### Available Templates
- **Complete Weapon**: Create, texture, and export a weapon
- **Vegetation Patch**: Create optimized vegetation area
- **NPC Creation**: Create and setup an NPC
- **Batch Export**: Optimize and export multiple objects

#### Using Templates
1. Open **Automation & Macros** panel
2. Click **"Execute Template"**
3. Choose a template
4. Click OK
5. The entire workflow runs automatically!

### Macro Use Cases

**Example 1: Daily Setup**
```
Macro: "Daily_Setup"
1. Set render settings
2. Create base lighting
3. Setup FO4 export path
4. Create reference grid

Result: 30 seconds of manual work → 2 seconds with macro!
```

**Example 2: Texture Pipeline**
```
Macro: "Texture_Everything"
1. Smart material setup
2. Load diffuse texture
3. Load normal map
4. Load specular map
5. Validate textures

Result: 5 minutes of repetitive work → 5 seconds!
```

**Example 3: Export Prep**
```
Macro: "Export_Ready"
1. Apply scale
2. Optimize mesh
3. Validate mesh
4. Generate collision
5. Create LODs

Result: 10 minutes → 15 seconds!
```

### Recording Tips

✅ **DO:**
- Record logical sequences
- Keep macros focused on one task
- Test macros after recording
- Name macros descriptively

❌ **DON'T:**
- Record random actions
- Include object selections (unless specific to task)
- Record undos/redos
- Create extremely long macros

## 🔌 Add-on Integration

### What is it?
The Add-on Integration system detects other useful Blender add-ons and provides FO4-specific tutorials for using them.

### Detected Add-ons

The system automatically detects these useful add-ons:

#### Blender NIF Plugin
- **What**: Direct NIF import/export
- **FO4 Use**: Export directly to NIF format, study vanilla assets
- **Status**: Shows if installed/enabled
- **Tutorial**: Step-by-step integration guide

#### Rigify
- **What**: Advanced character rigging
- **FO4 Use**: Create complex character rigs for NPCs
- **Status**: Built into Blender
- **Tutorial**: How to rig characters for FO4

#### Loop Tools
- **What**: Mesh editing tools
- **FO4 Use**: Clean topology for better optimization
- **Status**: Built into Blender
- **Tutorial**: Using Loop Tools for FO4 meshes

#### F2
- **What**: Quick face creation
- **FO4 Use**: Speed up modeling workflow
- **Status**: Built into Blender

#### 3D Print Toolbox
- **What**: Mesh validation
- **FO4 Use**: Check meshes for errors before export
- **Status**: Built into Blender

### Viewing Integration Info

1. Open **Add-on Integrations** panel
2. See list of useful add-ons
3. Check installation status (✓ enabled, · installed, ✗ not installed)
4. Read FO4-specific use cases
5. Follow tutorials for integration

### Adding Custom Integrations

You can add tutorials for other add-ons you find useful:

1. Create integration JSON file
2. Define tutorial steps
3. Add FO4 use cases
4. Place in integrations folder

The system will pick it up automatically!

### Integration Use Cases

**Example 1: NIF Workflow**
```
1. Use our add-on to create and optimize mesh
2. Run validation
3. Use NIF Plugin to export directly to NIF
4. Test in FO4

Benefits: No FBX→NIF conversion needed!
```

**Example 2: Advanced Rigging**
```
1. Create character mesh with our add-on
2. Use Rigify to create complex rig
3. Use our validation to check bone count
4. Export with our add-on

Benefits: Professional character rigs + FO4 compatibility
```

## 💡 Productivity Tips

### Combine All Features

The real power comes from combining these features:

**Super Workflow:**
```
1. Load preset for base weapon (Preset Library)
2. Modify it
3. Run "Texture_Everything" macro (Automation)
4. Run "Export_Ready" macro (Automation)
5. Use NIF Plugin to export (Integration)
6. Save new variant as preset (Preset Library)

Time saved: 90%+
```

### Building Your Library

1. **Week 1**: Create and save 10 base presets
2. **Week 2**: Record 5 common macros
3. **Week 3**: Create workflow templates
4. **Week 4**: Everything is automated!

### Keyboard Shortcuts

While the add-on doesn't add shortcuts by default, you can:
1. Edit > Preferences > Keymap
2. Search for "fo4"
3. Assign shortcuts to your favorite operations

Recommended shortcuts:
- `Alt+P`: Load Preset
- `Alt+R`: Start/Stop Recording
- `Alt+M`: Execute Last Macro

### Batch + Automation = 🚀

**Example: Process 50 Assets**
```
1. Create one asset perfectly
2. Record the process as a macro
3. Create 49 base meshes
4. Select all meshes
5. Execute macro with batch processing

Result: What would take 50 hours takes 1 hour!
```

## 📊 Productivity Metrics

### Before Productivity Features
- Create weapon: 2 hours
- Texture 10 objects: 1 hour
- Export 20 meshes: 30 minutes
- Total for 20 weapons: 40+ hours

### After Productivity Features
- Create weapon: 30 minutes (using presets)
- Texture 10 objects: 5 minutes (using macro)
- Export 20 meshes: 2 minutes (using batch + macro)
- Total for 20 weapons: 10-12 hours

**Time saved: 70%+ on large projects!**

## 🎯 Best Practices

### Preset Library
1. Use descriptive names
2. Add detailed descriptions
3. Tag everything
4. Review and clean up monthly
5. Share presets with team/community

### Macros
1. Test before saving
2. Document what each macro does
3. Version your macros (v1, v2, etc.)
4. Keep macro library organized
5. Delete obsolete macros

### Add-on Integration
1. Enable recommended add-ons
2. Follow integration tutorials
3. Report compatibility issues
4. Share your integration discoveries

## 🚀 Advanced Techniques

### Preset Chains
```
1. Load vegetation preset
2. Load terrain preset
3. Load lighting preset
4. Result: Complete environment in 30 seconds!
```

### Macro Sequences
```
1. Execute "Base_Setup" macro
2. Manual modeling work
3. Execute "Finalize" macro
4. Result: Consistent quality every time
```

### Template Customization
```
1. Execute template
2. Adjust parameters for your needs
3. Record new macro with adjustments
4. Save as custom template
```

## 📈 Productivity Goals

### Beginner (Week 1-2)
- [ ] Save 5 presets
- [ ] Record 2 macros
- [ ] Use 1 workflow template
- [ ] Enable 2 integrated add-ons

### Intermediate (Week 3-4)
- [ ] Build library of 20+ presets
- [ ] Create 10+ macros
- [ ] Customize workflow templates
- [ ] Master add-on integrations

### Advanced (Month 2+)
- [ ] 50+ preset library
- [ ] Macro for every common task
- [ ] Custom workflow templates
- [ ] Share presets with community
- [ ] 5x productivity increase

## 💎 Pro Tips

1. **Morning Routine Macro**: Record your daily setup steps
2. **Evening Backup Macro**: Auto-backup your work
3. **Quality Check Macro**: Run all validations at once
4. **Preset Naming Convention**: Use "Type_Subtype_Name" format
5. **Macro Testing**: Always test on dummy objects first
6. **Preset Versioning**: Keep old versions when updating
7. **Automation First**: If you do it twice, automate it
8. **Share Smartly**: Export presets to share with team
9. **Regular Cleanup**: Review and delete unused items monthly
10. **Document Everything**: Add descriptions to everything

## 🎓 Learning Path

### Day 1: Presets
- Save your first preset
- Load it in a new scene
- Understand the library structure

### Day 2: Basic Macros
- Record a simple 3-step macro
- Execute it successfully
- Understand recording limitations

### Day 3: Workflow Templates
- Try all included templates
- Understand template structure
- Identify which templates you need

### Day 4: Add-on Integration
- Scan for installed add-ons
- Read integration tutorials
- Enable one recommended add-on

### Week 2: Build Library
- Create 10 useful presets
- Record 5 useful macros
- Customize one workflow template

### Month 1: Mastery
- Extensive preset library
- Macro-driven workflow
- Integrated add-on usage
- 5x+ productivity increase

## 🌟 Success Stories

**Modder A**: "Built a library of 50 weapon part presets. Now I can create new weapons in 15 minutes instead of 2 hours!"

**Modder B**: "Recorded macros for my entire texture pipeline. What took 5 minutes per object now takes 10 seconds!"

**Modder C**: "Used workflow templates to create 100 optimized vegetation objects in one afternoon. Before it would have taken a week!"

## 📚 Resources

### Preset Library Location
```
~/.config/blender/[version]/fo4_preset_library/
```

### Macros Location
```
~/.config/blender/[version]/fo4_macros/
```

### Integration Packs Location
```
~/.config/blender/[version]/fo4_addon_integrations/
```

## 🎉 Conclusion

These productivity features transform the add-on from a tool into a **productivity powerhouse**:

- ✅ **Preset Library**: Never recreate the same thing twice
- ✅ **Automation**: Eliminate repetitive tasks
- ✅ **Integration**: Leverage other great add-ons
- ✅ **Workflow Templates**: Common tasks → one click

**Result: More time creating, less time struggling!**

Start small, build your library, and watch your productivity soar! 🚀
