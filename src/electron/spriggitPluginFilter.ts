/**
 * Pure helpers for Spriggit plugin filtering.
 *
 * Extracted from main.ts so they can be unit-tested without Electron or the
 * file-system.  All functions are pure (no I/O, no side-effects).
 */

/**
 * The set of official Bethesda Fallout 4 ESM files.
 *
 * Used in two modes:
 *  - Custom-mod digest: these are SKIPPED so only user mods are serialized.
 *  - Vanilla digest (vanillaOnly): ONLY these files are serialized so Mossy
 *    learns the exact base-game records, FormIDs, and script structure.
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
 * Used for the custom-mod digest path.
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
 * Preferred processing order for vanilla ESMs.
 *
 * Fallout4.esm is placed first because it contains the entire base-game record
 * set and is the most valuable file for the knowledge-vault brain boost.
 * Putting it first ensures it is serialised before the early-exit crash
 * threshold fires (which would otherwise skip it when DLC files fail first due
 * to alphabetical ordering — 'D' sorts before 'F').
 *
 * DLC files follow in ascending size order so that the smaller Workshop ESMs
 * complete quickly; if the user's environment is broken and all serialisations
 * fail, the early-exit fires after the first three consecutive crashes
 * regardless of order, but at least Fallout4.esm will have been attempted.
 */
const VANILLA_PLUGIN_PRIORITY: ReadonlyArray<string> = [
  'fallout4.esm',
  'dlcworkshop01.esm',  // Wasteland Workshop  (smallest DLC, approx. size varies by version)
  'dlcworkshop02.esm',  // Contraptions Workshop
  'dlcworkshop03.esm',  // Vault-Tec Workshop
  'dlcrobot.esm',       // Automatron
  'dlccoast.esm',       // Far Harbor          (larger DLC)
  'dlcnukaworld.esm',   // Nuka-World           (largest DLC, approx. size varies by version)
];

/**
 * Given the raw list of plugin filenames found in the Data folder, returns
 * ONLY the vanilla/DLC ESMs together with a count of how many custom plugins
 * were skipped.
 * Used for the vanilla-brain-boost digest path.
 *
 * The returned list is sorted so that Fallout4.esm comes first (to give the
 * most-valuable file the best chance before any early-exit threshold fires)
 * and DLC files follow in ascending size order.
 */
export function filterVanillaPluginsOnly(allPluginFiles: string[]): {
  pluginFiles: string[];
  skippedCustomCount: number;
} {
  const matched = allPluginFiles.filter(f => isVanillaPlugin(f));
  const skippedCustomCount = allPluginFiles.length - matched.length;

  // Sort by the preferred priority order, falling back to the original
  // filesystem order for any files not listed in VANILLA_PLUGIN_PRIORITY
  // (should not happen for a standard install, but safe to handle).
  const priorityIndex = (name: string): number => {
    const idx = VANILLA_PLUGIN_PRIORITY.indexOf(name.toLowerCase());
    return idx === -1 ? VANILLA_PLUGIN_PRIORITY.length : idx;
  };
  const pluginFiles = matched.slice().sort(
    (a, b) => priorityIndex(a) - priorityIndex(b),
  );

  return { pluginFiles, skippedCustomCount };
}

/**
 * Build the error string for the "nothing to serialize" early-exit in custom-mod mode,
 * choosing between a "folder is empty" message and a "only vanilla ESMs found" message.
 */
export function buildNoPluginsError(allPluginFiles: string[]): string {
  if (allPluginFiles.length === 0) {
    return 'No plugin files (.esp/.esm/.esl) found in the Data folder.';
  }
  return (
    'Only vanilla/DLC Fallout 4 plugins were found in the Data folder.\n' +
    'The Spriggit digest is designed to learn your custom mods — Mossy already has built-in knowledge of the base game and official DLC.\n\n' +
    '💡 Using Mod Organizer 2 (MO2)? MO2 uses a virtual file system — your mods are NOT stored in the actual Data folder. ' +
    'To use this feature you would need to run the serialize step from inside MO2, or deploy your mods to the Data folder first.\n\n' +
    '💡 Using Vortex? Vortex deploys mods directly to the Data folder. ' +
    'If you have mods enabled in Vortex, make sure they are fully deployed, then try again.\n\n' +
    'If you have custom mods installed another way, point to the folder that contains your .esp/.esm/.esl files and try again.'
  );
}

/**
 * Build the error string for the "nothing to serialize" early-exit in vanilla-only mode,
 * i.e. the user's Data folder contained no recognised Bethesda ESMs.
 */
export function buildNoVanillaPluginsError(allPluginFiles: string[]): string {
  if (allPluginFiles.length === 0) {
    return 'No plugin files (.esp/.esm/.esl) found in the Data folder.';
  }
  return (
    'No vanilla Fallout 4 ESMs (Fallout4.esm, DLC files) were found in this folder.\n' +
    'Make sure you are pointing to your Fallout 4 Data folder ' +
    '(e.g. C:\\Steam\\steamapps\\common\\Fallout 4\\Data).\n\n' +
    'The expected files are: Fallout4.esm, DLCCoast.esm (Far Harbor), ' +
    'DLCNukaWorld.esm, DLCRobot.esm (Automatron), DLCWorkshop01-03.esm.'
  );
}
