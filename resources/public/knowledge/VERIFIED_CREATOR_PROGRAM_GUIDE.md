# Bethesda Verified Creator Program — Modder's Guide (2025/2026)

The **Verified Creator Program** (VCP) is Bethesda's official pathway for community mod authors to distribute mods — both free and paid — through Bethesda's Creations platform, which launched as part of the November 2025 Fallout 4 update (v1.11.x). This guide covers how the program works, how to apply, technical requirements, and implications for your existing Nexus Mods distribution.

---

## What Is the Verified Creator Program?

The Verified Creator Program replaced the old **Creation Club** model. The key differences:

| Old Creation Club | Verified Creator Program |
|---|---|
| Bethesda contracted developers to make specific mods | Any modder can apply to become a Verified Creator |
| Bethesda-owned content; limited scope | Creator-owned content; full creative control |
| Bethesda paid developers upfront | Creator earns revenue share from paid sales |
| Strict NDA; limited community collaboration | Community-facing; mod can be discussed publicly |
| New content only | Can submit existing community mods (with consent checks) |

### The Creations Platform (In-Game)

The **Creations** menu is accessible from the Fallout 4 main menu (v1.11.x+). It allows:
- PC players to browse and download both free and paid community mods.
- Console (Xbox, PlayStation, Switch 2) players to access a curated subset.
- Mods appear alongside Bethesda's official Creation Club content.

---

## Eligibility & Application

### Who Can Apply

As of 2026:
- Any modder over 18 years old in a supported country.
- Must have at least one published mod on Nexus Mods or the Bethesda.net mods portal with a verifiable history.
- No prior Bethesda Platform bans.

### Application Process

