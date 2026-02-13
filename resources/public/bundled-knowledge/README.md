# Bundled Knowledge

This folder contains curated knowledge packs that are bundled with every Mossy installer.

## Structure

- `manifest.json` - Lists all available knowledge packs and their versions
- `*.json` - Individual knowledge pack files

## Adding New Knowledge

1. Export knowledge from Memory Vault using "Export Shared"
2. Copy the JSON file here
3. Update `manifest.json` to include the new pack
4. Rebuild the installer

## Auto-Import

Knowledge packs with `"autoImport": true` in the manifest will be automatically imported on first run.

## Versioning

Each pack has a version number. Mossy tracks which versions have been imported to avoid duplicates.
