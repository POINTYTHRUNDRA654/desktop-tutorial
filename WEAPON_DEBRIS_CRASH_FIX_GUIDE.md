# Weapon Debris Crash Fix (A Top Weapon-Mod CTD)

## The problem
The in-game **Weapon Debris** setting uses NVIDIA GameWorks/Flex physics debris. On **RTX 20-series and newer** GPUs it reliably **crashes to desktop** when certain weapons are fired, and the **2024 Next-Gen update** made it worse. This is one of the most common "my weapon mod crashes" reports that is actually not the mod's fault.

## Fixes (pick one; the plugin is best)
1. **Turn it off** — Settings → Display → **Weapon Debris = Off**, or set `bEnableWeaponDebris=0` in `Fallout4Prefs.ini`.
2. **Weapon Debris Crash Fix** F4SE plugin (**Nexus #48078**) — patches the crash so you can **keep** the effect.
3. **Buffout 4** (#47359) — mitigates several related debris/mesh crashes as a safety net.

## Next-Gen (2024) note
The Next-Gen update **moved engine addresses**. Use the **Next-Gen build** of the crash-fix plugin and a **Next-Gen Address Library**, or the plugin silently fails to load. If you are on the downgraded/OG runtime, use the OG builds instead. Check the plugin's supported versions against your `Fallout4.exe` version.

## For mod authors
- **Do not depend on weapon debris** for any visual effect in your mod.
- If your weapon spawns physics debris, **note the fix** under requirements.
- **Test firing** every weapon on RTX hardware before release.
- If testers report a CTD only when shooting, **weapon debris is the first suspect** — have them toggle it off to confirm.

## How to confirm it in a crash log
In a Buffout 4 crash log, a weapon-debris crash typically shows the fault in the graphics/physics modules right after firing. Toggling the setting off and reproducing is the fastest confirmation. See the CLASSIC crash-log guide.

## Related
See: `CRASH_LOG_AUTOSCANNER_CLASSIC_GUIDE`, `CK_CRASH_PREVENTION_GUIDE`, Buffout 4 memory notes.
