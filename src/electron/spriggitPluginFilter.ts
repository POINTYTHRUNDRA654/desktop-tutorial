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
 * Given the raw list of plugin filenames found in the Data folder, returns
 * ONLY the vanilla/DLC ESMs together with a count of how many custom plugins
 * were skipped.
 * Used for the vanilla-brain-boost digest path.
 */
export function filterVanillaPluginsOnly(allPluginFiles: string[]): {
  pluginFiles: string[];
  skippedCustomCount: number;
} {
  const pluginFiles = allPluginFiles.filter(f => isVanillaPlugin(f));
  const skippedCustomCount = allPluginFiles.length - pluginFiles.length;
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
