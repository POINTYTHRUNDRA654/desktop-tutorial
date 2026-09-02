# Fallout 4 Advanced AI Plugin Author Guide

This guide defines the local HTTP plugin protocol used by `src/main.py` for mod compatibility patches and enhancements.

## Enable plugin hooks

In `Data/F4AI/config.json`:

```json
{
  "enable_plugin_hooks": 1,
  "plugin_endpoints": [
    "http://127.0.0.1:8770/f4ai/plugin"
  ]
}
```

## Event envelope

All requests are POSTed as:

```json
{
  "event": "pre_dialogue",
  "payload": { }
}
```

## `pre_dialogue`

### Incoming payload

- `npc_name`
- `location`
- `player_speech`
- `history`
- `system_prompt`

### Optional response keys (patch inputs before generation)

- `npc_name`
- `location`
- `player_speech`
- `system_prompt_append`

Use this for:
- mod-specific lore constraints
- location-aware behavior
- faction/mod compatibility tags

## `post_dialogue`

### Incoming payload

- `npc_name`
- `location`
- `player_speech`
- `npc_response`
- `emotion_id`

### Optional response keys (patch generated output)

- `npc_response`

Use this for:
- style filters
- profanity/consistency guardrails
- compatibility rewrites for other quest/dialogue mods

## Mossy endpoint coexistence

`enable_mossy_bridge` can run alongside plugin hooks. Mossy can provide full response generation, while plugin hooks can still patch `pre_dialogue` and `post_dialogue` phases.

## Free/offline requirement

Plugin endpoints are intended for free, local services. Avoid paid/cloud-only dependencies to preserve the offline design target.
