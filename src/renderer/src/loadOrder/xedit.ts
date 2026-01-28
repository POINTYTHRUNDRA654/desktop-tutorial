import type { Mo2PluginEntry } from './types';

export const generateXEditScriptStub = (plugins: Mo2PluginEntry[]) => {
  const enabled = plugins.filter(p => p.enabled).map(p => p.name);

  // This is intentionally a stub: it gives xEdit a starting point and a consistent patch name.
  // The next iteration will generate rule-based overrides once we add real conflict data.
  const pluginLines = enabled.map(p => `  // - ${p}`).join('\n');

  return (
`unit UserScript;

// Mossy Load Order Lab - xEdit script stub
// Purpose: create an empty conflict resolution patch as a starting point.
// Next: add rules to copy winning overrides for selected records.

function Initialize: integer;
begin
  AddMessage('Mossy: Creating "Mossy Conflict Patch.esp" (stub)');
  AddMessage('Enabled plugins observed:');
${pluginLines ? pluginLines : '  // (none)'}
  AddMessage('NOTE: This script currently only creates a placeholder patch.');
  Result := 0;
end;

end.`);
};
