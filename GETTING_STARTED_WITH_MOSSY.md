# Getting Started with Mossy
## Your Complete Fallout 4 Modding Assistant

Welcome to Mossy v3.0! This guide will help you get the most out of your AI modding companion.

---

## 🎯 What Can Mossy Do?

Mossy is an AI assistant with **60+ tools** covering every aspect of Fallout 4 modding:

### Creation & Editing
- Create weapons, armor, quests, NPCs, and any record type
- Edit existing records and properties
- Manage FormIDs and resolve conflicts
- Attach and configure Papyrus scripts

### Validation & Optimization
- Validate meshes (NIF files) for errors
- Optimize textures and convert to DDS
- Clean plugins (remove ITM/UDR records)
- Detect and resolve mod conflicts
- Fix texture paths automatically

### Scripting & Debugging
- Generate Papyrus script templates
- Validate syntax before compiling
- Provide intelligent autocomplete
- Debug scripts in real-time
- Find symbol references across project

### Testing
- **Initialize System Link:** Connect to the Desktop Bridge for real-time game interaction
- **Live Monitoring:** Watch the game's Papyrus log files directly from the dashboard
- **Real Metrics:** Monitor exact CPU/GPU performance impact (No simulated data)

### Release Preparation
- Generate documentation (README, changelog)
- Scan for required permissions/attributions
- Pack optimized BA2/BSA archives
- Validate all asset paths
- Sort load order with LOOT

### Version Control
- Initialize git repositories
- Commit with semantic versioning
- Compare versions and view diffs
- Rollback to previous versions

---

## 💬 How to Talk to Mossy

Mossy understands natural language! Here are examples:

### Creating Content
```
"Create a new laser rifle"
"Make a quest about finding a lost artifact"
"Generate a Papyrus script for an activator"
"Create an NPC named Captain Steel"
```

### Troubleshooting
```
"My game crashes when I load this cell"
"Check if my mod has conflicts"
"Why is this mesh showing up yellow in-game?"
"Debug this Papyrus script error"
```

### Optimization
```
"Optimize all my textures"
"Reduce poly count on this mesh"
"Clean my plugin"
"Check my load order"
```

### Testing
```
"Launch the game and test my quest"
"Create a test save at Sanctuary"
"Monitor the Papyrus log for errors"
"Inject this console command: coc qasmoke"
```

### Release
```
"Prepare my mod for release"
"Generate a README"
"Pack my files into a BA2 archive"
"Validate all my assets"
```

---

## 🚀 Quick Start Workflows

### 1. Creating Your First Weapon

**You:** "I want to create a custom energy weapon"

**Mossy will guide you through:**
1. Creating the weapon record in Creation Kit
2. Validating your mesh file
3. Optimizing your textures
4. Adding to a leveled list
5. Testing in-game

**Try saying:**
- "Create a weapon called Plasma Devastator"
- "Validate this mesh: MyWeapon.nif"
- "Convert my weapon textures to DDS"
- "Test the weapon in-game"

---

### 2. Creating a Quest

**You:** "Help me create a quest"

**Mossy will:**
1. Create the quest record
2. Generate a quest script template
3. Explain how to set up stages
4. Help you attach the script
5. Guide testing

**Try saying:**
- "Create a quest called The Lost Signal"
- "Generate a quest script that tracks player location"
- "How do I set up quest stages?"
- "Test this quest from the beginning"

---

### 3. Debugging a Crash

**You:** "My game crashes when I go to Red Rocket"

**Mossy will:**
1. Check Papyrus logs for errors
2. Validate all meshes in that cell
3. Check for mod conflicts
4. Look for PreVis issues
5. Suggest fixes

**Try saying:**
- "Analyze my Papyrus log"
- "Check for conflicts in my load order"
- "Validate all meshes in RedRocket01"
- "Is this a PreVis problem?"

---

### 4. Preparing for Release

**You:** "I'm ready to release my mod"

**Mossy will:**
1. Clean your plugin (remove ITM/UDR)
2. Check for conflicts
3. Validate all assets
4. Optimize textures/meshes
5. Generate documentation
6. Create archives
7. Version control setup

**Try saying:**
- "Clean my plugin"
- "Check if all my assets are valid"
- "Generate a README for my mod"
- "Pack everything into a BA2 archive"

---

## 🎨 Using the Workshop

Mossy includes a full IDE called "The Workshop":

### Features
- **Code Editor**: Write Papyrus scripts with syntax highlighting
- **Visual Loom**: Visual scripting graph editor
- **Snippets Library**: Pre-made Papyrus code snippets
- **File Explorer**: Browse your mod structure
- **Compiler**: Compile scripts directly
- **Console**: See build output and errors

