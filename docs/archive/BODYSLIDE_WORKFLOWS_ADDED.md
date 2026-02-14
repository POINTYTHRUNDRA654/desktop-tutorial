# BodySlide Workflow Documentation Added

## Overview

Integrated official BodySlide workflow tutorials from the GitHub Wiki into all Bodyslide documentation. These advanced tutorials cover essential Outfit Studio workflows for modders.

**Date**: January 24, 2026  
**Source**: https://github.com/ousnius/BodySlide-and-Outfit-Studio/wiki

---

## New Content Added

### 1. Conversion References Workflow
**Purpose**: Convert outfits from one body type to another (e.g., Vanilla → CBBE)

**Key Steps**:
- Load conversion reference templates
- Conform outfit to reference sliders
- Set base shape at 100% slider value
- Load target body reference
- Fix clipping and copy bone weights
- Export with reference

**Use Case**: Converting mods between different body frameworks

---

### 2. Creating BodySlide Projects
**Purpose**: Turn converted outfits into BodySlide projects with slider support

**Key Steps**:
- Create project with body reference containing sliders
- Load converted outfit
- Conform to sliders
- Fix slider-specific clipping
- Copy bone weights
- Save project with proper naming
- Set up groups for organization

**File Structure**:
```
BodySlide/
├── SliderSets/*.osp
├── ShapeData/ProjectName/*.osd
├── ShapeData/ProjectName/*.nif
└── SliderGroups/*.xml
```

---

### 3. Copying Bone Weights
**Purpose**: Ensure proper animation by copying skeletal weights from reference to outfit

**Key Concepts**:
- Bone weights control vertex movement during animations
- Weight factors range from 0.0 to 1.0
- Multiple bones can affect same vertex

**Methods**:
- Copy All Bones (simple, automatic)
- Copy Selected Bones (advanced, manual control)

---

### 4. Adding Zaps
**Purpose**: Create toggleable parts that can be removed during builds

**Common Uses**:
- Optional accessories (hoods, sleeves, belts)
- Hidden body part cleanup (prevent clipping)
- Outfit variations

**Key Concepts**:
- Masked areas = STAY (not deleted)
- Unmasked areas = ZAPPED (deleted in BodySlide)
- Hidden zaps = auto-enabled, invisible to user
- Zaps only preview in Outfit Studio—BodySlide removes parts

---

## Files Modified

### BODYSLIDE_COMPLETE_GUIDE.md
**Added Sections** (400+ lines):
- Conversion References Workflow
- Creating BodySlide Projects
- Copying Bone Weights
- Adding Zaps to Projects

**Enhanced**:
- Credits with official GitHub Wiki link
- Version history (v1.2)
- Step-by-step tutorials with detailed instructions

---

### BodyslideGuide.tsx
**New Section**: "📋 Workflows & Tutorials"

**Subsections**:
1. 🔄 Converting Outfits Between Body Types
2. 🛠️ Creating BodySlide Projects
3. 🦴 Copying Bone Weights
4. ✂️ Adding Zaps (Remove Parts)
5. ⚡ Quick Reference (menu commands)

**Features**:
- Expandable section with terminal theme styling
- Step-by-step numbered instructions
- Highlighted menu commands
- Project file structure visualization
- Common workflow patterns

---

### BODYSLIDE_QUICK_START.md
**Added Section**: "Advanced Workflows (Outfit Studio)"

**Brief Overview**:
- Converting Outfits
- Creating Projects
- Copying Weights
- Adding Zaps
- Reference to complete guide

---

## Key Menu Commands

| Command | Purpose |
|---------|---------|
| **Slider → Conform All** | Apply reference sliders to outfit |
| **Slider → Set Base Shape** | Make current slider value the default |
| **Slider → New Zap Slider** | Create toggleable part removal |
| **File → Load Reference** | Load template or project as reference |
| **Shape → Copy Bone Weights** | Copy all skeletal weights |
| **Shape → Copy Selected Weights** | Copy specific bones only |
| **Tool → Invert Mask** | Flip masked/unmasked areas |
| **Export → To NIF With Reference** | Export conversion result |
| **File → Save Project As** | Create BodySlide project |

