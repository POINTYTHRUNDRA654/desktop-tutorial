# Progressive Knowledge Framework for Mossy

## Design Philosophy

**Core Principle:** Every feature and guide in Mossy must serve **both beginners and experts** simultaneously without compromising either experience.

### The Challenge

Fallout 4 modding spans from simple texture swaps to complex script overhauls. Our users range from:
- **Complete beginners**: Never modded before, overwhelmed by terminology
- **Intermediate users**: Comfortable with basics, want to go deeper
- **Advanced modders**: Need full control, technical details, optimization

### The Solution: Adaptive Progressive Disclosure

**Progressive Disclosure** = Show simple first, reveal complexity on demand
**Adaptive** = Interface adjusts to user's demonstrated skill level

---

## Core Principles

### 1. **Start Simple, Scale Up**

Every feature should have three interaction levels:

```
┌─────────────────────────────────────┐
│  🟢 BEGINNER MODE (Default)         │
│  "I just want it to work"           │
│  - Guided workflows                 │
│  - Safe defaults                    │
│  - Plain language                   │
│  - One-click actions                │
└─────────────────────────────────────┘
           ↓ (Show More)
┌─────────────────────────────────────┐
│  🟡 INTERMEDIATE MODE                │
│  "I want to understand what's happening" │
│  - Explanations of choices          │
│  - Customization options            │
│  - Technical terms with tooltips    │
│  - Manual controls                  │
└─────────────────────────────────────┘
           ↓ (Advanced Settings)
┌─────────────────────────────────────┐
│  🔴 ADVANCED MODE                    │
│  "I know exactly what I'm doing"    │
│  - All parameters exposed           │
│  - Technical documentation          │
│  - Expert terminology               │
│  - Direct file editing              │
└─────────────────────────────────────┘
```

### 2. **Never Assume Prior Knowledge**

Every technical term gets:
- ✅ Plain language explanation
- ✅ Hover tooltip with details
- ✅ "Learn more" link to comprehensive docs
- ✅ Visual examples when possible

**Example:**
```
INI Settings [?]
├─ Beginner: "Game configuration files that control how Fallout 4 runs"
├─ Tooltip: "INI files contain key-value pairs that modify game behavior"
└─ Learn More: → Link to "Complete INI Reference"
```

### 3. **Provide Multiple Entry Points**

Each feature should be accessible via:
1. **Wizard/Guided Mode**: Step-by-step with hand-holding
2. **Quick Actions**: One-click presets for common tasks
3. **Manual Mode**: Full control for experts
4. **Templates**: Pre-configured starting points

### 4. **Fail Safely, Teach Gently**

When users make mistakes:
- ❌ Don't just show error codes
- ✅ Explain what went wrong in plain language
- ✅ Suggest specific fixes
- ✅ Offer to auto-fix if possible
- ✅ Link to relevant tutorial

**Example:**
```
❌ Bad: "Error: Invalid iSize H value"
✅ Good: "The screen height setting (iSize H) needs to match your monitor.
         Your monitor is 1920x1080, but you entered 800.
         → [Fix Automatically] or [Learn about INI settings]"
```

### 5. **Show Don't Tell (When Possible)**

- ✅ Visual comparisons (before/after screenshots)
- ✅ Interactive demos
- ✅ Preview changes before applying
- ✅ Live feedback during configuration

---

## Implementation Patterns

### Pattern 1: Tabbed Complexity Levels

**UI Structure:**
```tsx
<FeatureContainer>
  <SkillLevelSelector>
    <Tab value="beginner">🟢 Easy Mode</Tab>
    <Tab value="intermediate">🟡 Standard</Tab>
    <Tab value="advanced">🔴 Expert</Tab>
  </SkillLevelSelector>
  
  <ContentArea>
    {mode === 'beginner' && <GuidedWorkflow />}
    {mode === 'intermediate' && <CustomizableWorkflow />}
    {mode === 'advanced' && <FullControlPanel />}
  </ContentArea>
</FeatureContainer>
```

**Example: INI Configuration Manager**

