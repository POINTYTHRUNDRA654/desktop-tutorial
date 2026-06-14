import CreativeDirectorPanel from './CreativeDirectorPanel';
export { CreativeDirectorPanel };
export default CreativeDirectorPanel;

export const PLUGIN_META = {
  id: 'vault-tec-creative-director',
  name: 'Vault-Tec Creative Director',
  version: '1.0.0',
  backendPort: 8767,
  aiHelperPort: 8766,
  vmlPort: 8768,
} as const;
