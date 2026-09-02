# Machine Learning Optimization & DPO Fine-Tuning

This project supports local, on-the-fly reinforcement learning through Unsloth-compatible DPO-style workflows.

## Data Pipeline

* **Feedback Collection**: Player Up/Down key feedback is captured through `F4AI_FeedbackMonitor.psc`.
* **Logging System**: Python logs preference pairs (`prompt`, `chosen`, `rejected`) into `Training_Cache/*.jsonl`.
* **Background Training**: During idle/sleep windows, `train_lora.py` can run a short local optimization cycle and emit LoRA adapters.

## Hardware Scaling & Constraints

Recommended constraints for local background tuning:

* `load_in_4bit = True` (lower VRAM use)
* `max_steps = 20` (short training windows)
* `gradient_checkpointing = True` (reduced memory overhead)
