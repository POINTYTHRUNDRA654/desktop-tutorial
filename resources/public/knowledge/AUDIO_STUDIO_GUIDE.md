# Audio Studio - Professional Mod Audio Creation Tool

**Status:** ✅ Reworked & Functional  
**Last Updated:** January 13, 2026  
**Purpose:** Create, process, and export high-quality audio for Fallout 4 mods

---

## Overview

The **Audio Studio** is a professional-grade audio processing and creation tool integrated into Mossy. Instead of the previous fake TTS demo, it now provides real audio file handling, processing, effects, and export capabilities for mod audio creation.

### Key Features

✅ **Real Audio File Loading** - Import WAV, MP3, OGG audio files  
✅ **Audio Processing** - Volume, pitch shift, echo/reverb controls  
✅ **DSP Effects Rack** - 4 professional audio effects  
✅ **Quality Export** - Multiple audio quality settings (16/24-bit, 22-48kHz)  
✅ **Real-time Visualization** - Frequency analyzer with live feedback  
✅ **Mod Integration** - Set mod folder path for workflow  

---

## What Changed

### Before (Fake Implementation)
- ❌ Text-to-speech only (no real audio)
- ❌ Removed legacy Google/Gemini API calls
- ❌ "Generate Raw Audio" button didn't create real files
- ❌ No actual audio file import
- ❌ No real export functionality
- ❌ FX were decorative only

### After (Real Implementation)
- ✅ Actual audio file loading from disk
- ✅ Real Web Audio API processing
- ✅ Actual DSP effect chains
- ✅ Professional WAV export with multiple quality options
- ✅ Real-time audio parameter control
- ✅ Frequency visualization during playback
- ✅ Multiple audio file management

---

## How to Use Audio Studio

### Step 1: Load Audio File

1. Click **"Load Audio"** button in the Audio Files section
2. Select a compatible audio file:
   - WAV files (recommended for best quality)
   - MP3 files
   - OGG/Vorbis files
   - Other Web Audio API supported formats

3. File appears in list showing:
   - Filename
   - Duration in seconds

### Step 2: Select & Adjust Audio

**Select File:**
- Click on file in the list to select it
- File loads into the visualizer
- Play button becomes active

**Adjust Parameters:**
```
Volume:      0% → 200% (compensate for quiet sources)
Pitch:       50% → 200% (shift frequency without time stretch)
Echo Amount: 0% → 100% (add spatial depth)
Quality:     16-bit 22kHz → 24-bit 48kHz
```

### Step 3: Apply Effects

Choose one of four audio effects:

**1. Clean Signal**
- Direct unprocessed audio
- Best for dialogue and clear sources

**2. Radio Effect (Pip-Boy)**
- Bandpass filter @ 1kHz
- Mild distortion
- Use for: Radio broadcasts, vintage communication

**3. Robot Effect**
- Delay feedback (30ms)
- Metallic resonance
- Use for: Synth voices, robotic NPCs, computer effects

**4. Reverb Effect (Ethereal)**
- Multi-tap reverb simulation
- 150ms + 350ms delays
- Use for: Ghosts, supernatural elements, cave acoustics

### Step 4: Preview & Export

**Preview:**
- Click large **Play** button in visualizer
- Watch frequency analyzer respond in real-time
- Adjustable pitch/volume during preview

**Export:**
- Click **"Export to WAV"** button
- Choose quality setting (automatically applied)
- File downloads as `[filename]_[quality].wav`

**Example Output:**
```
Original:      dialogue.wav
16-bit 22kHz:  dialogue_16bit-22k.wav
16-bit 44kHz:  dialogue_16bit-44k.wav
24-bit 48kHz:  dialogue_24bit-48k.wav
```

### Step 5: Add to Mod Folder

1. Click **"Set Mod Path"** button
2. Enter your mod's folder path, example:
   ```
   C:\Modding\MyFallout4Mod
   ```

3. Path is remembered for reference
4. Export files to appropriate subfolder:
   ```
   C:\Modding\MyFallout4Mod\
   ├── Sound/
   │   ├── Voice/
   │   │   └── YourMod/
   │   │       └── [exported audio files]
   │   └── FX/
   │       └── [sound effects]
   └── ...other folders
   ```

---

## Audio Quality Settings

### 16-bit 22 kHz (Dialogue Quality)
```
File Size:     Small (~1.3 MB per minute)
Quality:       Suitable for voice dialogue
Use Case:      NPC voices, dialogue trees, narration
Fallout 4:     Perfect for voice acting
Recommendation: Fastest loading, ideal for speech
```

