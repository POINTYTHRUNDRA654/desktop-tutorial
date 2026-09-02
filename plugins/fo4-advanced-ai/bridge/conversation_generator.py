"""
conversation_generator.py
Fallout 4 Advanced AI — NPC-to-NPC Conversation Generator
==========================================================

Uses Mossy's AI engine (Ollama local or Gemini API) to generate
realistic, context-aware conversations between NPCs.

When the player enters a settlement, bar, or city:
  1. The game sends a location + NPC list to the bridge
  2. This engine pairs NPCs and generates conversations
  3. Conversations are written to a JSON file
  4. Papyrus reads the file and has NPCs deliver the lines

This is what makes Diamond City feel ALIVE — every time you walk in,
NPCs are talking about real things that happened in the world.
"""

import json
import os
import re
import sys
import time
import random
import datetime
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional

# Import FO4 knowledge base from src/ sibling directory
_SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))
from fo4_knowledge import (  # noqa: E402
    FO4_WORLD_BRIEF,
    build_conversation_location_context,
    get_faction_context,
)
from ai.memory_store import (  # noqa: E402
    save_npc_conversation,
    build_npc_pair_history_string,
)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

DOCUMENTS_PATH     = Path(os.path.expandvars(r"%USERPROFILE%\Documents\My Games\Fallout4"))
# Same DB the rest of the bridge uses (H:\Mossy Memory when present) — this used
# to hardcode the Documents path, a file that never existed, so every query here
# ran against an empty, disconnected database.
from ai.memory_store import DB_PATH as MEMORY_DB_PATH  # noqa: E402
CONVERSATION_FILE  = DOCUMENTS_PATH / "AdvancedAI_Conversations.json"

OLLAMA_URL         = "http://localhost:11434/api/generate"
OLLAMA_MODEL       = "llama3.1:8b"   # matches the model actually installed/pulled for this rig
GEMINI_MODEL       = "gemini-2.0-flash"

# Location type flavors — shapes the conversation topic pool
LOCATION_FLAVORS = {
    "settlement":   ["daily_life", "resources", "threats", "relationships", "past"],
    "bar_tavern":   ["gossip", "rumors", "complaints", "stories", "politics"],
    "city":         ["trade", "news", "factions", "crime", "weather"],
    "dungeon":      ["fear", "mission", "combat_prep", "past_trauma"],
    "military":     ["orders", "mission", "discipline", "respect", "war"],
    "wasteland":    ["survival", "weather", "threats", "destinations", "loneliness"],
}

# ─────────────────────────────────────────────────────────────────────────────
# Topic Templates
# These seed the AI with a direction without constraining it too much
# ─────────────────────────────────────────────────────────────────────────────

TOPIC_SEEDS = {
    "daily_life":     "Talk about the daily routine, chores, or something mundane but real",
    "resources":      "Discuss food, water, caps, or trade scarcity",
    "threats":        "Discuss a recent or nearby danger — raider activity, creature sightings",
    "relationships":  "Talk about someone they both know, a friendship or tension",
    "past":           "One of them mentions something from before the bombs",
    "gossip":         "Share a piece of juicy gossip about someone in the community",
    "rumors":         "Spread a rumor about something that happened in the Commonwealth",
    "complaints":     "Complain about something in their daily life in the wasteland",
    "stories":        "One tells a story about something they witnessed or survived",
    "politics":       "Discuss faction politics — Brotherhood, Railroad, Institute, Minutemen",
    "trade":          "Talk about a recent trade, a good deal or a rip-off",
    "news":           "Share recent news heard from a caravan or traveler",
    "factions":       "Discuss the factions and what they mean for regular people",
    "crime":          "Talk about something illegal that happened — theft, murder, corruption",
    "weather":        "Comment on the acid rain, the sky, or the nuclear winter atmosphere",
    "fear":           "Express fear or unease about where they are or what they're doing",
    "mission":        "Discuss what they're here to do and how they feel about it",
    "survival":       "Talk about survival tactics, close calls, how to stay alive out here",
}

