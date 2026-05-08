# Ambient Sound, ASPC & SNDR Records Guide — Fallout 4 (2026)

This guide covers the complete ambient sound system: Acoustic Space (ASPC), Sound Descriptor (SNDR), Region Sound (REGN), Sound Category (SNCT), and how to create authentic environment audio for custom cells, worldspaces, and flora mods.

---

## 1. The Sound Hierarchy

Fallout 4's ambient sound system is layered:

```
SNCT (Sound Category)
  └── SNDR (Sound Descriptor)      ← the individual sound event + file reference
        └── ASPC (Acoustic Space)   ← defines reverb + ambient loop for a cell
              └── Cell / REGN       ← the world space that activates the ASPC
```

- **SNCT**: top-level volume/priority category (Ambient, Effects, Dialogue, Music, Master)
- **SNDR**: a single sound event — links to one or more `.wav`/`.xwm` files with pitch/volume/distance settings
- **ASPC**: acoustic space — assigned to a cell; controls reverb preset and the ambient loop sound
- **REGN**: region sound — for exterior worldspaces, defines which sounds play in which geographic region

---

## 2. SNDR — Sound Descriptor

Every sound in the game is a SNDR record. This is what you create for custom vegetation rustle, creature calls, ambient drones, etc.

### SNDR Key Fields

| Field | Description |
|---|---|
| **EDID** | Editor ID — convention: `AMB_YourSound_01` |
| **CNAM** | Sound Category (SNCT) — determines volume/priority |
| **SNAM** | List of audio file paths (`.wav` or `.xwm`) + conditions |
| **ONAM** | Output model (reverb bus routing) |
| **FNAM** | Flags |
| **LNAM** | Looping flag (1 = loops indefinitely) |
| **BNAM** | Static attenuation (dB at reference distance) |
| **GNAM** | Group (for random selection from multiple files) |
| **WNAM** | Associated Sound (for chained events) |

### Distance/Attenuation Fields

In the SNDR DATA subrecord:
| Setting | Value | Description |
|---|---|---|
| `fMinDistance` | 200–500 | Distance at which sound is at full volume (game units) |
| `fMaxDistance` | 2000–8000 | Distance at which sound is inaudible |
| `fAttenCurve` | 0.5–1.0 | Rolloff curve (0=linear, 1=logarithmic natural falloff) |
| `fStaticAttenuation` | -12 to 0 dB | Base volume reduction |
| `fRandomFrequencyShift` | 0–1 | Random pitch variation per playback |

### Audio File Formats

Fallout 4 accepts:
- **`.wav`** — uncompressed, low quality for short sounds
- **`.xwm`** — XMA compressed (better compression); use `xWMAEncode.exe` from DirectX SDK
- Both should be: **16-bit PCM, 44100 Hz, mono** for ambient/effects; stereo only for music

Mono files have correct 3D spatialization. Stereo ambient files play flat (no positional audio).

### Creating a Custom SNDR in xEdit

