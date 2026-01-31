# Blender Animation Rig Guide (Fallout 4)

Version 2.0 Automation Update – includes Python automation for import/export, annotations via pose markers, filepaths, speed fixes, and weapon attachments.

## What This Rig Is For
- Create custom Fallout 4 animations and poses in Blender (what was previously 3ds Max–only workflows).
- Works for 3rd person rigs; separate link mentioned for Power Armor rig.
- Not an animation fundamentals tutorial; assumes Blender animation experience.

## Requirements
- Blender 4.1
- Havok Content Tools 2014 64-bit (1.0 or 1.1; 1.1 recommended)
- FBX Importer: https://www.nexusmods.com/fallout4/mods/59849
- F4AK_HKXPackUI (tools folder): https://www.nexusmods.com/fallout4/mods/16694
- Text editor with XML support (Notepad++ or VS Code)
- Autodesk FBX Converter (archive builds): https://aps.autodesk.com/developer/overview/fbx-converter-archives
- BA2 extractor (pick one): BAE, BSA Browser, Archive2 (CK Tools), or BSArchPro
- PyNifly: https://github.com/BadDogSkyrim/PyNifly/releases

## Workflow Overview
1) **Extract assets**
   - Use BA2 extractor to pull source HKX/FBX/NIF as needed.
   - Keep folder structure clean: `input/`, `output/`, `attachments/`.

2) **Convert HKX → FBX (if starting from HKX)**
   - Use F4AK_HKXPackUI (HKX → XML → FBX). Havok Content Tools handles FBX build.
   - Confirm animation FPS and duration; note any speed issues.

3) **Import to Blender with Rig**
   - Run provided Python automation script:
     - Imports FBX and rig, sets filepaths
     - Converts annotations ↔ pose markers
     - Adjusts clip speed to correct rate
     - Handles weapon attachments to bones/other attachments
   - Verify armature scale (1.0), orientation (Z up), and bone roll.

4) **Animate**
   - Use NLA/Action Editor as normal.
   - Place pose markers for annotations/events.
   - Keep root motion on the correct root bone; avoid extra scale on root.

5) **Export FBX**
   - Use automation script export step (ensures correct bone names, strips extras).
   - FBX settings: Apply Transform off, Armature > Only Deform Bones, Bake Animation with all keyframes, custom FPS if required.

6) **FBX → HKX**
   - Havok Content Tools 2014: build HKX (2010.2.0-r1 for FO4) from exported FBX.
   - HKXPackUI: pack to final HKX for FO4.

7) **Package**
   - Place HKX in `Data\Meshes\Actors\...` per target skeleton.
   - If distributing, pack into BA2 (see BA2 guide) or keep loose for testing.

## Automation Script (what it does)
- Imports rig + animation FBX
- Sets import/export filepaths automatically
- Converts annotations ↔ pose markers
- Fixes animation speed to target FPS
- Attaches weapons/props to correct bones (and chained attachments)
- Exports clean FBX for Havok build

## Tips
- Match FPS: FO4 typically 30 FPS; ensure Blender scene FPS matches before animating.
- Keep scene units at meters, scale 1.0.
- Root bone: avoid scaling/rotating the armature object; animate on bones only.
- Use pose markers for events (annotations) so script carries them through.
- For Power Armor: use the dedicated PA rig (linked separately) to avoid skeleton mismatches.

## Skeleton Rigging Notes
- Keep the vanilla hierarchy and names intact (FO4 human rigs: `Root` → `COM` → `Pelvis` etc.; plants/creatures: use the extracted HKX/FBX skeleton as reference). Do not rename deform bones.
- Apply scale/rotation on the armature object to 1.0/0.0; drive motion from bones only. If you must adjust scene scale, do it before any keyframes.
- Keep a single root bone; avoid adding extra roots. Non-deform helpers should be pruned before export or marked non-deform and excluded on export.
- Mirror weights and rolls cleanly: recalc roll on long chains (e.g., stems/tendrils) so exporters don’t introduce twist.
- When adding new deform chains (e.g., tendrils), parent them into existing spine/anchor bones rather than floating. Maintain consistent axes: Z up, Y forward, X right (matches FO4 Havok expectations after export).
- Pose markers map to Havok annotations: keep them on the action (not NLA) and name them exactly as events you want (e.g., `Hit`, `FootstepLeft`).

**Plant reference skeleton (static/ambush flora):**
- Extract the base plant HKX → FBX and import the armature; keep bone names verbatim (common roots: `Root`, `Base`, chained stems `Stem01+`, distal `Tendril`/`Tip`).
- Anchor the lowest deform bone to ground; avoid translating the armature object. Motion should come from bone keys, not object transforms.
- If you add tendril chains, parent to the existing distal or a stable mid-stem; avoid new roots. Keep roll aligned down the chain to prevent twist on export.

**Retargeting to other creature rigs (quick checklist):**
- Start from the target creature’s extracted skeleton (HKX→FBX); use it as the armature and do not rename bones.
- Scale/rotation on the armature must be applied before animation; scene units meters, scale 1.0.
- Map your action onto the target rig via bone constraints or manual key transfer; bake keys onto deform bones, then remove constraints before export.
- Preserve root motion conventions: some creatures use a root motion bone; keep it clean and non-scaled.
- Recreate annotations via pose markers on the target action (names must match the events you need in Havok).

**Concrete plant bone layouts:**
- Vine grabber (wrap-and-pull):
   - Roots/anchors: `Root`, `Base`, `Stem01`, `Stem02`, `Stem03` (spine toward player reach).
   - Vines: for each vine arm use `VineA01` → `VineA02` → `VineA03` → `VineA04` → `VineATip`; add `VineB*` for a second arm. Keep chain lengths consistent to avoid FBX scale mismatch.
   - Grip cluster (optional): `VineATip_ClampL`, `VineATip_ClampR` if you want a pincer at the tip.
   - Parent vines to `Stem02`/`Stem03` so base stays planted; no extra roots.
   - Annotations to consider: `GrabStart` (windup), `Clamp` (contact), `Pull` (reel-in), `Release`.

- Mouth plant (Little Shop–style swallow):
   - Roots/anchors: `Root`, `Base`, `Spine01`, `Spine02`, `Neck`, `Head`.
   - Jaw: `JawLower`, `JawUpper` (or `Jaw` only if single hinge). Pivot should be at the hinge; keep clean roll.
   - Mouth interior (optional): `Tongue01` → `Tongue02` → `TongueTip` to help sell swallow; keep short chain.
   - Support vines for reach: `ArmL01` → `ArmL02` → `ArmLTip`; `ArmR01` → `ArmR02` → `ArmRTip` (for grabbing before lift).
   - Swallow path (optional): `Gullet01` → `Gullet02` if you want a visible throat bulge; keep slight offsets only.
   - Parent all to the spine/neck, single root. Avoid moving the armature object; animate bones.
   - Annotations to consider: `GrabStart`, `GrabClamp`, `Lift`, `Swallow`, `Release` (match your behavior graph).

**Step-by-step recipe (both plants) to avoid common failures:**
1) Extract a reference: HKX → FBX via HKXPackUI/Havok; import armature only, no meshes. Apply scale/rot to 1.0/0.0 on the armature object before animating.
2) Build a clean action at 30 FPS. Keep the armature object at origin; animate bones only. Add pose markers:
   - Vine: `GrabStart` (~F5), `Clamp` (~F15), `Pull` (~F30), `Release` (~F45).
   - Mouth: `GrabStart` (~F5), `GrabClamp` (~F15), `Lift` (~F25), `Swallow` (~F35), `Release` (~F50).
3) Jaw hinge check (mouth plant): set pivot at hinge, ensure `JawLower` rotates on one axis (usually X). Zero roll; avoid translating the jaw bone.
4) Export FBX (deform bones only, Apply Transform OFF, bake all keys, FPS 30). No leaf bones. Keep names exactly as in the reference skeleton.
5) Havok build to FO4 2010.2.0-r1; verify annotations carried through (HKX annotation list should show your markers).
6) In-game hook-up: point your idle/attack to the HKX, and make sure the behavior graph listens for your annotation names (or rename markers to match existing events).

If earlier attempts failed, usual causes: renamed bones, unapplied armature transforms, wrong FPS (15/24), missing annotations, or exporting non-deform helpers. Fix those first, then rebuild the HKX.

## Troubleshooting
- **Animation plays too fast/slow:** Check scene FPS; ensure script speed-fix ran; re-bake keyframes.
- **Attachments misaligned:** Verify bone names and parent order; re-run attachment pass in script; check applied transforms on props.
- **Missing annotations:** Ensure pose markers exist and are named; rerun conversion step.
- **Havok build fails:** Confirm using 2014 64-bit tools; check FBX version (binary 2013/2014 works best); remove non-deform bones from export.
- **In-game T-pose:** Wrong skeleton or bone renames; ensure rig matches target actor skeleton; verify HKX build profile (FO4 2010.2.0-r1).

## Quick Checklist
- Blender scene FPS set (e.g., 30)
- Pose markers placed for events
- Attachments parented to correct bones
- Export via automation script
- Havok build with correct profile
- HKX placed in correct Data path
- (Optional) Pack HKX into BA2 for release

## Plant Attack Quick Kit

**Blender action (30 FPS):**
- Bones (deform only): `root` (grounded), `stem1` → `stem2` → `tendril1` → `tip` (striker)
- Timeline: F1–10 windup, F11–25 strike, F26–40 recoil
- Pose marker: add one named `Hit` at ~F18
- Export FBX: only deform bones, Apply Transform OFF, bake all keys, custom FPS 30, no leaf bones

**Minimal damage spell setup (CK):**
1) Magic Effect `PlantHitFX`: Archetype Peak Value Modifier → Health, Delivery: Contact, Casting: Constant Effect, Duration: 0, Magnitude: your damage.
2) Spell `PlantHitSpell`: Type Ability, Delivery Self, add `PlantHitFX`, Cost 0.

**Papyrus with directional cone hit check (player + NPCs + optional external feed):**
```papyrus
Scriptname PlantAttackController extends Actor

Idle  Property AttackIdle Auto         ; your HKX idle/attack
Spell Property DamageSpell Auto       ; PlantHitSpell
Float Property Range = 200.0 Auto
Float Property ConeDeg = 80.0 Auto    ; half-angle cone
Float Property Cooldown = 2.5 Auto

Bool isOnCooldown = False
Actor[] cachedTargets
Int cachedCount = 0
Actor[] externalTargets        ; filled by cloak/trigger helpers (optional)

Event OnLoad()
   RegisterForAnimationEvent(self, "Hit") ; matches pose marker/annotation
   RegisterForSingleUpdate(0.5)
EndEvent

Event OnUpdate()
   if isOnCooldown
      RegisterForSingleUpdate(0.5)
      return
   endif

   RefreshTargets()
   if cachedCount > 0
      isOnCooldown = True
      PlayIdle(AttackIdle)
      RegisterForSingleUpdate(Cooldown)
   else
      RegisterForSingleUpdate(0.5)
   endif
EndEvent

Event OnAnimationEvent(string evn)
   if evn == "Hit" && cachedCount > 0
      int i = 0
      while i < cachedCount
         Actor target = cachedTargets[i]
         if target && IsTargetInCone(target, Range, ConeDeg)
            if DamageSpell
               DamageSpell.Cast(self, target)
            else
               target.DamageAV("Health", 15.0)
            endif
         endif
         i += 1
      endwhile
      externalTargets = new Actor[0] ; clear after swing
   endif
EndEvent

Function RefreshTargets()
   cachedTargets = new Actor[2]      ; slot 0: player, slot 1: combat target
   cachedCount = 0

   Actor playerRef = Game.GetPlayer()
   if playerRef && IsTargetInCone(playerRef, Range, ConeDeg)
      cachedTargets[cachedCount] = playerRef
      cachedCount += 1
   endif

   Actor combatRef = GetCombatTarget()
   if combatRef && combatRef != playerRef && IsTargetInCone(combatRef, Range, ConeDeg)
      cachedTargets[cachedCount] = combatRef
      cachedCount += 1
   endif

   ; Pull any externally registered targets (cloak/trigger)
   if externalTargets && externalTargets.Length > 0
      int i = 0
      while i < externalTargets.Length
         Actor ext = externalTargets[i]
         if ext && IsTargetInCone(ext, Range, ConeDeg) && !ArrayHasTarget(ext)
            cachedTargets = cachedTargets + ext
            cachedCount += 1
         endif
         i += 1
      endwhile
   endif
EndFunction

Bool Function ArrayHasTarget(Actor target)
   if !cachedTargets
      return False
   endif
   int i = 0
   while i < cachedTargets.Length
      if cachedTargets[i] == target
         return True
      endif
      i += 1
   endwhile
   return False
EndFunction

Function RegisterExternalTarget(Actor target)
   if !target
      return
   endif
   externalTargets = externalTargets + target
EndFunction

Bool Function IsTargetInCone(Actor target, Float maxRange, Float halfAngleDeg)
   if !target
      return False
   endif
   float dist = GetDistance(target)
   if dist > maxRange
      return False
   endif

   ; Direction from actor to target
   float dx = target.GetPositionX() - GetPositionX()
   float dy = target.GetPositionY() - GetPositionY()
   float len = Math.Sqrt(dx*dx + dy*dy)
   if len <= 0.0
      return True
   endif
   dx /= len
   dy /= len

   ; Forward vector from heading
   float heading = GetAngleZ()
   float fx = Math.Sin(heading)
   float fy = Math.Cos(heading)

   float dot = dx*fx + dy*fy
   float cosLimit = Math.Cos(halfAngleDeg * 0.0174533)
   return dot >= cosLimit
EndFunction
```

