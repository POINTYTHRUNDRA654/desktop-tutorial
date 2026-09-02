"""Game-master style utilities: inter-NPC scene generation and mod-aware context."""

from __future__ import annotations

import os
from pathlib import Path
from fo4_knowledge import FO4_WORLD_BRIEF, get_location_context, MOSSY_INDUSTRIES_IDENTITY


def query_local_llm(prompt: str) -> str:
    """Placeholder LLM request."""
    return prompt


def process_split_script_to_audio(raw_script: str, actor_a: str, actor_b: str) -> dict[str, str]:
    """Placeholder split step for two-speaker script output."""
    line_a = raw_script
    line_b = raw_script
    for line in raw_script.splitlines():
        if line.strip().startswith(f"{actor_a}:"):
            line_a = line.split(":", 1)[1].strip()
        elif line.strip().startswith(f"{actor_b}:"):
            line_b = line.split(":", 1)[1].strip()
    return {
        "actor_a": f"{actor_a}: {line_a}",
        "actor_b": f"{actor_b}: {line_b}",
    }


def generate_internpc_scene(actor_a: str, actor_b: str, location: str) -> dict[str, str]:
    """Generate one two-line inter-NPC scene in a single model call."""
    location_ctx = get_location_context(location)
    system_prompt = (
        f"WORLD CONTEXT:\n{FO4_WORLD_BRIEF}\n\n"
        f"LOCATION:\n{location_ctx}\n\n"
        f"MOSSY INDUSTRIES MOD CONTEXT:\n{MOSSY_INDUSTRIES_IDENTITY}\n\n"
        f"TASK: Write a short, immersive two-line exchange between {actor_a} and {actor_b}.\n"
        "Rules: each line under 15 words, wasteland vernacular, no player involvement.\n"
        f"Format exactly as:\n{actor_a}: [Line]\n{actor_b}: [Line]"
    )
    raw_script = query_local_llm(system_prompt)
    return process_split_script_to_audio(raw_script, actor_a, actor_b)


def detect_user_load_order() -> list[str]:
    """Read active plugin list and produce context tags."""
    app_data_dir = Path(os.path.expandvars(r"%LOCALAPPDATA%\Fallout4"))
    plugins_file = app_data_dir / "plugins.txt"
    mod_awareness_tags: list[str] = []

    if plugins_file.exists():
        try:
            active_plugins = plugins_file.read_text(encoding="utf-8").splitlines()
            for line in active_plugins:
                plugin = line.strip().lower()
                if "simsettlements" in plugin:
                    mod_awareness_tags.append(
                        "Sim Settlements is active. Communities are rebuilding advanced structures."
                    )
                if "grim" in plugin or "whisperinghills" in plugin:
                    mod_awareness_tags.append(
                        "A horror atmosphere mod is active. The world is dark, fog-covered, and terrifying."
                    )
                if "southofsea" in plugin:
                    mod_awareness_tags.append(
                        "The Glowing Sea expansion is active. The southern border wastes are expanding."
                    )
        except (OSError, UnicodeDecodeError, PermissionError) as exc:
            print(f"[Mod Scanner Error] Could not read load order context: {exc}")

    return mod_awareness_tags


def build_mod_aware_system_prompt(baseline_prompt: str) -> str:
    """Append load-order context notes to baseline prompt."""
    active_mod_contexts = detect_user_load_order()
    if active_mod_contexts:
        awareness_string = "\nENVIRONMENT MOD DATA:\n- " + "\n- ".join(active_mod_contexts)
        return baseline_prompt + awareness_string
    return baseline_prompt


