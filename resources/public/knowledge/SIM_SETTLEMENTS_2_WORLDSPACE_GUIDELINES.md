# Sim Settlements 2: Custom Worldspaces Guidelines

**Version**: 1.0  
**Last Updated**: January 24, 2026  
**Type**: Reference Guide (Best Practices & Guidelines)

---

## Overview

Custom worldspaces require specialized configuration to work with SS2's settlement systems, caravan networks, and VR remote management. This guide covers design considerations and common issues when integrating custom worlds.

---

## Worldspace Planning

### Before You Start

**Critical Questions:**
1. Does your worldspace have settlements?
2. Do you need caravan/supply network support?
3. Will you support VR remote management?
4. How many settlements will you have?
5. Are there existing worldspace mods doing similar work?

**Answer No to all?** Consider whether SS2 integration is necessary

### Worldspace Characteristics

**Key Measurements:**
- Map dimensions (NWCellX, NWCellY, SECellX, SECellY)
- Settlement distribution
- Fast travel marker connections
- Geographic regions and zones

**Obtaining Measurements:**

Method A (Creation Kit):
1. Load worldspace mod as master
2. World > Worldspaces
3. Select worldspace
4. Read coordinates above OK button

Method B (FO4Edit):
1. Open mod in FO4Edit
2. Expand Worldspace section
3. Find your worldspace
4. Look under MNAM - Map Data

**Testing Coordinates:**
- Use console: `coc WorldspaceName 0 0` to verify
- Coords should place you roughly centered
- Check all cardinal directions work

### Settlement Distribution Patterns

**Sparse Approach** (5-8 settlements)
- Pros: Easier to balance, less micromanagement, clearer resource focus
- Cons: Players feel limited by options
- Use when: Lore-specific or post-apocalyptic sparse world

**Medium Approach** (10-20 settlements)
- Pros: Good player choice, manageable complexity
- Cons: Requires more balancing
- Use when: Standard post-war settlement rebuilding

**Dense Approach** (20+ settlements)
- Pros: Maximum player agency, settlement building focus
- Cons: Resource balancing nightmare, network complexity
- Use when: Dedicated settlement-building worldspace

---

## Caravan Network Planning

### Supply Chain Design

**Network Topology Matters:**

**Linear Network**
```
Settlement A ← Caravan → Settlement B ← Caravan → Settlement C
```
- Pros: Simple to understand
- Cons: Bottleneck issues, single point of failure
- Use when: Thematic (trade route)

**Hub Network**
```
        ← Settlement B ←
        ↓               ↓
Settlement A (Hub) ← Settlement C
        ↓               ↑
        → Settlement D →
```
- Pros: Balanced resources, redundancy
- Cons: Central settlement must be powerful
- Use when: Natural geographic center exists

**Fully Connected**
- Pros: Maximum flexibility
- Cons: Chaos without player management
- Use when: Advanced players only

### Distance Considerations

**Caravan Travel Time:**
- Base time: 24 in-game hours minimum
- Each cell distance: ~1 hour added
- Mountains/obstacles: May add significant time
- Player expectation: 1-3 days between trades

**Formula:** 
```
Travel Time = 24 + (cell distance × 1) + (terrain modifiers)
```

**Practical Limits:**
- Under 10 cells: Quick trade (1 day)
- 10-20 cells: Standard trade (2 days)
- 20-40 cells: Long route (3+ days)
- Over 40 cells: Consider if caravan ever gets there

**Testing:**
1. Build two settlements far apart
2. Establish municipal with caravan
3. Check if caravans actually arrive
4. Adjust if paths seem broken or too long

### Geographic Barriers

**Problems:**
- Impassable terrain (sheer cliffs, water)
- Worldspace boundaries block caravans
- Dense ruins stop pathfinding
- Radiation zones harm caravans

**Solutions:**
1. Design clear caravan routes between settlements
2. Avoid worldspace edges for key settlements
3. Test caravan pathfinding with console
4. Place settlements with traversal in mind

---

## VR Remote Management Setup

