import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { BethelIntegration } from '../bethel';

describe('BethelIntegration plugin export support', () => {
  it('collects ESP/ESM/ESL files from a mod directory for packaging', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bethel-plugin-test-'));
    try {
      const modDir = path.join(tempRoot, 'mod');
      fs.mkdirSync(path.join(modDir, 'Data', 'sub'), { recursive: true });
      fs.mkdirSync(path.join(modDir, '.mossy_enhanced'), { recursive: true });

      fs.writeFileSync(path.join(modDir, 'Data', 'MyMod.esp'), 'plugin');
      fs.writeFileSync(path.join(modDir, 'Data', 'sub', 'Patch.esl'), 'plugin');
      fs.writeFileSync(path.join(modDir, 'RootMaster.esm'), 'plugin');
      fs.writeFileSync(path.join(modDir, 'Data', 'textures.dds'), 'texture');
      fs.writeFileSync(path.join(modDir, '.mossy_enhanced', 'Ignored.esp'), 'ignore');

      const bethel = Object.create(BethelIntegration.prototype) as BethelIntegration;
      const pluginFiles = (bethel as any).collectPluginFiles(modDir) as Array<{
        sourcePath: string;
        dataRelativePath: string;
      }>;

      const relativePaths = pluginFiles.map((file) => file.dataRelativePath).sort();
      expect(relativePaths).toEqual(['MyMod.esp', 'RootMaster.esm', 'sub/Patch.esl']);
      expect(relativePaths.some((value) => value.includes('..'))).toBe(false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
