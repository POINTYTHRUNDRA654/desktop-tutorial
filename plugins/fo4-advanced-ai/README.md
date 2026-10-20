# Fallout 4 Advanced AI

A comprehensive Fallout 4 mod that overhauls AI behaviour for every entity type — creatures, humanoids, robots, synths, super mutants, and feral ghouls — plus a PC-side Mossy Bridge so NPCs remember your actions across sessions.

## Support the Developer

If this mod has improved your Fallout 4 experience, consider supporting continued development:

[![Patreon](https://img.shields.io/badge/Patreon-Support-orange?logo=patreon)](https://www.patreon.com/c/Pointytundra654)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Tip-yellow?logo=buymeacoffee)](https://buymeacoffee.com/tundra654)

---

## What's Included

| Folder | Contents |
|--------|----------|
| `mod/` | Papyrus scripts, MCM config, FOMOD installer |
| `bridge/` | Python simulation engines (acoustic, ecology, environment, lighting, memory, water, world) |
| `components/` | React UI panels for the Mossy.Space desktop app |

## Requirements

See [mod/REQUIREMENTS.md](mod/REQUIREMENTS.md) for the full dependency list.

## Installation

See [INSTALL.md](INSTALL.md) for step-by-step instructions.

## Credits & Third-Party Software

This mod bundles or depends on the following third-party projects. Please support their creators.

**KoboldCpp** — local AI inference engine  
By LostRuins and contributors  
https://github.com/LostRuins/koboldcpp  
License: AGPL-3.0

**TinyLlama 1.1B Chat v1.0** — bundled language model  
By the TinyLlama project (https://github.com/jzhang38/TinyLlama)  
GGUF quantisation by TheBloke (https://huggingface.co/TheBloke)  
License: Apache 2.0

**Piper** — offline neural text-to-speech for NPC voices (runs on your PC, nothing is sent online)  
By the Rhasspy / Open Home Foundation project (https://github.com/rhasspy/piper)  
License: MIT

**Piper voices** — en_US-joe-medium (CC0) and en_US-ljspeech-high (public domain), from https://huggingface.co/rhasspy/piper-voices  
Installed by setup_piper.ps1; not bundled in the repository.

---

## License

MIT
