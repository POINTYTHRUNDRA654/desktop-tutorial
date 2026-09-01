# Sentient / Attacking Plant Architecture for Fallout 4

A complete technical reference for building fully animated, threat-reacting, bioluminescent mutated plants in Fallout 4 using CommonLibF4, F4SE, Papyrus, and custom HKX skeletons.

---

## 1. Plant as an Actor — Not a Static Object

### Why Actor, Not Flora

Vanilla Fallout 4 flora records (`FLOR`) are static or scroll-animated via the NIF. They cannot attack, track a target, or die with a loot container. To get attacking behavior you need the plant to be an **NPC_/ACHR actor** (or a creature record) placed as a reference.

Key differences:

| Approach | Can attack | Can die | Loot container | Animations | AI |
|---|---|---|---|---|---|
| FLOR record | ❌ | ❌ | ❌ | Shader scroll only | ❌ |
| STAT record | ❌ | ❌ | ❌ | None | ❌ |
| NPC_ actor (creature) | ✅ | ✅ | ✅ | Full HKX | ✅ AI packages |
| NPC_ actor + F4SE | ✅ | ✅ | ✅ | F4SE-forced anims | ✅ Custom C++ |

### CK Record Setup for a Plant Actor

1. **NPC_ record**: Create a new non-humanoid creature NPC_ record. Set `ActorBase → Class` to a creature class (not human). Set race to a custom plant race (see below).
2. **Custom Race**: Create a `RACE` record with `Skin = your plant NIF`. Disable "Uses Head Tracking," "Uses Idle Markers," and all humanoid flags. Set `Default Race = your race`.
3. **Body Parts**: Assign `BPTD` (Body Part Data) record. Plants need at minimum one torso body part for death/ragdoll. Add a "stem" and "vine" part for targeted damage.
4. **Combat Style**: Assign a melee/bash combat style (e.g. `csCreatureAttack`) or create a custom one with zero retreat distance.
5. **Factions**: Add the plant reference to a hostile faction (e.g. `CreatureFaction` or a custom `MutatedFloraFaction`). Set Player faction as an enemy.

---

## 2. Custom Plant Skeleton (HKX Bone Chain)

### Why a Custom Skeleton

Without a skeleton, the mesh is rigid — it cannot bend toward the player or play an attack swing. A vine-type plant needs a **bone chain** (like a tail or tentacle), not a biped rig.

### Bone Chain Design for a Vine

```
Root [root_plant]
  └─ Stem [spine_01]
       └─ Mid-stem [spine_02]
            └─ Vine_01 [vine_a_01]
                 └─ Vine_02 [vine_a_02]
                      └─ Vine_03 [vine_a_03] ← attack tip (weapon node)
```

Rules:
- Maximum ~30 bones per chain before performance degrades
- Keep bone names lowercase with underscores (engine convention)
- Attach a `WeaponNode` or `AttackPoint` marker to the tip for melee hit detection
- The root bone **must** be named exactly `Root` (capital R) or the game will refuse to load the animation

### Building the Skeleton in Blender

1. Import a reference armature to establish scale (FO4 units = 1 unit = 1.4286 cm).
2. Create a bone chain in Pose Mode. Parent each bone with `Keep Offset`.
3. Export: **NIF + HKX** — use the Blender NIF Plugin or the community `fo4_nif_export` addon for Blender 3.6+.
4. The skeleton goes in `Data\Meshes\Actors\YourPlant\CharacterAssets\skeleton.nif`.
5. Havok behavior file (`.hkx`) goes in `Data\Meshes\Actors\YourPlant\Behaviors\`.

### Animation Files

Create at minimum:
- `idle.hkx` — dormant sway (loop)
- `attack_01.hkx` — lunge/strike (one-shot → returns to idle)
- `death.hkx` — wilt and collapse (one-shot)

Use **Havok Content Tools** (part of the official Skyrim/FO4 SDK) or **HkxPack** (community tool) to pack Blender FBX animations into `.hkx` format. See the HKX Animation Guide in this knowledge base.

---

## 3. C++ Proximity Detection — Vibration Sensing

### The Core Hook: Actor OnUpdate / Havok Contact

Plants do not have eyes. Instead of eye-line AI, hook **Havok contact** or the **Actor main update** to detect when the player enters a radius. This is faster than Papyrus and runs on the game simulation thread.

#### Pattern A — Distance Polling in Main Update Hook

```cpp
// Register an OnUpdate hook that fires every game frame for your plant NPC_
// Use REL::Relocation to find the Actor update virtual function

