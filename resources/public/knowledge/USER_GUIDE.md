# Mossy User Guide: Getting Started & Privacy

## Welcome to Mossy!

Mossy is your AI companion for Fallout 4 modding. This guide will help you get started and understand how your data is handled.

## First Launch - The Onboarding Tutorial

When you download and launch Mossy for the first time, you'll see a streamlined setup process. **You must complete this to use Mossy** - but don't worry, it only takes a minute!

### What's New in v5.4.23 ✨
- **Direct-Write Protocol:** Mossy can now directly write scripts to Papyrus, xEdit, and Blender with your explicit permission
- **Neural Link Monitoring:** Real-time monitoring of your modding tools (Blender, Creation Kit, xEdit, NifSkope)
- **Headless Automation:** Batch execution and automation for Blender operations
- **Enhanced Privacy Controls:** Explicit permission and audit logging for all direct-write and automation features
- **Production-Ready Modules:** All features are functional with no placeholders - everything works as described
- **Session Awareness:** Mossy adapts advice based on which tools you currently have active

### Setup Steps

**Step 1: Welcome + Language**
Choose your UI language (Auto/system or one of the supported languages). You can change this later in Settings.

**Step 2: System Scan**
Mossy scans for modding tools (Creation Kit, xEdit, Blender, NifSkope, Papyrus Compiler) to enable deep integrations.

**Step 3: Tool Permissions**
Review detected tools and grant explicit permissions for direct-write and automation features. Each tool shows what Mossy can do and requires your approval.

**Step 4: Privacy Settings**
Configure how your data is stored and shared (see detailed section below).

**Step 5: Setup Complete**
You're ready! Click "Complete Setup" to launch Mossy.

### Your Privacy Settings
This is the most important step. **You have complete control over your data.**

#### What Gets Stored Locally (Always)
By default, Mossy stores data locally on your computer:
- ✅ Your project files and mods
- ✅ Your conversations with Mossy
- ✅ Your settings and preferences
- ✅ Your modding projects and notes

**Nobody can access this data except you.** It never leaves your computer unless you explicitly choose to share something.

Note: local storage is not automatically encrypted by Mossy. Treat your Windows account and disk security (BitLocker, account password) as your primary protection.

#### Optional: Contribute to Community Knowledge Base
If you want to help other Mossy users, you can optionally share anonymized insights:

**Script Patterns** (Opt-in)
- Share Papyrus scripting patterns and techniques you discover
- Example: "Using event listeners improves performance by 15%"
- Your specific mod names and details are NOT shared
- Helps: Everyone gets better scripting recommendations

**Mesh Optimizations** (Opt-in)
- Share 3D optimization techniques
- Example: "Polygon reduction strategy works well for armor"
- Your specific mesh files and models are NOT shared
- Helps: Everyone creates more optimized 3D assets

**Bug Reports** (Opt-in)
- Help improve Mossy by reporting bugs you find
- Error information is reviewed for privacy
- No personal data is included
- Helps: Bugs get fixed faster for everyone

**Default Setting:** All sharing is OFF. You must actively choose to contribute.

#### Mossy's Privacy Promise
- 🔒 **Your data is yours** - We don't sell or monetize your information
- 🛡️ **Privacy first** - Permission needed before sharing anything
- 💻 **Local storage** - Your computer is the primary location
- 👁️ **Transparent** - You know exactly what gets shared and why

**What you need to do:** Review each setting. Toggle ON any that you want to participate in. If you prefer complete privacy, just leave them all OFF. ✅

### You're All Set
After setup completes, Mossy drops you into the main UI. From there you can open Chat, Install Wizard, or any module.

## After Onboarding

### Using Mossy
1. Click "Talk to Mossy" in the sidebar
2. Start a conversation about your modding project
3. Mossy will help with:
   - Writing and debugging Papyrus scripts
   - Creating and optimizing 3D meshes
   - Designing quests and worldspaces
   - Managing mods and dependencies
   - Solving compatibility issues
   - Providing documentation

### Accessing Settings Later
From the sidebar, you can use Settings to:
- View your current privacy configuration
- Change sharing preferences anytime
- Learn more about what each setting does
- See how much data you're storing locally
- Export your data as a backup
- Delete all your local data

## How Your Data Works

### Private Local Data
Everything by default stays on your computer in local storage:
- Projects and files
- Conversations
- Settings
- Personal notes
- Sensitive information