### 16-bit 44.1 kHz (Standard Quality)
```
File Size:     Medium (~2.6 MB per minute)
Quality:       CD-quality audio
Use Case:      General audio, background music, ambient
Fallout 4:     Matches most mod audio standards
Recommendation: Good balance of quality and size
```

### 24-bit 48 kHz (High-Fidelity)
```
File Size:     Large (~5.2 MB per minute)
Quality:       Professional/lossless quality
Use Case:      Critical audio, master recordings
Fallout 4:     Overkill for most purposes
Recommendation: Only if quality is essential
```

---

## DSP Effects Details

### Audio Effect Chain Architecture

```
Input Audio
    ↓
Volume Control (0-200%)
    ↓
Effect (None/Radio/Robot/Ethereal)
    ↓
Echo Processor (0-100%)
    ↓
Frequency Analyzer (visualization)
    ↓
Output Speaker
```

### Effect Specifications

#### Clean Signal
```
Processing:  None
Use For:     Clear dialogue, music, clean sources
Output:      Direct pass-through
Overhead:    Minimal (no DSP)
```

#### Radio (Pip-Boy Broadcast)
```
Filter:      Bandpass @ 1kHz, Q=2
             (Reduces bass/treble, limits midrange)

Distortion:  WaveShaper with curve
             (20x saturation drive)
             
Overhead:    Moderate (2 processing nodes)

Example Uses:
  - "Atom Cats" radio broadcast
  - Radio DJ voices
  - Ham radio transmissions
  - Vintage communication
```

#### Robot (Protectron/Synth)
```
Delay:       30ms feedback delay
Resonance:   30% feedback (repeating)
             
Effect:      Creates metallic comb-filter
             resonance typical of synths

Overhead:    Moderate (delay + feedback)

Example Uses:
  - Mr. Handy voices
  - Synth dialogue
  - Computer interfaces
  - Robotic enemy sounds
```

#### Reverb (Ethereal/Supernatural)
```
Delay 1:     150ms (early reflection)
Delay 2:     350ms (late reflection)
Feedback:    40% (tail decay)

Effect:      Simulates large room/cave acoustics
             Creates spacious, ethereal quality

Overhead:    High (3 processing nodes + feedback)

Example Uses:
  - Ghost/specter voices
  - Vault security systems
  - Underground caverns
  - Supernatural elements
```

---

## Fallout 4 Audio Integration

### Required Folder Structure

```
YourMod.esp/
└── Sound/
    ├── Voice/
    │   ├── YourMod/
    │   │   ├── Npc001_Dialog01_0.wav
    │   │   └── ... (all NPC voices)
    │   └── ... (other mods)
    │
    ├── FX/
    │   ├── Environment/
    │   │   └── ... (ambient loops, reverb tails)
    │   ├── Interface/
    │   │   └── ... (UI sounds, beeps)
    │   └── Weapons/
    │       └── ... (weapon audio)
    │
    └── Music/
        └── ... (background music files)
```

### Creating NPC Dialogue

**Naming Convention (CRITICAL):**
```
Format: [CharacterID]_[DialogueID]_[Take].wav

Examples:
  PP_001_Quest_Intro_0.wav      (NPC ID, dialogue, take)
  PP_001_Quest_Intro_1.wav      (alternate take)
  PP_002_Combat_Attack_0.wav    (different NPC)

Variables:
  [CharacterID]:  Unique ID for NPC (PP_001, etc.)
  [DialogueID]:   Quest/dialogue identifier (Quest_Intro)
  [Take]:         Take number (0, 1, 2, etc.)
```

### Creating Sound Effects

**Folder Organization:**
```
Sound/FX/
├── Environment/
│   ├── Settlement_ambient_loop.wav
│   ├── CaveDrip_01.wav
│   └── WindHowl.wav
│
├── Interface/
│   ├── ButtonClick.wav
│   ├── QuestionMark.wav
│   └── Alert.wav
│
└── Weapons/
    ├── LaserRifle_Fire.wav
    ├── LaserRifle_Impact.wav
    └── Gauss_Charge.wav
```

---

## Technical Specifications

### Supported Audio Formats
```
Input (Loading):
  ✓ WAV (Recommended)
  ✓ MP3
  ✓ OGG/Vorbis
  ✓ FLAC
  ✓ AAC (if browser supports)

Output (Export):
  ✓ WAV (16-bit or 24-bit)
     - PCM encoding
     - Fallout 4 compatible
```

### Web Audio API Specifications
```
Sample Rates Supported:
  - 22050 Hz (dialogue)
  - 44100 Hz (standard)
  - 48000 Hz (high-fidelity)

Channels:
  - Mono (1 channel)
  - Stereo (2 channels)

Buffer Size:
  - Variable (dynamic allocation)
  - Handled by Web Audio API

Maximum File Size:
  - Limited by system RAM
  - Typical limit: 100 MB audio file
```

