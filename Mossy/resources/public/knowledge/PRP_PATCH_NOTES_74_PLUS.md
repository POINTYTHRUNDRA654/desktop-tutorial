# PRP Patch Notes (74.xx and newer)

Endorsements: 4

Total views: 3.7k

Endorsed

Consult the changelog git document for plugin level changes.

---

## Future

Spoiler:  Show

- From scratch rebuilt MDHT for Commonwealth, SanctuaryHills(Intro), DLC03FarHarbor (adds new file intended for patch development for blocks not covered by PRP that includes the MDHT updates and is optional named prp-mdht-extra.esp), delayed for a future patch to be implemented, originally planned for 74.17.

---

## Branch 78

### 78.0 (All)
- Initial upload.

### 78.1 (PRP Plugins)
- Added missing ESL/Light flag to prp.esp and cleaned the plugin.

---

## Branch 74

Spoiler:  Show

### 74.23 (Plugins)
- (Experimental) Ran main plugins through the version control part of CK to generate missing information that may improve the performance of the plugins. Current optional version comes in two variants, the difference being that prp.esp is ESM+ESL or just ESL.

### 74.22 (Plugins)
- Translation resync updates: FR

### 74.21 (Plugins)
- Restored the missing WorkshopStackable keyword for the NorthBridge (Sanc Bridge) mesh as a result of excluding the bridge from precombines, as per Emiral. This allows for auto snapping like in vanilla again.
- Translation resync updates: RU, JP, ES

### 74.20 (Plugins)
- Cleanup to match UFO4P 2.1.8 (removal of a few specific override records, forward a spelling fix, clean out any files that got upstreamed from the archives)

### 74.19 (Plugins)
- Improvements to MassPikeTunnel01's dynamic disables to make the interior seamless if XO2 isn't installed or is, thanks to Exoclyps!

### 74.18 (OG/NG Plugins, optional for non-Chinese players.)
- Vozhou sent a pull request just recently, updating Chinese Simplified and adding Chinese Traditional languages, this is implemented as of this version. Many thanks!

### 74.17 (The usual, plugins only actually updated, optional for non-Japanese players.)
- Language updates: Japanese

### 74.16 (Only NG Plugins was changed in this update, all other packages were version bumped nexus side, no other changes.)
- Restored dynamic disables for Saugus Ironworks (related to the Heavy Incinerator CC, this is what was stopping quest progression there)

### 74.15 (This update is optional if you don't play in the below listed languages.)
- Translation updates (French, Russian, Spanish)
- Special note for the French player base, a bug was filed against your unofficial patch translation as some mismatches were observed in comparing strings vs the string file updates that ship with the mod.
- Renamed PRP Plugins to PRP Plugins OG and PRP Plugins NG nexus side, nothing has changed otherwise since last night's upload.

### 74.14
- Forwarded location fixes for E07B and E467 from UFO4P 2.1.7 (This also obsoletes the ClearableUSSRiptide_PRP_Patch.esp plugin if you have it)
- Renamed all filenames in the project to be lower case to be in line with the unofficial patch changes. (Reference bug 34096), this requires a reupload of the resources package. Previous users on windows don't have to redownload the updated package, as only the filenames have changed, nothing content level.
- Minor note, forgot to remove the unused images from the OG FOMOD, that's why it's slightly larger than the NG one.

### 74.13
- fomod config (adds OG or NG Version in title, Branch 74 only)
- Updated RedRPumps01.BGSM (Material file attached to Red Rocket Pump Meter mesh, thanks to CrunchyBiscuit007 for the contribution)
- Added updated CopperPanels01.BGSM (Material file attached to CopperPanels used in some yellower buildings, this fixes specular assignment to them as per DoubleYou)

### 74.12 Notes
- (OG) Resynced header adjustments to be in line with UFO4P 2.1.6 (mostly location and water related)
- (Both) Finally rebuilt the FOMOD.
- (OG, 082724) Resynced the missing XWEM in the Commonwealth entry. This was already fixed in NG, but I'm now just getting around to it.

