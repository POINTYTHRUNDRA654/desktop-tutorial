# Release Guide — Fallout 4 Mod Assistant

Complete checklist for publishing a new version of the add-on.

---

## 0 — Pre-flight checks

- [ ] All 120 integrity tests pass: `python3 test_addon_integrity.py`
- [ ] Version bump: update the `"version"` tuple in `__init__.py` **and** the
  `version` field in `blender_manifest.toml` to match.  
  Example: `(5, 2, 0)` → `"5.2.0"`.
- [ ] Merge all open PRs into `main` before tagging.

---

## 1 — Build the zips locally (optional, CI does this automatically)

```
python3 build_addon.py --outdir dist
```

This produces **five files** in `dist/`:

| File | Use |
|------|-----|
| `blender_game_tools-v{VER}-blender3x.zip` | Blender 3.6 LTS — legacy add-on format |
| `blender_game_tools-v{VER}-blender4x.zip` | Blender 4.0–4.1 — legacy add-on format |
| `blender_game_tools-v{VER}-blender42.zip` | Blender 4.2–4.9 — Extension format |
| `blender_game_tools-v{VER}-blender5x.zip` | Blender 5.0+ — Extension format |
| `blender_game_tools-v{VER}-nexus-bundle.zip` | **Nexus Mods** — all four zips + install guide |

---

## 2 — Create a GitHub Release (triggers CI automatically)

1. On GitHub, go to **Releases → Draft a new release**.
2. Create a new tag: `v5.2.0` (use the actual version number).
3. Target branch: `main`.
4. Click **Publish release**.

GitHub Actions will automatically:
- Build all four variant zips **and** the Nexus bundle.
- Run the 120 integrity tests.
- Attach every zip to the release page so users can download directly.

---

## 3 — Blender Extensions (extensions.blender.org)

> **How version selection works:** extensions.blender.org is the
> official Blender marketplace.  When a user opens
> *Edit → Preferences → Add-ons → Get Extensions* inside Blender, the
> platform only shows them extensions that are compatible with their
> installed Blender version.  **Users never have to pick a version
> manually** — the `blender_version_min` / `blender_version_max` fields
> in `blender_manifest.toml` handle that automatically.

### Submitting

1. Go to <https://extensions.blender.org> and sign in (create an account
   if you don't have one).
2. Click **Submit Extension**.
3. Upload the **`blender42.zip`** for the Blender 4.2–4.9 listing, or
   **`blender5x.zip`** for the Blender 5.0+ listing.  You can submit
   both as separate extension versions.
4. The manifest inside each zip already contains:
   - `blender_version_min` / `blender_version_max` — tells Blender which
     versions are compatible.
   - `website` — links back to this GitHub repo.
   - `license = ["SPDX:GPL-3.0-or-later"]` — required by the platform.
5. Fill in the description, screenshots, and tags on the submission form.
6. Submit for review. Blender Extension reviews typically take a few days.

### After approval

Once approved, any Blender 4.2+ user can install via
*Get Extensions → search "Fallout 4 Mod Assistant" → Install*.
Blender automatically handles version filtering.

---

## 4 — Nexus Mods

1. Go to <https://www.nexusmods.com> → **Upload a mod** (requires an
   account).
2. Choose the game category (e.g., *Fallout 4* under modding tools /
   utilities).
3. On the **Files** tab of your mod page, upload files individually for
   clarity — label each one clearly:

   | Nexus file name | Zip to upload | Category |
   |-----------------|---------------|----------|
   | Blender 5.x (Latest) | `…-blender5x.zip` | Main |
   | Blender 4.2–4.9 (Extension) | `…-blender42.zip` | Main |
   | Blender 4.0–4.1 | `…-blender4x.zip` | Optional |
   | Blender 3.6 LTS | `…-blender3x.zip` | Optional |
   | All versions bundle | `…-nexus-bundle.zip` | Miscellaneous |

4. In the mod description, paste this install snippet:

   ```
   INSTALLATION
   ────────────
   Pick the zip that matches your Blender version and install via
   Edit → Preferences → Add-ons → Install.

   Blender 5.x      → blender5x.zip   (Extension format)
   Blender 4.2–4.9  → blender42.zip   (Extension format)
   Blender 4.0–4.1  → blender4x.zip
   Blender 3.6 LTS  → blender3x.zip

   Not sure which Blender you have? Help → About Blender.
   ```

5. Set the **requirements** field to "Blender 3.6 or later".

---

## 5 — After release

- [ ] Update `DEVELOPMENT_NOTES.md` with the new working-baseline entry.
- [ ] Post a changelog comment on the Nexus Mods mod page.
- [ ] Bump the version to the next dev version (e.g., `5.2.0` → `5.3.0`)
  in `__init__.py` and `blender_manifest.toml`.
