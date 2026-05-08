# Sim Settlements 2: Addon System Design Guidelines

**Version**: 1.0  
**Last Updated**: January 24, 2026  
**Type**: Reference Guide (Best Practices & Guidelines)

---

## Overview

This comprehensive guide covers best practices for designing content across all SS2 addon systems: Discoveries, Dynamic Flags, Holidays, Leaders, Newspapers, Pets, Supplies, and World Repopulation. While each system has unique mechanics, common design principles apply across all.

---

## Core Design Principles

### Consistency Across Systems

**Visual Consistency:**
- Use same thematic elements across all your content
- Faction flags should match faction buildings
- Holiday decorations should maintain consistent art style
- Pet designs should fit same aesthetic framework

**Mechanical Consistency:**
- Discovery locations should relate thematically to discovered items
- Flag colors should match environmental palette
- Holiday timing should make cultural sense
- Leaders should have traits matching their background

**Example - Unified Vision:**
```
✓ Minuteman Faction Pack:
  - Leader: Preston (leadership traits)
  - Flags: Minuteman-themed colors
  - Discoveries: Minuteman weapon caches
  - Buildings: Colonial/militia aesthetic
  
✗ Disconnected Pack:
  - Leader: Preston
  - Flags: Institute colors
  - Discoveries: randomly themed
  - Buildings: mixed aesthetics
```

### Scope Management

**When to Include Multiple Systems:**
- You have cohesive thematic vision
- Content logically supports multiple systems
- You have resources to balance properly
- Player experience benefits from integration

**When to Focus Single System:**
- First major addon (learn one system well)
- Specialized content (holiday decorations only)
- Limited development time
- System naturally stands alone

**Red Flag: Scope Creep**
- "Let me add Leaders AND Discoveries AND Newspapers AND..."
- Result: Each system underdeveloped
- Solution: Prioritize core systems, leave expansion for patches

---

## Discovery System Guidelines

### Discovery Placement Strategy

**Ideal Discovery Locations:**
- Thematic fit (weapons cache near military bases)
- Accessible but non-obvious (not literally in center)
- Geographic variety (spread across map)
- Organic discovery (players naturally encounter)

**Location Keyword Selection:**

| Keyword Type | Best For | Example |
|---|---|---|
| LocEncGunners | Combat-focused items | Weapons, armor |
| LocEncGhouls | Older pre-war content | Vintage tech, clothing |
| LocSetFactory | Industrial items | Parts, machinery |
| LocSetVault | Technology | Experimental items |

### Discovery Rarity Tuning

**Common Discoveries:**
- High appearance chance (bAlwaysDiscovered: true)
- Generic locations (loose keywords)
- Player sees multiple times per playthrough

**Uncommon Discoveries:**
- Medium chance
- Specific location types
- Players might see once or twice

**Rare Discoveries:**
- Low chance (check bAlwaysDiscovered: false)
- Specific locations only
- Special treat when found

**Example Distribution:**
```
10 common discoveries (broad keywords)
5 uncommon discoveries (3-4 location types each)
2 rare discoveries (1-2 specific locations)
```

### What to Discover

**Strong Discovery Types:**
- Building plans (most popular)
- Crafting recipes (useful)
- Quest triggers (story-integrated)
- Cosmetic items (fun variation)

**Weak Discovery Types:**
- Random junk (feels cheap)
- Overpowered items (balance issues)
- Duplicates of common plans
- Unrelated to location thematic

### Common Pitfalls

| Problem | Cause | Solution |
|---------|-------|----------|
| Never discovered | Too many locations, low chance | Add bAlwaysDiscovered or specific locations |
| Found everywhere | Too-broad keyword | Use LocSetSpecific instead of LocEnc |
| Feels random | Unrelated to location | Choose thematic connection |
| Overpowered | No balance check | Compare to vanilla plan costs/resources |

---

## Dynamic Flags Guidelines

### Flag Design Philosophy

**Successful Flag Sets:**
- Easily recognizable
- 3-5 distinct color palettes
- Thematic coherence
- Works on 8+ different objects

**Avoid:**
- Gradients or complex shading (UV issues)
- Tiny details (disappears at distance)
- Full photorealism (breaks game aesthetic)
- More than 8 variations (UI overwhelm)

### Texture Preparation

**File Setup:**
```
Textures/Yourmod/Flags/
  FlagTexture_d.dds (2x width for mirroring)
Materials/Yourmod/Flags/
  FlagTexture.bgsm (points to texture)
```

**Texture Format:**
- Dimensions: 512x256 or 1024x512
- Top half: Flag front
- Bottom half: Flag back (can mirror front)
- Alpha channel: Supports transparency

