/**
 * Pure helpers for Spriggit plugin filtering.
 *
 * Extracted from main.ts so they can be unit-tested without Electron or the
 * file-system.  All functions are pure (no I/O, no side-effects).
 */

/**
 * The set of official Bethesda Fallout 4 ESM files that Mossy skips during
 * the Spriggit digest.  Reasons for skipping:
 *
 *  1. These files crash Spriggit with exit-code 0xFFFFFFFF in some
 *     AV/extraction configurations, triggering the early-exit heuristic that
 *     synthetically marks every subsequent plugin as failed.
 *  2. Their content is already covered by Mossy's built-in knowledge — there
 *     is no value in adding them to the Knowledge Vault.
 */
export const VANILLA_FO4_PLUGINS = new Set([
  'fallout4.esm',
  'dlccoast.esm',       // Far Harbor
  'dlcnukaworld.esm',   // Nuka-World
  'dlcrobot.esm',       // Automatron
  'dlcworkshop01.esm',  // Wasteland Workshop
  'dlcworkshop02.esm',  // Contraptions Workshop
  'dlcworkshop03.esm',  // Vault-Tec Workshop
]);

/** Returns true when the filename is a known vanilla / official-DLC ESM. */
export const isVanillaPlugin = (filename: string): boolean =>
  VANILLA_FO4_PLUGINS.has(filename.toLowerCase());

/**
 * Given the raw list of plugin filenames found in the Data folder, returns
 * the subset that should be serialized (i.e. non-vanilla plugins) together
 * with a count of how many were skipped.
 */
export function filterPluginsForSpriggit(allPluginFiles: string[]): {
  pluginFiles: string[];
  skippedVanillaCount: number;
} {
  const pluginFiles = allPluginFiles.filter(f => !isVanillaPlugin(f));
  const skippedVanillaCount = allPluginFiles.length - pluginFiles.length;
  return { pluginFiles, skippedVanillaCount };
}

/**
 * Build the error string for the "nothing to serialize" early-exit, choosing
 * between a "folder is empty" message and a "only vanilla ESMs found" message.
 */
export function buildNoPluginsError(allPluginFiles: string[]): string {
  if (allPluginFiles.length === 0) {
    return 'No plugin files (.esp/.esm/.esl) found in the Data folder.';
  }
  return (
    'Only vanilla/DLC Fallout 4 plugins were found in the Data folder.\n' +
    'The Spriggit digest is designed to learn your custom mods — Mossy already has built-in knowledge of the base game and official DLC.\n\n' +
    'To use this feature, make sure your custom .esp/.esm/.esl mod files are present in the Data folder, then try again.'
  );
}