### When to Add VR Support

**Include VR When:**
- Worldspace has multiple settlements
- Players will manage remotely
- You want full SS2 integration
- Texture work isn't prohibitive

**Skip VR When:**
- Single settlement worldspace
- Limited scope/scope creep prevention
- Resource constraints
- Worldspace is side location

### Map Material Creation

**Critical Success Factors:**
1. Map texture must exist for worldspace
2. Extraction must be accurate
3. Material swap must point to correct files
4. Preview must show in-game correctly

**Common Issues:**

| Problem | Cause | Solution |
|---------|-------|----------|
| Map blank in VR | Wrong texture file | Verify file exists and path is correct |
| Map upside down | Texture orientation | May need to flip in Photoshop |
| Map doesn't match | Old/wrong base texture | Use exact texture from worldspace |
| Crash when opening map | Material reference broken | Verify BGSM file syntax |

### Testing VR Maps

**In-Game Testing:**
1. Build City Planner's Desk
2. Unlock VR system (use cheats)
3. Activate blueprint
4. Access > VR Remote Management
5. Cycle through maps with menu
6. Your map should appear in list

**If Map Doesn't Appear:**
- Check Material Swap exists
- Verify static form points to correct swap
- Ensure worldspace config references static
- Look for console errors

**Performance Note:**
- Large maps may load slowly
- Recommend ~2048x2048 texture maximum
- DDS compression essential
- Test on lower-end hardware

---

## Common Pitfalls

### Coordinate Pitfalls

**Problem: Coordinates Inverted or Wrong**
- Cause: Misread coordinates or swapped values
- Symptom: Game thinks map is 10x actual size
- Solution: Double-check MNAM section carefully
- Prevention: Test with console coc command

**Problem: Settlements Appear off Map**
- Cause: Incorrect SE or NW coordinates
- Symptom: Settlement markers appear outside VR map bounds
- Solution: Recalculate SE coordinates correctly
- Prevention: Verify with manual settlement placement testing

**Problem: Map Markers Don't Align**
- Cause: Coordinate scaling incorrect
- Symptom: Markers clustered wrong or scattered wrongly
- Solution: Adjust DistanceScaling properties
- Prevention: Iterative testing with multiple settlements

### Caravan Pitfalls

**Problem: Caravans Never Arrive**
- Cause: Distance too great or path blocked
- Symptom: Settlers sent on caravan, never arrive
- Solution: Reduce distance or improve pathfinding
- Prevention: Place settlements with travel paths in mind

**Problem: Wrong Settlement Receives Goods**
- Cause: Multiple supply networks interfering
- Symptom: Resources go to unexpected settlement
- Solution: Check all caravan connections
- Prevention: Test with single network first

**Problem: Caravan Pathing Errors**
- Cause: Worldspace boundaries block path
- Symptom: Caravans get stuck or disappear
- Solution: Ensure settlements within accessible bounds
- Prevention: Map out viable caravan routes before placement

### VR Pitfalls

**Problem: Map Texture Not Showing**
- Cause: Incorrect texture path or missing file
- Symptom: Black or checkerboard map in VR
- Solution: Verify texture exists in Textures folder
- Prevention: Extract and test texture before material swap

**Problem: Map Rotated Wrong**
- Cause: Texture orientation doesn't match worldspace
- Symptom: North points wrong direction on map
- Solution: Flip or rotate texture to match game north
- Prevention: Compare extracted texture with expected orientation

**Problem: Material Swap Not Applying**
- Cause: Incorrect material file reference
- Symptom: Default commonwealth map shows instead
- Solution: Verify BGSM file path exactly
- Prevention: Never type paths manually; always use interface

### InterWorldspaceLink Pitfalls

**Problem: Fast Travel Broken Between Worlds**
- Cause: Map markers not properly referenced
- Symptom: Can't fast travel between worldspaces
- Solution: Verify marker references exist
- Prevention: Test fast travel early in development