**Wire-up notes:**
- HKX must contain the `Hit` annotation (from the Blender pose marker).
- Fill `AttackIdle` with your HKX; fill `DamageSpell` with `PlantHitSpell`.
- The script now hits the player (if inside the cone/range) and the actor you are currently in combat with (if different). To include arbitrary nearby actors, register them via `RegisterExternalTarget()` from a cloak or trigger helper.

**Optional: cloak-based auto-fill (recommended for “area awareness”):**
1) Create a cloak spell on the plant (ability, self, delivery self, constant). Cloak radius = your detection range.
2) Secondary effect script applied by the cloak to anything inside radius:
```papyrus
Scriptname PlantCloakMarker extends ActiveMagicEffect
PlantAttackController Property PlantRef Auto ; fill with the attacking plant actor

Event OnEffectStart(Actor akTarget, Actor akCaster)
   if PlantRef && akTarget && akTarget != PlantRef
      PlantRef.RegisterExternalTarget(akTarget)
   endif
EndEvent
```
3) Each OnUpdate the controller pulls these registered targets and filters by cone/range before swinging.

**Optional: trigger-volume auto-fill (good for static plants):**
```papyrus
Scriptname PlantTriggerCollector extends ObjectReference
PlantAttackController Property PlantRef Auto

Event OnTriggerEnter(ObjectReference akActionRef)
   Actor a = akActionRef as Actor
   if a && PlantRef
      PlantRef.RegisterExternalTarget(a)
   endif
EndEvent
```
Place a trigger around the plant and fill `PlantRef`. This keeps adding actors that step in; the controller filters and clears after each swing.

## Carnivorous Plant Behavior Graph Integration

**Behavior graph event flow (vine grabber):**
1) Detect target in range → idle → `GrabStart` annotation fires.
2) Vines extend and wrap → `Clamp` annotation (damage or stun on hit).
3) Plant reels victim in → `Pull` annotation.
4) Victim in plant/swallowed → `Release` annotation; return to idle.

**Behavior graph event flow (mouth plant):**
1) Plant awakens and bends toward victim → `GrabStart` annotation.
2) Arms/vines grab and lift victim → `GrabClamp` annotation (apply grab spell/paralysis).
3) Plant straightens, bringing victim to mouth → `Lift` annotation.
4) Jaw opens and victim slides down → `Swallow` annotation; trigger ragdoll or fade effect on victim.
5) Jaw closes → `Release` annotation; return to idle.

**CK behavior graph setup:**
- Create a behavior with states: `Idle`, `Awaken`, `Attack`, `Swallow`, `Return`.
- Transitions on annotations: `GrabStart` → `Awaken` → `Attack`; `Clamp`/`GrabClamp` applies damage/control spell; `Pull`/`Lift` applies movement spell or teleport; `Swallow` triggers vanish/death; `Release` → `Return` → `Idle`.
- Link the HKX to an attack entry (idle) in the CK; tie annotation events to behavior transitions.

**Papyrus for grab/swallow flow (extends PlantAttackController):**
```papyrus
Scriptname CarnivousPlantBehavior extends PlantAttackController

; Add these to extend the base controller for grab/swallow sequences
Spell Property GrabSpell Auto        ; applies paralysis or pull
Spell Property SwallowSpell Auto    ; kill or teleport victim
Int Property SwallowCount = 0 Auto  ; counts victims consumed

Function RefreshTargets()
   ; (base call from parent, then add swallow logic)
   parent RefreshTargets()
   
   ; Optional: track victim count for context/loot
   SwallowCount = SwallowCount
EndFunction

Event OnAnimationEvent(string evn)
   if evn == "GrabClamp" && cachedCount > 0
      int i = 0
      while i < cachedCount
         Actor target = cachedTargets[i]
         if target && GrabSpell
            GrabSpell.Cast(self, target)  ; paralysis/pull
         endif
         i += 1
      endwhile
   elseif evn == "Swallow" && cachedCount > 0
      int i = 0
      while i < cachedCount
         Actor target = cachedTargets[i]
         if target && SwallowSpell
            SwallowSpell.Cast(self, target)  ; kill/teleport
            SwallowCount += 1
         endif
         i += 1
      endwhile
   else
      parent OnAnimationEvent(evn)
   endif
EndEvent
```

**Quick wiring checklist for carnivorous plants:**
- HKX annotations: `GrabStart`, `Clamp`, `Pull` (vine) or `GrabStart`, `GrabClamp`, `Lift`, `Swallow` (mouth).
- Behavior graph transitions on those annotations.
- PlantAttackController handles cone + range checks; CarnivousPlantBehavior adds grab/swallow spell casts.
- Victim capture: apply a paralysis/stun spell on `Clamp`/`GrabClamp`; apply kill/teleport on `Swallow`.
- Optional: add swallow count tracker for loot/progression.

## Ranged Plant Types (Mist & Projectiles)

**Bone layout for mist/projectile plants:**
- Roots/anchors: `Root`, `Base`, `Spine01`, `Spine02` (stable structure).
- Mist emitter: `MistEmitter` (single bone or marker; keep at plant center for radial emission).
- Projectile turrets: `ProjectileTurret_L`, `ProjectileTurret_R` (or `ProjectileTurret01`–`03` for multi-angle). Parent to spine; keep facing outward.
- Optional sight/aiming: `TargetHelper` (non-deform) to aim projectiles; bake aiming into bone keys, then exclude on export.

**Mist plant (passive, nearby trigger):**
- Animation: idle loop → `MistOn` annotation (F10) → mist emission for ~2 sec → `MistOff` annotation (F30) → return to idle.
- Keep armature static; no root motion. Mist emission is handled by attached effect, not bone animation.

**Projectile plant (activator-required):**
- Animation: idle → `ProjectileReady` annotation (windup) → `FireLeft`/`FireRight` (or `FireAll`) annotations at fire frames → `ReloadStart` → `ReloadEnd` → idle.
- Optional: alternate left/right aiming via pose markers for multi-turret setups.

**Poison/infection effect setup (7-day ramp):**
1) Magic Effect `PoisonInfectionFX`: Archetype Ability Mod → Health; Delivery: Delivery Contact; Range 1; constant; Duration 604800 (7 days in seconds); Magnitude starts low (e.g., 0.1) and can escalate.
2) Alternative: use script to apply escalating damage: start at 1 HP/sec, ramp to 5 HP/sec by day 7 (use an Active Magic Effect with OnUpdate every 60 game seconds).
3) Spell `PoisonSpell`: Ability, Self, apply `PoisonInfectionFX`.

**Papyrus for mist emission (passive):**
```papyrus
Scriptname PlantMistEmitter extends Actor

Idle  Property MistIdle Auto          ; idle with MistOn/MistOff annotations
Spell Property PoisonSpell Auto
Float Property MistRange = 300.0 Auto
Float Property MistCheckInterval = 1.0 Auto

Bool isMisting = False

Event OnLoad()
    RegisterForAnimationEvent(self, "MistOn")
    RegisterForAnimationEvent(self, "MistOff")
    RegisterForSingleUpdate(MistCheckInterval)
EndEvent

Event OnUpdate()
    Actor player = Game.GetPlayer()
    if player && GetDistance(player) <= MistRange && !isMisting
        isMisting = True
        PlayIdle(MistIdle)
    else
        RegisterForSingleUpdate(MistCheckInterval)
    endif
EndEvent

Event OnAnimationEvent(string evn)
    if evn == "MistOn"
        ; Attached effect/VFX handles visible mist; apply poison to nearby actors
        Actor player = Game.GetPlayer()
        if player && GetDistance(player) <= MistRange && PoisonSpell
            PoisonSpell.Cast(self, player)
        endif
    elseif evn == "MistOff"
        isMisting = False
        RegisterForSingleUpdate(MistCheckInterval)
    endif
EndEvent
```

**Papyrus for projectile plant (activator-based):**
```papyrus
Scriptname PlantProjectileShooter extends Actor

Idle  Property AttackIdle Auto        ; idle with ProjectileReady/Fire annotations
Spell Property PoisonSpell Auto
ObjectReference Property Activator Auto  ; player activates to trigger attack
Float Property ProjectileRange = 500.0 Auto
Float Property Cooldown = 3.0 Auto

Bool isOnCooldown = False

Event OnLoad()
    RegisterForAnimationEvent(self, "ProjectileReady")
    RegisterForAnimationEvent(self, "FireLeft")
    RegisterForAnimationEvent(self, "FireRight")
    RegisterForAnimationEvent(self, "FireAll")
EndEvent

Event OnActivate(ObjectReference akActionRef)
    if !isOnCooldown
        Actor activator = akActionRef as Actor
        if activator
            isOnCooldown = True
            PlayIdle(AttackIdle)
            RegisterForSingleUpdate(Cooldown)
        endif
    endif
EndEvent

Event OnAnimationEvent(string evn)
    if evn == "FireLeft" || evn == "FireRight" || evn == "FireAll"
        ; Fire projectile toward nearest valid target in range
        Actor target = FindNearestTarget(ProjectileRange)
        if target && PoisonSpell
            ; Cast poison on impact (projectile impact handler or spell direct cast)
            PoisonSpell.Cast(self, target)
        endif
    endif
EndEvent

Actor Function FindNearestTarget(Float maxRange)
    Actor player = Game.GetPlayer()
    if player && GetDistance(player) <= maxRange
        return player
    endif
    
    ; Check combat target or any actor in range (you can expand this)
    Actor combatRef = GetCombatTarget()
    if combatRef && GetDistance(combatRef) <= maxRange
        return combatRef
    endif
    
    return None
EndFunction
```

**Escalating poison/infection script (7-day progressive damage):**
```papyrus
Scriptname PoisonInfectionFX extends ActiveMagicEffect

Float Property DamagePerUpdate = 0.016666 Auto  ; ~1 HP/sec at 60-sec intervals
Float Property MaxDamage = 0.083333 Auto        ; ~5 HP/sec at day 7
Float Property Duration = 604800.0 Auto         ; 7 days in seconds
Float Property CheckInterval = 60.0 Auto        ; update every 60 game seconds

Float ElapsedTime = 0.0
Actor AffectedActor

Event OnEffectStart(Actor akTarget, Actor akCaster)
    AffectedActor = akTarget
    ElapsedTime = 0.0
    RegisterForUpdate(CheckInterval)
EndEvent

Event OnUpdate()
    if !AffectedActor
        Dispel()
        return
    endif
    
    ElapsedTime += CheckInterval
    Float Progress = ElapsedTime / Duration  ; 0 to 1 over 7 days
    Float CurrentDamage = DamagePerUpdate + (MaxDamage - DamagePerUpdate) * Progress
    
    AffectedActor.DamageAV("Health", CurrentDamage)
    
    if ElapsedTime >= Duration
        Dispel()
    else
        RegisterForUpdate(CheckInterval)
    endif
EndEvent

Event OnEffectFinish(Actor akTarget, Actor akCaster)
    ; Poison expires after 7 days
EndEvent
```

