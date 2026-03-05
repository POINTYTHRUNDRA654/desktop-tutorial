# In-App Help System & Contextual Assistance

## Overview

This guide documents the comprehensive help system integrated into the Fallout 4 Blender Add-on, providing instant assistance right where you need it.

---

## 🎯 Help System Features

### 1. Contextual Tooltips

Every operator button includes helpful tooltips that appear on hover:

**Examples:**
- **Optimize Mesh**: "Reduces polygon count while maintaining visual quality. Recommended for game assets."
- **Generate Collision**: "Creates a simplified collision mesh for physics. Essential for static objects."
  Use the **Collision Type** dropdown to choose the appropriate category (rock, tree,
  building, creature, etc.); the add-on will also guess a reasonable type based on
  the object name.  Buildings receive heavier, less‑aggressive simplification;
  creatures are tagged for custom physics and no mesh is generated.  Some types such
  as grass or mushrooms automatically skip collision creation.  Collision type
  selections automatically assign default sound and weight presets (`fo4_collision_sound`
  and `_weight`) which are written to the object for export tools.  You can also
  click **Change Type** in the panel header to pick a category from a popup list
  without opening the sidebar, and an "Apply to Selected" option lets you tag
  multiple objects at once.
- **Generate + Export NIF**: "One‑click tool that makes a collision mesh and exports both the source
  and collision to a NIF file with correct naming/metadata. Use when preparing assets
  for FO4.  The current collision type will also be written so Havok tools can assign
  proper weights, sounds and material tags."
- **Smart Material Setup**: "Auto-detects and loads textures from a directory. Saves manual work."

### 2. Panel Descriptions

Each UI panel includes a description header explaining its purpose.  The
**Mesh Helpers** panel now also contains collision controls (type dropdown,
change/type buttons and export) so you can configure physics directly alongside
optimize/validate tools.  If you prefer the original boxed layout, open
Edit → Preferences → Add-ons → Fallout 4 and uncheck **Unified Mesh Panel**
under *User Interface*.


```python
# Example from code:
class FO4_PT_MeshPanel(bpy.types.Panel):
    bl_label = "Mesh Tools"
    bl_description = "Tools for optimizing and validating meshes for Fallout 4"
```

### 3. Operator Help Messages

All operators provide feedback messages after execution:

```python
# Success messages
self.report({'INFO'}, "Mesh optimized successfully! Reduced to 2,453 triangles.")

# Warning messages
self.report({'WARNING'}, "UV map missing. Auto-generated basic UV coordinates.")

# Error messages
self.report({'ERROR'}, "No mesh selected. Please select an object.")
```

### 4. Property Descriptions

Every property field includes detailed descriptions:

```python
fo4_lod_distance: bpy.props.FloatProperty(
    name="LOD Distance",
    description="Distance at which LOD switch occurs. Higher values = switches further away",
    default=2000.0,
    min=100.0,
    max=10000.0
)
```

---

## 📚 Quick Help Access

### F1 - Context-Sensitive Help

Press **F1** anywhere in Blender to:
1. Open help for current operator
2. See relevant documentation
3. Get quick tips

### Help Menu Integration

Access help through multiple paths:

**Method 1: Add-on Preferences**
```
Edit → Preferences → Add-ons → Fallout 4 → Documentation
```

**Method 2: Panel Headers**
```
Click (?) icon in any panel header
```

**Method 3: Right-Click Menu**
```
Right-click any operator → Online Manual
```

---

## 🔍 Help Categories

### Beginner Help

**For first-time users:**
- ✅ Installation guide
- ✅ Quick start tutorial
- ✅ Basic workflow examples
- ✅ Common mistakes to avoid

**Access:** Click "Getting Started" in main panel

### Intermediate Help

**For regular users:**
- ✅ Operator reference
- ✅ Property explanations
- ✅ Workflow optimization
- ✅ Troubleshooting tips

**Access:** Hover over operators for tooltips

### Advanced Help

**For power users:**
- ✅ Python API documentation
- ✅ Custom script examples
- ✅ Integration guides
- ✅ Performance tuning

**Access:** API_REFERENCE.md

---

## 💡 Smart Help Features

### 1. Error Detection with Solutions

When errors occur, the system suggests fixes:

```
Error: "Mesh has non-manifold edges"
Suggested Fix: "Run Mesh → Clean Up → Fill Holes"
Auto-Fix Available: [Fix Now] button
```

### 2. Workflow Suggestions

Based on current context:

```
Detected: You have a high-poly mesh
Suggestion: "Consider using Decimate modifier before export"
Learn More: [Show Tutorial]
```

