#!/usr/bin/env python3
"""
generate_fo4_with_inkling.py — FO4 Training Data Generator via Inkling API
===========================================================================
Uses Inkling (975B MoE, Thinking Machines) as a teacher model to generate
high-quality FO4 modding Q&A pairs, then appends them to the Gemma fine-tune
dataset in Mossy conversation format.

USAGE:
  python generate_fo4_with_inkling.py --api-key YOUR_KEY
  python generate_fo4_with_inkling.py --api-key YOUR_KEY --topics 40 --output "H:\\Mossy Memory\\finetune\\mossy_fo4_train.jsonl"

REQUIREMENTS:
  pip install openai
"""

import argparse, json, os, sys, time
from pathlib import Path

INKLING_BASE_URL = "https://api.tinker.thinkingmachines.ai/v1"
INKLING_MODEL    = "thinkingmachines/Inkling"

SYSTEM_PROMPT = """You are an expert Fallout 4 modding assistant with deep knowledge of:
- Papyrus scripting (quests, aliases, fragments, actors, packages)
- xEdit / FO4Edit record structures (QUST, DIAL, INFO, CELL, ACTR, BOOK, TERM, NOTE, NPC_, WEAP, ARMO)
- Creation Kit workflows (navmesh, FaceGen, precombines, lighting, BA2 packaging)
- Mossy Industries lore (pre-war AI/fungal/botanical research company; branches MYCEL/WEAVE/GRAFT;
  founder Dr. Eleanor Moss; Blue Hills facility; EditorIDs use MI_ prefix)
- F4SE, xEdit scripts, LOOT, CLASSIC, BodySlide, Community Shaders, PRP

When answering:
- Give precise, actionable answers with real FO4 syntax and record names
- Use valid EditorIDs, FormIDs (placeholder [GENERATE] where dynamic), and Papyrus syntax
- Never invent game content — only reference real vanilla or community-tool concepts
- Prefer structured output (code blocks for scripts, tables for records) where it helps clarity"""

FO4_TOPICS = [
    # Papyrus
    "How do I write a Papyrus quest script with 5 stages that enables an NPC on stage 3 and completes on stage 5?",
    "What is the correct pattern for a QF_ (quest fragment) script vs the main quest script in Papyrus?",
    "How do I use GetOwningQuest() in an alias fragment to reference the parent quest from a fill alias?",
    "How do I start a timer in Papyrus and handle the OnTimer event to advance quest stages?",
    "What is the SEQ file, why is it needed, and how do I generate it for a new quest?",
    "How do I register an OnHit event on an actor alias in Papyrus?",
    "How do I use SendModEvent and RegisterForModEvent to pass data between scripts?",
    "Write a Papyrus script for a container that plays a sound and locks itself after the player takes the key item.",
    "How do I use Utility.Wait vs StartTimer in Papyrus, and when should I prefer each?",
    "How do I write a fill alias script that makes an NPC say a specific line of dialogue when greeted?",

    # xEdit / records
    "What records do I need to create a simple fetch quest with 3 stages, 1 NPC, and 1 holotape reward?",
    "How do I create a DIAL/INFO record pair in xEdit for a basic greeting dialogue?",
    "What is the difference between a Misc Item, a BOOK record with IsNote flag, and a TERM record?",
    "How do I create an ACTR (encounter zone actor) record that respawns enemies after 7 days?",
    "What CELL flags control indoor lighting vs outdoor sunlight calculation?",
    "How do I set up a PACK (AI package) for an NPC that patrols between 3 waypoints?",
    "What is the correct xEdit structure for a settings holotape using BOOK + TERM + GLOB?",
    "How do I forward a master file record change through an override plugin without touching unrelated fields?",

    # Mossy Industries lore
    "Write a holotape found at a Mossy Industries GRAFT field station — research log from Dr. Eleanor Moss.",
    "Write 3 terminal entries for a Mossy Industries MYCEL division underground lab (pre-war).",
    "Write an NPC greeting dialogue for a rogue GRAFT prototype encountered in the Commonwealth (3 lines).",
    "What are the Mossy Industries branch divisions and what did each research before the war?",

    # Creation Kit
    "How do I export FaceGen data in the Creation Kit to fix the dark face bug?",
    "What is the correct workflow for setting up NavMesh in a custom interior cell?",
    "How do I set up precombines for a custom exterior cell to maintain FPS performance?",
    "What is the difference between an Encounter Zone and a Location record?",
    "How do I create a custom race in CK that inherits from HumanRace?",

    # Packaging & release
    "What is the correct BA2 package structure for a mod with textures, meshes, scripts, and FaceGen data?",
    "How do I verify my plugin has no deleted records or unresolved masters before releasing on Nexus?",
    "What FOMOD structure do I need for a mod that has OG and NG F4SE DLL variants?",
    "How do I use LOOT to assign masters and check for load order conflicts before release?",

    # Tools
    "How do I use CLASSIC to diagnose a CTD from a Papyrus script that runs at game load?",
    "What does 'Papyrus VM is overloaded' mean and how do I fix it?",
    "How do I use Community Shaders wet surface shader on a custom mesh with a custom BGSM material?",
    "How do I use BodySlide to build morphs for a custom armor piece?",
    "How do I use Champollion to decompile a PEX script back to PSC source?",

    # F4SE / DLL
    "What is the Address Library and why is it required for all modern F4SE DLL mods?",
    "How do I register a Papyrus native function from a C++ F4SE plugin using CommonLibF4?",
    "What is the difference between kPostLoad, kPostPostLoad, and kGameDataReady in F4SE message registration?",
    "How do I ship an F4SE DLL mod that supports both OG (1.10.x) and NG (1.11.x) Fallout 4?",
]


