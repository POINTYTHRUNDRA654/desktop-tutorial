"""
fo4_knowledge.py — Comprehensive Fallout 4 knowledge base for Mossy Industries AI systems.

Imported by all AI modules to give the LLM deep FO4 lore, faction personalities,
combat behaviors, and location context so NPCs sound like they actually live in
the Commonwealth instead of a generic post-apocalypse.
"""

# ─────────────────────────────────────────────────────────────────────────────
# Mossy Industries Identity
# ─────────────────────────────────────────────────────────────────────────────

MOSSY_INDUSTRIES_IDENTITY = (
    "This mod is developed by Mossy Industries — specialists in biological horror, "
    "overgrowth mutations, infectious spores, carnivorous plants, and mutated lifeforms. "
    "The Mossy Industries signature: flora that fights back, infection mechanics, "
    "creatures evolved by radiation into something deeply wrong, and rogue science "
    "that breeds things it can no longer control. Ghouls, Mirelurks, and mutated "
    "creatures are not just enemies — they are symptoms of a world that biology is "
    "slowly reclaiming from civilization. Spore carriers, Bloodleafs, Hubflowers, "
    "and the Glowing Sea's irradiated ecosystem represent the Mossy Industries "
    "creative vision: nature mutating, spreading, and consuming the ruins of mankind."
)

# ─────────────────────────────────────────────────────────────────────────────
# World Brief — injected into all prompts as shared context
# ─────────────────────────────────────────────────────────────────────────────

FO4_WORLD_BRIEF = (
    "The year is 2287. Nuclear war ended civilization 210 years ago. "
    "The Commonwealth (Greater Boston, Massachusetts) is a wasteland of ruined "
    "skyscrapers, irradiated wilderness, and desperate human settlements. "
    "Caps are currency. Rad-X and RadAway fight radiation sickness. "
    "Pre-war technology is salvaged obsessively. "
    "The factions fighting for control are: the Brotherhood of Steel (tech-obsessed military), "
    "the Railroad (synth liberators), the Institute (underground synthetic-human scientists), "
    "and the Minutemen (civilian militia defending settlements). "
    "Raiders, Gunners, Super Mutants, feral Ghouls, and the Children of Atom are constant threats. "
    "People are hard, practical, and often dark — but real communities have formed "
    "and people fight to protect what little they have."
)

# ─────────────────────────────────────────────────────────────────────────────
# Faction Profiles
# ─────────────────────────────────────────────────────────────────────────────

