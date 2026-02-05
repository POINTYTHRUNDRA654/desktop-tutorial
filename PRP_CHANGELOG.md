# PRP (Precombines Repair Pack) Changelog

**Last Updated:** April 9, 2023  
**Current Recommended Build:** Branch 65  
**Available Branches:** 59, 65, 69, 74, 80, 81

---

## Changelog Format Legend

- 🟥 **Removed** - Record deleted or disabled
- 🟩 **Added** - New record or feature added
- 🟨 **Changed** - Record modified or updated
- **Dedup** - Duplicate record removed (exact duplicate at same position)
- **U#####** - UFO4P upstream bug reference
- **AFK#####** - Fallout Collective tracking number

---

## Branch 81

### New Features & Major Fixes

- **Dynamic Disable:** Added new dynamic disable for CSEP Buzzard's Bounties VC (ref 58626)
- **Landscape Work:** Extensive landscape texture seam fixing and painting throughout Commonwealth
- **Wire Fixes:** Merged PRPWireFixes.prp with updated spline locations
- **Interior Positioning:** Multiple interior cell positioning and alignment fixes

### Cell-Specific Work

**[E69C]** - Updated landscape and water texture assignment (ExtOceanWater → ExtRiverCharlesUpper)

**[E5D1]** - Landscape shoring near settlement, adjusted navmesh

**[E59D]** - Landscape patching near cell

**[DLC03NucleusCommandCenter01]** - Swapped ref 03024044 BASE to 73EBA

**[E52B]** - Updated position/rotation of 1B042C (wheels on ground)

**Various Landscape Work:**
- E67B, E67D, DEE6, E419, DEF9, E59A, DEC7, DEAA, DE8D, E4D8
- Multiple cells with landscape texture seam patches
- Floating object fixes and repositioning

### Reference Positioning Fixes

**Interior Cells:**
- [03000BDB] - Landscape texture seam patching
- [03000C3E] - Dedup wall reference (0302DB02 duplicate of 0302CD0A)
- [03000C77] - Disabled leftover interior references
- [03000DA9] - Lowered refs to proper roof position
- Multiple vault and interior positioning corrections

**Exterior Cells:**
- [Varies] - Extensive wall clipping corrections
- [Switchboard] - Lowered 1924EF above neighboring crate
- Multiple building seam closing and gap filling
- Floating debris and trash pile corrections

### Major Deduplication Passes

Extensive deduplication across:
- DLC04 Nuka World interiors (BottlingPlant, KiddieKingdom, GZVaultTec, etc.)
- DLC01 Far Harbor locations
- DLC03 Vault facilities
- Commonwealth main landmass cells

### Material Swaps & Texture Fixes

- Updated material swaps for building consistency
- Fixed misaligned wall textures throughout
- Corrected window and door material assignments
- Applied texture standardization across similar structures

---

## Branch 80

### Navigation Mesh Work

- Adjusted navmesh entries in multiple cells
- Improved navmesh compatibility with repositioned objects
- Fixed navmesh seams in settlement areas

### Settlement Area Improvements

- Repositioned objects for visual coherence
- Removed floating settlement components
- Fixed gaps in settlement building structures

### Draw Call Optimization

Extensive "swapped out for non-full versions" work to reduce rendering overhead:
- Wall pieces (full → non-full versions)
- Building components
- Roof elements
- Fence sections
- Decorative elements

### Known Problem Cells

**Cells Causing CK Crashes During Precombine Generation:**
- Fusion City Rising (multiple cells documented)
- Hookers of the Commonwealth
- Outcast and Remnants

*Solution for problematic mods:* Remove affected cells from PRP patch before generation

### Building Consistency Passes

- **[-2, 1, CW]** - Major cleanup: disabled hidden refs, fixed z-fighting, repositioned building components
- **[-2, 2, CW]** - Added corner walls to fill gaps, raised references below surface
- **[GreenetechGeneticsExt]** - Disabled underground references, fixed matswaps
- **Multiple exterior cells** - Standardized wall and roof treatments

---

## Branch 74

### Dynamic Disable Expansion

Covered remaining instances of dynamic disables needed for Creation Club content compatibility

### Vault Suit Locker Compatibility

Fixed enable states of locker references across vault interiors for proper vault suit compatibility

### Mass Pike Tunnel CC Integration

Ported new wall records for Creation Club version support with dynamic disables for non-CC users

### Landscape Editing

- Soften vertices on corner debris (Drumlin Diner area)
- Landscape adjustments for floating foundation bits
- Landscape seam repairs throughout

### Building Hole Fixes

Multiple locations with missing wall/roof pieces:
- Added DecoMainA1x2WinB01CapTop01 pieces
- Filled interior gaps and holes
- Patched roof seams

### Material Swap Consolidation

Applied consistent material swap assignments across multiple interior cells

### Key Mesh Updates

- New contributed model fixes for pumps, lights, and railings
- Specular map additions to various meshes
- Rotation corrections for proper mesh alignment

---

## Branch 69

### Mesh Contributions

🟩 Imported contributed meshes from ossompossum (deadshrub01-05.nif)