**Wiring notes for ranged plants:**
- **Mist plant:** Attach a fog/mist effect to `MistEmitter` bone; PlantMistEmitter script detects player proximity and plays idle with `MistOn` annotation. Poison spell auto-casts on nearby actors.
- **Projectile plant:** Requires player activation (or an activator trigger). AttackIdle plays with `FireLeft`/`FireRight` annotations; projectile creation/firing is handled by attached ammo or a projectile helper script (tie to your spell/projectile system).
- **Poison effect:** Use the escalating script (PoisonInfectionFX) applied by both mist and projectile spells. Damage ramps over 7 days from low (1 HP/sec) to high (5 HP/sec).
- **7-day duration:** Game seconds = 604800 (7 * 24 * 3600); real-time updates every 60 game seconds (~6 real-time seconds on default timescale).

**Projectile helper (if you need custom projectile spawning):**
If you want projectiles to spawn from the turret bones and track targets, create a helper script fired on `FireLeft`/`FireRight` annotations that spawns a projectile from the turret bone, aims at the target, and applies poison on impact.

## Glow Maps & Particle Effects

**Glow maps for plant meshes (NIF/materials):**
- Glow maps enhance glowing parts of plants (bioluminescent patches, veins, eyes, mist emitters). They are extra texture channels applied to the mesh.
- In Blender: Import the NIF, assign materials, and use extra UV maps for glow channels. PyNifly allows you to set glow properties on export.
- In the CK or NifSkope: Open the plant's NIF, find materials, and add glow/specular maps in the shader properties. Use a desaturated/grayscale texture for the glow (brighter = more glow).
- Glow channels: Set `Emit Emittance` to > 0 on materials you want to glow (typical range 0.5–2.0 for subtle, 2.0+ for bright bioluminescence).
- Example: poison-veined tendril with glow map showing vein glow intensity, or a maw with glowing throat.

**Particle effects attachment workflow:**
1) Create the particle effect in the CK: FX Editor → Particle System (e.g., `PlantPoisonMist`, `PlantSpores`, `ProjectileTrail`).
2) Set up emitter properties: emission rate, lifetime, spread cone, initial velocity, gravity.
3) Add textures: use a grayscale cloud/smoke texture for mist, or small speckle textures for spores.
4) Attach the effect to a bone:
   - In the CK: open the plant's NIF/mesh, add an Effect shader node or use a spell's effect to trigger the particle system.
   - Via script: attach particle effect at `MistEmitter` bone on `MistOn` annotation; detach on `MistOff`.
   - Via spell: add the particle effect to the poison spell; it auto-attaches when cast.
5) Test in-game: verify emission cone aligns with plant orientation and animation timing.

**Particle effect setup for plant types:**

**Mist/poison cloud (passive plant):**
- Effect name: `PlantPoisonMist` (or similar).
- Emitter: 30–50 particles/sec, lifetime 3–5 sec, spread 180° cone (radial).
- Texture: greenish/purplish cloud, opacity ~0.6 for visibility but not total obstruction.
- Attach to: `MistEmitter` bone; auto-emit on `MistOn` annotation.
- Optional: add slight upward drift or radial spread to simulate toxic cloud expanding.

**Projectile trail (ranged plant):**
- Effect name: `PoisonProjectileTrail`.
- Emitter: 5–10 particles/sec along projectile path, lifetime 1–2 sec, small spread cone.
- Texture: thin vapor/poison droplets, color matching the poison (green/purple).
- Trigger: on projectile spawn (fired from `FireLeft`/`FireRight` annotations).
- Optional: make trail brighter toward impact (use OnEffectStart fade-in, fade-out on impact).

**Spore/pollen burst (impact or alarm effect):**
- Effect name: `PlantSpores`.
- Emitter: burst on impact (high initial emission), lifetime 2–3 sec, spread wide cone, gentle gravity (downward drift).
- Texture: small pollen/spore specks, yellowish or reddish depending on plant.
- Trigger: on `GrabStart` (vine plant awakens) or `FireAll` (projectile plant alarm).

**Papyrus helper for particle effect attachment (mist plant):**
```papyrus
Scriptname PlantMistEffectManager extends ActiveMagicEffect

String Property MistEffectPath = "PlantPoisons:PlantPoisonMist" Auto
ObjectReference Property EmitterRef Auto  ; will hold the effect reference

Event OnEffectStart(Actor akTarget, Actor akCaster)
    ; Find the mist emitter bone on the plant
    Actor PlantRef = akCaster
    if PlantRef
        ; Attach the particle effect at the plant's mist emitter
        EmitterRef = PlantRef.PlaceAtMe(Game.GetFormFromFile(0x00000000, "PlantPoisons.esp"), 1, False, False)
        EmitterRef.SetPosition(PlantRef.GetPositionX(), PlantRef.GetPositionY(), PlantRef.GetPositionZ())
    endif
EndEvent

Event OnEffectFinish(Actor akTarget, Actor akCaster)
    if EmitterRef
        EmitterRef.Delete()
    endif
EndEvent
```

**Papyrus for projectile poison trail:**
```papyrus
Scriptname PoisonProjectileTrail extends ObjectReference

String Property TrailEffect = "PlantPoisons:PoisonProjectileTrail" Auto
ObjectReference TrailEmitter

Event OnInit()
    ; Create particle effect at projectile origin
    TrailEmitter = PlaceAtMe(Game.GetFormFromFile(0x00000000, "PlantPoisons.esp"), 1, False, False)
EndEvent

Event OnUpdate()
    ; Update emitter position to follow projectile
    if TrailEmitter
        TrailEmitter.SetPosition(GetPositionX(), GetPositionY(), GetPositionZ())
    endif
    RegisterForUpdate(0.1)  ; update every 0.1 sec
EndEvent

Event OnHit(ObjectReference akProjectile, ObjectReference akTarget)
    ; On impact, fade out trail and apply poison
    if TrailEmitter
        TrailEmitter.Delete()
    endif
    if akTarget as Actor
        ; Apply poison effect on impact
        (akTarget as Actor).DamageAV("Health", 10.0)  ; or use spell cast
    endif
EndEvent
```

**Glow + particle checklist:**
- **Mesh glow:** Set `Emittance` on plant material nodes (NIfSkope or PyNifly); test in-game with lighting on/off.
- **Particle effects:** Create in CK FX Editor; test emission cone and lifetime match animation timings.
- **Attachment:** Use scripts (OnAnimationEvent) or spell effects to trigger particles at the right frame.
- **Color matching:** Glow and particles should match the poison color scheme (greens, purples, sickly yellows).
- **Performance:** Limit particle count; test with multiple plants in one cell to ensure no frame drops.

## Quest Modding (Start to Finish)

**Quest structure overview:**
A quest is a storyline container with stages, objectives, and dialogue. Each stage triggers scripts, dialogue, or quest marker updates.

**Step 1: Create quest in CK**
1) Open CK, load your mod's master (or no master if standalone).
2) Quests → New Quest → name it (e.g., `PlantHunt_Main`).
3) Set up quest properties:
   - **Quest Stages:** Define 0–200 (stage 0 is start, stages increment as player progresses).
   - **Objectives:** Link objectives to stages (e.g., Stage 10 = "Find the plant lair"; Stage 50 = "Destroy the plants").
   - **Dialogue:** Assign dialogue topics to NPCs for quest hints/rewards.

**Step 2: Build quest stages and objectives**
- Stage 0: Quest starts (hidden, internal setup).
- Stage 10: Player receives quest marker to plant location.
- Stage 20: Player discovers plant lair (auto-triggers on proximity or dialogue).
- Stage 50: Player must defeat/destroy a number of plants.
- Stage 100: Quest objective marked complete; NPC acknowledges success.
- Stage 200: Quest complete; reward given.

Example stage structure:
```
Stage 10: Set objective 10 ("Go to Fungal Cavern"), place quest marker.
Stage 20: On player proximity to cavern, set objective 20 ("Defeat the plants"), remove marker.
Stage 50: After X plants killed (script check), set objective 50 ("Report back to NPC"), place objective marker on NPC.
Stage 100: Player talks to NPC, receives reward, set objective 100 ("Quest Complete").
Stage 200: Quest ends.
```

**Step 3: Dialogue setup**
1) Create a Dialogue Topic (e.g., `PlantHunt_Quest`).
2) Add dialogue responses:
   - Quest start: NPC tells player about plants.
   - Quest progress: NPC hints at location or status.
   - Quest end: NPC congratulates and rewards.
3) Link responses to quest stages via conditions (GetStageDone, GetQuestRunning, etc.).

Example condition:
```
GetQuestRunning PlantHunt_Main == 1
AND GetStageDone PlantHunt_Main 10 == 0
```
This makes the dialogue only appear when quest is running and stage 10 is not done.

**Step 4: Script triggers for stages**
Create a quest script that monitors player progress and auto-advances stages.

```papyrus
Scriptname PlantHuntQuestScript extends Quest

; Properties
ObjectReference Property PlantLairMarker Auto    ; marker object for quest location
Keyword Property PlantKeyword Auto               ; keyword on all plants for counting
Float Property KillCheckInterval = 1.0 Auto

; Script-managed state
Int InitialPlantCount = 0
Int PlantsKilled = 0

Event OnQuestInit()
    ; Quest starts: initialize state
    InitialPlantCount = CountPlantsWithKeyword(PlantKeyword)
    PlantsKilled = 0
    
    ; Set initial stage
    SetStage(10)
    RegisterForUpdate(KillCheckInterval)
EndEvent

Event OnUpdate()
    ; Check if player killed any plants
    Int CurrentCount = CountPlantsWithKeyword(PlantKeyword)
    Int NewKills = InitialPlantCount - CurrentCount
    
    if NewKills > PlantsKilled
        PlantsKilled = NewKills
        if PlantsKilled >= 3  ; example: need to kill 3 plants
            SetStage(50)  ; objective: return to NPC
            UnregisterForUpdate()
        endif
    endif
EndEvent

Int Function CountPlantsWithKeyword(Keyword kw)
    ; Helper: count remaining plants with keyword
    ; You'd use FindAllReferencesOfType or similar; simplified here
    return 0  ; placeholder
EndFunction
```

**Step 5: Reward setup**
1) **Items:** Add items to player inventory on quest completion.
2) **Gold:** Use a script to add currency.
3) **Spells/Perks:** Grant new abilities.
4) **Experience:** Increase a skill via Papyrus.

Example reward script:
```papyrus
Scriptname PlantHuntRewardScript extends Quest

ObjectReference Property NPC Auto
Armor Property RewardArmor Auto
Spell Property RewardSpell Auto
Int RewardGold = 500

Event OnStageSet(int auiStageID, int aiSeenDataID)
    if auiStageID == 100
        Actor player = Game.GetPlayer()
        if player
            ; Give items
            player.AddItem(RewardArmor, 1, False)
            player.AddItem(Game.GetFormFromFile(0x0000000F, "Skyrim.esm"), RewardGold, False)
            ; Give spell
            player.AddSpell(RewardSpell, False)
            ; Show message
            Debug.MessageBox("Quest complete! You've earned: " + RewardArmor.GetName() + " and " + RewardGold + " gold.")
        endif
    endif
EndEvent
```

**Step 6: Testing the quest in-game**
1) Save the mod in CK.
2) Launch Fallout 4 with your mod active.
3) Open console: `cqf PlantHunt_Main` to force quest start.
4) Test each stage: `SetStage PlantHunt_Main 50` to jump to stage 50.
5) Test dialogue conditions and rewards.
6) Use `GetStage PlantHunt_Main` to verify current stage.

**Step 7: Packaging the quest mod**
1) Ensure all quests, NPCs, dialogue, scripts, and assets (meshes, textures, effects) are in your mod.
2) Package into BA2 (see BA2 guide) or distribute as loose files.
3) Create a readme with quest start conditions (talk to NPC X, or use console command).

