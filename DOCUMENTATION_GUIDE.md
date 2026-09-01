# Mossy Documentation Guide

## 📖 Where to Find What You Need

This guide helps you navigate Mossy's documentation and find the information you need.

---

## 🎯 Quick Reference

| If you want to... | Go to... |
|---|---|
| **See what each page looks like** | [VISUAL_GUIDE.md](VISUAL_GUIDE.md) - 55+ screenshots |
| **Learn as a complete beginner** | [MOSSY_TUTORIAL_ENHANCED.md](MOSSY_TUTORIAL_ENHANCED.md) |
| **Get detailed technical info** | [MOSSY_COMPREHENSIVE_TUTORIAL.md](MOSSY_COMPREHENSIVE_TUTORIAL.md) |
| **Quick start developing** | [GETTING_STARTED.md](GETTING_STARTED.md) |
| **Learn Blender integration** | [BLENDER_ADDON_TUTORIAL.md](resources/public/knowledge/BLENDER_ADDON_TUTORIAL.md) |
| **Package and release** | [PACKAGING_GUIDE.md](PACKAGING_GUIDE.md) |

---

## 📚 Main Documentation Files

### For End Users

#### [VISUAL_GUIDE.md](VISUAL_GUIDE.md)
**Best for:** First-time users who want to see what every page looks like
- ✅ 55+ actual application screenshots
- ✅ Page-by-page walkthrough
- ✅ "What this page is for" explanations
- ✅ Step-by-step usage instructions
- ✅ Beginner tips for each page

**Start here if:** You're brand new and want to see what Mossy looks like before diving in.

#### [MOSSY_TUTORIAL_ENHANCED.md](MOSSY_TUTORIAL_ENHANCED.md)
**Best for:** Complete beginners to Fallout 4 modding
- ✅ Every button and control explained
- ✅ Common mistakes and how to avoid them
- ✅ Glossary of modding terms
- ✅ Screenshots with descriptions
- ✅ Assumes NO prior modding knowledge

**Start here if:** You've never modded Fallout 4 before and need hand-holding.

#### [MOSSY_COMPREHENSIVE_TUTORIAL.md](MOSSY_COMPREHENSIVE_TUTORIAL.md)
**Best for:** Users who want complete technical details
- ✅ In-depth feature documentation
- ✅ All keyboard shortcuts
- ✅ Advanced configuration options
- ✅ FAQ and troubleshooting
- ✅ Assumes some technical familiarity

**Start here if:** You're comfortable with computers and want to learn everything Mossy can do.

### For Developers

#### [GETTING_STARTED.md](GETTING_STARTED.md)
Development quick-start guide

#### [README.md](README.md)
Project overview and installation instructions

#### [CONTRIBUTING.md](CONTRIBUTING.md)
How to contribute to Mossy development

---

## 📸 Screenshots and Visual Resources

### Main Screenshot Directories

1. **`/visual-guide-images/`** (55+ screenshots)
   - Complete application screenshots
   - Every page captured
   - Used by VISUAL_GUIDE.md
   - Naming: "Page X, feature name.png"

2. **`/docs/screenshots/`** (9 core screenshots)
   - Key interface elements
   - Quick reference screenshots
   - Used by tutorials
   - Naming: "feature-description.png"

### Screenshot Documentation

- **[docs/screenshots/README.md](docs/screenshots/README.md)** - Screenshot locations and usage
- **[SCREENSHOT_GUIDE_FOR_TUTORIAL.md](SCREENSHOT_GUIDE_FOR_TUTORIAL.md)** - How to reference screenshots

---

## 🎓 Specialized Guides

### Integration Guides
- **[BLENDER_ADDON_TUTORIAL.md](resources/public/knowledge/BLENDER_ADDON_TUTORIAL.md)** - Blender integration
- **[BLENDER_MASTER_GUIDE.md](BLENDER_MASTER_GUIDE.md)** - Complete Blender reference
- **[ANIMATION_SUITE_IMPLEMENTATION.md](resources/public/knowledge/ANIMATION_SUITE_IMPLEMENTATION.md)** - Animation workflow

### Development Guides
- **[BUILD_GUIDE.md](BUILD_GUIDE.md)** - How to build Mossy
- **[PACKAGING_GUIDE.md](PACKAGING_GUIDE.md)** - Creating installers
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Running tests

### Feature-Specific Guides
- **[CK_CRASH_PREVENTION_GUIDE.md](CK_CRASH_PREVENTION_GUIDE.md)** - Creation Kit safety
- **[CLOUD_SYNC_ENGINE_GUIDE.md](CLOUD_SYNC_ENGINE_GUIDE.md)** - Cloud sync features
- **[PAPYRUS_COMPILER_GUIDE.md](PAPYRUS_COMPILER_GUIDE.md)** - Script compilation