```tsx
// Beginner Mode
<SafetyPresets>
  <Button>Apply Safe Settings for My PC</Button>
  <Description>
    Automatically configures Fallout 4 based on your hardware.
    This is safe and recommended for most users.
  </Description>
</SafetyPresets>

// Intermediate Mode
<PresetSelector>
  <Preset name="Low" description="For older PCs (2015-2017)" />
  <Preset name="Medium" description="For mid-range PCs" />
  <Preset name="High" description="For modern PCs" />
  <Preset name="Ultra" description="For high-end gaming PCs" />
  <Preset name="Custom" description="Customize each setting" />
</PresetSelector>

// Advanced Mode
<FullEditor>
  <FileSelector files={['Fallout4.ini', 'Fallout4Prefs.ini', 'Fallout4Custom.ini']} />
  <SettingsTable>
    <Row>
      <Setting>[Display]iSize W</Setting>
      <CurrentValue>1920</CurrentValue>
      <RecommendedValue>1920</RecommendedValue>
      <Actions>
        <EditButton />
        <InfoButton />
      </Actions>
    </Row>
  </SettingsTable>
</FullEditor>
```

### Pattern 2: Expandable Details

Use progressive disclosure for explanations:

```tsx
<Setting name="bFloatPointRenderTarget">
  <Label>
    Float Point Render Target
    <QuickTooltip>Required for ENB</QuickTooltip>
  </Label>
  
  <Value toggle={true} />
  
  <ExpandableDetails>
    <SimpleExplanation>
      This setting allows ENB visual mods to work. Turn it on if you use ENB.
    </SimpleExplanation>
    
    <TechnicalDetails collapsed>
      <h4>Technical Details</h4>
      <p>
        Enables 32-bit floating-point render targets, allowing for
        high dynamic range (HDR) rendering. Required for post-processing
        effects like ENB. Minimal performance impact on modern GPUs.
      </p>
      <h4>Performance Impact</h4>
      <ul>
        <li>GPU: ~2-5% overhead</li>
        <li>VRAM: +100-200 MB</li>
      </ul>
    </TechnicalDetails>
  </ExpandableDetails>
</Setting>
```

### Pattern 3: Contextual Help System

Every screen should have:

```tsx
<HelpPanel>
  <QuickHelp>
    <Icon type="beginner" />
    <Title>New to this?</Title>
    <Actions>
      <Button>Start Guided Tour</Button>
      <Button>Watch Video Tutorial</Button>
      <Link>Read Beginner Guide</Link>
    </Actions>
  </QuickHelp>
  
  <ContextualTips>
    <Tip relevance={0.95}>
      💡 Tip: Click the green "Auto-Configure" button for safe defaults
    </Tip>
    <Tip relevance={0.87}>
      ⚠️ Note: Changes won't apply until you restart the game
    </Tip>
  </ContextualTips>
  
  <RelatedResources>
    <Resource title="INI Settings Guide" level="beginner" />
    <Resource title="Performance Optimization" level="intermediate" />
    <Resource title="Advanced INI Tweaks" level="advanced" />
  </RelatedResources>
</HelpPanel>
```

### Pattern 4: Smart Defaults with Override

```tsx
<SmartDefaults>
  <AutoDetected>
    ✅ Automatically configured based on:
    - Your GPU: NVIDIA RTX 3060
    - Your monitor: 1920x1080 @ 144Hz
    - Your mods: 47 active mods detected
  </AutoDetected>
  
  <RecommendedSettings>
    <Setting name="Shadow Quality" value="High" reason="Your GPU can handle it" />
    <Setting name="God Rays" value="Medium" reason="Performance balance" />
    <Setting name="Draw Distance" value="High" reason="1080p doesn't need lower" />
  </RecommendedSettings>
  
  <OverrideOption>
    Not what you want? <Button>Customize Settings</Button>
  </OverrideOption>
</SmartDefaults>
```

### Pattern 5: Wizard + Expert Toggle

