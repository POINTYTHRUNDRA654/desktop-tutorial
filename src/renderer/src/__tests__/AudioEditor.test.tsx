import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AudioEditor from '../AudioEditor';

describe('AudioEditor (renderer)', () => {
  beforeEach(() => {
    // ensure mocks are reset
    const api = (window as any).electronAPI;
    if (api && api.audioEditor) {
      Object.values(api.audioEditor).forEach((fn: any) => fn && fn.mockClear && fn.mockClear());
    }
    // stub alert to avoid noise
    window.alert = vi.fn();
  });

  it('calls audioEditor.convertToXWM when Convert button is clicked', async () => {
    const api = (window as any).electronAPI;
    api.audioEditor.convertToXWM.mockResolvedValue({ success: true, outputPath: 'voice.xwm' });

    render(<AudioEditor />);

    const btn = screen.getByRole('button', { name: /Convert to XWM/i });
    await userEvent.click(btn);

    expect(api.audioEditor.convertToXWM).toHaveBeenCalled();
  });

  it('calls audioEditor.generateLipSync when Generate Lip-Sync is clicked', async () => {
    const api = (window as any).electronAPI;
    api.audioEditor.generateLipSync.mockResolvedValue({ phonemes: [], emotions: [], duration: 1.0 });

    render(<AudioEditor />);

    const btn = screen.getByRole('button', { name: /Generate Lip-Sync/i });
    await userEvent.click(btn);

    expect(api.audioEditor.generateLipSync).toHaveBeenCalled();
  });

  it('calls audioEditor.normalizeVolume and removeNoise when respective buttons are clicked', async () => {
    const api = (window as any).electronAPI;
    api.audioEditor.normalizeVolume.mockResolvedValue(undefined);
    api.audioEditor.removeNoise.mockResolvedValue('clean.wav');

    render(<AudioEditor />);

    const normalizeBtn = screen.getByRole('button', { name: /Normalize Volume/i });
    await userEvent.click(normalizeBtn);
    expect(api.audioEditor.normalizeVolume).toHaveBeenCalled();

    const noiseBtn = screen.getByRole('button', { name: /Remove Noise/i });
    await userEvent.click(noiseBtn);
    expect(api.audioEditor.removeNoise).toHaveBeenCalled();
  });
});