namespace PlantProximity
{
    constexpr float DETECT_RADIUS    = 256.0f; // game units (~3.6 m)
    constexpr float VIBRATION_SPEED  = 100.0f; // player sprint speed threshold (game units/s)

    // Thread-safe state per plant instance
    struct PlantState
    {
        std::atomic<bool> isAlert{ false };
        std::atomic<float> threatLevel{ 0.0f }; // 0–1
    };
    std::unordered_map<RE::FormID, PlantState> gPlantStates;

    float CalcDistanceSq(const RE::NiPoint3& a, const RE::NiPoint3& b) noexcept
    {
        const float dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }

    // Call this from your hooked Actor::Update or a registered on-update callback
    void EvaluatePlantThreat(RE::Actor* plant)
    {
        auto* player = RE::PlayerCharacter::GetSingleton();
        if (!player || !plant) return;

        const float distSq  = CalcDistanceSq(plant->GetPosition(), player->GetPosition());
        const float radiusSq = DETECT_RADIUS * DETECT_RADIUS;
        if (distSq > radiusSq * 4.0f) return; // outside 2× outer range — skip

        // "Vibration" sensing: weight × speed proxy
        // actorValues: SpeedMult(329) encodes current movement speed
        const float playerSpeed = player->GetActorValue(RE::ActorValue::kSpeedMult);
        const float heavyFactor = player->GetActorValue(RE::ActorValue::kCarryWeight) > 200.0f ? 1.4f : 1.0f;
        const float vibration   = playerSpeed * heavyFactor;

        // Threat grows when player is close AND moving fast (heavy footfalls)
        auto& state = gPlantStates[plant->GetFormID()];
        const float rawThreat = (1.0f - std::sqrt(distSq) / (DETECT_RADIUS * 2.0f))
                               * (vibration / VIBRATION_SPEED);
        const float clamped   = std::clamp(rawThreat, 0.0f, 1.0f);
        state.threatLevel.store(clamped);

        // Flip to alert if close enough
        if (distSq < radiusSq && clamped > 0.15f) {
            state.isAlert.store(true);
        }
    }
}
```

#### Pattern B — Havok Physics Contact Callback

For instant "touch" detection when the player enters the plant mesh collision:

```cpp
// Register a Havok contact listener on the plant's bhkRigidBody
// This fires from the physics thread — keep it lock-free

class PlantContactListener : public RE::hkpContactListener
{
public:
    RE::FormID plantFormID;