# ─────────────────────────────────────────────────────────────────────────────
# NPC Pair Selector
# ─────────────────────────────────────────────────────────────────────────────

def select_npc_pairs(npcs: list[dict], max_pairs: int = 3) -> list[tuple]:
    """
    Select pairs of NPCs to have conversations.
    Prefers pairs with existing relationship history.
    """
    if len(npcs) < 2:
        return []

    conn = sqlite3.connect(MEMORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    pairs = []
    used = set()

    # First try to pair NPCs that know each other (have shared location history)
    for i, npc_a in enumerate(npcs):
        if npc_a["npc_id"] in used:
            continue
        for npc_b in npcs[i+1:]:
            if npc_b["npc_id"] in used:
                continue
            if len(pairs) >= max_pairs:
                break

            # Check if they've been in the same location before. location_knowledge
            # is only created by advanced_memory_systems.py, which nothing in the
            # live bridge initializes — don't let a missing table kill pairing.
            try:
                c.execute("""
                    SELECT COUNT(*) FROM location_knowledge
                    WHERE npc_id IN (?,?) AND location_name = ?
                    GROUP BY location_name HAVING COUNT(DISTINCT npc_id) = 2
                """, (npc_a["npc_id"], npc_b["npc_id"],
                      npc_a.get("current_location", "")))
                known = c.fetchone()
            except sqlite3.OperationalError:
                known = None

            # Pair them (prefer known pairs, but take any if needed)
            pairs.append((npc_a, npc_b))
            used.add(npc_a["npc_id"])
            used.add(npc_b["npc_id"])
            break

    # Fill remaining slots with random pairs
    remaining = [n for n in npcs if n["npc_id"] not in used]
    random.shuffle(remaining)
    while len(pairs) < max_pairs and len(remaining) >= 2:
        pairs.append((remaining.pop(), remaining.pop()))

    conn.close()
    return pairs

# ─────────────────────────────────────────────────────────────────────────────
# Prompt Builder
# ─────────────────────────────────────────────────────────────────────────────

def build_conversation_prompt(npc_a: dict, npc_b: dict,
                               location: str, location_type: str,
                               world_events: list, topic_seed: str) -> str:
    """Build the AI prompt for generating an NPC conversation."""

    # Distil world events to 3 most relevant
    world_summary = ""
    for event in world_events[:3]:
        world_summary += f"- {event.get('event_type','?')}: {event.get('event_subject','')} at {event.get('event_location','')}\n"
    if not world_summary:
        world_summary = "- Nothing notable has happened recently\n"

    # Enrich with FO4 knowledge
    location_ctx  = build_conversation_location_context(location, location_type)
    faction_a_ctx = get_faction_context(npc_a.get('npc_faction', 'none'))
    faction_b_ctx = get_faction_context(npc_b.get('npc_faction', 'none'))

    name_a = npc_a.get('npc_name', 'Settler')
    name_b = npc_b.get('npc_name', 'Guard')

    # Load past conversations between these two NPCs from memory store
    past_convos = build_npc_pair_history_string(name_a, name_b, limit=3)

    prompt = f"""You are writing immersive dialogue for a Fallout 4 mod (Mossy Industries Advanced AI).
Generate a realistic, in-character conversation between two NPCs who live in the Commonwealth.
These NPCs have a shared history — they remember past conversations and should reference them naturally.

WORLD: {FO4_WORLD_BRIEF}

{location_ctx}

NPC A: {name_a}
  {faction_a_ctx}
  Personality: aggression={npc_a.get('aggression', 0.5):.0%}, morality={npc_a.get('morality', 0.5):.0%}
  Current mood: {npc_a.get('emotional_state', 'neutral')}

NPC B: {name_b}
  {faction_b_ctx}
  Personality: aggression={npc_b.get('aggression', 0.5):.0%}, morality={npc_b.get('morality', 0.5):.0%}
  Current mood: {npc_b.get('emotional_state', 'neutral')}

THEIR CONVERSATION HISTORY (what they've talked about before):
{past_convos}

RECENT WORLD EVENTS THEY MAY KNOW ABOUT:
{world_summary}

CONVERSATION TOPIC TODAY: {topic_seed}

RULES:
- 4 to 6 lines total (alternating speakers)
- SHORT lines — 1-2 sentences each, like real overheard dialogue
- Use each NPC's faction personality and dialect (see faction context above)
- Wasteland vernacular — gruff, practical, sometimes dark humor
- If they've spoken before, let it show — pick up threads, reference past topics naturally
- Reference world events if relevant (don't force it)
- No player character — this is between the two NPCs only
- Feel overheard, not performed
- If their factions are opposed (e.g., BoS meets Railroad), let the tension show

OUTPUT FORMAT (exactly):
{name_a}: [line]
{name_b}: [line]
{name_a}: [line]
{name_b}: [line]
(etc.)
"""
    return prompt

# ─────────────────────────────────────────────────────────────────────────────
# AI Generation
# ─────────────────────────────────────────────────────────────────────────────

def generate_with_ollama(prompt: str, model: str = OLLAMA_MODEL) -> Optional[str]:
    """Generate conversation using local Ollama."""
    try:
        payload = json.dumps({
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.85,
                "top_p": 0.9,
                "max_tokens": 300,
            }
        }).encode()

        req = urllib.request.Request(
            OLLAMA_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return data.get("response", "").strip()
    except Exception as e:
        print(f"[Conv] Ollama error: {e}")
        return None

def generate_with_gemini(prompt: str, api_key: str) -> Optional[str]:
    """Generate conversation using Gemini API."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
        payload = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.85,
                "maxOutputTokens": 300,
            }
        }).encode()

        req = urllib.request.Request(
            url, data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"[Conv] Gemini error: {e}")
        return None

def parse_conversation(raw: str, npc_a_name: str, npc_b_name: str) -> list[dict]:
    """Parse AI output into structured conversation lines."""
    lines = []
    for raw_line in raw.strip().split("\n"):
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        if raw_line.startswith("A:"):
            lines.append({
                "speaker_id": "npc_a",
                "speaker_name": npc_a_name,
                "line": raw_line[2:].strip().strip('"'),
            })
        elif raw_line.startswith("B:"):
            lines.append({
                "speaker_id": "npc_b",
                "speaker_name": npc_b_name,
                "line": raw_line[2:].strip().strip('"'),
            })
    return lines

# ─────────────────────────────────────────────────────────────────────────────
# Fallback Conversations (if AI unavailable)
# Templated but still context-aware
# ─────────────────────────────────────────────────────────────────────────────

FALLBACK_TEMPLATES = [
    [
        ("npc_a", "Quiet night. Too quiet."),
        ("npc_b", "Never thought I'd say I miss the sound of gunfire."),
        ("npc_a", "Give it an hour."),
    ],
    [
        ("npc_a", "You hear about the caravan that came through yesterday?"),
        ("npc_b", "The one from Goodneighbor? Yeah. Said they lost two guys to raiders past Lexington."),
        ("npc_a", "Every week it's something. Every damn week."),
    ],
    [
        ("npc_a", "My stash is running low. Radroach again tonight."),
        ("npc_b", "Could be worse. Last month I was eating newspaper."),
        ("npc_a", "That's... actually an idea. What did it taste like?"),
        ("npc_b", "Current events, mostly."),
    ],
    [
        ("npc_a", "You see that stranger who came through? The one with all the weapons?"),
        ("npc_b", "Heard they cleared out the old factory down south."),
        ("npc_a", "Alone?"),
        ("npc_b", "That's what they're saying. I don't believe it either."),
    ],
    [
        ("npc_a", "Before the war, you know what I did?"),
        ("npc_b", "No idea."),
        ("npc_a", "Nothing. I did nothing interesting. Funny how that changes."),
        ("npc_b", "Yeah. Funny."),
    ],
]

def get_fallback_conversation(npc_a_name: str, npc_b_name: str) -> list[dict]:
    """Return a templated fallback conversation."""
    template = random.choice(FALLBACK_TEMPLATES)
    return [
        {
            "speaker_id": spk,
            "speaker_name": npc_a_name if spk == "npc_a" else npc_b_name,
            "line": line
        }
        for spk, line in template
    ]

# ─────────────────────────────────────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def generate_location_conversations(location: str, location_type: str,
                                     npcs: list[dict], world_events: list,
                                     ai_engine: str = "ollama",
                                     gemini_api_key: str = "",
                                     max_conversations: int = 3) -> dict:
    """
    Generate all conversations for a location when the player arrives.

    Returns a dict that gets written to AdvancedAI_Conversations.json
    for Papyrus to read.
    """
    flavors = LOCATION_FLAVORS.get(location_type, LOCATION_FLAVORS["wasteland"])
    pairs   = select_npc_pairs(npcs, max_pairs=max_conversations)

    conversations = []
    for npc_a, npc_b in pairs:
        topic_key  = random.choice(flavors)
        topic_seed = TOPIC_SEEDS.get(topic_key, topic_key)

        prompt = build_conversation_prompt(
            npc_a, npc_b, location, location_type, world_events, topic_seed
        )

        # Try AI generation
        raw = None
        if ai_engine == "ollama":
            raw = generate_with_ollama(prompt)
        elif ai_engine == "gemini" and gemini_api_key:
            raw = generate_with_gemini(prompt, gemini_api_key)

        if raw:
            lines = parse_conversation(raw, npc_a.get("npc_name","A"), npc_b.get("npc_name","B"))
        else:
            lines = get_fallback_conversation(
                npc_a.get("npc_name","Settler"),
                npc_b.get("npc_name","Guard")
            )

        if lines:
            conv = {
                "conversation_id": f"conv_{int(time.time())}_{random.randint(1000,9999)}",
                "location": location,
                "location_type": location_type,
                "topic": topic_key,
                "npc_a_id": npc_a.get("npc_id",""),
                "npc_a_name": npc_a.get("npc_name",""),
                "npc_b_id": npc_b.get("npc_id",""),
                "npc_b_name": npc_b.get("npc_name",""),
                "lines": lines,
                "generated_at": datetime.datetime.now().isoformat(),
                "ai_generated": raw is not None,
                "delivered": False,
            }
            conversations.append(conv)

            # Store in dialogue history
            _store_conversation_history(conv)

    result = {
        "version": "1.0",
        "location": location,
        "generated_at": datetime.datetime.now().isoformat(),
        "conversations": conversations,
        "ready": True,
    }

    # Write to file for Papyrus to read
    with open(CONVERSATION_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"[Conv] Generated {len(conversations)} conversations for {location}")
    return result

def _store_conversation_history(conv: dict):
    """Persist generated conversation to the Mossy memory store so NPCs remember it."""
    lines_for_store = [
        {"speaker": line.get("speaker_name", "?"), "text": line.get("line", "")}
        for line in conv.get("lines", [])
    ]
    save_npc_conversation(
        npc_a_id=conv.get("npc_a_id", ""),
        npc_a_name=conv.get("npc_a_name", ""),
        npc_b_id=conv.get("npc_b_id", ""),
        npc_b_name=conv.get("npc_b_name", ""),
        location=conv.get("location", ""),
        topic=conv.get("topic", ""),
        lines=lines_for_store,
    )

def mark_conversation_delivered(conversation_id: str):
    """Mark a conversation as delivered after Papyrus confirms playback."""
    try:
        with open(CONVERSATION_FILE, "r") as f:
            data = json.load(f)
        for conv in data.get("conversations", []):
            if conv["conversation_id"] == conversation_id:
                conv["delivered"] = True
        with open(CONVERSATION_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[Conv] Mark delivered error: {e}")

def get_pending_conversations() -> list:
    """Get conversations that haven't been delivered yet."""
    try:
        if not CONVERSATION_FILE.exists():
            return []
        with open(CONVERSATION_FILE, "r") as f:
            data = json.load(f)
        return [c for c in data.get("conversations", []) if not c.get("delivered")]
    except Exception:
        return []
