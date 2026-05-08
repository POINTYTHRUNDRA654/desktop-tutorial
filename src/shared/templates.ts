import type { Template } from './types';

export const readmeTemplate: Template = {
  id: 'tpl_readme_default',
  name: 'Default README',
  type: 'readme',
  content: `# {{MOD_NAME}}\n\nVersion: {{MOD_VERSION}}\n\n## Description\n{{DESCRIPTION}}\n\n## Features\n{{FEATURES}}\n\n## Installation\n{{INSTALLATION_STEPS}}\n\n## Credits\n{{CREDITS}}`,
  variables: [
    { name: 'MOD_NAME', type: 'string', default: 'My Mod', description: 'Name of the mod' },
    { name: 'MOD_VERSION', type: 'string', default: '0.1.0', description: 'Version' },
    { name: 'AUTHOR_NAME', type: 'string', default: 'Author', description: 'Primary author name' },
    { name: 'DESCRIPTION', type: 'string', default: '', description: 'Short description' },
    { name: 'FEATURES', type: 'array', default: [], description: 'List of features' },
    { name: 'REQUIREMENTS', type: 'array', default: [], description: 'Requirements/Dependencies' },
    { name: 'INSTALLATION_STEPS', type: 'array', default: [], description: 'Installation steps' },
    { name: 'CREDITS', type: 'array', default: [], description: 'Credits/authors' },
  ],
};

export const readmeVariables = {
  MOD_NAME: 'My Awesome Mod',
  MOD_VERSION: '1.0.0',
  AUTHOR_NAME: 'Your Name',
  DESCRIPTION: 'This mod adds awesome features...',
  FEATURES: ['Feature 1', 'Feature 2'],
  REQUIREMENTS: ['Fallout 4', 'F4SE'],
  INSTALLATION_STEPS: ['Download', 'Extract', 'Activate'],
  CREDITS: ['Person A', 'Person B'],
};

export const TEMPLATES: Template[] = [readmeTemplate];
export default TEMPLATES;