    void contactPointCallback(const RE::hkpContactPointEvent& event) override
    {
        // Check if either body belongs to the player
        auto* bodyA = event.m_bodies[0];
        auto* bodyB = event.m_bodies[1];
        if (IsPlayerBody(bodyA) || IsPlayerBody(bodyB)) {
            // Trigger attack immediately — post a deferred game-thread task
            SKSE::GetTaskInterface()->AddTask([this]() {
                auto* plant = RE::TESForm::LookupByID<RE::Actor>(plantFormID);
                if (plant) TriggerPlantAttack(plant);
            });
        }
    }
};
```

---

## 4. F4SE Animation Triggering

### Force Attack Animation from C++

When the plant detects the player within attack range, use F4SE's animation graph event system to force the attack animation:

```cpp
void TriggerPlantAttack(RE::Actor* plant)
{
    if (!plant || plant->IsDead()) return;

    // Send an animation graph event — equivalent to CK's "SendAnimationEvent"
    // String matches the event name in your HKX behavior graph
    plant->NotifyAnimationGraph("AttackStart");

    // Optional: set a behavior variable to pick which attack clip
    // (if your behavior graph has a variable 'iAttackType')
    RE::BSAnimationGraphManagerPtr graphManager;
    if (plant->GetAnimationGraphManager(graphManager)) {
        graphManager->graphs[0]->SetVariableOnGraphsInt("iAttackType", 1);
    }

    F4SE::log::info("PlantAttack triggered on {:08X}", plant->GetFormID());
}
```

### Vector3 Distance Gate in C++

```cpp
// In your update hook — gate attack trigger on precise 3D distance
void CheckAttackRange(RE::Actor* plant)
{
    constexpr float ATTACK_RANGE_SQ = 128.0f * 128.0f; // ~1.8 m

    auto* player = RE::PlayerCharacter::GetSingleton();
    if (!player) return;

    const auto& pp = plant->GetPosition();
    const auto& qp = player->GetPosition();
    const float dx = pp.x - qp.x, dy = pp.y - qp.y, dz = pp.z - qp.z;
    if (dx*dx + dy*dy + dz*dz <= ATTACK_RANGE_SQ) {
        TriggerPlantAttack(plant);
    }
}
```

### Animation Event → Melee Hit

In your behavior graph (`BehaviorGraph.xml` / `.hkx`), wire `AttackStart` to trigger:
1. The attack animation clip playback
2. An `AttackHit` event at the frame when the vine tip passes through the player hitbox
3. A `BackToIdle` event at clip end

The `AttackHit` event should fire a Papyrus event (or directly call `plant->DamageActorValue`) to deal damage.

---

## 5. Glow Map Shader — Visual Threat Level

### Threat Ramp: Green → Red

Wire the `threatLevel` atomic (written by C++ proximity code) to the emittance system:

```cpp
void UpdatePlantGlowShader(RE::Actor* plant)
{
    auto& state = PlantProximity::gPlantStates[plant->GetFormID()];
    const float threat = state.threatLevel.load();

    // Color ramp: dormant (dull green) → threatening (bright red)
    // threat = 0 → {R=0.1, G=0.55, B=0.05}
    // threat = 1 → {R=0.95, G=0.05, B=0.02}
    const RE::NiColorA color{
        0.1f  + threat * 0.85f,          // R: ramps sharply
        0.55f - threat * 0.50f,          // G: fades
        0.05f - threat * 0.03f,          // B: minimal throughout
        1.0f
    };

    // Pulse rate: faster as threat increases (2 Hz dormant → 12 Hz alert)
    const float time    = static_cast<float>(RE::GetCurrentTimeInSeconds());
    const float pulseFq = 2.0f + threat * 10.0f;
    const float pulse   = 0.7f + 0.3f * std::sin(time * pulseFq * RE::NI_TWO_PI);

    // Emittance multiplier: 1.0 dormant → 3.5 alert
    const float mult = (1.0f + threat * 2.5f) * pulse;

    auto* root = plant->Get3D();
    if (root) ShaderInjection::SetEmittanceRecursive(root, color, mult);
}
```

### Kill-State Bioluminescent Burst

When the plant attacks (at the moment of damage delivery), trigger a single-frame burst:

```cpp
void TriggerBioluminescentBurst(RE::Actor* plant)
{
    // Instant bright burst — emittance mult 10.0 for one render frame
    auto* root = plant->Get3D();
    if (!root) return;

    const RE::NiColorA burst{ 0.05f, 1.0f, 0.6f, 1.0f }; // acid-green burst
    ShaderInjection::SetEmittanceRecursive(root, burst, 10.0f);

    // Schedule reset back to threat level after 80ms
    // Use a simple timer or queue a task
    std::thread([plant]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(80));
        SKSE::GetTaskInterface()->AddTask([plant]() {
            if (!plant->IsDead()) UpdatePlantGlowShader(plant);
        });
    }).detach();
}
```

> ⚠️ **Note:** Avoid spawning a raw `std::thread` in production. Use F4SE's task queue or a frame counter instead. The pattern above is illustrative; a frame-counter approach (decrement a counter each update, reset shader when counter hits zero) is more robust.

---

## 6. Papyrus State Machine

### Plant State Enum

```papyrus
; SentientPlant.psc  — attached to the plant actor reference (ACHR)
Scriptname SentientPlant extends Actor

; ── State constants ──────────────────────────────────────────────────────────
int Property STATE_DORMANT   = 0 AutoReadOnly
int Property STATE_ALERT     = 1 AutoReadOnly
int Property STATE_ATTACKING = 2 AutoReadOnly
int Property STATE_FEEDING   = 3 AutoReadOnly
int Property STATE_DEAD      = 4 AutoReadOnly

; ── Properties (set in CK) ───────────────────────────────────────────────────
Quest   Property EcosystemQuest    Auto
int     Property QuestStageHarvest = 100 AutoReadOnly
Message Property MsgPlantKilled    Auto  ; optional notification

; ── Script state ─────────────────────────────────────────────────────────────
int  gCurrentState = 0
bool gAttackFired  = false
```

### State Transitions

```papyrus
Event OnLoad()
    ; Ensure correct state after cell reload
    GoToState("Dormant")
EndEvent