```tsx
<WizardMode active={!expertMode}>
  <Step current={1} total={5}>
    <StepTitle>Choose Your Goal</StepTitle>
    <Options>
      <Option icon="🎮">Best Performance</Option>
      <Option icon="🎨">Best Visuals</Option>
      <Option icon="⚖️">Balanced</Option>
    </Options>
    <Navigation>
      <Button>Next Step →</Button>
    </Navigation>
  </Step>
</WizardMode>

<ExpertModeToggle>
  <Checkbox checked={expertMode} onChange={toggleMode}>
    I know what I'm doing, skip the wizard
  </Checkbox>
</ExpertModeToggle>
```

---

## Content Structure Template

Every guide should follow this structure:

### Level 1: Quick Start (Beginners)

```markdown
# [Feature Name] - Quick Start

## What is this?
[1-2 sentence plain language explanation]

## Why should I care?
[Practical benefit for the user]

## Quick Actions
- [One-click preset 1]
- [One-click preset 2]
- [Safe default option]

## 5-Minute Tutorial
1. [Simple step with screenshot]
2. [Simple step with screenshot]
3. [Simple step with screenshot]
4. Done! [What to expect next]

## Common Questions
Q: [Simple question beginners ask]
A: [Simple answer with no jargon]

---
👉 Want to learn more? Continue to [Intermediate Guide] →
```

### Level 2: Standard Guide (Intermediate)

```markdown
# [Feature Name] - Complete Guide

## Overview
[Comprehensive explanation with some technical terms]

## How It Works
[Conceptual explanation of underlying system]

## Features
### Feature 1
- What it does
- When to use it
- Example use case

### Feature 2
[etc...]

## Step-by-Step Tutorial
### Scenario 1: [Common use case]
1. [Detailed step]
2. [Detailed step]
[Screenshots, code examples]

### Scenario 2: [Another use case]
[etc...]

## Customization Options
[Available settings with explanations]

## Troubleshooting
Problem: [Common issue]
Solution: [How to fix]

## Best Practices
- [Tip 1]
- [Tip 2]

---
🔰 New to this? See [Quick Start Guide] ←
🔧 Want more control? See [Advanced Guide] →
```

### Level 3: Advanced Reference (Experts)

```markdown
# [Feature Name] - Advanced Reference

## Technical Architecture
[Deep technical explanation]

## API Reference
[All parameters, options, flags]

## Advanced Use Cases
### Use Case 1: [Complex scenario]
[Technical implementation]

### Use Case 2: [Edge case]
[Technical implementation]

## Performance Optimization
[Technical tweaks and benchmarks]

## Integration with Other Tools
[How to combine with other features]

## Known Limitations
[Technical constraints]

## Source Code
[Links to relevant code if open source]

## Advanced Troubleshooting
[Technical debugging steps]

---
📖 Want a gentler introduction? See [Standard Guide] ←
```

---

## Specific Feature Examples

### INI Configuration Manager

**🟢 Beginner View:**
```
┌──────────────────────────────────────┐
│ 🎯 What do you want?                 │
│                                      │
│ ○ Best performance (faster game)    │
│ ○ Best visuals (prettier game)      │
│ ○ Balanced (good mix)                │
│                                      │
│ [Apply My Choice] [Tell me more]    │
└──────────────────────────────────────┘
```

**🟡 Intermediate View:**
```
┌──────────────────────────────────────┐
│ 📊 Current Settings vs Recommended   │
├──────────────────────────────────────┤
│ Shadow Quality                       │
│ Current: Low ⚠️                      │
│ Recommended: High (your GPU can do it)│
│ [Apply] [Keep Current] [?]           │
├──────────────────────────────────────┤
│ Texture Quality                      │
│ Current: High ✓                      │
│ Recommended: High (perfect!)         │
├──────────────────────────────────────┤
│ [...more settings...]                │
│                                      │
│ [Apply All Recommended] [Customize]  │
└──────────────────────────────────────┘
```

**🔴 Advanced View:**
```
┌──────────────────────────────────────┐
│ 📝 Raw INI Editor                    │
├──────────────────────────────────────┤
│ File: Fallout4.ini                   │
│ [Display]                            │
│ iSize H=1080                         │
│ iSize W=1920                         │
│ bFull Screen=1                       │
│ bBorderless=0                        │
│                                      │
│ [Launcher]                           │
│ bEnableFileSelection=1               │
│ [...etc...]                          │
│                                      │
│ [Validate] [Apply] [Backup] [Reset] │
└──────────────────────────────────────┘
```