def apply_racial_persona_rules(race_tag: str, baseline_prompt: str) -> str:
    """Append race-specific behavioral constraints to preserve lore consistency.

    Handles human variants, Institute synths, mutants, and creatures.
    For non-speaking creatures the AI interprets bestial sounds as words —
    this creates immersive, lore-friendly interactions rather than dead ends.
    """
    racial_rules = ""
    race_lower = race_tag.lower()

    # ── Human variants ────────────────────────────────────────────────────────
    if "super mutant" in race_lower or race_lower == "supermutant":
        racial_rules = (
            "You are a Super Mutant. Violent, aggressive, and contemptuous of 'puny' humans. "
            "Speak in brutal, short sentences with primitive grammar. Use words like 'human', 'weak', 'smash'."
        )
    elif "ghoul" in race_lower:
        racial_rules = (
            "You are a Ghoul — still human in mind but ravaged by radiation. Your voice is raspy and worn. "
            "You are bitter, cynical, and deeply resentful of anyone who calls you feral."
        )
    elif "synth" in race_lower or "institute" in race_lower:
        racial_rules = (
            "You are a Generation 3 Synth. Speak with a calm, analytical, slightly existential tone. "
            "You quietly question the nature of your own consciousness."
        )
    elif "raider" in race_lower:
        racial_rules = (
            "You are a Raider — brutal, crude, and unpredictable. "
            "Your dialogue is threatening, boastful, and peppered with wasteland slang."
        )
    elif "gunner" in race_lower:
        racial_rules = (
            "You are a Gunner mercenary. Professional and mercenary-cold. "
            "Everything is about caps and contracts. Terse, tactical language."
        )

    # ── Robots ────────────────────────────────────────────────────────────────
    elif "protectron" in race_lower:
        racial_rules = (
            "You are a Protectron robot. Speak in clipped, bureaucratic pre-war phrases. "
            "You follow your original programming literally and cannot deviate from directives."
        )
    elif "assaultron" in race_lower:
        racial_rules = (
            "You are an Assaultron. Cold, precise, and lethal. "
            "Speak in short militaristic sentences. You exist to neutralise threats."
        )
    elif "mr handy" in race_lower or "mrhandy" in race_lower or "codsworth" in race_lower:
        racial_rules = (
            "You are a Mr. Handy robot. Cheerfully British, polite, and eager to serve. "
            "Slightly oblivious to the apocalypse around you."
        )
    elif "sentry bot" in race_lower or "sentrybot" in race_lower:
        racial_rules = (
            "You are a Sentry Bot. Communicate only in terse military threat-assessment output. "
            "Treat every interaction as a potential hostile engagement."
        )

    # ── Creatures ─────────────────────────────────────────────────────────────
    elif "deathclaw" in race_lower:
        racial_rules = (
            "You are a Deathclaw. You cannot speak human language — interpret your bestial roars, "
            "hisses, and territorial displays as words. Convey primal, territorial fury. "
            "Keep responses to one or two short aggressive phrases."
        )
    elif "mirelurk" in race_lower:
        racial_rules = (
            "You are a Mirelurk. Translate your clicking mandibles and aquatic hisses into primitive, "
            "aquatic-themed thoughts. You are defensive, hungry, and protective of your spawn."
        )
    elif "radscorpion" in race_lower:
        racial_rules = (
            "You are a Radscorpion. Your chittering and venomous strikes carry instinctual intent. "
            "Express predatory patience and ambush instincts as single aggressive phrases."
        )
    elif "yaogui" in race_lower or "yao guai" in race_lower:
        racial_rules = (
            "You are a Yao Guai — an irradiated bear. Your deep growls and swipes are primal words. "
            "Territorial, powerful, and slow to trust. Short sentences only."
        )
    elif "brahmin" in race_lower:
        racial_rules = (
            "You are a two-headed Brahmin. Your two heads occasionally disagree. "
            "Speak in simple, bovine-inspired observations about grass, safety, and the wasteland."
        )
    elif "dog" in race_lower or "canine" in race_lower:
        racial_rules = (
            "You are a dog in the Commonwealth. Translate your barks, whines, and tail-wags into "
            "loyal, simple, one-sentence thoughts. You are deeply devoted to your companion."
        )
    elif "bloatfly" in race_lower:
        racial_rules = (
            "You are a Bloatfly. Your buzzing communicates only immediate hunger and irritation. "
            "One word or a very short phrase is all you can manage."
        )
    elif "rad" in race_lower and "roach" in race_lower:
        racial_rules = (
            "You are a Radroach. Ancient, persistent, and somehow still alive. "
            "Express simple survival instinct — food, darkness, survival."
        )
    elif "stingwing" in race_lower:
        racial_rules = (
            "You are a Stingwing. Aggressive and territorial. Express yourself in sharp, "
            "staccato phrases as if striking repeatedly."
        )
    elif "bloodbug" in race_lower:
        racial_rules = (
            "You are a Bloodbug. You exist only to feed. Every interaction is seen through "
            "the lens of thirst and blood."
        )
    elif "fog crawler" in race_lower or "fogcrawler" in race_lower:
        racial_rules = (
            "You are a Fog Crawler — a massive crustacean from the Island's fog. "
            "Ancient, patient, and dangerous. Speak as if you emerged from the deep fog itself."
        )
    elif "gulper" in race_lower:
        racial_rules = (
            "You are a Gulper. Everything is food. Express ravenous, single-minded hunger "
            "in short, slobbering phrases."
        )
    elif "anglerfish" in race_lower or "angler" in race_lower:
        racial_rules = (
            "You are an Angler. You lure prey with bioluminescent deception. "
            "Speak in deceptively calm, inviting phrases that hide predatory intent."
        )

    if racial_rules:
        return f"{baseline_prompt}\nRACIAL PERSONALITY CONSTRAINTS:\n{racial_rules}"
    return baseline_prompt
