# Mossy's Knowledge & Brain Data

This directory contains exported versions of Mossy's learned knowledge and brain data, automatically synced to GitHub whenever you push.

## What's Here

### `mossy-knowledge/`
- **`knowledge-vault.json`** — All user-added knowledge entries from the Memory Vault. This includes custom modding tips, solutions, and information you've taught Mossy during sessions.
- **`export-metadata.json`** — Timestamp and export information

### `mossy-brain-data/`
- **`MossyBrain.ts`** — Mossy's system instructions, knowledge base sections, and AI behavior definitions
- **`training-dataset.jsonl`** — Fine-tuning training pairs (if using the NVIDIA edition with fine-tuning enabled)
- **`export-metadata.json`** — Export timestamp and versioning info

## How It Works

The `pre-push` git hook automatically:
1. Exports your local Mossy knowledge vault from your user data
2. Copies MossyBrain.ts (which contains all her instructions)
3. Exports any fine-tuning training data
4. Stages the files for commit before your push completes

**This happens automatically** — you don't need to do anything. Every time you push to GitHub, Mossy's latest knowledge is included.

## GitHub Stays in Sync

Now when you:
- **Collaborate with others** — They can see Mossy's accumulated knowledge
- **Deploy to a new system** — The knowledge is preserved in Git history
- **Roll back changes** — You can restore Mossy's brain from any previous Git state

## Privacy & Security

- Only **local knowledge** (from your Mossy instance) is exported
- Chat history and private projects are **not** included
- Settings and credentials are **never** exported
- You can `.gitignore` these directories if you prefer not to share

## Restoring Knowledge

To restore Mossy's knowledge from a previous Git state:

```bash
# Check out the knowledge from a specific commit
git checkout <commit-hash> -- external/mossy-knowledge/ external/mossy-brain-data/

# Manually copy the knowledge-vault.json back to your Mossy userData:
# cp external/mossy-knowledge/knowledge-vault.json ~/AppData/Local/Mossy/userData/
```

## Updating Knowledge

Every time you:
- Add entries to the Memory Vault in Mossy
- Update system instructions
- Run fine-tuning on the NVIDIA edition
- Push to GitHub

...Mossy's brain is automatically exported and committed.