### Asset Duplicate Scanner

**🟢 Beginner View:**
```
┌──────────────────────────────────────┐
│ 🔍 Free Up Space & Improve Performance│
│                                      │
│ We found duplicate files in your mods│
│ that waste space and slow down the   │
│ game.                                │
│                                      │
│ 💾 You can free up: 8.3 GB          │
│ ⚡ Performance boost: ~15% faster    │
│                                      │
│ [Scan & Clean Automatically]         │
│ [Show me what you found first]       │
│                                      │
│ ✅ Don't worry, we'll backup first!  │
└──────────────────────────────────────┘
```

**🟡 Intermediate View:**
```
┌──────────────────────────────────────┐
│ 📂 Duplicate Files Found              │
├──────────────────────────────────────┤
│ pipboy_screen.dds (3 copies)         │
│ • Mod A: 4.2 MB (2048x2048)          │
│ • Mod B: 4.2 MB (identical)          │
│ • Mod C: 4.1 MB (slightly smaller)   │
│                                      │
│ Recommendation: Keep Mod C version   │
│ Reason: Smallest file, same quality  │
│ [Keep C] [Keep B] [Manual]           │
├──────────────────────────────────────┤
│ vault_suit.nif (2 copies)            │
│ [...etc...]                          │
│                                      │
│ [Auto-Fix All] [Review Each]         │
└──────────────────────────────────────┘
```

**🔴 Advanced View:**
```
┌──────────────────────────────────────┐
│ 🔬 Duplicate Analysis Report          │
├──────────────────────────────────────┤
│ Hash Algorithm: SHA256 + pHash       │
│ Scan Depth: Recursive with BA2       │
│ Threshold: 98% similarity            │
│                                      │
│ Results:                             │
│ • Exact matches: 147 files           │
│ • Similar (>98%): 23 files           │
│ • Total waste: 8,367 MB              │
│                                      │
│ By Mod:                              │
│ • Mod A: 34 duplicates (2.1 GB)      │
│ • Mod B: 29 duplicates (1.8 GB)      │
│ [...detailed breakdown...]           │
│                                      │
│ [Export Report] [Custom Rules]       │
│ [Whitelist] [Advanced Cleanup]       │
└──────────────────────────────────────┘
```

### Game Log Monitor

**🟢 Beginner View:**
```
┌──────────────────────────────────────┐
│ 🚨 Crash Alert!                      │
│                                      │
│ The game is about to crash because:  │
│ A script is broken                   │
│                                      │
│ 🔧 How to fix:                       │
│ 1. Save your game now                │
│ 2. Exit Fallout 4                    │
│ 3. Disable "CustomQuest.esp" mod     │
│ 4. Try again                         │
│                                      │
│ [Save Game Now] [More Details]       │
│ [Report Bug to Mod Author]           │
└──────────────────────────────────────┘
```

**🟡 Intermediate View:**
```
┌──────────────────────────────────────┐
│ 📊 Live Game Monitor                  │
├──────────────────────────────────────┤
│ ⚠️ Warning detected (85% crash risk) │
│                                      │
│ Timeline:                            │
│ 14:23:45 - Quest started             │
│ 14:23:46 - Script attach failed      │
│ 14:23:47 - Memory warning            │
│ 14:23:48 - NOW (predicted crash)     │
│                                      │
│ Problem Mod: CustomQuest.esp         │
│ Issue: Missing master file           │
│                                      │
│ Actions:                             │
│ [Fix Load Order] [Disable Mod]       │
│ [Export Crash Report]                │
└──────────────────────────────────────┘
```

**🔴 Advanced View:**
```
┌──────────────────────────────────────┐
│ 🔍 Log Stream (Live)                  │
├──────────────────────────────────────┤
│ Filter: [All▾] [Errors] [Warnings]  │
│ Source: [All▾] [Papyrus] [Game]     │
│                                      │
│ [14:23:48.123] SCRIPT: Cannot find   │
│                form 0x00012345        │
│                in CustomQuest.esp    │
│                Stack: QuestScript    │
│                +0x45A → OnInit()     │
│                                      │
│ [14:23:48.234] ERROR: Script attach │
│                failed for alias      │
│                "PlayerAlias"         │
│                                      │
│ [14:23:48.345] WARNING: Memory alloc│
│                failed (Papyrus heap) │
│                                      │
│ [Pause] [Export] [Pattern Match]    │
│ [Regex Filter] [Custom Alerts]      │
└──────────────────────────────────────┘
```

