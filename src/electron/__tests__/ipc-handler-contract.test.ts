import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from '../types';
import {
  IPC_HANDLER_CONTRACT_VERSION,
  REQUIRED_IPC_HANDLER_CHANNELS,
} from '../ipc-required-handlers';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const MAIN_TS_PATH = path.join(REPO_ROOT, 'src/electron/main.ts');

function readRegisteredChannelsFromMainSource(): Set<string> {
  const source = fs.readFileSync(MAIN_TS_PATH, 'utf-8');
  const channels = new Set<string>();

  const addChannel = (literal?: string, constantKey?: string) => {
    if (literal) {
      channels.add(literal);
      return;
    }
    if (constantKey && Object.prototype.hasOwnProperty.call(IPC_CHANNELS, constantKey)) {
      const value = (IPC_CHANNELS as Record<string, string>)[constantKey];
      if (typeof value === 'string' && value.length > 0) {
        channels.add(value);
      }
    }
  };

  const registrations = [
    /registerHandler\(\s*(?:IPC_CHANNELS\.([A-Z0-9_]+)|['"`]([^'"`]+)['"`])/g,
    /safeHandle\(\s*(?:IPC_CHANNELS\.([A-Z0-9_]+)|['"`]([^'"`]+)['"`])/g,
    /forceHandle\(\s*(?:IPC_CHANNELS\.([A-Z0-9_]+)|['"`]([^'"`]+)['"`])/g,
    /ipcMain\.handle\(\s*(?:IPC_CHANNELS\.([A-Z0-9_]+)|['"`]([^'"`]+)['"`])/g,
  ];

  for (const pattern of registrations) {
    for (const match of source.matchAll(pattern)) {
      addChannel(match[2], match[1]);
    }
  }

  return channels;
}

describe('IPC required handler contract', () => {
  it('ensures all required channels are registered in main setup', () => {
    const registeredChannels = readRegisteredChannelsFromMainSource();
    const missing = REQUIRED_IPC_HANDLER_CHANNELS.filter(channel => !registeredChannels.has(channel));

    expect(
      missing,
      `IPC contract ${IPC_HANDLER_CONTRACT_VERSION} is missing required channels: ${missing.join(', ')}`
    ).toEqual([]);
  });
});