1. **Create a Bethesda.net account** (if you don't have one).
2. Navigate to the **Creator Hub** at creatorhub.bethesda.net.
3. Click **Apply to the Verified Creator Program**.
4. Submit:
   - Your existing mod portfolio (links to Nexus pages).
   - A brief description of the mod(s) you plan to release through Creations.
   - Tax/payment information (required for paid mods; optional for free-only creators).
5. Bethesda reviews applications within 2–6 weeks.
6. Approved creators receive a Verified Creator badge and access to the Creator Hub upload tools.

---

## Technical Requirements for Creations Submissions

Mods submitted through the Verified Creator Program must meet stricter technical standards than Nexus-hosted mods:

### Mandatory Requirements

| Requirement | Detail |
|---|---|
| **Clean plugin** | Zero ITMs (Identical to Master records) and zero UDRs (Undeleted References). Clean with xEdit 4.0.4+. |
| **BA2 packaging** | All assets packed into BA2 archives. No loose files. Header Version 1 or higher (V1 for broad compatibility). |
| **No F4SE dependency** | Mods with `.dll` F4SE plugins cannot be distributed through Creations (console compatibility requirement). Pure ESPs with no DLL are fine. |
| **No external URLs** | No web links in mod descriptions or scripts. |
| **No adult content** | NSFW content is prohibited on the Creations platform. |
| **Original assets** | You must own or have license for all included assets. Cannot use assets from other mods without explicit permission. |
| **NG/1.11.x compatibility** | Must be tested and working on the current game version. |

### BA2 Packing for Creations

Use Archive2 (from the Creation Kit) to pack your mod:

```
Archive2.exe -create -root:"Data\" -output:"Data\MM_MyMod.ba2"
```

- Use **V1 format** for general BA2 (meshes, scripts, etc.) — widest compatibility.
- Use **texture-specific BA2** for textures:
  ```
  Archive2.exe -create -root:"Data\Textures\" -output:"Data\MM_MyMod - Textures.ba2" -format:DX10
  ```

The plugin `.esp`/`.esm`/`.esl` itself is not packed into the BA2 — it remains a standalone file.

### ESL-Flag Your Plugin (Strongly Recommended)

The Creations platform prefers ESL-flagged plugins because they don't count against the 255 plugin limit. If your mod has fewer than 2048 new FormIDs, ESL-flag it:
- In xEdit: right-click your plugin header → Compact FormIDs → then set the ESL flag.
- See `LOAD_ORDER_ESL_GUIDE.md` for full instructions.

---

## Free vs. Paid Mods on Creations

### Free Distribution

- No payment processing required.
- Mod appears in Creations with a "Free" label.
- Available to all platforms (PC, Xbox, PlayStation, Switch 2 if applicable).
- You retain full ownership and can continue distributing the same mod on Nexus.

### Paid Distribution

- You set the price in **Creation Credits** (Bethesda's in-game currency).
- Bethesda takes a platform cut (approximately 30–40% based on agreement type — check the current Creator Hub terms).
- You receive the remainder.
- Paid mods can only be distributed through Creations — you **cannot sell mods on Nexus** (Nexus prohibits paid mods except through their own Nexus Premium system).
- You CAN distribute a free version on Nexus and a premium/enhanced version on Creations.

---

## Can I Submit My Existing Nexus Mod?

Yes, with conditions:

### If You Made the Mod Solo

- You own all assets → free to submit.
- If the mod uses Creation Club assets (official Bethesda CC content), this is permitted as they are licensed for modding.

### If the Mod Uses Third-Party Assets

- Get explicit written permission from all asset contributors.
- If using community tools output (BodySlide, DynDOLOD output files), check each tool's license — most allow Creations distribution as long as the underlying assets are your own.
- CBBE/BodySlide body morphs: permitted with credit per the CBBE license terms.

### What Nexus Mods Thinks

Nexus Mods is a separate platform — submitting to Creations does not violate Nexus ToS as long as your mod's original page stays active and you don't use Nexus to advertise paid Creations content in a misleading way.

---

## Updating Your Mod on Creations

Once a mod is live on Creations, updates go through the Creator Hub:

1. Upload the new version as a new package.
2. Set the version number.
3. Bethesda reviews the update (usually 3–5 days for minor updates).
4. After approval, the update deploys to all owners automatically.

### Versioning Recommendations

- Use semantic versioning: `1.0.0`, `1.1.0`, `2.0.0`.
- Patch notes go in the Creator Hub update description — these appear in the in-game Creations changelog.
- Major updates (that change FormIDs or add new masters) should be tested extra carefully — players on console cannot easily manage load order issues caused by broken updates.

---

## Console Compatibility Considerations

Mods on Creations are potentially available on consoles (Xbox, PlayStation, Switch 2 — platform availability varies). Console modding has additional constraints:

| Feature | PC | Xbox | PlayStation | Switch 2 |
|---|---|---|---|---|
| F4SE mods | ✅ | ❌ | ❌ | ❌ |
| Loose files | ✅ (with INI) | ❌ BA2 only | ❌ BA2 only | ❌ BA2 only |
| Custom scripts (.dll) | ✅ F4SE | ❌ | ❌ | ❌ |
| Papyrus scripts (.pex) | ✅ | ✅ | ✅ | ✅ |
| Custom NIF meshes | ✅ | ✅ | ✅ | ✅ |
| Custom DDS textures | ✅ | ✅ | ✅ | ✅ |
| External URLs in scripts | ❌ | ❌ | ❌ | ❌ |
| File size limit | None | ~1GB | ~1GB | ~1GB |

If you want your mod on consoles, design it without F4SE from the start. Post-hoc F4SE removal is often very difficult.

---

## Creator Hub — Key Features

**creatorhub.bethesda.net**

- **Upload Manager**: Upload BA2 and ESP/ESM/ESL files.
- **Analytics**: Unique downloads, ratings, wishlist adds, review count.
- **Revenue Dashboard** (paid mods): Earnings by region, transaction history, payout settings.
- **Community Reports**: User-submitted bug reports and reviews.
- **Patch History**: Record of all approved updates.

---

## Implications for Existing Modders

### Should You Move to Creations?

Consider Creations if:
- Your mod is F4SE-free and technically polished.
- You want console exposure (huge player base).
- You want revenue from a paid mod.
- You want official Bethesda distribution/branding.

Stick with Nexus-only if:
- Your mod depends on F4SE (non-starter for Creations).
- You use community mods' assets that haven't been cleared for Creations.
- You iterate rapidly and can't wait for Bethesda's review cycle.
- Your mod is experimental/niche with complex installation instructions.

### Dual Distribution (Nexus + Creations)

This is the recommended approach for popular mods that qualify:
- Keep the free version on Nexus (broadest audience, fastest updates).
- Submit the same mod (or a "Definitive Edition" variant) to Creations for console access and official distribution.
- Nexus and Creations are not mutually exclusive.

---

## Quality Bar Comparison

| Standard | Nexus | Creations |
|---|---|---|
| ITMs/UDRs | Recommended to clean | **Required to clean** |
| BA2 packaging | Optional | **Required** |
| NG/1.11.x compatibility | Recommended | **Required** |
| Assets license | Good practice | **Enforced** |
| F4SE mods | Allowed | **Not allowed** |
| NSFW content | Allowed (adult section) | **Not allowed** |
| Update speed | Instant (self-managed) | Days–weeks (review cycle) |

---

## Resources

- **Creator Hub**: https://creatorhub.bethesda.net
- **Creation Kit Download**: Steam → Library → Tools → Fallout 4 Creation Kit (always install NG CK for 1.11.x)
- **CKPE** (Creation Kit Platform Extended): GitHub (search "CKPE") — required for stable NG CK operation
- **xEdit** (for cleaning): Nexus or GitHub (ElminsterAU/xEdit)
- **Archive2** (for BA2 packing): Included with the Creation Kit in your game's `Tools\Archive2\` folder

---

*Last updated: May 2026. Verified Creator Program terms and availability may change — check creatorhub.bethesda.net for the latest official requirements.*