**Quality Checklist:**
- [ ] No harsh transitions
- [ ] Clean alpha edges if transparent
- [ ] Top/bottom are equivalent (or intentionally different)
- [ ] Tested on all 8 material swap models

### Material Swap Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Manual path typing | Material won't load | Always use interface "Edit" button |
| Wrong texture file | Black/checkerboard ingame | Verify file exists in Textures folder |
| DDS compression wrong | Visual artifacts | Use BC3/DXT5 compression |
| Missing mipmaps | Flickering at distance | Generate mipmaps on export |

---

## Holiday System Guidelines

### Holiday Timing Strategy

**Major Holidays (30+ days):**
- October (Halloween)
- December (Christmas)
- July (Independence Day)
- Good for broad seasonal feel

**Minor Holidays (3-7 days):**
- Specific dates
- Special events
- Easter eggs
- "Easter egg" feeling

**Custom Holiday Pattern:**
```
Broad holiday: 1/1-1/31 (New Year)
Overlapping special: 1/18-1/24 (Special week)
Tiny easter egg: 4/20 only (joke holiday)
```

### Decoration Placeholder Types

**Know These Sizes:**

| Placeholder Type | Size | Good For |
|---|---|---|
| Small | ~50 units | Wreaths, lights, garlands |
| Medium | ~100 units | Banners, centerpieces |
| Large | ~200 units | Large displays, trees |
| XXL | ~400+ units | Building-scale decorations |

**Matching Placeholders to Decorations:**
- Oversize decoration → Downsample or use larger placeholder
- Tiny decoration → Upsides on small, make bigger
- Wall decoration → Use Wall placeholder (obvious)
- Hanging decoration → Use Hanging placeholder

### Avoiding Placeholder Mismatches

| Problem | Cause | Solution |
|---------|-------|----------|
| Decoration clips model | Wrong placeholder size | Measure decoration, use correct size |
| Looks awkwardly tiny | Too-large placeholder | Scale decoration up |
| Floating/sinking | Wrong anchor point | Align to top for hanging, bottom for surface |
| Disappears on certain plots | Not registered to holiday | Add to correct formlist |

---

## Leader System Guidelines

### Trait Balance Principles

**Major Trait Design:**
- Substantial impact (10-20% settlement change)
- Meaningful choice when selecting
- Noticeable difference in gameplay
- Single per leader (not stacking)

**Minor Trait Design:**
- Small impact (2-5% change)
- Flavorful benefit
- Balanced by weakness pairing
- Support leader specialty

**Weakness Design:**
- Opposite of minor trait
- Same magnitude of impact
- Thematic sense (not arbitrary penalty)
- Discourages cheating

**Example - Balanced Trio:**
```
Major: +25% building production (significant)
Minor: +10% resource generation (helpful)
Weakness: -10% happiness (fair cost)
Result: Leader feels special but balanced
```

### Avoiding Overpowered Leaders

**Red Flags:**
- Multiple major traits
- No weaknesses
- Stacking with other systems
- Permanent stat bonuses

**Safe Pattern:**
```
1 Major + 1-3 Minor/Weakness pairs
OR
No Major + 3-5 Minor/Weakness pairs
Never both multiple Majors and multiple Minors
```

### Leader Role Definition

**Clear Identity:**
- Combat Leader (martial traits)
- Economic Leader (production traits)
- Scholarly Leader (research traits)
- Social Leader (happiness traits)

**Avoid:**
- Leaders good at everything
- Traits conflicting with character
- Mechanics unrelated to character

---

## Newspaper Guidelines

### Article Voice & Tone

**Successful Voices:**
- First-person journalist perspective
- In-universe cultural references
- Period-appropriate language
- Consistent personality

**Article Types to Vary:**
- News (major events)
- Rumors (speculation)
- Opinion (editorial)
- Features (human interest)
- Reviews (media/products)

### Priority System

| Priority | Use For | Examples |
|----------|---------|----------|
| 0-5 | Filler, recipes, gossip | Radroach recipes, rumors |
| 6-10 | Regular events | Settlement milestones |
| 11-15 | Important events | Quest completion |
| 16-20 | Major world-changing | Faction endings, invasions |

**Avoid Priority Creep:**
- All articles at priority 15 = no prioritization
- Reserve 18-20 for truly rare events
- Most content: 5-12 range

### Common Writing Mistakes

| Mistake | Issue | Fix |
|---------|-------|-----|
| 4th wall break | Feels gamey | Describe as in-universe character |
| Inconsistent voice | Jarring shifts | Maintain character personality |
| Too long | Doesn't fit UI | 2-3 paragraphs maximum |
| Meta references | Immersion break | "I found a building plan" sounds weird |

