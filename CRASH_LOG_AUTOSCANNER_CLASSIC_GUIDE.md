# Crash Log Auto-Scanner (CLASSIC) & Reading Buffout Logs

## The toolchain
- **Buffout 4** (**Nexus #47359**, by alandtse) patches engine memory and **writes crash logs** to:
  `Documents/My Games/Fallout4/F4SE/Crashlogs/`
- **CLASSIC** (**Crash Log Auto Scanner and Setup Integrity Checker**, by Poet/evildarkarchon) **parses those logs** and names the likely culprit, and also checks that your setup is correct.

## Using CLASSIC
1. Install **Buffout 4** correctly (see below) and reproduce the crash.
2. Run **CLASSIC** and point it at your Crashlogs folder.
3. Read the generated **`-AUTOSCAN.md`** report next to each crash log.

CLASSIC reads the **exception**, the **probable call stack**, and the **loaded-module list**, matches them against known crash **signatures** (Weapon Debris, driver issues, specific broken plugins), flags suspect files, and verifies Buffout / **Address Library** / F4SE are set up right.

## Reading a Buffout log by hand
- **Top line** — the exception code, e.g. `EXCEPTION_ACCESS_VIOLATION`.
- **Faulting address/module** — first-party engine module vs a plugin.
- **PROBABLE CALL STACK** — the function chain at the moment of the crash.
- **MODULES / PLUGINS list** — what was loaded. A plugin appearing **repeatedly near the fault** is a prime suspect.

## Common signatures
- `0x00000000` / `0xEEEEEEEE` → referencing a **null or freed object** (often a script touching a **deleted reference**).
- Repeated **texture/mesh paths** → a bad or missing asset.
- A **Papyrus stack dump** → **script overload**; raise the Papyrus heap via **Buffout `MemoryManager=true`** and the `Fallout4.ini` Papyrus limits (`iMaxAllocatedMemoryBytes=536870912`).

## Buffout 4 essentials (Buffout4.toml)
```
MemoryManager = true        # critical
ScaleformAllocator = true
SmallBlockAllocator = true
BSTextureStreamerLocalHeap = true
```
Note: Buffout's MemoryManager conflicts with **pre-2024 ENB** — use ENB **0.493+**.

## For mod authors
- Always test with **Buffout 4 + CLASSIC** before release.
- Ship **no deleted navmeshes or references** — this ties directly into Mossy's **NAVM auto-fix** in the CK platform. A deleted NAVM is a classic `0x…` access-violation source for your users.

## Related
See: `CK_CRASH_PREVENTION_GUIDE`, `RESOLVING_CREATION_KIT_CRASHES`, `WEAPON_DEBRIS_CRASH_FIX_GUIDE`, `ERROR_HANDLING_AND_TROUBLESHOOTING_GUIDE`.