---

## 🔍 How to Search Documentation

### By Topic

**AI and Chat:**
- Chat Interface → MOSSY_TUTORIAL_ENHANCED.md (section 5)
- Live Voice → MOSSY_TUTORIAL_ENHANCED.md (section 6)
- AI Configuration → MOSSY_COMPREHENSIVE_TUTORIAL.md

**Asset Management:**
- The Auditor → MOSSY_TUTORIAL_ENHANCED.md (section 7)
- Image Suite → MOSSY_COMPREHENSIVE_TUTORIAL.md
- The Vault → MOSSY_COMPREHENSIVE_TUTORIAL.md

**Development Tools:**
- Workshop → MOSSY_COMPREHENSIVE_TUTORIAL.md
- Papyrus Scripts → PAPYRUS_COMPILER_GUIDE.md
- Creation Kit → CK_CRASH_PREVENTION_GUIDE.md

**System Integration:**
- Desktop Bridge → MOSSY_COMPREHENSIVE_TUTORIAL.md
- Tool Detection → VISUAL_GUIDE.md (Page 20, 39, 48)
- Neural Link → README.md

### By File Type

**For `.esp` files:** → The Auditor section in tutorials
**For `.nif` files:** → The Auditor + NIFSKOPE_DIVA11_GUIDE.md
**For `.dds` files:** → Image Suite + The Auditor
**For `.psc` files:** → Workshop + PAPYRUS_COMPILER_GUIDE.md

---

## 🆘 Troubleshooting Documentation

If you're having issues:

1. **Installation problems** → README.md installation section
2. **Build errors** → BUILD_GUIDE.md
3. **Feature not working** → MOSSY_COMPREHENSIVE_TUTORIAL.md troubleshooting section
4. **Creation Kit crashes** → CK_CRASH_PREVENTION_GUIDE.md
5. **General questions** → MOSSY_TUTORIAL_ENHANCED.md

---

## 📝 Documentation Structure

```
mossy-ai/
├── README.md ................................ Main project overview
├── GETTING_STARTED.md ....................... Quick start guide
├── DOCUMENTATION_GUIDE.md ................... This file
│
├── Tutorials/
│   ├── VISUAL_GUIDE.md ...................... 55+ screenshots walkthrough
│   ├── MOSSY_TUTORIAL_ENHANCED.md ........... Beginner tutorial
│   └── MOSSY_COMPREHENSIVE_TUTORIAL.md ...... Complete reference
│
├── Screenshots/
│   ├── visual-guide-images/ ................. 55+ app screenshots
│   └── docs/screenshots/ .................... 9 core screenshots
│
├── Specialized Guides/
│   ├── BLENDER_*.md ......................... Blender integration
│   ├── PAPYRUS_*.md ......................... Script development
│   ├── CK_*.md .............................. Creation Kit guides
│   └── [Feature]_GUIDE.md ................... Individual features
│
└── Development/
    ├── BUILD_GUIDE.md ....................... Building from source
    ├── PACKAGING_GUIDE.md ................... Creating installers
    ├── TESTING_GUIDE.md ..................... Running tests
    └── CONTRIBUTING.md ...................... Contributing code
```

---

## 💡 Tips for Using Documentation

### For New Users
1. Start with VISUAL_GUIDE.md to see what Mossy looks like
2. Read MOSSY_TUTORIAL_ENHANCED.md sections as you explore
3. Use screenshots to confirm you're on the right page
4. Ask Mossy AI questions as you go (use Chat Interface)

### For Experienced Modders
1. Skim MOSSY_COMPREHENSIVE_TUTORIAL.md table of contents
2. Jump to sections relevant to your workflow
3. Bookmark specialized guides you use often
4. Check keyboard shortcuts for efficiency

### For Developers
1. Read GETTING_STARTED.md for setup
2. Review BUILD_GUIDE.md for development workflow
3. Check CONTRIBUTING.md before submitting PRs
4. Use specialized guides as API reference

---

## 📱 Documentation Updates

**Current Version:** 5.4.24 (February 2026)

Documentation is updated with each release. If you find:
- ❌ Broken screenshot links
- ❌ Outdated instructions
- ❌ Missing information

Please open an issue on GitHub!

---

## 🤝 Contributing to Documentation

Want to improve Mossy's documentation?

1. **Fix typos/errors** → Edit markdown files directly
2. **Add screenshots** → Follow SCREENSHOT_GUIDE_FOR_TUTORIAL.md
3. **Write new guides** → Use existing guides as templates
4. **Update tutorials** → Test instructions as you write

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

**Questions?** Ask in:
- Chat Interface (within Mossy)
- GitHub Issues
- Community Discord (link in README.md)