**Quest MOD quick checklist:**
- [ ] Quest created with stages 0, 10, 20, 50, 100, 200.
- [ ] Objectives assigned to stages.
- [ ] Dialogue topics linked to quest stages via conditions.
- [ ] Quest script monitors progress and auto-advances stages.
- [ ] Rewards set up (items, gold, spells).
- [ ] Tested in-game with console commands.
- [ ] All assets (meshes, scripts, dialogue) packaged in BA2 or loose files.
- [ ] Readme documents quest start and objectives.

## Building Plots & City Plans (Settlement Content)

**Overview:**
Plots are settlement objects players can build in their settlements. City Plans are pre-made settlement layouts that include multiple plots and decorations. This section covers creating modular settlement buildings tied to your plant mod.

**Step 1: Create a settlement building (plot) in CK**
1) Open CK, load Fallout4.esm.
2) Object window → Furniture or Statics → New Item.
3) Build your plant-themed structure:
   - Plant lair entrance (modeled in Blender, exported as NIF).
   - Grow room with hanging vines (static meshes).
   - Poison garden with glowing plants (use your animated plants).
4) Assign scripts: attach `PlantAttackController` or `CarnivousPlantBehavior` to animated plants in the plot.
5) Set snap points for settlement building grid (use snap markers).
6) Test placement in a workshop settlement.

**Step 2: Define settlement categories**
1) In the CK, categorize your plot:
   - **Category:** Settlement (Decorations, Structures, Flora).
   - **Keywords:** Add settlement keywords (e.g., `WorkshopPlant`, `PlantFarm`).
   - **Cost:** Assign build cost (caps, materials: wood, steel, adhesive).
2) Example: "Carnivorous Plant Lair" costs 100 caps, 10 steel, 15 wood, 5 adhesive.

**Step 3: Create a City Plan (pre-made layout)**
A City Plan is a collection of linked plots + decorations grouped into a single purchasable/buildable layout.

1) **Create a test settlement:** Use a cell you own (e.g., a small clearing).
2) **Place plots:** Add your plant buildings, decorations, water, power, etc.
3) **Record the layout:** Export the object placements (CK → Render → Save Layout or use a helper script).
4) **Package as City Plan:** Link all placed objects into a single "City Plan" record in the CK.
   - Use a quest or script to track placed objects.
   - On player activation, spawn all objects at once at the target settlement.

Example City Plan workflow:
```
City Plan: "Fungal Garden" (quest-driven)
├── Plant Lair (central structure)
├── Grow Beds (3x, around lair)
├── Poison Gardens (2x, flanking)
├── Defense Turrets (optional, plant-themed)
└── Gathering Hub (NPC work area)
```

**Step 4: Script for City Plan placement**
```papyrus
Scriptname CityPlanFungalGarden extends ObjectReference

; Properties for all objects in the plan
ObjectReference Property PlantLair Auto
ObjectReference[] Property GrowBeds Auto
ObjectReference[] Property PoisonGardens Auto
ObjectReference Property GatheringHub Auto

; Offset from player to avoid overlaps
Float Property OffsetX = 500.0 Auto
Float Property OffsetY = 500.0 Auto

Event OnActivate(ObjectReference akActionRef)
    Actor player = akActionRef as Actor
    if player && player == Game.GetPlayer()
        ; Place all objects of the city plan
        Float baseX = player.GetPositionX() + OffsetX
        Float baseY = player.GetPositionY() + OffsetY
        Float baseZ = player.GetPositionZ()
        
        ; Spawn main lair
        ObjectReference spawnedLair = PlantLair.PlaceAtMe(Game.GetFormFromFile(0x00000000, "YourMod.esp"), 1, False, False)
        spawnedLair.SetPosition(baseX, baseY, baseZ)
        
        ; Spawn grow beds in a circle
        int i = 0
        while i < GrowBeds.Length
            Float angle = (i / GrowBeds.Length) * 6.28318  ; 2*pi
            Float bedX = baseX + Math.Cos(angle) * 300.0
            Float bedY = baseY + Math.Sin(angle) * 300.0
            ObjectReference spawnedBed = GrowBeds[i].PlaceAtMe(Game.GetFormFromFile(0x00000000, "YourMod.esp"), 1, False, False)
            spawnedBed.SetPosition(bedX, bedY, baseZ)
            i += 1
        endwhile
        
        Debug.MessageBox("Fungal Garden city plan placed!")
    endif
EndEvent
```

**Step 5: Integrate with quest rewards**
Link City Plan placement to quest completion:
```papyrus
Event OnStageSet(int auiStageID, int aiSeenDataID)
    if auiStageID == 100
        ; Quest complete: unlock city plan
        ; Add to player's settlement building list or auto-place
        Debug.MessageBox("You've unlocked the Fungal Garden city plan for your settlements!")
    endif
EndEvent
```

**Step 6: Best practices for settlement building design**
- **Modular:** Design plots to work together (matching textures, scale, themes).
- **Performance:** Limit geometry and scripts per plot. Use LOD meshes for distant objects.
- **Snap points:** Align snap grid so plots snap cleanly together.
- **Power/water:** Include power connectors or water taps for settlement integration.
- **NPCs:** Add work areas (furniture) for settlers assigned to the plot.
- **Navigation:** Leave pathways between plots so NPCs can navigate.

**Step 7: Testing & distribution**
1) Build test settlements with your plots.
2) Verify snap alignment, performance, NPC pathing.
3) Package all plots, scripts, meshes into BA2 (see BA2 guide).
4) Create a City Plan readme:
   - List all included plots.
   - Cost and requirements.
   - How to activate/place (console or NPC dialogue).
   - Screenshots of example layouts.

**City Plan mod checklist:**
- [ ] Settlement plots created and categorized in CK.
- [ ] Snap points aligned on grid.
- [ ] Cost/materials assigned.
- [ ] City Plan record created (quest or script-driven).
- [ ] Placement script tested in-game.
- [ ] Quest rewards unlock City Plan or provide access.
- [ ] All meshes, scripts, effects packaged.
- [ ] Performance tested (no lag with multiple plots).
- [ ] Readme includes screenshots, costs, activation instructions.

## Sim Settlements Add-On Modding for Fallout 4 (Kinggath Toolkit)

**What is Sim Settlements for Fallout 4?**
Sim Settlements is a comprehensive settlement overhaul mod for Fallout 4 that adds city plans, custom buildings, leaders, economy systems, and more. The Add-On Maker's Toolkit (provided by Kinggath) enables creators to build add-on content for Fallout 4 settlements without deep modding experience.

**Add-On Maker's Toolkit resources:**
- Official Wiki: wiki.simsettlements.com (Fallout 4 section)
- PDF tutorials and guides included in the toolkit
- XEdit scripts for rapid workflows
- Support Discord and community forums
- No prior modding experience required; step-by-step tutorials

**What you can create with the toolkit (Fallout 4):**
- New settlement buildings (plots for settlements)
- City plans (pre-made settlement layouts)
- New settlement leaders (unique NPCs with perks/bonuses)
- Custom industrial buildings
- Unlockable content (progression-based buildings)
- Economy system integration (production, trade, resources)
- Custom flags and settlement aesthetics
- Discovery system content (locations, artifacts)

**Step 1: Set up the Add-On Maker's Toolkit (Fallout 4)**
1) Download the toolkit from nexusmods.com/fallout4/mods/[SimSettlements-ID].
2) Extract to a working folder (e.g., `SimSettlements_Addons/YourAddonName/`).
3) Folder structure:
   ```
   YourAddonName/
   ├── Data/
   │   ├── Meshes/YourAddonName/
   │   ├── Textures/YourAddonName/
   │   └── Scripts/YourAddonName/
   ├── Templates/
   │   ├── Building_Template.xml
   │   ├── CityPlan_Template.xml
   │   ├── Leader_Template.json
   │   └── Settlement_Building_Config.json
   ├── Docs/
   │   └── Tutorials (PDFs)
   └── Tools/
       └── XEdit_Scripts/
   ```

**Step 2: Create a settlement building (plot) for Fallout 4**

**Part A: Model the building in Blender**
1) Open Blender; create settlement architecture matching Fallout 4 aesthetic (pre-war, Vault-Tec, industrial, or custom).
2) Export as FBX (apply transforms, single mesh or clean hierarchy).
3) Convert to NIF using Outfit Studio or PyNifly:
   - Set collision (simple box or convex hull for performance).
   - Apply proper materials (diffuse, normal, specular, emissive for glow).
4) Place NIF in `Data/Meshes/YourAddonName/Building_Name/`.

**Part B: Configure the building in XEdit (Fallout 4)**
1) Open the toolkit's XEdit script: `CreateSettlementBuilding.pas` (Fallout 4 version).
2) Fill in the building properties:
   - **Name:** "Carnivorous Plant Lair" (player-visible in build menu).
   - **Model Path:** `Meshes/YourAddonName/PlantLair/model.nif`.
   - **Category:** Settlement building (Housing, Food Production, Water, Defense, Decoration, etc.).
   - **Tags:** Settlement keywords (e.g., `Plant_Garden`, `Predator_Lair`, `Farm`).
   - **Build Cost:** Junk materials (wood, steel, adhesive, gears, screws, etc.).
   - **Scripts:** Attach Sim Settlements framework scripts for integration.
3) Example build cost:
   ```json
   {
     "Wood": 10,
     "Steel": 15,
     "Adhesive": 5,
     "Screw": 3,
     "Copper": 2
   }
   ```
4) Run the script; it auto-generates the building form in your mod.

**Part C: Define building jobs and production (Fallout 4)**
1) If your building is a workplace, assign a job type:
   - **Job Type:** Farmer, Guard, Trader, Scavenger, Engineer, etc.
   - **Work animation:** Point to furniture/markers (benches, workstations) in the building.
   - **Happiness modifier:** How the building affects settlement happiness (+/- %).
   - **Production:** What the settler produces (food, water, materials, items).
2) Example (plant farm):
   ```json
   {
     "JobType": "Farmer",
     "WorkAnimations": ["Lounge", "Sit", "Farm"],
     "Production": {
       "Food": 2,
       "PlantMaterial": 1
     },
     "HappinessModifier": 5
   }
   ```
3) Link to Sim Settlements economy if desired (integration with industrial system).

**Part D: Test the building in Fallout 4**
1) Load your mod in Fallout 4 with Sim Settlements active.
2) Start a settlement (Sanctuary, Red Rocket, etc.); find your building in the build menu.
3) Place it; verify mesh, collisions, snap points, NPC animations.
4) If it has jobs, assign a settler and verify work animations play correctly.

**Step 3: Create a city plan for Fallout 4**

**Part A: Plan the layout (Fallout 4 settlement)**
1) Sketch a settlement concept on paper or in a layout tool.
   - Central hub (marketplace, town center).
   - Residential zones (housing clusters).
   - Work zones (farms, workshops, plant lairs, factories).
   - Defense (walls, guard towers, turret emplacements).
   - Utility (power, water sources).
   - Gathering areas (benches, campfires, dining).
2) Decide which buildings to include (yours + vanilla + other add-ons).
3) Consider Fallout 4 faction themes (Brotherhood, Railroad, Minutemen, etc.).

**Part B: Configure the city plan in XEdit (Fallout 4)**
1) Open the toolkit's XEdit script: `CreateSettlementCityPlan.pas`.
2) Fill in the plan properties:
   - **Name:** "Fungal Settlement" (player-visible).
   - **Description:** What settlers will build; unique features.
   - **Buildings:** List each building with its position (X, Y, Z), rotation, and flags.
   - **Decorations:** Static objects (walls, rubble, vegetation, light sources).
   - **Leaders:** Assign a leader NPC if applicable.
   - **Rewards:** Optional settlement expansion or unlocks.