### Massive Deduplication Campaign

🟩 **13, 9, CW area:** 35+ deduplicated references

Extensive deduplication across entire Commonwealth worldspace:
- Grid coordinates 1-7, various locations
- Careful handling of overlapping building components
- Preserved unique reference placements
- Tagged development leftovers for cleanup

### Landscape Texture Seam Work

Throughout Commonwealth:
- Feathering landscape to close visible gaps
- Blending texture seams at cell borders
- Landscape geometry adjustments

### Umbra Optimization

Multiple reference position tuning specifically to resolve Umbra occlusion calculation errors

### XLRT Exclusions

Added extensive XLRT (Extra Load Ref Tag) exclusions for picture frames and detailed elements that need proper alpha cutoff handling in precombines

### Mesh Model Fixes

- Updated meshes from Glitchfinder, Exoclyps, and Pra contributions
- Collision mesh corrections
- Material file path corrections
- Specular map assignments

---

## Branch 65

### Material Swap System

Implemented separated material swaps for enhanced compatibility, particularly with Underwater Glass Fix mod

### Vault Improvements

**Vault 75:** Extensive matswap assignments across all damage and light theme variants
- VaultDamageTheme01
- VaultSignageTheme01_Damage
- VaultLightTheme01_Damage
- VaultDamageTheme16_DamageLavatory

**Vault 81, 81 Entry, 81 Secret:** Multiple texture swaps and reference positioning

**Vault 95, 114, 118:** Placement corrections and matswap fixes

### Corvegas Assembly Plant

Comprehensive null linkref cleanup across Ext01-Ext06:
- **Ext01:** 37 null linkrefs removed
- **Ext02:** 17 null linkrefs removed
- **Ext03:** 33 null linkrefs removed
- **Ext04:** 81 null linkrefs removed
- **Ext05:** 28 null linkrefs removed
- **Ext06:** 14 null linkrefs removed

### UFO4P Reconciliation

Migrated post-2.1.4 UFO4P fixes to PRP layer:
- Building positioning corrections
- Material swap applications
- Reference alignment fixes

### Extensive Interior Positioning Work

- General Atomics Factory: 15+ barrel and crate repositioning
- Med-Tek Research: Floor tile and furniture placement
- Multiple warehouse and industrial locations

### Far Harbor Integration

Backported all Far Harbor changes from GamePass ESM (requires new duplicate verification pass)

---

## Branch 59

### Foundation Release

Early comprehensive deduplication and positioning work across:
- DLC01 Lair locations
- Interior vault systems
- Commonwealth exterior cells
- Far Harbor worldspace

### DLC Content Integration

Initial Far Harbor precombine support
- Extensive deduplication across FH grid
- Position corrections for FH-specific locations
- Material swap applications

### Flicker Fixer Integration

Imported Flicker Fixer model sets and occlusion stripping
- Added transparency fixes for meshes
- Removed problematic occlusion data
- Integrated community-contributed mesh fixes

### Nuka World Mesh Generation

Generated MDHT (Mesh Data Header Table) for Nuka World DLC

### Archive Management

- Compacted PPF.esm for potential ESL tagging
- Optimized archive sizing
- BA2 file management improvements

---

## Major Feature Categories

### Deduplication Work

The most extensive part of PRP is deduplication (removing exact duplicate references at the same position):

**Process:**
1. Identifies references with identical base objects
2. Placed at exactly the same coordinates
3. Removes all but one instance
4. Preserves intentional duplicate effects (special cases noted)

**Areas with Most Dedups:**
- Commonwealth grid coordinates (-30 to 24 X, -32 to 26 Y)
- DLC04 Nuka World (06 prefix coordinates)
- DLC03 Far Harbor (03 prefix coordinates)
- DLC01 locations

### Landscape Editing

**Common Issues Fixed:**
- Texture seams between cell borders
- Visible mesh gaps and holes
- Floating terrain elements
- Water plane positioning issues

**Techniques Used:**
- Landscape vertex softening
- Texture blending and repainting
- Geometry feathering
- Z-fighting prevention

### Reference Positioning

**Categories:**
- **Floating objects:** Lowered to ground level
- **Embedded references:** Extracted from walls/floors
- **Misaligned elements:** Rotated and repositioned
- **Clipping prevention:** Minor nudges to prevent Z-fighting
- **Consistency:** Aligned similar elements across locations

### Draw Call Optimization

Swapped full-textured versions of objects for non-full (simpler) variants in:
- Interior walls and railings
- Roof pieces
- Fence sections
- Decorative elements
- Hidden objects (unreachable by player)

**Benefits:**
- Reduced geometry complexity
- Lower rendering overhead
- Better performance in dense areas
- Faster precombine generation

### Material/Texture Swaps

**Applications:**
- Matching damaged vault walls across interior
- Consistency for building materials
- Fixing color/material mismatches
- Applying post-war vs pre-war variants
- Correcting incorrectly applied textures

### Mesh Updates & Fixes

**Sources:**
- Flicker Fixer collection
- Glitchfinder contributions
- Community submissions
- Model fixes for UV errors
- Collision mesh corrections