If you enable cloud AI or cloud speech-to-text providers, your prompts/audio may be sent to that provider to fulfill the request.

### Optional Shared Data
If you enable sharing, **anonymized patterns** are sent to improve Mossy for everyone:

```
❌ NOT shared:
- Your name or username
- File paths or locations
- Specific mod names you're working on
- Project details
- Personal information

✅ CAN be shared (if you opt-in):
- General coding patterns
- Technique recommendations
- Performance improvement methods
- Bug reports (reviewed for privacy)
```

### Example: What Sharing Looks Like

**Your Script:**
```papyrus
Event OnInit()
    RegisterForAnimationEvent(akActor, "tailFlick")
    ; Private project code...
EndEvent
```

**What Mossy Shares:**
```
Pattern: "Event listener registration improves performance"
Technique: "RegisterForAnimationEvent is 20% faster than polling"
```

**What's NOT shared:**
- Your project name
- File paths
- Specific mod details

## Privacy Controls

### Always Available
- Toggle sharing on/off anytime
- All settings save immediately
- No restrictions on changing your mind

### Your Rights
You can:
- ✅ See exactly what data you're storing
- ✅ Download all your data
- ✅ Delete all your data
- ✅ Change privacy settings anytime
- ✅ Disable all sharing
- ✅ See what's being shared

## Frequently Asked Questions

**Q: Will Mossy share my project files?**
A: Never. Project files stay local only, even if sharing is enabled. Only anonymized patterns are shared.

**Q: Can I turn off all sharing?**
A: Yes! By default, sharing is OFF. You must opt-in to contribute any data.

**Q: Where is my data stored?**
A: On your computer, in encrypted local storage. It never goes to any server unless you explicitly enable sharing.

**Q: Can I see what data I'm sharing?**
A: Yes! Go to Privacy Settings to see what's being contributed and disable any type anytime.

**Q: What if I change my mind about sharing?**
A: Just toggle it off in Privacy Settings. Only future sharing is stopped (past contributions can't be recalled, but no new data will be sent).

**Q: Is my data encrypted?**
A: Yes! Local data is encrypted at rest. Shared data is anonymized before sending.

**Q: Who can access my data?**
A: Only you can access your local data. Shared data is anonymized and goes to the community knowledge base.

**Q: Can I delete everything?**
A: Yes! In Privacy Settings, click "Delete All Local Data" to remove everything. Your computer will be wiped of Mossy data.

**Q: How do you prevent sharing of personal information?**
A: Patterns are automatically anonymized before sharing - project names, file paths, and personal details are removed. Shared patterns contain only techniques and methods.

**Q: What happens to reported bugs?**
A: Bug reports are reviewed by the Mossy team for privacy issues before analysis. If sensitive information is detected, that report is not processed.

## Getting Help

### Within Mossy
- **Chat with Mossy** - Ask questions directly in the chat interface
- **Settings Menu** - Access Privacy Settings for more details
- **Tutorial** - Can re-run the onboarding from Settings → Help

### Online
- Check the README files in each module
- Visit the Mossy documentation
- Report bugs or request features

## Quick Start Tips

1. **First Use:** Complete the onboarding (3-5 minutes)
2. **Get Connected:** Select your tools in Step 2
3. **Stay Private:** Review Step 3 settings (defaults are secure)
4. **Start Modding:** Click "Talk to Mossy" and describe your project
5. **Pro Tip:** Mossy learns from conversations - more specific = better help

## What Mossy Can Do

- ✅ Help write Papyrus scripts
- ✅ Design and optimize 3D meshes
- ✅ Plan and design quests
- ✅ Solve compatibility issues
- ✅ Provide modding documentation
- ✅ Help manage mod projects
- ✅ Explain techniques and best practices
- ✅ Debug and optimize code

## What Mossy Won't Do

- ❌ Share your project without permission
- ❌ Send data to the internet (unless you opt-in sharing)
- ❌ Track your activity
- ❌ Sell or monetize your data
- ❌ Request passwords or sensitive credentials
- ❌ Force any sharing features

## Need More Help?

1. **For Privacy Questions:** See Privacy Settings page
2. **For Technical Issues:** Check the troubleshooting section
3. **For Feature Requests:** Chat with Mossy directly
4. **For Data Concerns:** Contact the Mossy support team

---

**Remember:** Mossy is here to help YOU succeed in modding. Your privacy and control over your data are always the priority. Enjoy your modding journey!

*Version 5.4.23* | *Last Updated: February 2026*