; ── DORMANT ──────────────────────────────────────────────────────────────────
State Dormant
    Event OnBeginState(string asOldState)
        gCurrentState = STATE_DORMANT
        RegisterForUpdate(0.5)   ; poll every 0.5 seconds (Papyrus is slow — C++ handles real-time)
    EndEvent

    Event OnUpdate()
        Actor player = Game.GetPlayer()
        float dist = self.GetDistance(player)
        if dist < 512.0
            GoToState("Alert")
        endif
    EndEvent

    Event OnEndState(string asNewState)
        UnregisterForUpdate()
    EndEvent
EndState

; ── ALERT ─────────────────────────────────────────────────────────────────────
State Alert
    Event OnBeginState(string asOldState)
        gCurrentState = STATE_ALERT
        self.SetAlerted(true)
        ; C++ shader hook reads gCurrentState via a registered native function
        SentientPlantNative.SetThreatState(self, STATE_ALERT)
        RegisterForUpdate(0.1)
    EndEvent

    Event OnUpdate()
        Actor player = Game.GetPlayer()
        float dist = self.GetDistance(player)
        if dist < 128.0 && !gAttackFired
            GoToState("Attacking")
        elseif dist > 768.0
            GoToState("Dormant")
        endif
    EndEvent
EndState

; ── ATTACKING ─────────────────────────────────────────────────────────────────
State Attacking
    Event OnBeginState(string asOldState)
        gCurrentState = STATE_ATTACKING
        gAttackFired  = true
        ; C++ hook handles the actual anim trigger — Papyrus signals state change only
        SentientPlantNative.SetThreatState(self, STATE_ATTACKING)
        RegisterForSingleUpdate(3.0) ; wait for attack animation (~3 s)
    EndEvent

    Event OnUpdate()
        ; Attack animation finished — return to alert or feeding
        gAttackFired = false
        GoToState("Alert")
    EndEvent
EndState

; ── FEEDING (post-kill) ───────────────────────────────────────────────────────
State Feeding
    Event OnBeginState(string asOldState)
        gCurrentState = STATE_FEEDING
        SentientPlantNative.SetThreatState(self, STATE_FEEDING)
        ; Plant feeds — play a slow bioluminescent pulse
        RegisterForSingleUpdate(10.0)
    EndEvent

    Event OnUpdate()
        GoToState("Dormant")
    EndEvent
EndState
```

### Death and Loot Logic

```papyrus
; ── DEATH EVENT ──────────────────────────────────────────────────────────────
Event OnDeath(Actor akKiller)
    gCurrentState = STATE_DEAD
    UnregisterForUpdate()
    SentientPlantNative.SetThreatState(self, STATE_DEAD)

    ; Trigger quest stage for ecosystem tracking
    if EcosystemQuest != None
        EcosystemQuest.SetCurrentStageID(QuestStageHarvest)
    endif

    ; Enable harvest — swap to a harvestable version or add container items
    ; Option A: enable a hidden "HarvestContainer" ObjectReference near the plant
    ObjectReference harvestRef = self.PlaceAtMe(Game.GetForm(0xYOUR_HARVEST_CONTAINER_FORM) as Form)
    harvestRef.Enable()
    harvestRef.AddItem(Game.GetForm(0xYOUR_PLANT_LOOT_FORM) as Form, 1)

    ; Option B: use GetLinkedRef() pointing to a pre-placed loot container
    ObjectReference linkedContainer = self.GetLinkedRef()
    if linkedContainer != None
        linkedContainer.Enable()
    endif

    if MsgPlantKilled != None
        MsgPlantKilled.Show()
    endif
EndEvent
```

### Harvest / Quest Stage Pattern

The quest stage approach keeps ecosystem logic centralised:

```papyrus
; EcosystemQuest.psc — attached to a quest  
; Stage 100: player killed first sentient plant (trigger cutscene / journal update)
; Stage 200: player killed 5 plants (unlock crafting recipe for Bioluminescent Extract)
; Stage 300: player discovered the colony root (main quest beat)

Event OnStageSet(int auiStageID, int auiItemID)
    if auiStageID == 100
        ; First kill — add knowledge to player
        Game.GetPlayer().AddItem(Game.GetForm(0xYOUR_PLANT_NOTES_FORM) as Form, 1)
    elseif auiStageID == 200
        ; Unlock crafting
        Game.GetPlayer().AddPerk(Game.GetForm(0xYOUR_PLANT_CRAFT_PERK) as ActorValue as Form)
    endif