**Problem: Distance Offset Creates Wrong Connection**
- Cause: fDistanceOffset applied incorrectly
- Symptom: Map shows settlements far apart when adjacent
- Solution: Leave at 0 unless specific reason
- Prevention: Only adjust if testing proves necessary

---

## Design Patterns

### The Satellite Worldspace Pattern

Custom worldspace extending vanilla content:

**Setup:**
1. Create 5-8 settlements distributed geographically
2. Connect via caravan routes to vanilla Commonwealth
3. Enable InterWorldspaceLinks to maintain fast travel
4. Add VR map support

**Benefit:** Feels integrated, not isolated

**Example:** Far Harbor-style expansion with distinct flavor

### The Isolated Community Pattern

Self-contained worldspace with internal network only:

**Setup:**
1. Create 10+ settlements in tight geographic area
2. Fully connected caravan network
3. Optional: Connection to vanilla Commonwealth
4. Focus on internal economy and trade

**Benefit:** Players manage complete economy separately

**Example:** Underground vault network or island community

### The Frontier Pattern

Sparse settlements with long caravan routes:

**Setup:**
1. Create 3-5 settlements spread across large area
2. Caravans take 2-3 days between stops
3. Road-based topology (linear or hub)
4. Add atmosphere of exploration

**Benefit:** Trading feels meaningful and challenging

**Example:** Trading post network in distant region

---

## Performance Considerations

### Worldspace Load Impact

**Minimal Impact:**
- Worldspace config records (metadata only)
- VR map static references
- InterWorldspaceLink definitions

**Potential Impact:**
- Custom settlements (depends on settlement size)
- Caravan route generation
- VR map texture size

**Optimization:**
- Keep VR textures under 2048x2048
- Don't over-complicate settlement designs
- Test performance with multiple settlements active
- Profile caravan network generation time

### VR Map Performance

**Texture Optimization:**
- Use BC3/DXT5 compression
- Generate mipmaps
- Limit to 2048x2048 maximum
- Consider 1024x1024 for large maps

**Memory Impact:**
- Single VR map in memory at once
- Loading new map has brief pause
- No significant long-term impact

---

## Distribution Guidelines

### Documentation Requirements

**For Worldspace Configs:**
- List included settlements by name
- Describe caravan network topology
- Note distance between settlements
- Explain thematic/lore justification
- List any fast travel connections

**For VR Support:**
- Confirm VR maps included
- Document texture resolution
- Note any installation requirements
- Describe map orientation/alignment

### Compatibility Notes

**Should Document:**
- Worldspace mod version required
- Load order dependencies
- Conflicts with other worldspace addons
- Custom settlement mod compatibility

**Installation Instructions:**
- Clear load order placement
- Dependency handling
- VR map extraction (if needed)
- Testing verification steps

---

## Testing Checklist

### Worldspace Config
- [ ] Coordinates verified with console coc
- [ ] Map bounds contain all settlements
- [ ] SE coordinates larger than NW (check math!)
- [ ] Worldspace loads without errors

### Caravan Network
- [ ] Each settlement has Municipal plot
- [ ] At least 2 settlements connected
- [ ] Caravan actually arrives (test with passtime)
- [ ] Resources transfer correctly
- [ ] No settlements blocked by barriers

### VR Support
- [ ] Map texture extracted successfully
- [ ] Material swap created and tested
- [ ] Static form references correct material
- [ ] Worldspace config points to static
- [ ] VR menu shows map in-game
- [ ] Markers align with actual settlements
- [ ] Orientation correct (north = up)

### Compatibility
- [ ] Works with vanilla Commonwealth settlements
- [ ] Works with other addon worldspaces
- [ ] Load order flexible (not strict dependency)
- [ ] No console errors on load

---

## Summary

Custom worldspace integration requires:

✓ **Accurate measurements** for proper map bounds  
✓ **Thoughtful settlement placement** for caravan viability  
✓ **Clear network design** for resource management  
✓ **Proper VR support** for full SS2 integration  
✓ **Extensive testing** across all features  

When done well, custom worldspaces feel like natural extensions of the SS2 experience.