1. Create a new record under `SNDR` in your plugin
2. Set CNAM to `AmbientSoundDescriptorCategory` (for world ambience)
3. SNAM: add file paths relative to `Sound\fx\` (e.g., `amb\mutatedforest\leaves_rustle_01.xwm`)
4. Add multiple files to SNAM for random variation (the game picks one randomly per playback)
5. Set attenuation, distance, looping flags

---

## 3. ASPC — Acoustic Space

The ASPC record is assigned to a cell and defines:
1. The **ambient loop sound** (background atmosphere)
2. The **reverb preset** (echo characteristics)
3. The **environmental type** identifier

### ASPC Key Fields

| Field | Description |
|---|---|
| **BNAM** | Ambient sound — SNDR to loop continuously in this cell |
| **RDAT** | Region Data — ties ASPC to a region for exterior use |
| **WNAM** | Underwater ambient SNDR |
| **YNAM** | Ambient interior footstep echo SNDR |
| **HNAM** | "is interior" flag |
| **SNAM** | Reverb type enum (see list below) |

### Reverb Presets (SNAM enum values)

| Value | Preset | Use case |
|---|---|---|
| 0 | None | No reverb |
| 1 | Room Small | Small carpeted room |
| 2 | Room Medium | Average house interior |
| 3 | Room Large | Large open interior (Diamond City market) |
| 4 | Pipe Short | Small pipe/vent |
| 5 | Pipe Long | Long metal corridor |
| 6 | Vault | Metal vault room — long metallic echo |
| 7 | Vault Large | Larger vault (Vault 111 entrance) |
| 8 | Hallway | Long corridor |
| 9 | Cave | Rock cave — natural drip echo |
| 10 | Dungeon | Damp dungeon-like space |
| 11 | Sewer | Underground sewer echo |
| 12 | Outdoors | Near-zero reverb, open sky |
| 13 | Generic Indoor | Fallback for unspecified interior |

For realistic results:
- **Plant biomes** outdoors: Reverb = 12 (Outdoors) or 0 (None)
- **Fungal cave / underground plant room**: Reverb = 9 (Cave)
- **Abandoned greenhouse interior**: Reverb = 3 (Room Large) or 8 (Hallway)
- **Sewers with plant growth**: Reverb = 11 (Sewer)

### Assigning ASPC to a Cell

In xEdit → your cell record → `XCAS` field = FormID of your ASPC record.
In the CK: Cell Properties → Lighting tab → Acoustic Space dropdown.

---

## 4. REGN — Region Sound for Exteriors

For open-world exterior areas, the REGN record defines which sounds play in a geographic region. This is how the game knows the Glowing Sea sounds different from the Forest.

### REGN Sound Entry Structure

```
REGN (Region)
├── RDAT (Region Data Header, Type = Sound)
│   └── RDSA (Sound Entries array):
│       ├── FormID of SNDR 1 + chance% + loop/distance flags
│       ├── FormID of SNDR 2 + chance%
│       └── FormID of SNDR 3 + chance%
└── Region boundary polygon (defines geographic extent)
```

### Adding Custom Region Sounds

1. In xEdit, find the REGN record covering your area (e.g., `REGNCommonwealthForest`)
2. OR create a new REGN record with a polygon boundary defining your mod's zone
3. Add RDSA sound entries:
   - Set a SNDR FormID from your custom sounds
   - Set chance (0–100) — probability this sound fires each trigger cycle
   - Set loop flag if the sound should loop
   - Set min/max distance for hearing range

### Typical Region Sound Mix

| Sound type | Chance | Loop | Description |
|---|---|---|---|
| Ambient drone | 100 | Yes | Base atmosphere layer |
| Bird/creature call | 15 | No | Occasional wildlife sounds |
| Wind gust | 25 | No | Intermittent environmental events |
| Rustling leaves | 40 | No | Frequent texture sounds |
| Distant rumble | 5 | No | Rare dramatic ambient event |

---

## 5. Custom Flora Ambient Sounds

For mutated vegetation and sentient plant mods, custom audio elevates immersion significantly.

### Bioluminescent Plant Sound Design

Suggested SNDR set for a glowing mushroom biome:
- `AMB_BioGlow_Hum_01.xwm` — 20Hz drone (looping) — the "life force" hum
- `AMB_BioGlow_Pulse_01.xwm` — soft rhythmic pulse (looping, 1Hz) — synced with emittance pulse
- `AMB_BioSpore_Release_01.xwm` — spore burst puff (non-looping, 15% chance trigger)
- `AMB_BioGlow_Crackle_01.xwm` — electrical crackle (non-looping, 5% chance)

### Wind Through Mutated Canopy

For large flora:
- `AMB_MutatedLeaf_Rustle_Light.xwm` — gentle rustling (looping)
- `AMB_MutatedLeaf_Rustle_Heavy.xwm` — storm rustling (looping, swap via TESWeatherEvent)
- Sync sound intensity with `fGRAS_INI_GrassWaveSpeed` + TESWeather wind speed

### Sentient Plant Sound Events

Papyrus can trigger sounds on awareness state changes:
```papyrus
; In SentientPlantBehavior.psc
Sound.Play(SFX_PlantAlert_Growl, Self)    ; on threat detected
Sound.Play(SFX_PlantAttack_Vine, Self)    ; on attack
Sound.Play(SFX_PlantFeed_Absorb, Self)    ; on feed complete
```

All three SNDR records reference `.xwm` files with positional audio (mono, 44100Hz).

---

## 6. Sound Output Models (Buses)

The SNDR `ONAM` field routes the sound through a mix bus:

| Output Model | Bus | Use for |
|---|---|---|
| `ITMSoundOutputModel` | Interior mix | All interior sounds |
| `EXTSoundOutputModel` | Exterior mix | All outdoor sounds |
| `BGS_AmbienceOutputModel` | Ambience bus | Ambient drones and loops |
| `BGS_EffectOutputModel` | Effects bus | One-shot effects |
| `BGS_CombatOutputModel` | Combat mix | Combat sounds |

Using the wrong output model can cause sounds to be muted or mixed incorrectly. Always use `BGS_AmbienceOutputModel` for looping ambient tracks and `BGS_EffectOutputModel` for triggered events.

---

## 7. Testing and Debugging

### In-Game Console Commands

```
sqv YourQuestID           ; check quest/script state if sounds are driven by script
SA 0xFormID               ; StopAllSounds — stops all currently playing sounds
PlaySound Sound_FormID    ; plays a sound at player position (testing)
```

### F4SE Sound Debug

Many F4SE plugins log sound-related issues. Check:
```
Documents\My Games\Fallout4\F4SE\Buffout4.log
```

For missing sound files, the game typically logs `SNDFILE: Can't open 'filename'`.

---

## 8. Checklist for Custom Ambient Audio

- [ ] All audio files are mono 44100Hz 16-bit WAV or XWM
- [ ] SNDR records created with correct category (SNCT) and output model (ONAM)
- [ ] Distance/attenuation values set (min 200–500, max 2000–8000)
- [ ] Multiple audio file variants added to each SNDR for random variation
- [ ] ASPC record created with correct reverb preset for cell type
- [ ] ASPC assigned to cells via `XCAS` field
- [ ] REGN sound entries added for exterior worldspace geographic zones
- [ ] Region sound mix includes base drone + random event sounds
- [ ] Sentient plant sound events driven by Papyrus state machine
- [ ] Audio files packed into BA2 archive

*Last updated: May 2026.*