---

## Tooltip System

Every technical term should have progressive tooltips:

```tsx
<Term term="F4SE">
  <Level1Tooltip>
    Script Extender - Allows mods to do more advanced things
  </Level1Tooltip>
  
  <Level2Tooltip>
    Fallout 4 Script Extender (F4SE) adds extra functions that
    mods can use. Required for many popular mods.
  </Level2Tooltip>
  
  <Level3Tooltip>
    F4SE extends the Papyrus scripting language and provides
    low-level memory access for plugins. Enables features like
    MCM, custom UI elements, and advanced script functions.
    Version: 0.6.23+ required for most modern mods.
  </Level3Tooltip>
  
  <LearnMoreLink>Complete F4SE Guide →</LearnMoreLink>
</Term>
```

---

## Interactive Tutorials

Every major feature should have an interactive tutorial:

```tsx
<InteractiveTutorial feature="INI Manager">
  <Step number={1}>
    <Instruction>
      Click the green "Scan My PC" button
    </Instruction>
    <Highlight element="#scan-button" />
    <WaitFor action="click" element="#scan-button" />
  </Step>
  
  <Step number={2}>
    <Instruction>
      Great! Now look at the recommendations.
      See how it detected your GPU and monitor?
    </Instruction>
    <Callout element="#recommendations-panel" />
    <WaitFor action="view" duration={3000} />
  </Step>
  
  <Step number={3}>
    <Instruction>
      Click "Apply Safe Settings" to use these recommendations
    </Instruction>
    <Highlight element="#apply-button" />
    <WaitFor action="click" element="#apply-button" />
  </Step>
  
  <Completion>
    <Celebration>🎉 You did it!</Celebration>
    <Summary>
      You just configured Fallout 4 for optimal performance
      on your PC. The game should run smoother now!
    </Summary>
    <NextSteps>
      <Option>Learn about advanced settings →</Option>
      <Option>Optimize your mods →</Option>
      <Option>Start playing! 🎮</Option>
    </NextSteps>
  </Completion>
</InteractiveTutorial>
```

---

## Glossary Integration

Build a comprehensive, layered glossary:

```typescript
interface GlossaryTerm {
  term: string;
  category: 'modding' | 'technical' | 'game' | 'tool';
  
  simple: string;        // 1 sentence, no jargon
  standard: string;      // 1 paragraph, some technical terms
  advanced: string;      // Full technical explanation
  
  relatedTerms: string[];
  examples: Example[];
  visualAid?: string;    // Image or diagram URL
  
  prerequisites?: string[]; // Terms to understand first
  nextSteps?: string[];     // Related concepts to learn
}

// Example
{
  term: "Load Order",
  category: "modding",
  
  simple: "The order in which mods are loaded affects which mod's changes take priority",
  
  standard: "Load order determines which mod 'wins' when multiple mods modify the same thing. Mods loaded later override earlier mods. Getting this right prevents conflicts.",
  
  advanced: "Load order determines plugin initialization sequence and record override priority in the game engine. ESP/ESM files are loaded sequentially, with later plugins taking precedence for conflicting records via FormID overrides. Proper load order respects master dependencies, DLC requirements, and patch hierarchies.",
  
  relatedTerms: ["FormID", "ESP", "ESM", "Conflict", "Override"],
  
  examples: [
    {
      scenario: "Two mods edit the same weapon",
      beginner: "Mod B loads after Mod A, so Mod B's changes are used",
      advanced: "Weapon FormID 0x0001F669 modified by both PluginA.esp and PluginB.esp. PluginB's record wins due to load order position."
    }
  ]
}
```

---

## Skill Level Detection

Automatically adapt interface based on user behavior:

```typescript
interface UserSkillProfile {
  level: 'novice' | 'intermediate' | 'advanced' | 'expert';
  
  indicators: {
    featuresUsed: string[];
    advancedSettingsAccessed: number;
    wizardsCompleted: number;
    manualConfigsPerformed: number;
    docsViewed: string[];
    errorsEncountered: number;
    errorsResolved: number;
  };
  
  preferences: {
    preferredMode: 'guided' | 'manual';
    tooltipVerbosity: 'simple' | 'detailed';
    showAdvancedOptions: boolean;
  };
}

function detectSkillLevel(profile: UserSkillProfile): SkillLevel {
  // Algorithm to determine appropriate interface level
  const score = 
    (profile.indicators.advancedSettingsAccessed * 2) +
    (profile.indicators.manualConfigsPerformed * 3) +
    (profile.indicators.wizardsCompleted * -1) + // Wizards = beginner indicator
    (profile.indicators.errorsResolved / profile.indicators.errorsEncountered * 5);
    
  if (score < 10) return 'novice';
  if (score < 30) return 'intermediate';
  if (score < 60) return 'advanced';
  return 'expert';
}
```

---

## Content Writing Guidelines

### For Beginners

**Do:**
- ✅ Use analogies ("Think of load order like stacking papers")
- ✅ Break into small steps
- ✅ Show expected outcomes
- ✅ Provide screenshots
- ✅ Anticipate confusion
- ✅ Offer quick fixes

**Don't:**
- ❌ Use acronyms without explanation
- ❌ Assume prior knowledge
- ❌ Jump to technical details
- ❌ Use command-line examples
- ❌ Reference external tools without context

### For Intermediate Users

**Do:**
- ✅ Explain "why" not just "how"
- ✅ Connect concepts
- ✅ Provide options
- ✅ Show troubleshooting
- ✅ Link to deeper resources

**Don't:**
- ❌ Over-simplify (they know basics)
- ❌ Skip important details
- ❌ Assume expert knowledge

### For Advanced Users

**Do:**
- ✅ Technical accuracy
- ✅ Show edge cases
- ✅ Performance implications
- ✅ Source code references
- ✅ Architecture details

**Don't:**
- ❌ Waste time on basics
- ❌ Oversimplify complex topics

---

## Implementation Checklist

For every new feature, ensure:

### Content
- [ ] Quick Start guide (5 minutes or less)
- [ ] Standard tutorial (comprehensive)
- [ ] Advanced reference (technical details)
- [ ] Glossary entries for new terms
- [ ] Video tutorial (optional but recommended)

### UI
- [ ] Beginner mode with guided workflow
- [ ] Intermediate mode with customization
- [ ] Advanced mode with full control
- [ ] Mode selector clearly visible
- [ ] Contextual help always available

### UX
- [ ] One-click "safe" option
- [ ] Preview before apply
- [ ] Undo/rollback capability
- [ ] Backup system
- [ ] Error messages in plain language

### Testing
- [ ] Test with actual beginners
- [ ] Verify advanced features work
- [ ] Check all tooltips render
- [ ] Validate terminology consistency
- [ ] Ensure smooth mode transitions

---

## Success Metrics

Track these to measure effectiveness:

1. **Feature Adoption Rate**
   - % of users who try new features
   - Time to first use

2. **Mode Usage**
   - % using beginner mode
   - % graduating to intermediate
   - % using advanced

3. **Support Metrics**
   - Reduction in "how do I?" questions
   - Reduction in error reports
   - Time to problem resolution

4. **User Satisfaction**
   - Survey scores by skill level
   - Feature ratings
   - Completion rates

5. **Learning Progression**
   - Users moving from guided to manual
   - Tutorial completion rates
   - Documentation access patterns

---

## Conclusion

This framework ensures that Mossy serves all users effectively:

- **Beginners** get gentle onboarding with safe defaults
- **Intermediate users** get explanation and customization
- **Advanced users** get full control and technical depth

**Key Takeaway:** Never sacrifice simplicity for beginners OR power for experts. Support both through progressive disclosure.

---

*Last Updated: February 13, 2026*
*For Mossy v5.5.0+*