---

## Outfit Studio Workflow Patterns

### Pattern 1: Body Conversion
```
New Project → Load Reference → Load Outfit → Conform All → 
Set Base Shape → Load Target → Fix Clipping → Copy Weights → Export
```

### Pattern 2: Project Creation
```
New Project → Load Body+Sliders → Load Outfit → Conform All → 
Fix Sliders → Copy Weights → Save Project → Set Groups
```

### Pattern 3: Weight Copying
```
New Project → Load Reference → Load Outfit → Select Shapes → 
Copy Bone Weights → Export/Save
```

### Pattern 4: Adding Zaps
```
Load Project → Mask Brush → Mask Keep Areas → New Zap Slider → 
(Optional: Set Hidden) → Save Project
```

---

## Bridge Conversions

When no direct conversion reference exists, use intermediate shapes:

**Examples**:
- Vanilla → CBBE → Custom Body
- A → B → C (two-step conversion)
- Use any compatible intermediate shape

**Process**: Complete first conversion, then use result as input for second conversion.

---

## Documentation Sources

1. **Original Guide**: Lindeboombier (Steam Community)
2. **Slider Details**: Secondary Bodyslide guide
3. **Official Settings**: BodySlide GitHub Wiki (Installation & Settings)
4. **Official Workflows**: BodySlide GitHub Wiki (Guides section)

---

## Implementation Status

✅ **Complete Guide**: 4 new workflow sections (400+ lines)  
✅ **React Component**: New "Workflows & Tutorials" section  
✅ **Quick Start**: Advanced workflows overview  
✅ **Credits Updated**: Official documentation acknowledged  
✅ **Version History**: v1.2 recorded  
✅ **TypeScript**: No compilation errors  

---

## User Benefits

**For Basic Users**:
- Understand what Outfit Studio can do
- Know when to use advanced features
- Quick reference for menu commands

**For Modders**:
- Step-by-step conversion tutorials
- Project creation workflow
- Bone weight management
- Zap creation for optional parts

**For Mod Authors**:
- Complete project file structure guide
- Sharing and packaging instructions
- Group management for organization
- Professional workflow patterns

---

## Next Steps for Users

1. **Basic Usage**: Follow Quick Start for simple body customization
2. **Converting Outfits**: Use Conversion References workflow
3. **Creating Mods**: Follow Project Creation workflow
4. **Advanced Features**: Add zaps for optional parts
5. **Sharing Work**: Package files with proper structure

---

## Technical Details

### Conversion References
- Defined in `RefTemplates.xml`
- Point to installed projects
- One reference active at a time
- Can load .osp or .nif files

### Project Files
- `.osp`: Slider set definitions
- `.osd`: Shape data (slider morphs)
- `.nif`: Mesh files
- `.xml`: Group definitions

### Bone Weights
- Stored per-vertex
- Multiple bones per vertex possible
- Weight factors sum to 1.0
- Critical for animation

### Zaps
- Slider type with special behavior
- Affects geometry visibility
- Can be hidden from user
- Only removes parts in BodySlide builds

---

## Related Documentation

- **BODYSLIDE_COMPLETE_GUIDE.md**: Full reference with all workflows
- **BODYSLIDE_QUICK_START.md**: 5-minute setup guide
- **BodyslideGuide.tsx**: Interactive in-app guide
- **Official Wiki**: https://github.com/ousnius/BodySlide-and-Outfit-Studio/wiki

---

## Version Info

**Documentation Version**: 1.2  
**Last Updated**: January 24, 2026  
**Status**: Complete  
**TypeScript Errors**: None  

---

**Implementation Complete** ✅