### 3. Best Practice Reminders

Proactive tips during work:

```
Reminder: "Don't forget to apply scale before export!"
Action: [Apply Scale] button
Dismiss: [Don't Show Again]
```

### 4. Version-Specific Help

Different help for different Blender versions:

```
Blender 3.6+: "Use new Geometry Nodes method"
Blender 3.0-3.5: "Use modifier stack approach"
Blender 2.8-2.9: "Legacy method documentation"
```

---

## 🎓 Interactive Tutorials

### In-App Tutorial System

**Access:** Tutorial Panel → Start Interactive Tutorial

**Features:**
- Step-by-step guidance
- Highlight relevant UI elements
- Automatic progress tracking
- Can pause/resume anytime

**Available Tutorials:**
1. **Basic Mesh Creation** (10 mins)
2. **Texture Setup** (15 mins)
3. **Complete Weapon Workflow** (30 mins)
4. **Batch Processing** (10 mins)
5. **Troubleshooting Common Issues** (20 mins)

### Tutorial Features

**Interactive Highlights:**
```
Current Step: "Select the mesh in the outliner"
[Highlight: Outliner panel]
[Next] [Previous] [Skip Tutorial]
```

**Validation:**
```
✓ Step completed automatically when action performed
✗ Shows tip if stuck for >30 seconds
```

**Progress Tracking:**
```
Tutorial Progress: ▰▰▰▰▱▱▱ 4/7 steps
Estimated Time Remaining: 12 minutes
```

---

## 📖 Documentation Integration

### Quick Reference Cards

**Access:** Help → Quick Reference

**Available Cards:**
- Keyboard Shortcuts
- Operator Quick Reference
- Property Defaults
- Export Settings
- Common Workflows
- Troubleshooting Flowchart

### Searchable Help Database

**Access:** Help → Search Documentation

**Features:**
- Full-text search across all docs
- Tag-based filtering
- Recent searches history
- Suggested topics

**Example Search:**
```
Search: "texture not showing"
Results:
1. Troubleshooting: Missing Textures (⭐⭐⭐⭐⭐)
2. Smart Material Setup Guide (⭐⭐⭐⭐)
3. FAQ: Common Texture Issues (⭐⭐⭐)
```

---

## 🆘 Contextual Help Examples

### Example 1: Mesh Optimization

**Context:** User selects high-poly mesh

**Help Display:**
```
╔═══════════════════════════════════════╗
║ 💡 Mesh Optimization Help            ║
╠═══════════════════════════════════════╣
║ Current: 50,423 triangles             ║
║ Recommended: < 5,000 for FO4         ║
║                                       ║
║ Options:                              ║
║ • Decimate (fast, good for most)     ║
║ • Remesh (better topology)           ║
║ • Manual reduction (best quality)    ║
║                                       ║
║ [Optimize Now] [Learn More]          ║
╚═══════════════════════════════════════╝
```

### Example 2: Export Validation

**Context:** User clicks Export

**Pre-Export Check:**
```
╔═══════════════════════════════════════╗
║ 🔍 Export Validation                 ║
╠═══════════════════════════════════════╣
║ ✓ Mesh has UVs                       ║
║ ✓ Scale is applied                   ║
║ ✗ Normals need recalculation         ║
║ ⚠ High triangle count (12,453)      ║
║                                       ║
║ [Auto-Fix Issues] [Export Anyway]    ║
║ [Cancel]                              ║
╚═══════════════════════════════════════╝
```

### Example 3: Material Setup

**Context:** User adds new material

**Smart Suggestions:**
```
╔═══════════════════════════════════════╗
║ 🎨 Material Setup Assistant          ║
╠═══════════════════════════════════════╣
║ Detected texture files in:            ║
║ • /path/to/textures/                  ║
║                                       ║
║ Found:                                ║
║ • weapon_d.dds (diffuse)             ║
║ • weapon_n.dds (normal)              ║
║ • weapon_s.dds (specular)            ║
║                                       ║
║ [Auto-Setup Material] [Manual]       ║
╚═══════════════════════════════════════╝
```

---

## 🎯 Help for Specific Workflows

### Weapon Creation Help

**Triggered when:** User creates weapon-shaped mesh

**Displays:**
```
Weapon Creation Workflow:
1. ✓ Model base mesh
2. → Optimize for game (current step)
3. → Create LODs
4. → Setup materials
5. → Add collision
6. → Export to FO4

[Show Detailed Steps] [Skip Workflow Help]
```

### Batch Processing Help

**Triggered when:** Multiple objects selected

