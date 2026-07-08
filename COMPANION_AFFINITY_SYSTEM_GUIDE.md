# Companion / Follower Affinity & Relationship System

A DLC-tier companion has to **react to what the player does**. Vanilla Fallout 4 builds this from the **Story Manager**, a **companion quest**, and **Papyrus** — not a single checkbox. This guide covers the moving parts.

## The pieces
1. **Companion NPC** — an `NPC_` with a follow package, added to the companion/follower faction and to a quest alias.
2. **Companion quest (`QUST`)** — holds the affinity logic, the reaction dialogue, and the aliases. Use the vanilla **Piper** or **Cait** companion quests as working templates.
3. **Affinity value** — a global or quest variable that goes up and down.
4. **Story Manager event nodes** — the game-wide event bus that tells your quest "the player just did X."

## How affinity flows
- The player performs an action: a kill, a lockpick, a hack, a location discovery, a specific dialogue choice, donating to the poor, etc.
- A **Story Manager event node** (e.g. Location Change, Actor Dialogue, Quest event) fires and starts/updates your companion quest.
- Your **Papyrus** raises or lowers the affinity value, then plays a **"likes that"** or **"dislikes that"** idle line plus reaction dialogue.

## Relationship rank
The **relationship** between the companion NPC and `PlayerRef` moves through ranks — **Acquaintance → Friend → Confidant → Ally → Lover**. Rank gates dialogue conditions and, at the top, unlocks the **companion perk**.

## Romance
- Flag the companion as **romanceable**.
- When affinity reaches the highest tier, trigger a **romance scene**; success grants the **Lover's Embrace** well-rested XP bonus.

## Minimum dialogue you must author
- Recruit / "travel with me" branch.
- **Dismiss** and **wait** branches (players get stuck without these).
- Like / dislike reaction lines keyed to affinity thresholds.
- Rank-up conversations (the "let's talk" personal quest beats).

## Common mistakes
- Affinity events **not registered** with the Story Manager → nothing ever changes.
- NPC not added to the **follower/companion faction** or the quest **alias** → commands and affinity break.
- Missing **dismiss/wait** dialogue → the companion cannot be managed.
- Forgetting to fill the companion's **package stack** so it actually follows and sandboxes.

## Related
See: `QUEST_SCRIPTING_GUIDE`, `ACTOR_AND_NPC_SCRIPTING_GUIDE`, `ALIAS_SYSTEM_DEEP_DIVE`, `PAPYRUS_EVENTS_AND_ACTIONS_GUIDE`.