### 74.11 Notes (Previously 74.9 and 74.10)
- Removed XWEM entries for Commonwealth/DiamondCity/FarHarbor (this matches the puddle fix from fadingsignal intentionally to deal with wackyness from the previous 74.8 release relying on partial forms which was causing patching issues) Reverted to vanilla records as per DoubleYou, and ENB users. The puddlefix isn't a panacea, and I shouldn't have made this sort of change, honestly, but it was 2am and I was tired.
- Also did conflict checks to make sure NG CC locations were in the cell headers where required. (Surprise, they are, since 74.8)

### 74.8b Notes
- Fixed the description on PRP.esp so that it doesn't show '74.8Previsibines' in Loot and instead '74.8' like it's supposed to.

### 74.6b (OG), 74.8a (NG) Notes
- Removed default cubemap in Commonwealth, a leftover from what I was attempting to resolve last night to assist in TMR load order, this matches the puddle fix mod (which makes the order between PRP.esp and the Puddle fix mod now irrelevant). Apologies for the sudden amount of updates.

### 74.7, 74.8 Notes
- Did conflict resolution with the Next Gen master files and synced header updates, also adding the requirement of a pair of newly added CC items to minimize requirements for PPF/PRP (HeavyFlamer and Remnants are now required as of this patch due to header location updates, but also frees up a slot taken by a CR plugin that's now pointless)

### 74.6 Notes
- Updated SCOL meshes with the patched versions DoubleYou sent to resolve conflicts with the Flutter Flicker Fixer for Foilage mod which will be fully fixed in the next branch, and added a patched mesh to fix a model seam, contributed by Glitchfinder. Patches generated after upgrading to 74.6 will pick up this fix, it's not important enough to merit a full branch rebuild.
- 74.6a: QAC'd and PartialForm'd PRP.esp at request, english only due to time constraints. Future updates will do this for next gen users and translated versions.

### 74.5 Notes
- Purged some ITPO remnants from the build process that weren't cleaned previously.

### 74.4 Notes
- Additional work to make CC related changes seamless where possible. The affected records were marked initially disable when branch 74 was generated, they just need to be hooked up to an enable parent instead, so generated patches should be unaffected. Associated interiors do need checked, though. Next up is the FOMOD overhaul, which is long overdue, those waiting on translations, 74.5 should have them, provided nothing else needs patching.
- 74.4a: I'm an idiot, forgot to do the ESL renumber with PRP.esp loaded. Fixed the new record links to PRP.esp (two new records should not have been renumbered), and finally cleared out the reference group deletion entries.

### 74.3 Notes
- Fixed incorrect enable/disable state for a specific set of CC related references for the Vault Suit CC and implemented the missing walls in MassPikeTunnel01 if you do not have the X02 CC installed. Both patches do not require any patch rebuilding, but the Vault Suit related references (just locker statics in vaults, only the VaultCryo111 locker with loot in it would be missed) are not retroactive. The objects are there, just disabled.
- The archives were repacked to better match Build 69 (minus translations, that'll be later), if you are a MO2 user and did a merge, just install PPF's update, as only PPF.esm was updated in this upload. Vortex users and MO2 users should redownload both parts unless they are tech savvy enough to move PRP.esp to the PPF mod installation folder. These instructions only apply to build 74 users, build 69 has not changed.

### 74.2 Notes
- Rebuilt MDHT again for Nuka World, I swear to the office gods, I need to setup a trello or something.

### 74.1 Notes
- Disabled Previs in RelayTowerInt12. Again. I really need to blacklist that cell.

### 74.0 Notes
- Initial upload of new branch.

---

## Acknowledgements

- Maintainers and contributors: DoubleYou, Glitchfinder, Exoclyps, Vozhou, Emiral, CrunchyBiscuit007.
- Translators: Community members maintaining FR/RU/ES/JP/ZH updates.
- Tooling: xEdit/FO4Edit, CKPE, Archive2/BSArch used in build and validation.