3) Example Fallout 4 city plan structure:
   ```json
   {
     "Name": "Fungal Settlement",
     "Description": "A self-sustaining settlement built around bioluminescent plants.",
     "Buildings": [
       {"Name": "Central Plant Lair", "X": 100, "Y": 0, "Z": 0, "Rotation": 0, "Type": "Central_Hub"},
       {"Name": "Carnivorous Plant Beds", "X": 150, "Y": 150, "Z": 0, "Rotation": 45, "Count": 4},
       {"Name": "Water Purifier", "X": 0, "Y": -150, "Z": 0, "Rotation": 0, "Type": "Utility"},
       {"Name": "Guard Tower", "X": -150, "Y": 150, "Z": 0, "Rotation": 90, "Type": "Defense"},
       {"Name": "Housing", "X": 0, "Y": 100, "Z": 0, "Rotation": 0, "Count": 6},
       {"Name": "Market Stall", "X": 50, "Y": -50, "Z": 0, "Rotation": 0, "Count": 3}
     ],
     "InitialLeader": "PlantKeeper_NPC",
     "SettlementName": "The Spore Garden"
   }
   ```

**Part C: Build the city plan in-game (reference method)**
1) Load Fallout 4 with Sim Settlements active.
2) Start a settlement or use a test location.
3) Manually place all buildings from the plan using the settlement workshop menu.
4) Arrange them to your specification; note positions, rotations, and orientations.
5) Take screenshots for documentation.
6) Use Sim Settlements' city plan export tool or manual coordinate recording.

**Part D: Generate the city plan mod (Fallout 4)**
1) Run the `CreateSettlementCityPlan.pas` script with your layout data.
2) Script auto-generates building placements and settlement form records.
3) Test in-game: load the city plan from workshop menu; verify all buildings spawn correctly.

**Step 4: Advanced Sim Settlements integration (Fallout 4)**

**Economy and production system:**
If your buildings integrate with Sim Settlements' economy:
1) Define what resources your buildings produce/consume.
2) Link production rates to settler job assignments.
3) Example: "Plant Farm" produces food based on population.

```json
{
  "Building": "PlantFarm",
  "Production": {
    "Food": 3,
    "PlantMaterial": 1.5,
    "EXP": 10
  },
  "Consumption": {
    "Water": 1,
    "Power": 2
  },
  "MaxSettlers": 5,
  "HappinessModifier": 5
}
```

**Leader system (Fallout 4):**
If your city plan needs a custom settlement leader:
1) Create an NPC in the CK (unique name, custom dialogue, perks).
2) Link the leader to the city plan or individual plots.
3) Assign bonuses the leader provides (production %, happiness, defense).

Example leader:
```json
{
  "Name": "The Gardener",
  "Perks": [
    {"Name": "PlantHarvest_Bonus", "Value": 1.25},
    {"Name": "Poison_Resistance", "Value": 0.5},
    {"Name": "HappinessBonus", "Value": 10}
  ],
  "StartingLevel": 50
}
```

**Unlock/progression system:**
If content unlocks based on player progression:
1) Define unlock triggers (quest completion, workshop level, playtime, etc.).
2) Tag buildings/plans with unlock conditions.
3) Example: "Plant Lair" unlocks after completing a plant-hunting quest or reaching settlement level 10.

```json
{
  "Building": "CarnivousPlantLiar",
  "UnlockCondition": "Quest:PlantHunt_Main Stage 100",
  "AlternateUnlock": "WorkshopLevel >= 10"
}
```

**Step 5: Papyrus scripting for Sim Settlements (Fallout 4)**
Custom behaviors tied to Sim Settlements framework:

```papyrus
Scriptname SimSettings_PlantBuildingScript extends ObjectReference

; Properties for Sim Settlements integration
String Property BuildingID = "SS_PlantLair" Auto
ObjectReference Property SettlementRef Auto
Float Property BaseProduction = 3.0 Auto  ; food per settler

Event OnLoad()
    ; Register with Sim Settlements on placement
    Utility.Wait(1.0)
    SendModEvent("SimSettlement_BuildingPlaced", BuildingID)
EndEvent

Event OnUpdate()
    ; Update production based on assigned settlers
    int settlerCount = GetAssignedSettlers()
    if settlerCount > 0
        float totalProduction = BaseProduction * settlerCount
        ; Send production to Sim Settlements economy
        SendModEvent("SimSettlement_Production", BuildingID, totalProduction)
    endif
    RegisterForSingleUpdate(3600.0)  ; update every hour (game time)
EndEvent

Int Function GetAssignedSettlers()
    ; Count settlers assigned to this building (via linked actor data)
    ; Simplified; actual implementation uses Sim Settlements functions
    return 0
EndFunction

Event OnActivate(ObjectReference akActionRef)
    ; Allow settlement worker assignment
    Actor settler = akActionRef as Actor
    if settler
        settler.SetLinkedRef(self, None)  ; link settler to building
    endif
EndEvent
```

**Step 6: Testing the complete Fallout 4 add-on**
1) **Load order:** Your mod → Sim Settlements (main) → Fallout4.esm.
2) **In-game testing:**
   - Verify buildings appear in settlement workshop build menu.
   - Place buildings; check mesh/collision integrity.
   - Assign settlers; verify job animations work.
   - Verify production values increase with settler count.
   - Place city plan; verify all buildings spawn and link correctly.
3) **Compatibility:** Test with popular Sim Settlements add-ons (no conflicts).
4) **Performance:** Monitor frame rate with many plots placed in a settlement.
5) **Console commands (Fallout 4):**
   - `cqf SimSettlement_Quest` (check Sim Settlements framework status).
   - `player.additem [FormID] 1` (spawn building for testing).
   - `getav WorkshopLevelUp` (check settlement level).

**Step 7: Package and distribute the Fallout 4 add-on**
1) **Folder structure for distribution:**
   ```
   YourAddonName/
   ├── Data/
   │   ├── Meshes/YourAddonName/...
   │   ├── Textures/YourAddonName/...
   │   └── Scripts/YourAddonName/...
   ├── YourAddonName.esp
   ├── README.md
   ├── INSTALLATION.txt
   └── Screenshots/
   ```
2) **Create a detailed README:**
   - Mod description and theme.
   - List of all buildings included with build costs.
   - List of city plans included with settler counts.
   - Installation instructions (load order).
   - Required mods (Sim Settlements, patches if any).
   - Features and production rates.
   - Known issues or compatibility notes.
   - Credits (builders, modelers, scripters).
3) **Create an INSTALLATION.txt:**
   - Step-by-step installation for mod managers (MO2, Vortex).
   - Manual installation for advanced users.
4) **Upload to Nexus:** Mark as Sim Settlements add-on, tag appropriately (settlement, building, etc.).

**Step 8: Community and feedback**
1) Post on Sim Settlements community Discord/forums (Fallout 4 channel).
2) Link to your add-on in the Sim Settlements main mod page.
3) Monitor for bug reports; release patches if needed.
4) Contribute back to community (share scripts, tips, building templates).

**Fallout 4 Sim Settlements Add-On checklist:**
- [ ] Buildings modeled in Blender, converted to NIF.
- [ ] Build costs assigned (wood, steel, adhesive, etc.).
- [ ] Building configurations generated via XEdit script.
- [ ] Jobs/production rates configured and balanced.
- [ ] Buildings tested in-game (placement, collisions, work animations).
- [ ] City plans designed and laid out.
- [ ] City plan configurations generated and tested.
- [ ] Optional: Economy/leader/unlock integration implemented.
- [ ] Papyrus scripts tested (if custom behaviors).
- [ ] Load order verified (your mod → Sim Settlements → Fallout4.esm).
- [ ] Compatibility tested with other SS add-ons.
- [ ] Performance tested with multiple plots in a settlement.
- [ ] README and INSTALLATION.txt written with screenshots.
- [ ] Packaged and uploaded to Nexus.

## Sim Settlements 2 Add-On Modding for Fallout 4 (Kinggath Toolkit)

**What is Sim Settlements 2 for Fallout 4?**
Sim Settlements 2 is the expanded successor to the original Sim Settlements, bringing advanced settlement tools, city plans, leaders, economy systems, and industrial production to Fallout 4. The Add-On Maker's Toolkit (provided by Kinggath) enables creators to build add-on content for Sim Settlements 2 (Fallout 4) without extensive modding experience.

**Key differences from Sim Settlements 1 (Fallout 4):**
- More sophisticated city plan system with branching layouts.
- Industrial production chains (raw materials → processed goods → trade).
- Dynamic leader system with unique perks and settlement progression.
- Integration with broader Fallout 4 settlement ecosystem.
- Advanced customization options for buildings and plots.

**Add-On Maker's Toolkit resources (SS2 Fallout 4):**
- Official Wiki: wiki.simsettlements2.com (Fallout 4 section)
- PDF tutorials and guides included in the toolkit
- XEdit scripts for rapid workflow automation
- Support Discord and community forums
- Example add-on packs for reference

**What you can create with SS2 toolkit (Fallout 4):**
- Advanced settlement buildings with multi-stage production
- Complex city plans with branching layout options
- Custom settlement leaders with unique perks and dialogue
- Industrial production chains (ore → metal → weapons, etc.)
- Unlockable content (progression-based buildings)
- Custom banners and faction-themed decorations
- Discovery/loot integration
- Economy system add-ons
- Custom settler roles and job types

**Step 1: Set up Sim Settlements 2 Toolkit (Fallout 4)**
1) Download the SS2 add-on toolkit from nexusmods.com/fallout4/mods/[SimSettlements2-ID].
2) Extract to a working folder (e.g., `SS2_Addons_FO4/YourAddonName/`).
3) Folder structure:
   ```
   YourAddonName/
   ├── Data/
   │   ├── Meshes/YourAddonName/
   │   ├── Textures/YourAddonName/
   │   ├── Scripts/YourAddonName/
   │   └── Sounds/ (optional)
   ├── Templates/
   │   ├── Building_Template.xml
   │   ├── CityPlan_Template.json
   │   ├── Leader_Template.json
   │   └── ProductionChain_Template.json
   ├── Docs/
   │   └── Tutorials (PDFs)
   └── Tools/
       └── XEdit_Scripts/
   ```

**Step 2: Create an advanced SS2 building (multi-stage production)**

**Part A: Model and configure the building**
1) Model the building in Blender; export as FBX → convert to NIF.
2) Create in XEdit using `CreateSS2Building.pas` script:
   - **Name:** "Carnivorous Plant Processor" (player-visible).
   - **Model Path:** `Meshes/YourAddonName/PlantProcessor/model.nif`.
   - **Category:** Industrial, Production, Specialty.
   - **Build Cost:** Higher cost for industrial buildings (50+ materials).
   - **Production Type:** Staged (input → processing → output).
3) Example multi-stage production:
   ```json
   {
     "Name": "Plant Fiber Processor",
     "Type": "Industrial",
     "ProductionStages": [
       {
         "Stage": 1,
         "Input": "PlantMaterial",
         "Process": "Harvest",
         "Output": "PlantFiber",
         "Rate": 2.0
       },
       {
         "Stage": 2,
         "Input": "PlantFiber",
         "Process": "Refine",
         "Output": "RefinedFiber",
         "Rate": 1.5
       }
     ],
     "Workers": 3,
     "BuildCost": {
       "Steel": 25,
       "Wood": 20,
       "Adhesive": 10,
       "Gears": 8,
       "Screws": 5
     }
   }
   ```

**Part B: Define multiple job roles**
SS2 allows complex job assignments:
- **Role 1:** Harvester (collects raw plant material).
- **Role 2:** Processor (refines material).
- **Role 3:** Quality Assurance (ensures quality).

Each role has unique work animations and happiness modifiers.

**Part C: Test in-game**
1) Load Fallout 4 with both SS2 and your mod.
2) Find the building in settlement workshop menu.
3) Place it; assign settlers to each job role.
4) Verify production chains complete correctly (use console to check workshop stats).

**Step 3: Create an advanced SS2 city plan with branching options**

**Part A: Design multiple layout variants**
SS2 city plans can have multiple versions:
- **Variant 1:** Compact (for small settlements).
- **Variant 2:** Expanded (for medium settlements).
- **Variant 3:** Industrial (for large settlements with factories).

Each variant has different building counts and layouts.

