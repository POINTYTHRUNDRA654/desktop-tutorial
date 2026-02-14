# Sim Settlements 2: Add-On Toolkits & Tutorials

**Version:** 1.0  
**Last Updated:** January 24, 2026  
**Scope:** Resources, toolkits, and tutorial references for SS2 add-on creation  
**Audience:** Addon pack authors, beginner to advanced modders

## Table of Contents

1. [Introduction](#introduction)
2. [Add-On Maker's Toolkit](#add-on-makers-toolkit)
3. [Bethesda Mod School Resources](#bethesda-mod-school-resources)
4. [Getting Started with Add-Ons](#getting-started-with-add-ons)
5. [Tutorial Organization](#tutorial-organization)
6. [Community Resources](#community-resources)
7. [Recommended Learning Path](#recommended-learning-path)

---

## Introduction

Creating Sim Settlements 2 add-ons requires specialized tools, knowledge of the Creation Kit, and understanding of SS2's systems. This guide consolidates the essential resources needed to begin your add-on creation journey.

### What You Can Create

With the Add-On Maker's Toolkit and proper knowledge, you can develop:

- **Building Plans** - Custom structures and automation for player settlements
- **City Plans** - Complete settlement designs with multiple progression levels
- **Character Cards** - NPC personality and preference systems
- **Worldspaces** - Custom locations for settlement integration
- **Addon Systems** - Discovery, flags, holidays, leaders, newspapers, pets, supplies, world repopulation
- **Traits & Leaders** - Settlement leadership with bonuses and penalties
- **Conversion/Production** - Industrial resource generation

### Prerequisites

Before starting:
- Install the Creation Kit (free from Bethesda launcher)
- Understand basic modding concepts
- Have Fallout 4 and related DLC installed
- Allocate time for learning (estimated 20-100 hours depending on complexity)

---

## Add-On Maker's Toolkit

### What is the Toolkit?

The Add-On Maker's Toolkit is a comprehensive package provided by the Sim Settlements 2 development team containing:

- **Example Plugins** - Pre-built add-ons demonstrating best practices
- **Template Files** - Starting points for different content types
- **Reference Documentation** - Inline notes and explanations
- **Web Tools** - City Plan Maker, Building Plan Generators
- **Scripts & Resources** - Papyrus scripts and utility tools
- **Quick-Start Guides** - Getting started documentation

### Obtaining the Toolkit

**Official Download Location:**
- Nexus Mods: Sim Settlements 2 (find link in main mod description)
- Discord Server: #downloads or #resources channel
- Alternative: GitHub releases (if applicable)

**Contents Breakdown:**

```
SS2 Add-On Maker's Toolkit/
├── Documentation/
│   ├── Guides/
│   ├── Quick-Starts/
│   └── References/
├── Templates/
│   ├── BuildingPlans/
│   ├── CityPlans/
│   ├── CharacterCards/
│   └── Worldspaces/
├── Examples/
│   ├── ExampleAddon1/
│   ├── ExampleAddon2/
│   └── ExampleAddon3/
├── Tools/
│   ├── CityPlanMaker/
│   ├── BuildingPlanHelper/
│   └── DataSheets/
└── Resources/
    ├── Papyrus Scripts/
    ├── Reference Plugins/
    └── Assets/
```

### Toolkit Features

#### Example Plugins

Pre-built add-ons showing:
- Proper folder structure
- Correct file naming conventions
- Best practices for plugin management
- Integration patterns with SS2
- Complete workflow examples

**Study these before creating your own content**

#### Template Files

Starting templates for:
- Building Plan weapon records
- City Plan .esp files
- Character Card forms
- Settlement integration structures

**Tip:** Don't reinvent—duplicate and modify these templates

#### Web Tools

**City Plan Maker** (https://www.simsettlements.com/tools/cpV2maker.php)
- Browser-based plugin generation
- Multi-level city plan support
- Automatic file packaging
- No Creation Kit required for basic setup

**Building Plan Helper** (if available)
- Resource calculation assistance
- Cost balancing tools
- Production estimation

#### Documentation Included

- Markdown guides for all major systems
- Property-by-property breakdowns
- Common pitfalls and solutions
- Troubleshooting references
- Integration procedures

---

## Bethesda Mod School Resources

### About Bethesda Mod School

**Creator:** kinggath (Sim Settlements 2 Lead Developer)  
**Platform:** YouTube  
**Focus:** Comprehensive modding tutorials from beginner to advanced  
**Availability:** Free on YouTube

### Channel Overview

The Bethesda Mod School channel provides:
- Step-by-step modding tutorials
- Creation Kit walkthroughs
- Best practices and design patterns
- Advanced scripting techniques
- Fallout 4 specific content
- Regular updates as systems evolve

### Key Video Series

#### Beginner Series

**Creation Kit Fundamentals**
- Installing and configuring Creation Kit
- User interface overview
- Basic form creation
- Plugin management
- Save and load procedures

**Your First Addon**
- Complete walkthrough of creating initial addon
- Testing and debugging
- Packaging for distribution
- Common beginner mistakes

#### SS2 Specific Series

**Sim Settlements 2 Add-On Creation**
- System overview and architecture
- Building Plan creation from scratch
- City Plan design and testing
- Character Card setup
- Worldspace integration

**Advanced Systems**
- Conversion and Production classes
- Industrial resource management
- Trait and leader creation
- Unlock system implementation
- Custom event triggers

#### Technical Tutorials

**Papyrus Scripting**
- Syntax and structure
- Function creation
- Event handling
- Debugging techniques
- Common patterns and solutions

**Workshop Framework**
- Settlement integration
- Resource management
- Plot systems
- Workshop-specific features

**Creation Kit Mastery**
- Advanced form editing
- References and references IDs
- Navmeshing
- Lighting and optimization
- Performance debugging

### How to Access

1. Go to YouTube
2. Search: "Bethesda Mod School" or "kinggath"
3. Subscribe to stay updated with new tutorials
4. Check Sim Settlements Discord for playlist links
5. Note video upload dates—older tutorials may need updates

### Recommended Viewing Order

**Week 1 - Foundations**
- Creation Kit installation and setup
- UI overview and basic navigation
- Your first addon walkthrough (Part 1-3)

**Week 2-3 - SS2 Basics**
- Sim Settlements 2 overview
- Building Plan creation fundamentals
- Understanding the development workflow

**Week 4+ - Your First Project**
- Choose your add-on type
- Follow relevant tutorial series
- Refer back to documentation as needed

---

## Getting Started with Add-Ons

### Step 1: Preparation

**Setup Checklist:**
- [ ] Creation Kit installed and working
- [ ] Fallout 4 + DLC fully installed
- [ ] Add-On Maker's Toolkit downloaded
- [ ] YouTube Bethesda Mod School bookmarked
- [ ] Sim Settlements 2 installed in test game
- [ ] Text editor for documentation (Notepad++, VS Code)
- [ ] GitHub account (optional but recommended)

### Step 2: Learning Phase

**Minimum Learning Path (20-30 hours):**
1. Watch "Your First Addon" series (3-5 videos, 1-2 hours)
2. Read "Creating Building Plans" guide (1-2 hours)
3. Watch specific system tutorials (2-4 hours)
4. Read relevant documentation from toolkit (3-5 hours)
5. Study example plugins in toolkit (3-5 hours)
6. Attempt simple modification to example addon (2-3 hours)

**Total: ~15-25 hours before creating original content**

### Step 3: Choose Your First Project

**Easy Starting Points:**
- Simple building plan (single purpose, basic resources)
- Character card additions (if addon already exists)
- Small worldspace addon (leveraging existing templates)

**Avoid for First Project:**
- Complex multi-system addons
- Extensive Papyrus scripting
- Advanced trait effects
- Full-featured city plans

**Recommended First Project:**
Create a single building plan addon that:
- Produces one resource type
- Uses existing cost structure
- Includes 2-3 levels
- No custom Papyrus scripts

### Step 4: Development

**Workflow:**
1. Create plugin in Creation Kit
2. Reference example addon as template
3. Follow tutorial for your content type
4. Refer to documentation frequently
5. Test in-game after each major change
6. Join Discord for quick questions

### Step 5: Testing

**Pre-Release Testing:**
- [ ] Loads without errors
- [ ] All forms present in expected location
- [ ] No conflicts with SS2 systems
- [ ] All costs display correctly
- [ ] No missing references
- [ ] Visually appears as intended
- [ ] Documentation is accurate
- [ ] Tested in multiple save states

### Step 6: Packaging & Distribution

**Release Preparation:**
1. Create appropriate folder structure
2. Write clear README with requirements
3. List compatibility and dependencies
4. Package .zip or .7z
5. Upload to Nexus Mods or GitHub
6. Include link in Discord #releases channel

---

## Tutorial Organization

### By Skill Level

#### Beginner
- Installation and setup
- Basic plugin creation
- Your first addon
- Simple building plans
- Understanding resources

#### Intermediate
- Multi-level designs
- Complex resources
- Character cards
- Worldspace basics
- Trait creation

#### Advanced
- Papyrus scripting
- Custom effects
- Advanced worldspaces
- Full addon packs
- Performance optimization

### By Content Type

#### Building Plans
1. Watch: "Building Plan Creation Fundamentals"
2. Read: Building Plans guide from documentation
3. Study: Example building plans in toolkit
4. Create: Your first simple building plan
5. Enhance: Add multiple levels and progression

#### City Plans
1. Read: City Plans overview
2. Use: City Plan Maker web tool
3. Watch: "City Plan Design and Testing"
4. Study: Example city plans
5. Create: Your custom city plan

#### Character Cards
1. Watch: "Character Card Setup"
2. Read: Character Cards guide
3. Study: Example character cards
4. Create: Simple character card addon
5. Expand: Create diverse character pool

#### Worldspaces
1. Watch: "Worldspace Integration"
2. Read: Worldspace guidelines
3. Study: Example worldspace addon
4. Create: Small custom worldspace
5. Refine: Add caravans and connections

#### Advanced Systems
1. Read: Respective system documentation
2. Watch: Advanced system tutorials
3. Study: Complex example addons
4. Create: Your custom implementation
5. Test: Thoroughly before release

---

## Community Resources

### Official Channels

**Discord Server**
- Real-time help and questions
- #modding-help channel
- #resources and #downloads
- Community showcase
- Developers available for complex questions

**Forum / Discussion**
- Nexus Mods: Comments and discussion
- GitHub: Issue tracking and pull requests
- Documentation: Feedback and suggestions

### Learning Resources

**External Tutorials**
- UESP (Unofficial Elder Scrolls Pages) - Creation Kit info
- Community wikis - User-contributed guides
- Mod author showcases - Learning from released addons

**Books and References**
- Creation Kit Documentation (built-in)
- Papyrus Language Reference
- Workshop Framework guide
- Community-maintained wikis

### Addon Community

**Featured Addon Creators**
- Study successful addons for best practices
- Analyze file structure and organization
- Review release notes for lessons learned
- Contribute improvements where possible

**Contributing Back**
- Share your creations
- Help others with problems
- Report bugs and improvements
- Contribute to documentation

---

## Recommended Learning Path

### Timeline: 6-12 Weeks to First Release

#### Week 1-2: Foundation
- **Goal:** Understand SS2 architecture
- **Activities:** 
  - Install toolkit and watch "Your First Addon" Part 1-3
  - Read building plans and resources overview
  - Explore example plugins in toolkit
- **Time:** 5-10 hours
- **Output:** Understanding of workflow

#### Week 3-4: Core Concepts
- **Goal:** Learn your chosen content type
- **Activities:**
  - Watch specific tutorial series for your focus
  - Read relevant documentation sections
  - Study 2-3 example addons of your type
- **Time:** 8-12 hours
- **Output:** Conceptual understanding

#### Week 5-6: First Attempt
- **Goal:** Create simple addon
- **Activities:**
  - Set up plugin file in Creation Kit
  - Duplicate example addon as base
  - Create one building plan OR character card OR small addon
  - Test in-game
- **Time:** 10-15 hours
- **Output:** Working addon (even if simple)

#### Week 7-8: Refinement
- **Goal:** Add features and polish
- **Activities:**
  - Add multiple levels or variations
  - Implement proper costs
  - Create multiple items
  - Comprehensive testing
- **Time:** 10-15 hours
- **Output:** Multi-featured addon

#### Week 9-10: Documentation
- **Goal:** Prepare for release
- **Activities:**
  - Write comprehensive README
  - Create proper folder structure
  - Compile compatibility list
  - Final testing
- **Time:** 3-5 hours
- **Output:** Release-ready addon

#### Week 11-12: Release & Iteration
- **Goal:** Publish and gather feedback
- **Activities:**
  - Upload to Nexus/GitHub
  - Announce in community
  - Address initial feedback
  - Plan Version 1.1 improvements
- **Time:** 3-5 hours
- **Output:** Published addon

### Study Prioritization

**Essential (Must Learn):**
1. Creation Kit basics
2. Building plan creation
3. Resource system
4. In-game testing workflow
5. File organization

**Important (Should Learn):**
6. Your specific content type details
7. Papyrus basics (if modifying scripts)
8. City plan creation
9. Requirements and conditions
10. Community standards

**Optional (Nice to Know):**
11. Advanced Papyrus scripting
12. Custom traits and perks
13. Worldspace optimization
14. Advanced discovery systems
15. Custom quest integration

---

## Toolkit Content Deep Dive

### Documentation Files

**Reference Guides Included:**
- Building Plans: Properties and Configuration
- City Plans: Level design and creation
- Character Cards: NPC customization
- Resources: Virtual and material systems
- Industrial: Conversion and production
- Traits: Effect types and balancing
- Worldspaces: Integration and design
- Troubleshooting: Common issues and solutions

### Example Code & Scripts

**Papyrus Examples:**
- Basic script structure
- Common functions
- Event handling
- State management
- Best practices

**Pre-configured Assets:**
- Default outfits
- Resource formlists
- Keyword structures
- Registration patterns

### Template Files for Import

**Creation Kit Templates:**
- Base building plan form
- City plan structure
- Character card setup
- Worldspace form
- NPC actor record

**Ready-to-Edit Files:**
- Modify instead of creating from scratch
- Reduced setup time
- Built-in best practices
- Compatible structure

---

## Advanced Resources

### Web-Based Tools

**City Plan Maker** (Official)
- URL: https://www.simsettlements.com/tools/cpV2maker.php
- Purpose: Generate city plan plugins
- Features: Multi-level support, batch creation, export optimization

**Building Plan Calculator** (Community)
- Purpose: Calculate resource balance
- Features: Cost estimation, production analysis

### Video Content Organization

**Organized Playlists (typically on YouTube):**
- Sim Settlements 2 Development Diary
- Addon Creation Series
- Advanced Modding Topics
- System Walkthroughs
- Community Showcases

### Live Resources

**Discord Community:**
- Real-time Q&A
- Peer learning
- Showcase channels
- Event announcements
- Resource pinning

**Periodic Streams:**
- Live addon creation
- Q&A sessions
- System deep-dives
- Community challenges

---

## Troubleshooting Resources

### When You Get Stuck

**First Steps:**
1. Check toolkit documentation for your topic
2. Search YouTube for tutorial on specific problem
3. Review example addon handling of same issue
4. Ask in Discord #modding-help with context

**What to Include in Help Request:**
- What you're trying to do
- What you've already tried
- What error/behavior you're seeing
- Relevant plugin name or file
- Creation Kit version

### Common Issues Quick Reference

**"Form won't appear in game"**
→ Check registration in FormLists
→ Verify FLID keywords correct

**"Cost displays wrong"**
→ Verify ActorValue selection
→ Check iCount values
→ Confirm category (iIndex) setting

**"Actor looks wrong"**
→ Verify race and template
→ Check outfit configuration
→ Review keyword assignments

**"Settlement won't recognize plot"**
→ Confirm plot type keyword
→ Verify building class setup
→ Check registration status

---

## Additional Learning Tips

### Best Practices for Learning

1. **Learn by Doing** - Don't just watch, pause and replicate
2. **Take Notes** - Document what you learn for reference
3. **Read Code** - Study example addons critically
4. **Test Frequently** - Don't wait until "done" to test
5. **Join Community** - Ask questions and share progress
6. **Version Control** - Use backup saves while learning
7. **Read Errors** - Creation Kit error messages are helpful
8. **Ask Questions** - Community is helpful to beginners

### Resources Worth Bookmarking

- Official SS2 Discord server
- Nexus Mods SS2 mod page
- Bethesda Mod School YouTube channel
- Creation Kit official documentation
- Workshop Framework guide
- GitHub for example projects

### Time Investment Reality

**For Simple Addon (1 building plan):**
- Learning: 15-20 hours
- Development: 5-10 hours
- Testing & Polish: 5-10 hours
- **Total: 25-40 hours**

**For Medium Addon Pack (5-10 plans):**
- Learning: 20-30 hours (reuses knowledge)
- Development: 15-30 hours
- Testing & Polish: 10-15 hours
- **Total: 45-75 hours**

**For Complex Addon (with systems):**
- Learning: 30-50 hours
- Development: 30-60 hours
- Testing & Polish: 20-30 hours
- **Total: 80-140 hours**

---

## Quick Start Checklist

### Before You Begin

- [ ] Creation Kit installed and launched successfully
- [ ] Fallout 4 with DLC installed
- [ ] Add-On Maker's Toolkit downloaded and extracted
- [ ] Watched "Your First Addon" series (3-5 videos)
- [ ] Discord account created and joined server
- [ ] Test mod installed and working in Fallout 4
- [ ] Text editor (Notepad++, VS Code) ready
- [ ] Folder structure created for your project

### First Day Goals

- [ ] Watch "Your First Addon" Part 1
- [ ] Create new .esp plugin in Creation Kit
- [ ] Duplicate example addon form
- [ ] Modify form properties
- [ ] Save and load without errors
- [ ] Join Discord and say hello

### First Week Goals

- [ ] Complete "Your First Addon" series
- [ ] Read building plans documentation
- [ ] Examine 3 example building plans
- [ ] Create your first simple building plan
- [ ] Test in-game and verify appearance
- [ ] Ask community one question about process

### First Month Goals

- [ ] Create 3-5 working addon pieces
- [ ] Add progression levels (L1, L2, L3)
- [ ] Implement proper cost structure
- [ ] Write comprehensive documentation
- [ ] Package addon for distribution
- [ ] Get feedback from community

---

## Next Steps

Once you've completed the learning path:

1. **Create Your Addon** - Apply what you've learned
2. **Test Thoroughly** - Use multiple save games, test all scenarios
3. **Document Well** - Clear readme, version history, compatibility
4. **Get Feedback** - Share with community, iterate on v1.1
5. **Share Knowledge** - Help newer creators when you're able
6. **Keep Learning** - Stay updated on system changes and improvements

---

**Document Version:** 1.0  
**Last Updated:** January 24, 2026  
**Maintained By:** Mossy Documentation Team  
**Source:** Sim Settlements 2 Development Team, kinggath, Community Resources

## Additional Resources Links

- **Official SS2:** [Nexus Mods - Sim Settlements 2](https://www.nexusmods.com)
- **City Plan Maker:** https://www.simsettlements.com/tools/cpV2maker.php
- **Bethesda Mod School:** YouTube - Search "Bethesda Mod School" or "kinggath"
- **Community Discord:** Check Nexus Mods page for Discord link
- **Creation Kit:** Free from Bethesda Launcher

