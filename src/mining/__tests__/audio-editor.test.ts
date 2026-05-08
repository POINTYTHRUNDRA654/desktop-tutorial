import { describe, it, expect, beforeEach } from 'vitest';
import { audioEditor } from '../audioEditor';

describe('AudioEditorEngine (in-memory stubs)', () => {
  beforeEach(() => {
    // no-op; engine is in-memory and stateless for these tests
  });

  it('convertToXWM returns a .xwm path and includes size/ratio metadata', async () => {
    const res = await audioEditor.convertToXWM('voice_sample.wav', 90);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.outputPath).toMatch(/\.xwm$/i);
    expect(typeof (res as any).originalSize).toBe('number');
    expect(typeof (res as any).compressedSize).toBe('number');
    expect(typeof (res as any).compressionRatio).toBe('number');
  });

  it('convertToFUZ returns FUZ conversion metadata and lip sync included', async () => {
    const res = await audioEditor.convertToFUZ('voice_sample.wav', 'voice_sample.lip') as any;
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.outputPath).toMatch(/\.fuz$/i);
    expect(res.lipSyncIncluded).toBe(true);
    expect(typeof res.originalSize).toBe('number');
  });

  it('generateLipSync returns a LipFile with phonemes', async () => {
    const lip = await audioEditor.generateLipSync('voice_sample.wav', 'Hello world');
    expect(lip).toBeDefined();
    expect(Array.isArray((lip as any).phonemes)).toBe(true);
    expect((lip as any).phonemes.length).toBeGreaterThan(0);
  });

  it('batchConvertAudio returns summary counts and per-file ConversionResult', async () => {
    const br = await audioEditor.batchConvertAudio(['a.wav','b.wav'], 'xwm');
    expect(br.totalFiles).toBe(2);
    expect(br.successful).toBe(2);
    expect(Array.isArray(br.results)).toBe(true);
    expect(typeof br.results[0].compressionRatio).toBe('number');
  });

  it('createAmbientSound returns AmbientSound with layers and fade settings', async () => {
    const amb = await audioEditor.createAmbientSound(['s1','s2'], 'simultaneous' as any);
    expect(amb).toBeDefined();
    expect(Array.isArray((amb as any).layers)).toBe(true);
    expect(typeof (amb as any).fadeIn).toBe('number');
    expect(typeof (amb as any).fadeOut).toBe('number');
  });

  it('phonemeAnalysis returns transcript and confidence', async () => {
    const data = await audioEditor.phonemeAnalysis('voice_sample.wav');
    expect(data).toBeDefined();
    expect(typeof data.transcript).toBe('string');
    expect(typeof data.confidence).toBe('number');
  });

  it('normalizeVolume resolves without error and removeNoise returns cleaned path', async () => {
    await expect(audioEditor.normalizeVolume(['a.wav'])).resolves.not.toThrow();
    const out = await audioEditor.removeNoise('noisy.wav', 0.6);
    expect(out).toMatch(/noisy(\.clean)?\.wav|noisy\.clean/i);
  });

  it('createMusicTrack and createMusicPlaylist work as stubs', async () => {
    const layers = [{ audioPath: 'm1.wav', volume: 1.0, startTime: 0, loop: true, fadeIn: 0, fadeOut: 0 }];
    const track = await audioEditor.createMusicTrack('ambient', layers as any, 'explore');
    expect(track).toBeDefined();
    expect(track.id).toMatch(/track_/);

    const pl = await audioEditor.createMusicPlaylist([track.id], 'crossfade', 1.0, false);
    expect(pl).toBeDefined();
    expect(pl.tracks).toContain(track.id);
  });

  it('createSoundDescriptor and set3DAttenuation do not throw', async () => {
    const sd = { name: 'sd1', category: 'FX', audioFiles: ['s1.wav'], looping: false, volume: 1.0 } as any;
    const id = await audioEditor.createSoundDescriptor(sd);
    expect(typeof id).toBe('string');

    await expect(audioEditor.set3DAttenuation(id, { points: [{ distance: 0, volume: 1 }, { distance: 10, volume: 0 }] } as any)).resolves.not.toThrow();
  });
});