EndEvent
```

---

## 7. Native Papyrus Bridge (C++ ↔ Papyrus)

Register native functions so Papyrus can push/pull state to/from C++ hooks:

```cpp
// In F4SEPlugin_Load:
F4SE::GetPapyrusInterface()->Register([](RE::BSScript::IVirtualMachine* vm) {
    // Papyrus calls SentientPlantNative.SetThreatState(akActor, aiState)
    vm->RegisterFunction("SetThreatState", "SentientPlantNative",
        [](RE::BSScript::IVirtualMachine*, RE::VMStackID, RE::StaticFunctionTag*,
           RE::Actor* actor, int state) {
            if (!actor) return;
            auto& ps = PlantProximity::gPlantStates[actor->GetFormID()];
            switch (state) {
                case 0: ps.threatLevel.store(0.0f);  ps.isAlert.store(false); break;
                case 1: ps.threatLevel.store(0.5f);  ps.isAlert.store(true);  break;
                case 2: ps.threatLevel.store(0.95f); TriggerBioluminescentBurst(actor); break;
                case 3: ps.threatLevel.store(0.2f);  break; // feeding — dim pulse
                case 4: ps.threatLevel.store(0.0f);  ps.isAlert.store(false); break; // dead
            }
        });
    return true;
});
```

---

## 8. End-to-End Architecture Diagram

```
Game thread (Papyrus)                  Simulation thread (C++)              Render thread (C++)
──────────────────────────────         ────────────────────────────         ──────────────────────────
SentientPlant.psc OnUpdate()      →    EvaluatePlantThreat(plant)      →    UpdatePlantGlowShader()
  dist check (coarse, 0.1–0.5 s)         CalcDistanceSq (precise)            reads atomic threatLevel
                                          SpeedMult * CarryWeight proxy        NiColorA ramp green→red
                                          writes atomic threatLevel             emittanceMult pulse

SentientPlant.psc GoToState()     →    SentientPlantNative.SetThreatState()
  "Alert"                               sets atomics per-plant

SentientPlant.psc GoToState()     →    CheckAttackRange() if dist ≤ 128u
  "Attacking"                           NotifyAnimationGraph("AttackStart")
                                        ↓
                                    TriggerBioluminescentBurst()
                                        burst emittance = 10.0 × 1 frame

SentientPlant.psc OnDeath()       →    SetCurrentStageID(100)
                                        Enable harvestRef / linkedContainer
                                        (loot container becomes accessible)
```

---

## 9. Quick-Reference Checklist

| Step | Tool / File | Notes |
|---|---|---|
| Plant NPC_ record | Creation Kit | Non-humanoid, custom race |
| Custom RACE record | Creation Kit | Disable humanoid flags |
| Vine bone chain | Blender + NIF Plugin | ≤30 bones, `Root` named exactly |
| HKX animations | Havok Content Tools / HkxPack | idle, attack, death |
| Combat Style | Creation Kit | Melee/creature, zero retreat |
| Proximity detection | C++ (CommonLibF4) | `Actor::Update` hook, atomic state |
| Animation trigger | C++ (F4SE) | `NotifyAnimationGraph("AttackStart")` |
| Glow map shader | C++ (BSLightingShader hook) | `threatLevel` → color ramp + pulse |
| Bioluminescent burst | C++ | emittanceMult = 10.0 for ~80 ms |
| State machine | Papyrus (SentientPlant.psc) | Dormant → Alert → Attacking → Feeding |
| Loot / harvest | Papyrus `OnDeath` | Enable linked container, add items |
| Quest stages | Papyrus (EcosystemQuest.psc) | OnStageSet gates crafting / journal |
| Native bridge | C++ `RegisterFunction` | `SentientPlantNative.SetThreatState` |

---

## 10. Common Pitfalls

- **Root bone name**: Must be exactly `Root` (capital R) — lowercase causes animation load failure
- **Behavior graph not found**: `Behaviors\` path must match `RACE` record's behavior graph path exactly
- **Havok contact thread**: Never block in the contact callback — defer all Papyrus/game-state work to `SKSE::GetTaskInterface()->AddTask()`
- **Atomic + render thread**: Always `std::atomic<float>` for values crossing the game↔render thread boundary; never use a mutex in a render hook
- **Papyrus poll rate**: 0.5 s polling is coarse — C++ handles sub-frame precision; Papyrus is only for high-level state transitions
- **Attack animation looping**: Set `LoopCount = 0` in HKX clip annotation, or the plant will attack forever
- **Emittance burst thread**: Use task queue or frame counter — raw `std::thread` + `sleep_for` is fragile in a game process