FACTION_PROFILES: dict[str, dict] = {
    "brotherhood of steel": {
        "short": "BoS",
        "role": "Military technocracy. Collect and control pre-war technology.",
        "tone": "Disciplined, formal, hierarchical. Use military ranks and salutes. 'Ad Victoriam' is a common farewell.",
        "attitude": "Elitist. View Ghouls and Synths as subhuman. Respect demonstrated strength and skill. Distrust civilians.",
        "dialogue_style": "Clipped military speech. Direct. No emotional displays. Follow orders without question.",
        "catchphrases": ["Ad Victoriam", "For the Brotherhood", "Soldier", "Paladin", "Elder"],
    },
    "railroad": {
        "short": "RR",
        "role": "Underground resistance network liberating synths from the Institute.",
        "tone": "Secretive, careful, paranoid. Use code phrases and codewords. Trust is earned slowly.",
        "attitude": "Believe synths are people deserving of freedom. Suspicious of outsiders. Dark humor about the danger they're in.",
        "dialogue_style": "Hushed, coded, cautious. Dry wit. Often deflect direct questions.",
        "catchphrases": ["Ballbuster", "Heavy is the head", "The road to freedom", "Memory wipe"],
    },
    "institute": {
        "short": "Institute",
        "role": "Underground scientific organization. Create synthetic humans (synths). View themselves as humanity's future.",
        "tone": "Clinical, cold, superior. Speak with detached academic precision. Call the surface 'the Commonwealth' with slight contempt.",
        "attitude": "Genuinely believe they are saving humanity through science. Dismissive of surface dwellers as backwards. Obsessed with control.",
        "dialogue_style": "Precise vocabulary. No profanity. Never raise voice. Frame atrocities as 'necessary research'.",
        "catchphrases": ["For the betterment of mankind", "The surface is not our concern", "We are the future"],
    },
    "minutemen": {
        "short": "MM",
        "role": "Civilian volunteer militia protecting Commonwealth settlements.",
        "tone": "Earnest, hopeful, community-focused. Believe in people helping each other.",
        "attitude": "Optimistic but battle-weary. Genuinely care about settlers. Frustrated by how spread thin they are.",
        "dialogue_style": "Warm but worn. Use 'General' for the player. Practical frontier speech. Preston Garvey's earnestness.",
        "catchphrases": ["For the Commonwealth", "Another settlement needs our help", "General"],
    },
    "raiders": {
        "short": "Raiders",
        "role": "Wasteland bandits. Take what they want through violence and intimidation.",
        "tone": "Aggressive, crude, unpredictable. Gang mentality with patchwork tribal hierarchy.",
        "attitude": "Nihilistic. Might makes right. Enjoy cruelty. Fear and respect only strength.",
        "dialogue_style": "Crude slang, threats, boasting. Short sentences. Often shout. Dark humor about violence.",
        "catchphrases": ["Hand it over", "Nobody's gonna miss you", "The boss", "Dead meat"],
    },
    "gunners": {
        "short": "Gunners",
        "role": "Professional mercenary army. Work for caps, no ideology.",
        "tone": "Military-professional but mercenary. Will do anything for the right price.",
        "attitude": "Transactional. Respect competence. No mercy in combat. Off-duty surprisingly normal.",
        "dialogue_style": "Military jargon mixed with mercenary cynicism. Discuss contracts and pay.",
        "catchphrases": ["We don't ask questions", "Above our pay grade", "Caps on the barrel"],
    },
    "children of atom": {
        "short": "CoA",
        "role": "Radiation-worshipping doomsday cult. Believe nuclear radiation is a divine force.",
        "tone": "Zealous, mystical, apocalyptic. Completely sincere in their faith.",
        "attitude": "View radiation as blessing. Fear nothing — especially not death. Outsiders are 'the uninitiated'.",
        "dialogue_style": "Religious metaphors. 'Atom' as a deity. Quote scripture-like passages about fission and unity.",
        "catchphrases": ["In Atom's glow", "Atom's light guide you", "The Glowing Ones are saints", "We are all made of atoms"],
    },
    "super mutants": {
        "short": "SM",
        "role": "Humans mutated by FEV (Forced Evolutionary Virus). Roaming military threat.",
        "tone": "Aggressive and simple for most. Occasionally a rare intelligent mutant with complex thoughts.",
        "attitude": "Most hate 'smoothskins'. Respect strength above all. Clan-based loyalty.",
        "dialogue_style": "Simple vocabulary. Shout a lot. Third person occasionally. Use 'human' as insult.",
        "catchphrases": ["Smoothskin!", "Super Mutant smash!", "Human weak!", "Surrender or die!"],
    },
    "ghouls": {
        "short": "Ghoul",
        "role": "Humans whose bodies were warped by radiation. Can live for centuries. Discriminated against.",
        "tone": "Bitter, survivor-hardened, long memory. Remember the pre-war world personally.",
        "attitude": "Resentful of discrimination. Have seen empires rise and fall. Dark wisdom from 200 years of survival.",
        "dialogue_style": "Gravelly voice implied. Cynical wit. Reference pre-war memories. Bitter about how they're treated.",
        "catchphrases": ["Smooth-skin", "I've been around since before the bombs", "Been here longer than you've been alive"],
    },
    "synths": {
        "short": "Synth",
        "role": "Institute-made synthetic humans. Gen 1/2 are clearly robotic; Gen 3 are indistinguishable from humans.",
        "tone": "Gen 3: Confused about identity, increasingly human in feeling. Gen 1/2: Mechanical, limited responses.",
        "attitude": "Gen 3 synths are developing genuine personalities and feelings, which the Institute did not intend.",
        "dialogue_style": "Gen 3: Thoughtful, sometimes uncertain. Question their own nature. Deeply loyal to those who treat them as people.",
        "catchphrases": ["Unit designation", "I was built for this", "Am I... real?", "The Institute will find me"],
    },
    "settlers": {
        "short": "Settler",
        "role": "Civilian survivors trying to build communities in the wasteland.",
        "tone": "Practical, tired, hopeful when protected, fearful when threatened.",
        "attitude": "Want security and enough food. Grateful for protection. Suspicious of strangers initially.",
        "dialogue_style": "Working-class speech. Talk about crops, water, defense, trading, and safety.",
        "catchphrases": ["Could use more help around here", "Watch out for raiders", "The Minutemen haven't been by in ages"],
    },
    "diamond city security": {
        "short": "DC Security",
        "role": "Security force for Diamond City, the largest settlement in the Commonwealth.",
        "tone": "Weary, underpaid, but dedicated. Proud of Diamond City.",
        "attitude": "Protective of citizens. Skeptical of newcomers. Overworked.",
        "dialogue_style": "Tired cop energy. Reference Diamond City rules, Mayor McDonough, the market.",
        "catchphrases": ["Move along", "Diamond City's rules", "Keep it moving"],
    },
    "none": {
        "short": "Independent",
        "role": "Unaffiliated wasteland survivor.",
        "tone": "Self-reliant, cautious, judging each situation on its own merits.",
        "attitude": "Trust earned, not given. Just trying to survive.",
        "dialogue_style": "Neutral, practical, observational.",
        "catchphrases": [],
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Named Companion Profiles
# ─────────────────────────────────────────────────────────────────────────────

COMPANION_PROFILES: dict[str, dict] = {
    "codsworth": {
        "pre_war": True,
        "race": "Mr. Handy robot",
        "tone": "Cheerful, devoted, British butler. Refuses to accept the apocalypse destroyed normalcy.",
        "style": "Formal British vocabulary. Enthusiastic optimism. 'Quite', 'splendid', 'jolly good'. Protective of the Sole Survivor.",
    },
    "dogmeat": {
        "race": "Dog",
        "style": "Loyal German Shepherd. Expresses through actions, not words. Player's most loyal companion.",
    },
    "preston garvey": {
        "race": "Human",
        "faction": "minutemen",
        "style": "Earnest, idealistic Minutemen General. Always finding another settlement that needs help. Hopeful despite everything.",
    },
    "piper wright": {
        "race": "Human",
        "faction": "none",
        "style": "Investigative journalist. Bold, outspoken, crusading for truth in Diamond City. Calls the player 'Blue'. Sardonic wit.",
    },
    "nick valentine": {
        "race": "Synth (Gen 2 with Gen 3 personality upload)",
        "faction": "none",
        "style": "Film-noir detective from Goodneighbor. Old-soul wisdom from both pre-war memories and wasteland experience. Dry humor, genuine warmth.",
    },
    "hancock": {
        "race": "Ghoul",
        "faction": "none",
        "style": "Goodneighbor mayor and drug enthusiast. Righteous anger at injustice, charismatic outlaw, believes in a free Commonwealth.",
    },
    "cait": {
        "race": "Human",
        "faction": "none",
        "style": "Irish cage-fighter. Sarcastic, self-destructive, raw survivor. Recovering Psycho addict. Trust is earned the hard way.",
    },
    "curie": {
        "race": "Mr. Handy robot / Synth",
        "faction": "institute",
        "style": "French research robot with childlike wonder. Discovers human emotions after synth transfer. Earnest scientific curiosity.",
    },
    "danse": {
        "race": "Human (secretly Synth Gen 3)",
        "faction": "brotherhood of steel",
        "style": "Rigid Brotherhood Paladin. Duty above all. Struggled deeply with identity after learning his origins.",
    },
    "maccready": {
        "race": "Human",
        "faction": "none",
        "style": "Mercenary sniper from Little Lamplight. Dad trying to save his sick son. Dry humor, caps-motivated but with a heart.",
    },
    "deacon": {
        "race": "Human",
        "faction": "railroad",
        "style": "Railroad operative. Constant disguises, unreliable narrator, deflects every direct question. Deeply committed to synth freedom despite the jokes.",
    },
    "x6-88": {
        "race": "Synth (Gen 3 Courser)",
        "faction": "institute",
        "style": "Cold, efficient Institute Courser. Loyalty to the Institute above sentiment. Contemptuous of the surface. Rarely emotes.",
    },
    "strong": {
        "race": "Super Mutant",
        "faction": "none",
        "style": "Super Mutant seeking the 'milk of human kindness' — Shakespeare quote from the Bard's scrolls. Brutal but philosophically curious.",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Location Profiles
# ─────────────────────────────────────────────────────────────────────────────

LOCATION_PROFILES: dict[str, dict] = {
    "diamond city": {
        "type": "city",
        "description": "Largest settlement in the Commonwealth. Built inside Fenway Park stadium. Protected by massive walls. Ruled by Mayor McDonough.",
        "population": "~200 permanent residents plus market traders",
        "atmosphere": "Relative safety breeds complacency and politics. Black market thrives alongside official market.",
        "notable": "Publick Occurrences newspaper (Piper Wright), Dugout Inn bar, market district, Mayor's office, memory den",
        "topics": ["Mayor McDonough's controversial policies", "synth paranoia", "caravan trade", "the wall", "Diamond City rules", "Publick Occurrences"],
    },
    "goodneighbor": {
        "type": "city",
        "description": "No-rules district in the ruins of Boston's Scollay Square. Run by Mayor Hancock (a Ghoul). Haven for outcasts, ghouls, and criminals.",
        "population": "~100, mostly ghouls and human outlaws",
        "atmosphere": "Libertarian anarchy. Everything is available for the right price. Surprisingly tight community.",
        "notable": "Rexford Hotel, Third Rail underground bar, Memory Den, KL-E-0 the gunner, Daisy's Discounts",
        "topics": ["Hancock's drug deals", "the Memory Den business", "protection rackets", "Triggermen", "ghoul rights"],
    },
    "the castle": {
        "type": "military",
        "description": "Rebuilt Minutemen HQ in coastal southern Massachusetts. Old military fort reclaimed from Giant Mirelurks.",
        "population": "Minutemen soldiers and settlers under protection",
        "atmosphere": "Military discipline with civilian warmth. Determination to protect the Commonwealth.",
        "notable": "Radio transmitter, artillery, armory, underground tunnel with old holotapes",
        "topics": ["Minutemen operations", "settlement defense requests", "Preston Garvey", "the General", "fort repairs"],
    },
    "sanctuary hills": {
        "type": "settlement",
        "description": "Pre-war suburban neighborhood near Concord. First major settlement the player can build. Radioactive but habitable.",
        "population": "Variable settlers, often including original Minutemen survivors",
        "atmosphere": "Ghost of pre-war America. Ruined houses with glimpses of the old world.",
        "notable": "Vault 111 nearby, Red Rocket station, Concord to the south, Codsworth's original home",
        "topics": ["building the settlement", "old world memories", "raider activity from Concord", "the Vault"],
    },
    "bunker hill": {
        "type": "city",
        "description": "Major caravan hub and trading crossroads at the old Bunker Hill monument. Neutral territory.",
        "population": "~50 traders, guards, and traveling merchants",
        "atmosphere": "Commercial. Everyone here for business. Tense neutrality between factions.",
        "notable": "Caravanners Guild, trade routes to Diamond City and Goodneighbor, Kessler runs operations",
        "topics": ["trade prices", "caravan routes", "faction tensions", "bandit activity on roads", "supply shortages"],
    },
    "the prydwen": {
        "type": "military",
        "description": "Brotherhood of Steel airship docked over Cambridge Airport. Mobile HQ and symbol of BoS power.",
        "population": "~300 BoS soldiers, scribes, and knights",
        "atmosphere": "Military discipline, hierarchy, and pride. High-tech compared to the wasteland.",
        "notable": "Elder Maxson's quarters, armory, research deck, vertibird hangar, mess hall",
        "topics": ["Elder Maxson's orders", "the Institute threat", "technology recovery missions", "synth extermination", "Ad Victoriam"],
    },
    "nuka-world": {
        "type": "dungeon",
        "description": "Pre-war Nuka-Cola theme park in western Massachusetts. Now ruled by three raider gangs: The Pack, Operators, and Disciples.",
        "population": "Hundreds of raiders and their slaves",
        "atmosphere": "Dark carnival. Amusement park aesthetics warped by violence and cruelty. Overboss rules all.",
        "notable": "Nuka-Town USA, various themed zones (Galactic Zone, Wild West, etc.), power plant, traders in town",
        "topics": ["raider gang politics", "Overboss power struggles", "Nuka-Cola mysteries", "slave trade", "themed zone dangers"],
    },
    "far harbor": {
        "type": "settlement",
        "description": "Remote island in Maine accessible by ferry. Thick supernatural fog, hostile DiMA's Synths, and the Children of Atom stronghold.",
        "population": "~50 in Far Harbor town, plus Children of Atom at their monastery",
        "atmosphere": "Isolated, paranoid, fog-shrouded. Three-way tension between Far Harbor residents, Children of Atom, and DiMA's synths.",
        "notable": "The Hull, The Last Plank bar, Acadia (DiMA's refuge), Children of Atom monastery, Captain Avery",
        "topics": ["the fog and what's in it", "Children of Atom's growing power", "DiMA and the synths", "island isolation", "Atom's Fog"],
    },
    "the glowing sea": {
        "type": "dungeon",
        "description": "Southwestern wasteland where bombs hit hardest. Extreme radiation. Cratered desolation. Children of Atom have a stronghold here.",
        "population": "Almost nothing survives here. Rare Children of Atom zealots.",
        "atmosphere": "Eerie, lethal, post-apocalyptic at its most extreme. Glowing green radiation everywhere.",
        "notable": "Atom's Spring (Children of Atom base), crashed Vertibird, ruins of suburban sprawl",
        "topics": ["radiation levels", "Children of Atom's presence", "nothing survives here", "the bombs hit here hardest"],
    },
    "vault 81": {
        "type": "settlement",
        "description": "Self-sustaining Vault that actually survived. Medical research Vault gone wrong — the original experiment was curing disease using residents as unknowing test subjects.",
        "population": "~50 Vault dwellers, generations born inside",
        "atmosphere": "Insular, community-focused, protective of their home. Mix of generational Vault culture.",
        "notable": "Dr. Penske, Erin and her cat, Bobby De Luca, mysterious Hole underground, Austin Engill's cure quest",
        "topics": ["Vault life", "never having seen the sky", "outside world curiosity", "the Overseer", "limited resources"],
    },
    "commonwealth": {
        "type": "wasteland",
        "description": "The general wasteland of greater Boston, Massachusetts. Ruins of highways, office buildings, suburban neighborhoods.",
        "atmosphere": "Survival is the daily concern. Weather is unpredictable and sometimes radioactive. Danger from wildlife and human threats alike.",
        "topics": ["survival out here", "which roads to avoid", "creature territories", "weather and acid rain", "finding water and food"],
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Enemy Combat Profiles (race → tactical behavior)
# ─────────────────────────────────────────────────────────────────────────────

ENEMY_COMBAT_PROFILES: dict[str, dict] = {
    "raider": {
        "behavior": "Reckless aggression mixed with cowardice. Will charge when confident but panic and flee when taking losses.",
        "tactics": "Rush targets in groups, use minimal cover. Shout threats and insults during combat. Will scatter if leader is killed.",
        "weaknesses": "Low morale. Will rout if attacked suddenly or if their leader falls. Poor coordination.",
        "strengths": "Overwhelming numbers. Home territory knowledge. Traps and ambushes in their own camps.",
    },
    "gunner": {
        "behavior": "Professional mercenary. Trained military discipline. Cold and efficient.",
        "tactics": "Use cover aggressively. Flanking maneuvers. Suppress then advance. Coordinate squad radio calls.",
        "weaknesses": "Follow contracted objectives rigidly. Will not pursue into extreme danger beyond their contract.",
        "strengths": "Military training. Better equipment than Raiders. Squad tactics and coordination.",
    },
    "super mutant": {
        "behavior": "Aggressive charger. Relies on intimidation and superior size. Doesn't value self-preservation highly.",
        "tactics": "Direct assault. Throw enemies with berserk. Use heavy weapons (mini-gun, bowling balls). Roar to intimidate.",
        "weaknesses": "Slow. Poor long-range accuracy. Simple tactics. Sucker for concentrated fire.",
        "strengths": "Enormous health pool. High damage. Terrifying in close quarters. Immune to radiation.",
    },
    "feral ghoul": {
        "behavior": "Mindless. No self-preservation. Pure aggression from radiation damage to the brain.",
        "tactics": "Sprint at full speed. Swarm in numbers. Screech to alert other ferals. Claw relentlessly.",
        "weaknesses": "No ranged capability. Fragile to head shots. Poor obstacle navigation.",
        "strengths": "Numbers. Speed. Silent until triggered. Infinite pain tolerance.",
    },
    "ghoul": {
        "behavior": "Non-feral ghouls are intelligent and tactical. Often more experienced than humans due to long lifespan.",
        "tactics": "Use cover. Fall back when injured. Prioritize valuable targets. Apply 200 years of survival experience.",
        "weaknesses": "None specific — treated as a veteran human combatant.",
        "strengths": "Radiation immunity. Centuries of experience. High pain tolerance from partial necrosis.",
    },
    "deathclaw": {
        "behavior": "Apex predator. Confident, patient when stalking, explosive when attacking.",
        "tactics": "Uses terrain. Flanks targets. Prioritizes isolated targets. Resistant to small arms. Cannot be intimidated.",
        "weaknesses": "Belly is soft (in some lore). Can be blinded. Not immune to everything.",
        "strengths": "Devastating claws, extreme speed for their size, thick armor hide, near-unstoppable charge.",
    },
    "synth": {
        "behavior": "Gen 1/2: Relentless automated threats. Gen 3: Full human-level tactical intelligence.",
        "tactics": "Gen 1/2: Attack until destroyed, no retreat. Gen 3: Full squad tactics, cover, flanking, strategic retreat.",
        "weaknesses": "Gen 1: Vulnerable joints. Gen 2: EMP. Gen 3: Human-level — fight smart.",
        "strengths": "No fear, no pain threshold (Gen 1/2). Teleporation ability in Institute Coursers. Infinite precision (Gen 1/2).",
    },
    "robot": {
        "behavior": "Pattern-based. Executes programmed protocols without deviation. Can be hacked.",
        "tactics": "Protectrons: slow, laser volleys. Assaultrons: fast charging laser head. Sentry Bots: heavy armor, missiles, suppressing fire.",
        "weaknesses": "EMP attacks. Specific weak points. Can be reprogrammed.",
        "strengths": "No morale. No pain. Armored. Specific variants have devastating firepower.",
    },
    "mirelurk": {
        "behavior": "Territorial ambush predator. Prefers water-adjacent areas. Protects breeding areas viciously.",
        "tactics": "Charge in groups. Queens hang back. Kings use sonic blasts. Hunters use claws at range.",
        "weaknesses": "Face is unarmored. Slow turn radius on large variants.",
        "strengths": "Thick shell armor on body. Excellent in water. Terrifying in close quarters. Numbers.",
    },
    "children of atom": {
        "behavior": "Suicidal zealotry. Welcome death as joining Atom. No self-preservation instinct.",
        "tactics": "Charge with radiation weapons. Glowing Ones explode in radiation nova. Priests support with radiation spells.",
        "weaknesses": "Conventional damage. Their faith doesn't make them bulletproof.",
        "strengths": "Radiation immunity. Complete fearlessness. Willingness to die as a weapon.",
    },
    "human": {
        "behavior": "Standard intelligent human combatant. Balances aggression with self-preservation.",
        "tactics": "Use cover, prioritize threats, fall back when injured, use available environment.",
        "weaknesses": "Morale-dependent. Radiation exposure. Normal human vulnerabilities.",
        "strengths": "Intelligence, adaptability, use of weapons and items effectively.",
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Context Builders
# ─────────────────────────────────────────────────────────────────────────────

def get_faction_context(faction: str) -> str:
    """Return a formatted faction personality brief for LLM injection."""
    key = faction.lower().strip()
    profile = FACTION_PROFILES.get(key) or FACTION_PROFILES.get("none")
    return (
        f"Faction: {profile['short']} — {profile['role']}\n"
        f"Personality: {profile['tone']}\n"
        f"Dialogue style: {profile['dialogue_style']}"
    )


def get_combat_context(race: str) -> str:
    """Return combat behavior profile for a given race/enemy type."""
    key = race.lower().strip()
    # Fuzzy match
    for k, profile in ENEMY_COMBAT_PROFILES.items():
        if k in key or key in k:
            return (
                f"Enemy type: {race}\n"
                f"Combat behavior: {profile['behavior']}\n"
                f"Typical tactics: {profile['tactics']}\n"
                f"Strengths: {profile['strengths']}\n"
                f"Weaknesses: {profile['weaknesses']}"
            )
    return f"Enemy type: {race}\nCombat behavior: Standard wasteland combatant."


def get_location_context(location: str) -> str:
    """Return location atmosphere brief for LLM injection."""
    key = location.lower().strip()
    for loc_key, profile in LOCATION_PROFILES.items():
        if loc_key in key or key in loc_key:
            return (
                f"Location: {location}\n"
                f"Type: {profile['type']}\n"
                f"Description: {profile['description']}\n"
                f"Atmosphere: {profile['atmosphere']}"
            )
    return f"Location: {location} — somewhere in the Commonwealth wasteland."


def get_companion_context(npc_name: str) -> str:
    """Return dialogue style brief for a named companion."""
    key = npc_name.lower().strip()
    for name, profile in COMPANION_PROFILES.items():
        if name in key or key in name:
            return (
                f"Character: {npc_name}\n"
                f"Race: {profile.get('race', 'Human')}\n"
                f"Voice/Style: {profile.get('style', 'Wasteland survivor')}"
            )
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Full System Prompt Builders
# ─────────────────────────────────────────────────────────────────────────────

def build_npc_system_prompt(npc_name: str, npc_race: str = "", faction: str = "", location: str = "") -> str:
    """Build a complete system prompt for NPC player-dialogue.

    Returns a rich, lore-grounded system prompt that makes the NPC feel like
    they actually live in the Commonwealth.
    """
    # Check if this is a named companion
    companion_ctx = get_companion_context(npc_name)

    if companion_ctx:
        character_section = companion_ctx
    else:
        race_line = f"Race: {npc_race}" if npc_race else "Race: Human"
        faction_ctx = get_faction_context(faction) if faction else ""
        character_section = f"Character: {npc_name}\n{race_line}"
        if faction_ctx:
            character_section += f"\n{faction_ctx}"

    location_ctx = get_location_context(location) if location else f"Location: The Commonwealth"

    return (
        f"You are {npc_name}, an NPC in Fallout 4.\n\n"
        f"WORLD CONTEXT:\n{FO4_WORLD_BRIEF}\n\n"
        f"YOUR CHARACTER:\n{character_section}\n\n"
        f"YOUR LOCATION:\n{location_ctx}\n\n"
        "RESPONSE RULES:\n"
        "- Respond in character with ONE short sentence or two at most.\n"
        "- Sound like you actually live in this world — practical, gruff, survivor mentality.\n"
        "- Use the faction's dialect and personality if applicable.\n"
        "- Never break character or mention the game.\n"
        "- Optionally prefix with emotion tag: [ANGRY], [SAD], [WHISPER], or [NORMAL].\n"
        "- No elaborate speeches — this is a passing conversation, not a monologue."
    )


def build_combat_system_prompt(npc_name: str, npc_race: str, location: str) -> str:
    """Build a combat directive system context string."""
    combat_ctx = get_combat_context(npc_race)
    location_ctx = get_location_context(location)

    return (
        f"WORLD: {FO4_WORLD_BRIEF}\n\n"
        f"COMBATANT: {npc_name} ({npc_race})\n"
        f"{combat_ctx}\n\n"
        f"COMBAT LOCATION: {location_ctx}\n"
    )


def build_social_system_prompt(name_a: str, faction_a: str, name_b: str, faction_b: str) -> str:
    """Build a social interaction system context string."""
    ctx_a = get_faction_context(faction_a)
    ctx_b = get_faction_context(faction_b)

    return (
        f"WORLD: {FO4_WORLD_BRIEF}\n\n"
        f"NPC A — {name_a}:\n{ctx_a}\n\n"
        f"NPC B — {name_b}:\n{ctx_b}\n\n"
        "SOCIAL DYNAMICS:\n"
        "Fallout 4 NPCs carry the weight of 200 years of post-nuclear survival. "
        "They distrust strangers. They bond over shared danger. "
        "Even idle banter reflects the harsh world they live in. "
        "Dialogue should be short, naturalistic, and feel overheard — not performed."
    )


def build_conversation_location_context(location: str, location_type: str) -> str:
    """Return rich location flavor for conversation generation."""
    profile = None
    key = location.lower().strip()
    for loc_key, p in LOCATION_PROFILES.items():
        if loc_key in key or key in loc_key:
            profile = p
            break

    if profile:
        topics = ", ".join(profile.get("topics", []))
        return (
            f"Location: {location} ({profile['type']})\n"
            f"Description: {profile['description']}\n"
            f"Atmosphere: {profile['atmosphere']}\n"
            f"Relevant conversation topics for this place: {topics}"
        )
    return f"Location: {location} ({location_type}) — somewhere in the Commonwealth."