### FFT Analyzer (Visualizer)
```
FFT Size:     256 bins
Frequency:    Updates 60x per second
Display:      Gradient bars (effect color-coded)
Purpose:      Real-time frequency feedback
```

---

## Common Workflows

### Workflow 1: Import & Export NPC Dialogue
```
1. Load → dialogue_raw.wav
2. Set Volume → 100% (optimal level)
3. Set Effect → Clean Signal
4. Set Quality → 16-bit 22kHz (NPC voices)
5. Export → MyNPC_Dialog01_0.wav
6. Place → Sound/Voice/MyMod/ folder
7. Reference in CK → Link via FormID
```

### Workflow 2: Create Radio Broadcast
```
1. Load → speech_recording.wav (your voice/AI TTS)
2. Set Effect → Radio
3. Set Echo → 20% (slight reverb)
4. Set Quality → 16-bit 44kHz
5. Export → RadioBroadcast_01.wav
6. Place → Sound/Voice/RadioStation/ folder
```

### Workflow 3: Process Ambient Sound
```
1. Load → cave_ambience_raw.wav (low quality)
2. Set Volume → 150% (boost level)
3. Set Effect → Ethereal (adds reverb depth)
4. Set Echo → 50% (spacious quality)
5. Set Quality → 24-bit 48kHz (high fidelity)
6. Export → AmbientCave_Master.wav
7. Use → In worldspace cells
```

### Workflow 4: Create Sound Effect
```
1. Load → laser_fire_raw.wav
2. Set Pitch → 85% (lower frequency)
3. Set Effect → Robot (metallic)
4. Set Echo → 35% (short reverb tail)
5. Set Quality → 16-bit 44kHz
6. Export → LaserRifle_Fire_Custom.wav
7. Place → Sound/FX/Weapons/ folder
```

---

## File Management

### Load Audio File
- Click **"Load Audio"** button
- Select file from disk
- Added to file list automatically
- Can load multiple files

### Switch Between Files
- Click file in list to select
- Visualizer updates
- Play button uses selected file
- All controls apply to selected file

### Delete Audio File
- Click **Trash** icon on file
- Removed from session
- Currently selected file clears
- Does NOT delete original file

### Set Mod Folder Path
- Click **"Set Mod Path"** button
- Enter mod directory path
- Path stored for reference
- Helps organize workflow
- Does NOT auto-export to path

---

## Troubleshooting

### Issue: "Failed to load audio file"
```
Cause:   Unsupported format or corrupted file
Solution:
  1. Ensure file is WAV, MP3, or OGG
  2. Try converting: ffmpeg -i input.m4a -acodec libmp3lame output.mp3
  3. Check file isn't corrupted
  4. Try different browser (Chrome, Firefox, Edge)
```

### Issue: Audio plays but visualizer shows nothing
```
Cause:   Analyzer not connected to playback
Solution:
  1. Reload page (Ctrl+R)
  2. Check browser console for errors
  3. Ensure AudioContext is initialized
  4. Try different audio file
```

### Issue: Export creates corrupt WAV
```
Cause:   Web Audio API limitation
Solution:
  1. Try 16-bit 44kHz quality first
  2. Keep audio duration < 5 minutes
  3. Reload page and retry
  4. Use different browser
```

### Issue: Effects don't sound right
```
Cause:   Effect parameters may need adjustment
Solution:
  1. Adjust Volume first (optimal gain)
  2. Try Echo at 25-50% with effects
  3. Pitch shift is real-time (may sound weird)
  4. Preview first, export after confirming
```

---

## Future Enhancements (Planned)

- [ ] Equalizer (3, 5, or 10-band)
- [ ] Compression/limiting
- [ ] Fade in/out controls
- [ ] Audio trimming/cropping
- [ ] Batch processing
- [ ] Effect presets
- [ ] Audio file chaining (concatenation)
- [ ] Noise reduction
- [ ] Normalization

---

## Integration with Mossy

### Location in App
```
Path: /tts (kept for backward compatibility)
Menu: Audio Tools → Audio Studio
Icon: Music/Mic icon in sidebar
```

### Related Tools
- **Image Suite** - For texture creation
- **Papyrus Compiler** - For dialogue quest scripts
- **Workshop Framework** - For settlement audio setup

---

## Summary

The Audio Studio is now a **fully functional audio creation and processing tool** instead of a fake demo. You can:

✅ Load real audio files  
✅ Process with real DSP effects  
✅ Export to Fallout 4-compatible WAV files  
✅ Use multiple quality settings  
✅ Create mod-ready audio content  

**Status: COMPLETE & TESTED** ✅
