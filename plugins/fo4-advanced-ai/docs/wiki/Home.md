# Welcome to the Fallout 4 Advanced AI System Wiki

This project is a 100% free, fully offline middleware framework that bridges Bethesda's Creation Engine with local machine learning models.

## Architectural Pipeline

The system operates as a synchronized file-loop state machine:

1. **Papyrus Trigger**: The game registers player interaction and writes world context to `bridge_input.json`.
2. **Python Watcher**: The background runtime captures payloads, processes context, and executes inference.
3. **Local Inference**: Text is generated through KoboldCPP, voice via Piper/xVASynth paths, and optional lipgen via `CreationKit32.exe`.
4. **Game Execution**: Papyrus reads `bridge_output.json`, applies face morph overrides, and plays spatial audio.

## Developer Quick Links

* [[Papyrus-Script-Inventory]]
* [[Machine-Learning-and-Unsloth-Tuning]]