def build_conversation(question: str, answer: str) -> dict:
    return {
        "conversations": [
            {"role": "system",  "content": SYSTEM_PROMPT},
            {"role": "user",    "content": question},
            {"role": "assistant","content": answer},
        ]
    }


def generate_answer(client, topic: str) -> str:
    resp = client.chat.completions.create(
        model=INKLING_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": topic},
        ],
        max_tokens=2048,
        temperature=0.7,
    )
    return resp.choices[0].message.content.strip()


def main():
    parser = argparse.ArgumentParser(description="Generate FO4 training data via Inkling API")
    parser.add_argument("--api-key",  default=os.environ.get("INKLING_API_KEY", ""), help="Inkling API key (or set INKLING_API_KEY env var)")
    parser.add_argument("--base-url", default=INKLING_BASE_URL)
    parser.add_argument("--model",    default=INKLING_MODEL)
    parser.add_argument("--topics",   type=int, default=len(FO4_TOPICS), help="Number of topics to generate (default: all)")
    parser.add_argument("--output",   default=r"H:\Mossy Memory\finetune\mossy_fo4_train.jsonl")
    parser.add_argument("--delay",    type=float, default=1.0, help="Seconds between API calls (rate limiting)")
    args = parser.parse_args()

    if not args.api_key:
        print("ERROR: Provide --api-key or set INKLING_API_KEY environment variable")
        print("  Get your key at: https://tinker.thinkingmachines.ai")
        sys.exit(1)

    try:
        from openai import OpenAI
    except ImportError:
        print("ERROR: openai package not installed. Run: pip install openai")
        sys.exit(1)

    client = OpenAI(api_key=args.api_key, base_url=args.base_url)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    topics = FO4_TOPICS[:args.topics]
    print(f"Generating {len(topics)} FO4 training examples via Inkling")
    print(f"Model:  {args.model}")
    print(f"Output: {output_path}")
    print()

    generated = 0
    with open(output_path, "a", encoding="utf-8") as f:
        for i, topic in enumerate(topics, 1):
            print(f"[{i}/{len(topics)}] {topic[:70]}...")
            try:
                answer = generate_answer(client, topic)
                record = build_conversation(topic, answer)
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
                generated += 1
                print(f"       {len(answer)} chars — OK")
            except Exception as e:
                print(f"       ERROR: {e}")

            if i < len(topics):
                time.sleep(args.delay)

    print(f"\nDone. {generated}/{len(topics)} examples written to {output_path}")
    print()
    print("Next step — fine-tune Gemma on the updated dataset:")
    print(f'  python scripts/train_mossy_fo4.py --model 4b --dataset "{output_path}"')


if __name__ == "__main__":
    main()