---

## Known Issues & Limitations

### CK Crashes During Precombine Generation

**Affected Mods:**
- Fusion City Rising
- Hookers of the Commonwealth
- Outcast and Remnants

**Solution:** Exclude problematic cells from patch before running precombine generation

### Floating Point Edge Cases

**Issue:** Umbra occlusion calculation errors from imprecise coordinates

**Solution:** Round coordinate values, adjust reference positions slightly for Umbra compatibility

### Previs Generation Holes

**Cause:** Some positioning changes can create temporary previs issues

**Solution:** Multiple passes of coordinate refinement, documented in version notes

### Memory Requirements

Large mods (5000+ cells) require significant RAM for precombine generation:
- Minimum: 16GB RAM
- Recommended: 32GB+ RAM
- May require temporary texture archive relocation

---

## Patch Compatibility

### Official Bundled Patches (FOMOD Selection)

**All Branches (59, 65, 69):**
- Clarity 4.2 and 4.3 (separate options)
- Diamond City Ambience
- Fogout
- Interiors Enhanced
- Region Names on Save Files
- Ultra Exterior Lighting (regular + Darker versions)
- Ultra Interior Lighting
- JSRS Sound Mod

### External Patches by Branch

**Branch 65, 69:**
- Galac-Tac + Mercs and Music
- Nuka World Plus
- Nuka World Reborn
- Viva Nuka World

**Branch 59:**
- Point Lookout (newer builds elsewhere)
- Maxwell's World (newer builds elsewhere)

### Major Dependencies

**UFO4P Versions:**
- Branch 59: 2.1.3
- Branch 65: 2.1.4
- Branch 69: 2.1.5

⚠️ **Warning:** Branch 59 will crash with UFO4P 2.1.5 due to record changes since branch 59 release

---

## Contribution Guidelines

### How to Submit Fixes

1. **File Structure:** Use UFO4P bug tracking format (U##### identifiers)
2. **Deduplication:** Report exact duplicate references with coordinates
3. **Positioning:** Include before/after reference coordinates
4. **Testing:** Verify fixes work in-game without flickering or gaps
5. **Documentation:** Provide clear explanation of the problem and solution

### Creating Patches for PRP

See [PRP_PATCH_CREATION_GUIDE.md](PRP_PATCH_CREATION_GUIDE.md) for detailed instructions

### Reporting Issues

Issues should include:
- Exact cell location (grid coordinates or interior name)
- Reference ID (hex format)
- Description of visual problem
- Suggested fix (if known)
- Screenshots (if possible)

---

## Version History Summary

### Latest (Branch 81)
- Focus on landscape work and interior positioning
- Extensive wire spline fixes
- Major deduplication cleanup

### Stable (Branch 65 - Recommended)
- UFO4P 2.1.4 compatible
- Comprehensive material swap system
- Extensive interior improvements
- Most community patches available

### Previous (Branch 59)
- Original foundation release
- UFO4P 2.1.3 compatibility
- Initial deduplication passes

### Alternative (Branch 69)
- UFO4P 2.1.5 compatible
- Massive deduplication campaign
- Mesh contribution integration
- Umbra optimization work

---

## Performance Impact

### Positive Effects
- Reduced draw calls from non-full mesh swaps
- Proper precombine generation improves rendering efficiency
- Removed duplicate meshes reduce memory usage
- Fixed Z-fighting improves visual clarity

### Potential Issues
- Large precombine files (500MB+) may slow initial generation
- Previs generation is very resource-intensive (2-8+ hours depending on mod size)
- Some older systems may experience longer load times with generated precombines

### Optimization Tips
1. Use BA2 archives for precombined meshes (8,192+ loose file limit)
2. Compress PSG files to CSG format
3. Use Collect Assets script for clean VIS files
4. Exclude problematic cells from generation
5. Increase page file if RAM constrained

---

## Quick Reference by Issue Type

### Floating Objects
**Branches:** 80, 81 (primary)
- Lowered trash piles, furniture, vegetation
- Hundreds of individual reference Z-height corrections

### Building Gaps & Seams
**Branches:** 65+, 80, 81
- Added missing wall/roof pieces
- Repositioned adjacent elements
- Closed "see through" gaps in buildings

### Material Inconsistency
**Branch:** 65+ (matswap system)
- Unified vault wall textures
- Corrected building material colors
- Applied post-war variants consistently

### Mesh Errors & Clipping
**Branches:** 69, 80, 81
- Replaced problematic meshes
- Fixed UV mapping errors
- Corrected collision data

### Z-Fighting & Flickering
**Branches:** 69+, 80, 81
- Subtle coordinate adjustments
- Umbra position optimization
- Reference layer separation

---

**For detailed implementation guides, see companion documentation:**
- [PRP_COMPREHENSIVE_GUIDE.md](PRP_COMPREHENSIVE_GUIDE.md)
- [PRP_PATCH_CREATION_GUIDE.md](PRP_PATCH_CREATION_GUIDE.md)
- [PRP_TRANSLATION_GUIDE.md](PRP_TRANSLATION_GUIDE.md)