**Displays:**
```
Batch Processing Available!

You have 15 objects selected.
Batch operations available:
• Optimize All (estimated: 2 mins)
• Validate All (estimated: 30 secs)
• Export All (estimated: 1 min)

[Start Batch] [Learn More]
```

---

## 📱 Help Panel

### Dedicated Help Panel

**Location:** Sidebar → Fallout 4 Tab → Help Panel

**Contents:**
```
╔═══════════════════════════════════════╗
║ 📚 Help & Resources                  ║
╠═══════════════════════════════════════╣
║ Quick Start                           ║
║ • [First Time Setup]                  ║
║ • [Basic Tutorial]                    ║
║ • [Video Guides]                      ║
║                                       ║
║ Documentation                         ║
║ • [User Manual]                       ║
║ • [API Reference]                     ║
║ • [FAQ]                               ║
║                                       ║
║ Support                               ║
║ • [Report Bug]                        ║
║ • [Request Feature]                   ║
║ • [Community Forum]                   ║
║                                       ║
║ Current Context Help                  ║
║ → Mesh Optimization                   ║
║   [Show Tips]                         ║
╚═══════════════════════════════════════╝
```

---

## 🔧 Help System Configuration

### Preferences

**Access:** Edit → Preferences → Add-ons → Fallout 4 → Help Settings

**Options:**
```
☑ Enable contextual tooltips
☑ Show workflow suggestions
☑ Display best practice reminders
☑ Auto-open help for errors
☐ Expert mode (hide beginner tips)

Tooltip Delay: [0.5] seconds
Help Panel Position: [Right Sidebar ▼]
```

---

## 🌐 Online Help Resources

### Integrated Web Links

**Direct access from Blender:**
- Documentation website
- Video tutorial playlist
- Community forum
- Discord server
- GitHub repository
- Nexus Mods page

### Offline Mode

**When internet unavailable:**
- ✅ All basic help available offline
- ✅ Cached documentation
- ✅ Tutorial text available
- ✗ Videos require internet
- ✗ Live community features disabled

---

## 💬 Getting Help

### In-App Support Channels

**Method 1: Help Menu**
```
Help → Get Support
• Search Knowledge Base
• Ask in Forum
• Report Issue
• Request Feature
```

**Method 2: Error Reports**
```
When error occurs:
[Report This Error]
→ Auto-fills error details
→ You add description
→ Sends to support
```

**Method 3: Community Chat**
```
Help → Community Chat
→ Opens Discord in browser
→ Direct link to #support channel
```

---

## 📊 Help System Statistics

### Usage Tracking (Optional)

**Helps improve help:**
- Most viewed help topics
- Common error searches
- Tutorial completion rates
- Feature discovery metrics

**Privacy:** All anonymous, opt-in only

---

## 🎨 Help UI Customization

### Customize Help Display

**Theme Options:**
- Compact mode (minimal UI space)
- Detailed mode (full explanations)
- Expert mode (advanced only)

**Language Support:**
- English (default)
- Community translations welcome

---

## 🚀 Future Help Features

### Planned Improvements

1. **AI Assistant** (future)
   - Natural language help queries
   - Context-aware suggestions
   - Personalized tips

2. **Video Tooltips** (future)
   - Short GIF/video demonstrations
   - Embedded in tooltips
   - Show exact steps

3. **Community Tips** (future)
   - User-submitted tips
   - Voting system
   - Featured tips of the week

---

## ✅ Help Best Practices

### For Add-on Users

1. **Start with Quick Start** - Don't skip basics
2. **Use Tooltips** - Hover before clicking
3. **Follow Workflows** - Trust the guidance
4. **Report Issues** - Help improve the add-on
5. **Share Knowledge** - Help other users

### For Add-on Developers

1. **Write Clear Tooltips** - Assume no prior knowledge
2. **Provide Examples** - Show don't just tell
3. **Add Validation** - Catch errors early
4. **Update Docs** - Keep help current
5. **Test Help System** - Ensure it works

---

## 📞 Contact & Support

**Need help? Multiple channels available:**

- 💬 Community Forum: [Link]
- 💬 Discord Server: [Link]
- 📧 Email Support: support@example.com
- 🐛 Bug Reports: GitHub Issues
- 💡 Feature Requests: GitHub Discussions

**Response Times:**
- Forum: Usually < 24 hours
- Discord: Usually < 2 hours
- Email: 2-3 business days
- GitHub: Variable (community-driven)

---

*Help System Version 1.0*
*Last Updated: 2026-02-18*
*Making FO4 modding accessible to everyone!*