**Part B: Configure branching city plan**
```json
{
  "Name": "Fungal Industrial Complex",
  "Description": "A multi-stage settlement focused on processing plant materials.",
  "Variants": [
    {
      "Name": "Compact Spore Garden",
      "Size": "Small",
      "MaxSettlers": 10,
      "BuildingCount": 15,
      "Layout": [
        {"Building": "PlantLair", "X": 100, "Y": 0, "Z": 0, "Count": 1},
        {"Building": "PlantFiber_Processor", "X": 150, "Y": 100, "Z": 0, "Count": 2},
        {"Building": "Housing", "X": 0, "Y": 150, "Z": 0, "Count": 5},
        {"Building": "Water_Purifier", "X": -100, "Y": 0, "Z": 0, "Count": 1}
      ]
    },
    {
      "Name": "Expanded Poison Processing",
      "Size": "Large",
      "MaxSettlers": 30,
      "BuildingCount": 40,
      "Layout": [
        {"Building": "PlantLair", "X": 200, "Y": 0, "Z": 0, "Count": 2},
        {"Building": "PlantFiber_Processor", "X": 300, "Y": 150, "Z": 0, "Count": 6},
        {"Building": "Poison_Refinery", "X": 300, "Y": -150, "Z": 0, "Count": 4},
        {"Building": "Housing", "X": 0, "Y": 200, "Z": 0, "Count": 15},
        {"Building": "Market_Hub", "X": 0, "Y": 0, "Z": 0, "Count": 1}
      ]
    }
  ]
}
```

**Part C: Link city plans to leaders**
Each city plan variant can have an optional leader:
```json
{
  "VariantName": "Expanded Poison Processing",
  "Leader": "MasterChemist_NPC",
  "LeaderPerks": [
    {"Perk": "ChemicalBonus", "Value": 1.25},
    {"Perk": "HappinessBonus", "Value": 15}
  ]
}
```

**Step 4: Advanced SS2 features (Fallout 4)**

**Industrial production chains:**
Define complex multi-building production workflows:
```json
{
  "ProductionChain": "PlantToPoison",
  "Steps": [
    {
      "Building": "PlantHarvester",
      "Input": null,
      "Output": "RawPlant",
      "Rate": 5.0
    },
    {
      "Building": "PlantFiber_Processor",
      "Input": "RawPlant",
      "Output": "PlantFiber",
      "Rate": 3.0
    },
    {
      "Building": "Poison_Refinery",
      "Input": "PlantFiber",
      "Output": "Poison_Extract",
      "Rate": 1.5
    },
    {
      "Building": "Trader",
      "Input": "Poison_Extract",
      "Output": "Caps",
      "Rate": 2.0,
      "TradeValue": 100
    }
  ]
}
```

**Leader system with progression:**
Leaders can level up and unlock building upgrades:
```json
{
  "Leader": "MasterGardener",
  "StartLevel": 1,
  "Perks": [
    {"Level": 1, "Name": "PlantAffinity", "Bonus": 1.1},
    {"Level": 5, "Name": "HarvestMastery", "Bonus": 1.25},
    {"Level": 10, "Name": "PoisonSynthesis", "Bonus": 1.5, "UnlocksBuilding": "AdvancedRefinery"}
  ]
}
```

**Unlock system based on progression:**
```json
{
  "Building": "Poison_Refinery",
  "UnlockConditions": [
    {"Type": "LeaderLevel", "Value": 5},
    {"Type": "ProductionMilestone", "Building": "PlantFiber_Processor", "Amount": 100},
    {"Type": "QuestComplete", "Quest": "PlantHunt_Main"}
  ]
}
```

**Step 5: Papyrus scripting for SS2 (advanced)**

```papyrus
Scriptname SS2_AdvancedPlantSystem extends Quest

; SS2 production chain script
String Property ProductionChainID = "SS2_PlantToPoison" Auto
String Property LeaderID = "SS2_MasterGardener" Auto
ObjectReference Property SettlementRef Auto

; Production rates per stage
Float Property HarvestRate = 5.0 Auto
Float Property ProcessRate = 3.0 Auto
Float Property RefineRate = 1.5 Auto

Event OnInit()
    ; Register production chain with SS2
    SendModEvent("SS2_RegisterChain", ProductionChainID)
    RegisterForSingleUpdate(3600.0)  ; update hourly (game time)
EndEvent

Event OnUpdate()
    ; Check if buildings exist and have settlers
    UpdateProductionStage("PlantHarvester", HarvestRate)
    UpdateProductionStage("PlantFiber_Processor", ProcessRate)
    UpdateProductionStage("Poison_Refinery", RefineRate)
    RegisterForSingleUpdate(3600.0)
EndEvent

Function UpdateProductionStage(String buildingID, Float rate)
    ; Send production event to SS2 for this stage
    SendModEvent("SS2_ProduceResource", buildingID, rate)
EndFunction

Event OnLeaderAssigned(String leaderID)
    ; Called when a leader is assigned to settlement with this building
    if leaderID == LeaderID
        Debug.MessageBox("Master Gardener assigned! Production bonuses active.")
    endif
EndEvent
```

**Step 6: Testing SS2 add-on (Fallout 4)**
1) **Load order:** Your mod → Sim Settlements 2 → Sim Settlements 1 → Fallout4.esm.
2) **In-game testing:**
   - Verify buildings appear in workshop menu with correct categories.
   - Verify city plan variants load correctly.
   - Assign settlers to multiple job roles; check animation variety.
   - Monitor production output and input chain completion.
   - Test leader assignment and perk bonuses.
   - Verify unlock conditions trigger on milestones.
3) **Console commands:**
   - `cqf SS2_SettlementFramework` (check framework status).
   - `getav WorkshopLevelUp` (check settlement level).
   - `player.modav Speech 10` (test level-up triggers).

**Step 7: Package and distribute SS2 add-on**
1) **Create README with SS2-specific info:**
   - Production chain diagrams (what buildings feed into what).
   - City plan variant descriptions and settler counts.
   - Leader perks and progression milestones.
   - Industrial economy integration details.
2) **Include reference screenshots:**
   - Full settlement layout views.
   - Production chain visualization.
   - Leader assignment and benefits.
3) **Upload to Nexus:** Mark as SS2 add-on; include "Sim Settlements 2" in title.

**Sim Settlements 2 (Fallout 4) Add-On checklist:**
- [ ] Advanced buildings with multi-stage production modeled and configured.
- [ ] Multiple job roles with unique work animations assigned.
- [ ] City plan variants designed and laid out (compact, expanded, industrial).
- [ ] Leaders with perks and progression paths defined.
- [ ] Unlock conditions set (quest completion, production milestones, etc.).
- [ ] Industrial production chains mapped and tested.
- [ ] Papyrus scripts for production/leader events implemented.
- [ ] Load order verified (your mod → SS2 → SS1 → Fallout4.esm).
- [ ] Leader assignment and perks tested in-game.
- [ ] Production chains complete correctly with proper output rates.
- [ ] Performance tested with multiple production buildings.
- [ ] README with production diagrams and variant descriptions written.
- [ ] Screenshots of all city plan variants included.
- [ ] Packaged and uploaded to Nexus as SS2 add-on.

## Texturing & Materials (Creating Custom Plant Textures)

**Texture workflow:**
1) **Create base textures in Photoshop/GIMP:**
   - **Diffuse (base color):** RGB image of plant skin, veins, flesh.
   - **Normal map:** Grayscale depth cues (bumps, wrinkles). Use Photoshop's Normal Map filter or Crazybump.
   - **Specular (shininess):** Grayscale defining reflectivity. Bright = shiny, dark = matte.
   - **Emissive (glow):** Grayscale for self-illuminated parts (bioluminescent veins, glowing maw).
2) **Resolution:** 2048×2048 or 4096×4096 for close-up meshes; 1024×1024 for distant objects.
3) **Export as DDS:** Fallout 4 uses DDS format. Export from Photoshop using NVIDIA DDS plugin.
4) **Place textures:** `Data/Textures/YourAddonName/Plants/`.

**Assigning textures in Blender (for PyNifly export):**
1) Create materials in Blender's Shader Editor.
2) Assign texture paths to material nodes (diffuse, normal, specular).
3) On export via PyNifly, textures link to the NIF correctly.
4) Verify in-game: textures should display without gaps or mirroring.

**Plant-specific texture tips:**
- **Bioluminescent veins:** Use emissive map to glow green/purple.
- **Wet/slime texture:** High specular + smooth normals = glossy appearance.
- **Poison damage areas:** Use darker diffuse + increased emissive to show toxicity.
- **Healing flesh:** Lighter, pulsing colors; use animated normal maps if possible.

## Custom Locations & Navmesh (Building Plant Lairs)

**Creating a custom location cell:**
1) Open CK, create a new cell (Landscape or Interior).
2) Design the location:
   - Terrain, cliffs, water.
   - Place your plant models (meshes, NIF files).
   - Add lighting (overhead, bioluminescent plant glow).
   - Place markers (spawn point, loot containers, NPCs).
3) Example plant lair: central carnivorous plant, surrounding growth beds, poison pools.

**Navmesh (NPC pathfinding):**
1) In CK, after placing all meshes/cliffs, generate navmesh:
   - Geometry → Generate Navmesh (or Ctrl+Alt+N).
   - Fallout 4 auto-generates walkable surfaces.
2) **Verify navigation:**
   - Test markers (toggle "Walk" and watch NPCs pathfind).
   - Fill gaps with small navmesh brushes.
   - Remove navmesh from unreachable areas (vines, poison pools).
3) **Plant-specific navmesh considerations:**
   - Keep paths clear around attacking plants (don't let NPCs get stuck).
   - Add vertical navmesh for vines/climbing sections (if creatures climb).
   - Mark hazardous areas (poison pools) so NPCs avoid them.

**Linking location to quest:**
1) In quest config, set the location marker to your custom cell.
2) Player will receive quest marker pointing to your location.
3) Example: "Find the Fungal Cavern" → marker appears on your custom location.

## Crafting & Recipe Integration (Making Plants Useful)

**Creating craftables from plant materials:**
1) Define plant material ingredient (e.g., `PlantFiber`, `PoisonGland`).
2) Create recipes in the CK using constructible object entries (workbench recipes).
3) Example recipes:
   - **Plant armor:** PlantFiber + Leather = plant-themed armor piece (poison resist).
   - **Poison grenades:** PoisonGland + Gunpowder = throwable poison bomb.
   - **Plant salve:** PlantMaterial + Bloodmeal = healing potion (with slow-acting poison option).

**Setting up a workbench recipe:**
1) Workbenches → Crafting → Armor Workbench (or your custom bench).
2) Add recipe: inputs (plant parts) → outputs (finished item).
3) Set skill requirement (if any) and perks to unlock.

## Papyrus Debugging & Console Commands (Troubleshooting)

**Essential console commands for testing:**
- `cqf QuestID` - Force quest start.
- `SetStage QuestID StageNumber` - Jump to quest stage.
- `GetStage QuestID` - Check current quest stage.
- `player.additem FormID Count` - Add item to inventory.
- `player.setav Health 1000` - Set attribute (health, magicka, etc.).
- `tgm` - Toggle god mode.
- `tcl` - Toggle clipping (walk through walls).
- `coc CellName` - Teleport to cell.
- `ps` - Pause game (useful for screenshot).

**Papyrus logging for debugging:**
1) Create a test script that logs to papyrus logs.
2) Place in `Documents/My Games/Fallout4/Logs/Script/`.
3) Example:
```papyrus
Debug.Notification("Plant spawned at position: " + GetPositionX())
Debug.Trace("PlantScript: Attack triggered on target " + target.GetName())
```
4) Check logs for errors; use `player.GetFormID()` to verify object references.

**Common script errors & fixes:**
- **"Object reference is invalid":** Script tried to access deleted object. Add null checks.
- **"Property not filled":** Editor properties not assigned. Fill all `Property Auto` in CK.
- **"Quest not found":** Quest FormID incorrect or quest not loaded. Verify load order.

## Performance Optimization (Keeping Mods Lag-Free)

**Mesh optimization:**
- **LOD (Level of Detail):** Create simplified versions of complex meshes for distance. Fallout 4 auto-loads lower LOD as distance increases.
- **Triangle budget:** Limit plant models to 5,000–10,000 triangles (more for close-ups, fewer for distant clutter).
- **Unwrap UVs efficiently:** Minimize texture waste; pack UV islands tightly to reduce texture resolution needed.