### Quick Actions
- Click **Compile** to build your script
- Click **Deploy** to copy to game folder
- Use **Snippets** for common patterns
- Switch to **Loom** for visual scripting

---

## 🔧 Advanced Features

### FormID Management
```
"What's the FormID for BoS Uniform?"
"Create a weapon with FormID 01ABC123"
"Change this FormID to avoid conflicts"
```

### xEdit Operations
```
"Detect conflicts in my plugin"
"Clean my mod with xEdit"
"Forward these records from winning mod"
"Renumber FormIDs for ESL compatibility"
```

### Collision & Physics
```
"Add collision to this mesh"
"Generate a box collision shape"
"Optimize collision for this weapon"
```

### Asset Pipeline
```
"Convert all PNGs to DDS with BC7 compression"
"Batch optimize textures to 2048px"
"Generate mipmaps for all textures"
"Validate texture paths in all NIFs"
```

---

## 📚 Learning Resources

Mossy has built-in knowledge of:
- **Papyrus Scripting**: Templates, patterns, best practices
- **Creation Kit**: Record types, properties, workflows
- **xEdit**: Conflict resolution, cleaning, scripting
- **NIF Format**: Block types, texture slots, collision
- **PreVis System**: What breaks it, how to fix it
- **Console Commands**: Testing, debugging, placement
- **Load Order**: LOOT rules, priorities, masters

**Ask Mossy anything!**
```
"How do I register for remote events in Papyrus?"
"What's the difference between BC1 and BC3 textures?"
"Explain FormID ranges"
"What breaks PreVis?"
"Show me a Papyrus script template for a quest"
```

---

## 🎯 Pro Tips

### 1. Let Mossy Lead Workflows
Instead of asking for individual steps, describe your goal:
```
❌ "How do I create a weapon?"
✅ "Create a laser rifle and help me test it"
```

Mossy will guide you through the entire process!

### 2. Be Specific About Problems
```
❌ "It doesn't work"
✅ "My game crashes when I load SanctuaryExt cell"
```

More details = better solutions!

### 3. Use Natural Language
You don't need to know exact command names:
```
"Make my textures smaller"
"Fix the paths in this mesh"
"Check if other mods conflict with mine"
```

Mossy understands intent!

### 4. Ask for Explanations
```
"Why do I need to clean my plugin?"
"What's the best texture format for weapons?"
"Explain how leveled lists work"
```

Mossy has comprehensive knowledge!

### 5. Request Complete Workflows
```
"Walk me through creating a custom NPC"
"Help me prepare my mod for Nexus"
"Guide me through quest creation"
```

---

## 🛠️ Common Tasks

### Creating Content
- "Create a [type] called [name]"
- "Generate a [script type] script"
- "Make a leveled list for [items]"

### Fixing Issues
- "Clean my plugin"
- "Fix texture paths in [file]"
- "Resolve conflicts with [mod]"

### Optimizing
- "Optimize [assets]"
- "Reduce poly count of [mesh]"
- "Compress textures in [folder]"

### Testing
- "Launch game and test [feature]"
- "Monitor logs for [filter]"
- "Create test save at [location]"

### Preparing Release
- "Generate documentation"
- "Validate everything"
- "Pack into archive"
- "Check permissions"

---

## 🆘 Getting Help

If you're stuck, try:

1. **Ask for explanation**: "Explain how [thing] works"
2. **Request examples**: "Show me an example of [thing]"
3. **Describe the symptom**: "My [thing] does [problem]"
4. **Ask for workflow**: "Walk me through [task]"

Mossy has extensive knowledge and will help you learn!

---

## 🎓 Learning Path

### Beginner
1. Start with simple record creation (weapons, items)
2. Learn basic Papyrus scripting
3. Practice testing in-game
4. Use Workshop for script editing

### Intermediate
1. Create complex quests with multiple stages
2. Learn xEdit conflict resolution
3. Optimize assets for performance
4. Use git for version control

### Advanced
1. Master Papyrus remote events
2. Create compatibility patches
3. Implement MCM menus
4. Handle complex FormID management

**Mossy helps at every level!**

---

## 🎉 You're Ready!

Start chatting with Mossy and explore all the capabilities. Remember:

✓ Use natural language
✓ Describe goals, not just individual steps
✓ Ask for explanations when learning
✓ Let Mossy guide you through workflows
✓ The more specific your questions, the better the answers

**Happy modding!**

---

*For technical details, see [FALLOUT4_MODDING_GUIDE.md](FALLOUT4_MODDING_GUIDE.md)*  
*For complete feature list, see [MOSSY_V3_ENHANCEMENTS.md](MOSSY_V3_ENHANCEMENTS.md)*
