/**
 * "Your own AI service" -- optional, off by default.
 *
 * Mossy is local-first: out of the box every AI feature runs on the user's PC
 * (Ollama, KoboldCpp, LM Studio...). A user who wants to can point Mossy at a
 * cloud service of their own (OpenAI, Groq, OpenRouter, or any
 * OpenAI-compatible endpoint) with their own API key. Mossy ships no keys and
 * calls no cloud service unless the user turned this on.
 *
 * It reuses the existing OpenAI-compatible provider slot (openaiCompat.ts):
 * turning it on points openaiCompatBaseUrl/openaiCompatModel at the service
 * and selects that provider; turning it off restores the previous values.
 * The key is encrypted with Electron safeStorage (Windows DPAPI) into
 * <userData>/byo-ai.key, never written to settings.json, never sent to the
 * renderer, and only attached to requests whose base URL is the saved one.
 */
import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

export type ByoPreset = 'openai' | 'groq' | 'openrouter' | 'custom';
export const BYO_PRESETS: Record<ByoPreset, { label: string; baseUrl: string; keyUrl: string }> = {
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', keyUrl: 'https://platform.openai.com/api-keys' },
  groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', keyUrl: 'https://console.groq.com/keys' },
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', keyUrl: 'https://openrouter.ai/settings/keys' },
  custom: { label: 'Other OpenAI-compatible service', baseUrl: '', keyUrl: '' },
};

const keyFile = () => path.join(app.getPath('userData'), 'byo-ai.key');
const norm = (u: string) => String(u || '').trim().replace(/\/+$/, '').toLowerCase();

export function hasByoKey(): boolean {
  return fs.existsSync(keyFile());
}

function readKey(): string | null {
  try {
    if (!fs.existsSync(keyFile()) || !safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(fs.readFileSync(keyFile()));
  } catch {
    return null;
  }
}

/** The user's key, only for the exact base URL they saved and only while the feature is on. */
export function byoKeyFor(baseUrl: string, settings: Record<string, any> | null | undefined): string | undefined {
  if (!settings?.byoAiEnabled || !settings?.byoAiBaseUrl) return undefined;
  if (norm(baseUrl) !== norm(settings.byoAiBaseUrl)) return undefined;
  return readKey() || undefined;
}

export function getByoConfig(settings: Record<string, any> | null | undefined) {
  return {
    enabled: !!settings?.byoAiEnabled,
    preset: (settings?.byoAiPreset || 'openai') as ByoPreset,
    baseUrl: String(settings?.byoAiBaseUrl || ''),
    model: String(settings?.byoAiModel || ''),
    hasKey: hasByoKey(),
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    presets: BYO_PRESETS,
  };
}

/**
 * Returns the settings patch to save. apiKey: undefined = keep the stored key,
 * '' = delete it. Throws (nothing saved) if a key can't be stored encrypted.
 */
export function buildByoPatch(
  current: Record<string, any>,
  input: { enabled: boolean; preset: ByoPreset; baseUrl: string; model: string; apiKey?: string },
): Record<string, any> {
  const baseUrl = String(input.baseUrl || '').trim().replace(/\/+$/, '');
  if (input.enabled) {
    if (!/^https:\/\//i.test(baseUrl) && !/^http:\/\/(127\.0\.0\.1|localhost)[:/]/i.test(baseUrl)) {
      throw new Error('The service address must start with https:// (or be a local http://127.0.0.1 address).');
    }
    if (!String(input.model || '').trim()) throw new Error('Enter the model name the service should use.');
  }
  if (input.apiKey !== undefined) {
    if (input.apiKey === '') {
      try { fs.rmSync(keyFile(), { force: true }); } catch { /* already gone */ }
    } else {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows could not encrypt the key on this PC, so Mossy will not store it. Nothing was saved.');
      fs.writeFileSync(keyFile(), safeStorage.encryptString(input.apiKey.trim()), { mode: 0o600 });
    }
  }
  const patch: Record<string, any> = { byoAiEnabled: !!input.enabled, byoAiPreset: input.preset, byoAiBaseUrl: baseUrl, byoAiModel: String(input.model || '').trim() };
  if (input.enabled && !current.byoAiEnabled) {
    // Remember the local setup so turning this off restores it exactly.
    patch.byoAiPrevious = {
      openaiCompatBaseUrl: current.openaiCompatBaseUrl ?? null,
      openaiCompatModel: current.openaiCompatModel ?? null,
      localAiPreferredProvider: current.localAiPreferredProvider ?? null,
    };
  }
  if (input.enabled) {
    patch.openaiCompatBaseUrl = baseUrl;
    patch.openaiCompatModel = patch.byoAiModel;
    patch.localAiPreferredProvider = 'openai_compat';
  } else if (current.byoAiEnabled) {
    const prev = current.byoAiPrevious || {};
    patch.openaiCompatBaseUrl = prev.openaiCompatBaseUrl ?? 'http://127.0.0.1:1234/v1';
    patch.openaiCompatModel = prev.openaiCompatModel ?? '';
    patch.localAiPreferredProvider = prev.localAiPreferredProvider ?? 'auto';
  }
  return patch;
}