**Script optimization:**
- **Avoid OnUpdate() spam:** Don't register for updates faster than necessary. Use long intervals (0.5–1.0 sec minimum).
- **Cache references:** Store frequently-used object references instead of looking them up repeatedly.
- **Use conditions wisely:** Filter checks (distance, alive status) before running expensive logic.

**Visual optimization:**
- **Particle limits:** Limit simultaneous particle effects to 5–10 on-screen; cap emitter counts.
- **Draw call reduction:** Combine multiple small meshes into one larger mesh when possible.
- **Texture atlasing:** Combine multiple textures into a single sheet to reduce draw calls.

**Testing performance:**
- Use Fallout 4's built-in profiler: `GetStatTimer()` in scripts.
- Monitor frame rate with multiple plants placed (aim for 60+ FPS).
- Load your mod with other heavy mods to test combined impact.

## Sound & Ambient Audio (Bringing Plants to Life)

**Creating plant sound effects:**
1) **Record or source audio:** Plant groans, vines shifting, poison dripping, jaw snapping.
2) **Edit in Audacity:** Normalize volume, add reverb for cave atmosphere, loop seamlessly.
3) **Export as WAV:** Fallout 4 accepts WAV; place in `Data/Sound/YourAddonName/`.

**Assigning sounds in the CK:**
1) Create a Sound Descriptor (Sounds → Sound Descriptor).
2) Link to your WAV file; set volume, frequency range.
3) Attach to plant via script or animation event.

**Ambient soundscapes:**
1) Create "ambient forest" or "cave echo" sound loops (5–30 sec, non-looping in CK, triggered to repeat).
2) Use `PlaySound()` on plant activation.
3) Example: mist plant plays whooshing sound on `MistOn` annotation.

## NIF File Fundamentals (Understanding Mesh Files)

**What is a NIF?**
- NIF = Netimmerse File, Fallout 4's mesh format.
- Contains geometry (vertices, faces), materials, collision shapes, animations.

**Key NIF concepts:**
- **BSGeometry:** Visual mesh (what players see).
- **bhkRigidBody:** Physics/collision (what players collide with).
- **NiMaterial:** Material properties (diffuse, normal, specular textures).
- **NiAVObject:** Animated bones (armature for skeletal animation).

**Inspecting NIFs in NifSkope:**
1) Open NifSkope, load your plant NIF.
2) Look for BSGeometry blocks (meshes) and bhkRigidBody blocks (collision).
3) Check material nodes for texture paths; verify they exist.
4) Check for duplicate/hidden meshes; clean if needed.

**Common NIF issues:**
- **Missing textures:** Paths don't match actual texture locations. Fix in NifSkope or re-export from Blender.
- **Inverted normals:** Mesh appears inside-out. Re-export with correct normal direction.
- **Collision problems:** Can't interact with plant. Verify bhkRigidBody exists and is correctly shaped.

## FormID Management & Load Order (Avoiding Conflicts)

**What is a FormID?**
- FormID = unique identifier for every game object (0x______).
- Format: 2-char mod index + 6-char object ID (e.g., 0x0A001234).

**Load order matters:**
1) Mod index assigned based on load order position.
2) If you move a mod in load order, all its FormIDs change.
3) This breaks references (quests pointing to wrong objects).

**Best practices:**
- **Lock load order early:** Once you're publishing, don't move your mod around.
- **Use master files:** If your addon depends on another mod, make it a master.
- **Test after load order changes:** Use `cqf` to verify quests still work.

**Checking FormIDs:**
- In CK: Highlight object → right-click → properties → note the ID.
- In console: `player.getformid ObjectName` → returns FormID.

## Voice Acting & Custom Dialogue (Optional but Impactful)

**Recording dialogue:**
1) Write NPC lines (keep them short, 5–15 seconds per line).
2) Record in a quiet room using Audacity or similar.
3) Use a consistent microphone for all lines (important for audio cohesion).
4) Export as WAV per line.

**Assigning to NPC dialogue:**
1) In CK, create Dialogue Topic for NPC.
2) Create Dialogue Response entries with your text.
3) Attach WAV file to each response.
4) Test in-game; verify NPC plays audio on dialogue.

**Tips for voice acting:**
- Match NPC personality (growl for aggressive plant, whisper for eerie atmosphere).
- Add atmosphere (wind, cave echo) via audio editing.
- Hire a voice actor or use text-to-speech if you're not comfortable recording yourself.

## Keyword & Tag System (Organization & Searchability)

**Using keywords in Fallout 4:**
- Keywords are tags that help organize objects and trigger conditions.
- Example: `Plant_Garden`, `Poison_Source`, `WorkshopPlant`.

**Creating custom keywords:**
1) In CK: Miscellaneous → Keyword → New.
2) Name it (e.g., `PlantHarvest_Keyword`).
3) Assign to your plant actor, items, locations.

**Using keywords in quests/scripts:**
```papyrus
if akObject.HasKeyword(PlantHarvest_Keyword)
    ; This is a harvestable plant
    player.AddItem(PlantMaterial, 5)
endif
```

## Mod Compatibility & Conflict Resolution

**Identifying conflicts:**
1) Use xEdit to load your mod + other mods.
2) Look for overrides (red/yellow highlighted cells).
3) Decide: patch other mod, rename your forms, or accept conflict (if harmless).

**Common plant mod conflicts:**
- **Creature mods:** If another mod edits creatures/plants, verify no shared FormIDs.
- **Quest mods:** If multiple quest mods add to same location, merge or reposition.
- **Settlement mods:** If using Sim Settlements, verify compatibility with other settlement add-ons.

**Creating a patch:**
1) In CK, load both conflicting mods.
2) Make your mod a master of the conflicting mod.
3) Edit conflicting records in your mod; save as patch.
4) Instruct users: load patch after both conflicting mods.

## Testing Checklist (Before Release)

- [ ] All meshes/textures load without errors.
- [ ] All sounds play correctly.
- [ ] Quest stages trigger on expected conditions.
- [ ] Combat/damage values are balanced.
- [ ] Particles/effects render without lag.
- [ ] Navmesh allows NPC navigation.
- [ ] Crafting recipes unlock and produce correct items.
- [ ] Papyrus logs show no errors (check log file).
- [ ] Compatible with Sim Settlements if applicable.
- [ ] Works with popular overhauls (AWKCR, better crafting, etc.).
- [ ] No orphaned formids or broken references.
- [ ] Documentation (README, installation) is clear.
- [ ] Screenshots showcase all plant types.
- [ ] Tested on clean save and existing save.

## AI & Behavior Trees (Intelligent Plant Behavior)

**Creating intelligent plant AI:**
1) Open CK → Creatures → AI Packages.
2) Create packages for plant behaviors:
   - **Eat/Hunt:** Track nearby actors, approach, attack.
   - **Patrol:** Walk set paths (linked to navmesh waypoints).
   - **Idle:** Rest and regenerate health.
   - **Flee:** Retreat if heavily damaged.

**Example AI package (carnivorous plant hunt):**
1) New AI Package → "PlantHunt".
2) **Type:** Combat (plant hunts prey).
3) **Target:** Closest Actor in combat radius (300 units).
4) **Conditions:** Check if target is alive, not friendly, within range.
5) **Priority:** High (overrides idle/patrol).

**Behavior tree basics:**
- Behavior trees organize AI decisions (if-then-else chains).
- **Leaf nodes:** Actions (attack, move, idle).
- **Branch nodes:** Conditions (distance check, health check).
- **Root:** Overall state machine entry.

**Fallout 4 behavior tree structure (simplified):**
```
PlantAI_Root
├── CheckEnvironment
│   ├── IsHostileNearby? (300 units)
│   │   ├── Yes → Attack
│   │   └── No → Continue
│   ├── IsHungry? (health < 50%)
│   │   ├── Yes → Hunt
│   │   └── No → Continue
│   └── PassiveIdle
├── Combat
│   ├── ApproachTarget
│   ├── PlayAttackAnimation
│   ├── DealDamage
│   └── CheckHealthFleeThreshold
└── Flee (if health < 20%)
```

**Papyrus for plant AI coordination:**
```papyrus
Scriptname PlantAIController extends Actor

Float Property HuntRange = 300.0 Auto
Float Property FleeHealthThreshold = 0.2 Auto
Float Property RegenRate = 1.0 Auto  ; HP/sec

Bool isHunting = False
Bool isFleeeing = False

Event OnLoad()
    RegisterForUpdate(1.0)
EndEvent

Event OnUpdate()
    Actor target = FindNearestHostile(HuntRange)
    
    if GetAVPercent("Health") < FleeHealthThreshold
        isFleeeing = True
        ; Flee or hide
    elseif target && !isHunting
        isHunting = True
        ; Start hunting behavior
        SendModEvent("PlantAI_Hunt")
    else
        ; Idle/regen
        RegenerateHealth(RegenRate)
    endif
    
    RegisterForUpdate(1.0)
EndEvent

Actor Function FindNearestHostile(Float maxRange)
    ; Find closest non-ally actor in range
    ; (simplified; actual implementation scans actor list)
    return GetCombatTarget()
EndFunction

Function RegenerateHealth(Float amount)
    if GetAVPercent("Health") < 0.95
        DamageAV("Health", -amount)
    endif
EndFunction
```

**Plant pack behaviors for Sim Settlements:**
If plants are settlement pack animals/workers:
1) Assign daily schedules (work 8am–6pm, idle rest of day).
2) Link to settlement furniture (workbenches, beds).
3) Example: Plant Harvester works at farm bed, sleeps in nearby shelter.

## Creating Custom Equipment & Armor (Wearables)

**Designing plant-themed armor:**
1) Model in Blender (fits player skeleton).
2) Export as NIF per armor slot:
   - **Head:** Head slot (helmet).
   - **Body:** Torso slot (chest piece).
   - **Hands:** Arm slot (gauntlets).
   - **Legs:** Leg slot (greaves).
   - **Feet:** Foot slot (boots).
3) Assign materials (textures).
4) Place in `Data/Meshes/Armor/YourAddonName/`.

**Creating armor in the CK:**
1) New Armor → name it (e.g., "Plant Vine Armor").
2) **Slot:** Body (which body part it covers).
3) **Models:** Link to your NIF files.
4) **Material:** Fallout 4 material type (leather, metal, etc.).
5) **Weight & Value:** Set realistic stats.
6) **Enchantment/Effects:** Add magical properties (poison resist, health regen).

**Example armor with plant theme:**
```
Name: Spore Suit
Armor Rating: 25
Weight: 10
Value: 500
Special Effects: +25 Poison Resistance
Material: Organic (custom keyword)
Color: Pale green with bioluminescent accents
```

**Assigning to NPCs or rewards:**
- Add to quest reward chest.
- Make loot in plant lair containers.
- Sell at settlement shops.
- Grant to player via spell/potion discovery.

**Creating weapons from plant materials:**
1) Model in Blender (melee weapon or gun).
2) Assign to weapon form in CK.
3) Set damage, weight, reach.
4) Example: "Thorn Blade" deals 15 slash damage + 5 poison.

## MCM - Mod Configuration Menu (User Settings)

**What is MCM?**
MCM is a framework that adds a menu in Fallout 4 where players configure mods without editing files.

**Creating an MCM for your plant mod:**
1) Install MCM framework (Mod Configuration Menu by expired).
2) Create a Papyrus script that hooks into MCM:
```papyrus
Scriptname PlantMod_MCMScript extends SKI_ConfigBase

; MCM properties
int poisonDamageOption = 1
int spawnRateOption = 2
int aggressionOption = 3

Float PlantPoisonDamage = 10.0
Float PlantSpawnRate = 1.0
Int PlantAggression = 5

Event OnConfigInit()
    Pages = new String[1]
    Pages[0] = "Settings"
EndEvent

Event OnPageReset(string page)
    if page == "Settings"
        SetCursorFillMode(TOP_TO_BOTTOM)
        
        AddHeader("Poison Settings")
        poisonDamageOption = AddSliderOption("Plant Poison Damage", PlantPoisonDamage, "{0}")
        
        AddHeader("Spawn Settings")
        spawnRateOption = AddSliderOption("Plant Spawn Rate", PlantSpawnRate, "{1}")
        
        AddHeader("Behavior Settings")
        aggressionOption = AddSliderOption("Plant Aggression Level", PlantAggression, "{0}")
    endif
EndEvent

Event OnOptionSliderAccept(int option, float value)
    if option == poisonDamageOption
        PlantPoisonDamage = value
        SetSliderOptionValue(option, value)
    elseif option == spawnRateOption
        PlantSpawnRate = value
        SetSliderOptionValue(option, value)
    elseif option == aggressionOption
        PlantAggression = int(value)
        SetSliderOptionValue(option, value)
    endif
EndEvent
```