---

## Pet System Guidelines

### Pet Type Selection

**Ideal Pet Candidates:**
- Creatures with personality
- Visually distinct from common enemies
- Diverse size range
- Iconic to game/world

**Avoid:**
- Reskins of existing pets
- Creatures needing complex AI
- NPCs (use Leader system instead)
- Tiny creatures (hard to see/interact)

### Pet Size Categories

| Size | AI Package | Best For |
|---|---|---|
| Small | Dog-style | Companions, settlement critters |
| Medium | Radroach-style | Exotic pets, mounts |
| Large | Deathclaw-style | Rare/special pets, boss pets |

**iSize Property Mapping:**
- Small: 0-1
- Medium: 1-2
- Large: 2-3

### Pet Name Injection Strategy

**Naming Patterns:**
- 5-10 thematic names per pet
- Mix of real names + fantasy
- Reflect pet personality
- Allow roleplay expression

**Example - Robot Pet:**
```
Names: Codsworth, Mr. Handy, Ironclad, 
       Sentinel, Clockwork, Rusty, Titan, 
       Brass, Cog, Tinman
(Mix of fallout references + thematic)
```

---

## Supply Injection Guidelines

### Item Categorization

**When to Inject Items:**

| Category | Include | Exclude |
|----------|---------|---------|
| Weapons | Standard weapons only | Unique quest items |
| Armor | Wearable armor | Costume/non-armor |
| Ammo | All ammunition types | Thrown weapons (separate) |
| Chems | Consumables | Quest-specific chems |

**Tier Within Categories:**

| Tier | Examples |
|------|----------|
| Makeshift | Pipe weapons, raider gear |
| Standard | Combat rifles, leather armor |
| Heavy | Gauss rifles, power armor |

### Avoiding Injection Mistakes

| Mistake | Result | Prevention |
|---------|--------|-----------|
| Too many items | Supply spam | Limit to 10-20 items per category |
| Quest items included | Players hoard supplies | Exclude unique/quest items |
| Duplicate names | Confusing formlist | Check existing supplies first |
| Wrong categorization | Items appear in wrong merchants | Verify category placement |

---

## World Repopulation Guidelines

### Interior Design Principles

**Template Sizing:**
- Match exterior roughly (within 10%)
- Err on side of generosity (more space)
- 2-3 levels maximum (AI pathfinding issues)
- Consider vertical space for NPCs

**Inhabitant Count:**
- Small interior: 1-2 NPCs
- Medium interior: 2-4 NPCs
- Large interior: 4-6 NPCs
- Don't overcrowd

### Door Placement Strategy

**Geographic Distribution:**
- Spread across worldspace
- Mix of building types
- Avoid clustering (too many near player start)
- Consider player progression (harder to reach later)

**Building Type Selection:**
- Variety of models
- Cluster same type (templates)
- Avoid overly-unique buildings
- Test paths before placement

### Merchant vs. Home Distinction

**Vendor Locations:**
- Small shops (1-2 NPCs)
- Clear counter area
- Limited inventory
- Useful but not essential

**Home Locations:**
- Larger interiors (2-6 NPCs)
- Mixed furniture
- Personal touches
- Strong community feel

---

## Testing Framework

### Cross-System Testing

**Integration Tests:**
- [ ] Create settlement with all content types
- [ ] Assign leader with flags
- [ ] Check discoveries appearing properly
- [ ] Verify holiday decorations applying
- [ ] Test newspapers writing about events
- [ ] Confirm pets available in stores

**Performance Tests:**
- [ ] Load game with all addons active
- [ ] Monitor FPS in major settlements
- [ ] Check for memory leaks on long play
- [ ] Test with 10+ settlements active

### Balance Testing

**Content Availability:**
- [ ] Is content appearing for player?
- [ ] Are unlocks appropriate timing?
- [ ] Is difficulty scaling right?
- [ ] Are costs/rewards balanced?

**Gameplay Impact:**
- [ ] Do leaders change settlement feel?
- [ ] Are discoveries meaningful?
- [ ] Does newspaper enhance story?
- [ ] Are holidays immersive?

---

## Summary

Great addon content requires:

✓ **Unified thematic vision** across all systems  
✓ **Careful scope management** (don't do everything)  
✓ **Consistent quality** in art and mechanics  
✓ **Balanced gameplay** that enhances, not breaks  
✓ **Extensive testing** across integrations  
✓ **Clear documentation** for player expectations  

When each system is polished and cohesive, players experience content that feels like natural parts of SS2, not tacked-on additions.