**MCM best practices:**
- Group related options under headers.
- Provide sensible defaults (so players don't need MCM).
- Include descriptions (tooltips) for each setting.
- Test all slider ranges for balance.

## Advanced CK Workflows & Navigation

**Essential CK hotkeys:**
- **Ctrl+Shift+L:** Load master/plugin files.
- **Ctrl+Alt+N:** Generate navmesh (in cell).
- **F5/F6:** Cycle through windows.
- **Ctrl+Shift+E:** Edit selected object.
- **Right-click:** Context menu (often faster than menus).

**CK performance tips:**
- **Save frequently:** Every 30 min, backup your mod.
- **Use layers:** Hide meshes you're not working on (Landscape → Visibility).
- **Purge unreferenced:** Remove unused forms (File → Purge Unused Forms).
- **Optimize renders:** Turn off distant terrain/water if laggy (View settings).

**CK best practices for plants:**
1) **Separate cells for testing:** Create a test cell for plant placement before adding to quest/settlement.
2) **Use templates:** Copy existing plants, modify duplicates rather than creating from scratch.
3) **Organize with keywords:** Tag all plant-related forms with a keyword for quick filtering.
4) **Link via references:** Use FormID links rather than copies to maintain synchronization.

**CK stability:**
- Load only required masters (your esp depends on fewer files = fewer conflicts).
- Avoid circular dependencies (Mod A requires Mod B requires Mod A).
- Test save frequently; don't edit for hours without saving.

## F4SE & DLL Plugins (Advanced Scripting)

**What is F4SE?**
F4SE = Fallout 4 Script Extender. Allows creation of DLL plugins that extend Papyrus capabilities beyond vanilla scripting.

**F4SE prerequisites:**
- Download F4SE from github (f4se.silverlock.org).
- Place in main Fallout 4 game folder.
- Launch via `F4SE_Launcher.exe` instead of Steam.

**Creating a simple F4SE plugin (advanced):**
Requires C++ programming knowledge.
```cpp
// Simple plant behavior DLL plugin
#include "f4se/PluginAPI.h"

// Function: Set plant poison effect intensity
void SetPlantPoisonIntensity(float intensity) {
    // Apply poison effect to all plants in scene
    // (complex implementation beyond scope)
}

// Register with F4SE
extern "C" {
    __declspec(dllexport) F4SEPluginVersionData F4SEPlugin_Version = {
        F4SE_VERSION_INTEGER,
        1, // Version
        "PlantModPlugin"
    };
}
```

**F4SE use cases for plants:**
- Custom poison decay system (hardcoded calculations).
- Advanced particle effects (not possible in Papyrus).
- Custom damage calculations (hit vs. dodge mechanics).
- Performance-critical features (mass plant spawning).

**Note:** F4SE plugins require compilation and deep C++ knowledge; stick with Papyrus for most mods.

## Survival Mode Integration (Hardcore Difficulty)

**Survival mode overview:**
Fallout 4's Survival mode adds hunger, fatigue, disease, and no fast travel. Plants should be deadlier and more realistic.

**Modifying plants for Survival:**
1) **Increased poison damage:** Poison does 50% more damage in Survival.
2) **Disease risk:** Poison exposure risks infection (camp disease).
3) **No instant healing:** Antitoxins heal slowly; players must manage health carefully.
4) **Corpse persistence:** Killed plants don't disappear; bodies pile up (atmosphere).

**Papyrus for Survival integration:**
```papyrus
Scriptname PlantSurvivalModifier extends Actor

; Check if Survival mode is active
Function ApplySurvivalModifiers()
    if Game.GetGameSettingFloat("iSurvival") == 1
        ; Increase poison damage
        Float baseDamage = 10.0
        Float survivalMultiplier = 1.5
        Float finalDamage = baseDamage * survivalMultiplier
        
        ; Add infection risk
        Spell SurvivalInfection = Game.GetFormFromFile(0x000F1234, "Fallout4.esm")
        if SurvivalInfection
            SurvivalInfection.Cast(self, Game.GetPlayer())
        endif
    endif
EndFunction
```

**Survival-specific features:**
- Plants are more aggressive (attack without provocation).
- Player takes disease from poison exposure (requires antitoxin treatment).
- No cure-all potions (remedies take time).
- Environmental hazards (poison pools, contaminated water).

## Holotape Games (Interactive Content)

**Creating a holotape mini-game:**
Holotape games are interactive programs players can use; great for adding flavor to your mod.

**Simple holotape game example:**
```papyrus
Scriptname PlantArcadeGame extends ObjectReference

; Holotape game: "Spore Dodge"
; Player avoids falling spores on screen

Int Score = 0
Int Lives = 3
Bool GameActive = False

Event OnActivate(ObjectReference akActionRef)
    Actor player = akActionRef as Actor
    if player == Game.GetPlayer()
        Debug.MessageBox("SPORE DODGE - Avoid the poison spores!\n\nScore: " + Score + "\nLives: " + Lives)
        StartGame()
    endif
EndEvent

Function StartGame()
    GameActive = True
    Score = 0
    Lives = 3
    
    while GameActive && Lives > 0
        ; Random spore pattern
        int random = Utility.RandomInt(1, 10)
        Debug.MessageBox("Dodge position " + random + "!\n\nScore: " + Score)
        
        ; Simple choice
        if Utility.RandomInt(1, 100) > 50
            Score += 10
        else
            Lives -= 1
        endif
        
        Utility.Wait(2.0)
    endwhile
    
    Debug.MessageBox("Game Over!\nFinal Score: " + Score)
    GameActive = False
EndFunction
```

**Advanced holotape ideas:**
- Plant encyclopedia (scan creatures, gain lore).
- Farming simulator (grow plants, harvest resources).
- Tower defense (protect settlement from plant invasions).
- Text adventure (narrative-driven exploration).

## Publishing Best Practices (Release Workflow)

**Versioning scheme:**
Use semantic versioning: `MajorVersion.MinorVersion.PatchVersion` (e.g., 1.0.5)
- **Major:** Significant features or incompatible changes (1.0 → 2.0).
- **Minor:** New features, backwards compatible (1.0 → 1.1).
- **Patch:** Bug fixes, balance tweaks (1.0 → 1.0.1).

**Creating a changelog:**
```
# Plant Mod Changelog

## Version 1.2.0 - December 2025
### Added
- New mouth plant species with swallowing animation
- Poison infection system with 7-day escalation
- 5 new plant-based armor sets

### Fixed
- Carnivorous plant not attacking in combat correctly
- Mist effect lingering after plant death
- MCM slider values not persisting on load

### Balance
- Reduced poison damage by 15% for Survival mode
- Increased plant spawn rates by 20%
```

**Pre-release checklist:**
1) Create version tag in file (README, esp metadata).
2) Test on clean Fallout 4 save + existing save.
3) Test with popular mods (AWKCR, Survival Mode, Sim Settlements).
4) Write detailed README with all features listed.
5) Create comparison screenshots (before/after).
6) Get permission for assets (textures, sounds, code from other mods).
7) Set Nexus compatibility (base game version, mod dependencies).

**Update procedures:**
1) Never change FormIDs (breaks existing saves).
2) Only add new content; don't delete existing forms.
3) Test on saves from older versions (ensure no crashes).
4) Write detailed changelog (what changed, why, how it affects saves).
5) Warn users if update requires new game (rare, last resort).

**Handling patches/hotfixes:**
- Release patch within 24 hours of major bugs.
- Test patch thoroughly before uploading.
- Clearly mark as "hotfix" in version number (e.g., 1.0.1).

## Asset Management & Legal Considerations

**Using Bethesda assets legally:**
1) **Vanilla assets:** Ok to use/modify for Fallout 4 mods (they're part of the game).
2) **DLC assets:** Use cautiously; some mods prevent DLC usage.
3) **Other mod assets:** Always ask author permission; credit heavily.

**Proper crediting:**
```
CREDITS:
- Plant models: [Your name/Blender artist]
- Textures: [Artist or resource pack]
- Sounds: [Source, license]
- Animations: [Custom or source mod]
- Scripts: [You and any references/tutorials]
- F4SE/MCM frameworks: [Original authors]
```

**License your mod:**
Common choices for Fallout 4 mods:
- **Creative Commons (CC BY-SA):** Share-alike; derivative works must credit you.
- **Custom:** "Free to use, no commercial use, always credit original author."
- **No permissions:** Most restrictive; others can't modify.

**Avoiding copyright issues:**
- Don't use real-world copyrighted images (brands, art, logos).
- Don't use music/audio from other games without permission.
- Don't copy entire mods; create original content inspired by ideas.

## Community Engagement & Feedback

**Responding to feedback:**
- **Bug reports:** Acknowledge, test, release fix quickly. Thank reporter.
- **Feature requests:** Consider feasibility; explain if can't do (performance, scope).
- **Critical comments:** Stay professional; don't argue with users.
- **Positive feedback:** Appreciate it; use it to motivate future work.

**Handling negative reviews:**
- Read carefully; separate trolls from legitimate criticism.
- Address legitimate bugs/balance issues in next update.
- Don't respond to trolls; they feed on attention.
- Update mod description to clarify misconceptions.

**Building community:**
- Post development updates (screenshots, progress).
- Answer questions in comments quickly.
- Engage with modding community (other mod authors, forums).
- Consider YouTube playthrough/showcase videos.
- Join modding Discord communities (FO4 modders, Nexus groups).

**Managing translations:**
- Enable translation support on Nexus (users can translate).
- If non-English users request translation, offer guidance.
- Provide text strings in a format translators can easily handle.

**Gathering playtest feedback:**
1) Release beta version (early access) to trusted modders.
2) Ask for feedback on balance, bugs, compatibility.
3) Collect suggestions before full release.
4) Credit playtesters in final README.

**Long-term mod maintenance:**
- Monitor for conflicts with major Fallout 4 updates.
- Check if game patches break your mod (F4SE compatibility, etc.).
- Release compatibility patches when needed.
- Consider deprecation if mod becomes incompatible (inform users).

**Building a mod portfolio:**
- Start with one small, polished mod (build reputation).
- Release follow-up mods that expand on first (build fanbase).
- Cross-promote your mods in descriptions.
- Share modding tips/tutorials (builds community respect).

---

## Final Checklist: Before Your First Release

**Documentation:**
- [ ] README (features, installation, requirements, compatibility).
- [ ] CHANGELOG (what's new, fixes, balance changes).
- [ ] CREDITS (all assets and inspiration).
- [ ] PERMISSIONS (what users can do with your mod).
- [ ] COMPATIBILITY (known issues, required mods, tested with X add-ons).

**Assets:**
- [ ] All meshes optimized (LOD, triangle budget).
- [ ] All textures in correct format (DDS) and location.
- [ ] All scripts compiled without errors (Papyrus).
- [ ] All dialogue and quests tested in-game.
- [ ] All animations play correctly (no T-poses or glitches).

**Testing:**
- [ ] Tested on clean save (new game).
- [ ] Tested on existing save (compatibility).
- [ ] Tested with mod dependencies loaded.
- [ ] Console shows no script errors (check logs).
- [ ] Performance tested (no FPS drops with feature active).
- [ ] Tested in Survival mode (if applicable).
- [ ] Tested with MCM (settings persist on load).

**Submission:**
- [ ] Version number set and documented.
- [ ] Load order requirements listed.
- [ ] Screenshots uploaded (gameplay, features, locations).
- [ ] Description clear and concise (what players will experience).
- [ ] Compatibility markers set on Nexus.
- [ ] ESP cleaned with xEdit (remove conflicts with masters).

You're ready to release! Good luck, and welcome to the modding community!
