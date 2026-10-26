import { computeCapabilities, recommendOllamaModel, type HardwareProfile, type GpuInfo } from '../hardwareCapabilities';

const gpu = (name: string, vendor: GpuInfo['vendor'], vramMB: number | null): GpuInfo => ({ name, vendor, vramMB, vramSource: vramMB ? 'nvidia-smi' : null });

const profile = (over: Partial<HardwareProfile> = {}, pre: Partial<HardwareProfile['prerequisites']> = {}): HardwareProfile => ({
  measuredAt: 0,
  os: { release: '10.0.26300', build: 26300 },
  cpu: { model: 'Test CPU', logicalCores: 8 },
  ramGB: 32,
  freeDiskGB: 200,
  gpus: [],
  edition: 'universal',
  ...over,
  prerequisites: {
    ollama: { installed: false, running: false, version: null, models: [] },
    python: null,
    git: null,
    dotnet: null,
    comfyui: { running: false, configuredPath: null },
    photocraft: null,
    brainB: null,
    cdHelpers: null,
    ...pre,
  },
});

const cap = (caps: ReturnType<typeof computeCapabilities>, id: string) => caps.find((c) => c.id === id)!;

describe('recommendOllamaModel', () => {
  it('this PC: two 8 GB RTX 2070s pick the largest model that fits one card with 1 GB spare', () => {
    const r = recommendOllamaModel({ ramGB: 64, gpus: [gpu('NVIDIA GeForce RTX 2070', 'nvidia', 8192), gpu('Intel(R) UHD Graphics 630', 'intel', 1024)] });
    expect(r.tag).toBe('gemma4:12b');
    expect(r.onGpu).toBe(true);
  });

  it('a 6 GB card gets a 3B model on the GPU', () => {
    expect(recommendOllamaModel({ ramGB: 16, gpus: [gpu('RTX 2060', 'nvidia', 6144)] })).toMatchObject({ tag: 'llama3.2:3b', onGpu: true });
  });

  it('no dedicated GPU: CPU picks are capped for speed by RAM', () => {
    expect(recommendOllamaModel({ ramGB: 16, gpus: [gpu('Intel UHD', 'intel', 1024)] })).toMatchObject({ tag: 'llama3.2:3b', onGpu: false });
    expect(recommendOllamaModel({ ramGB: 64, gpus: [] })).toMatchObject({ tag: 'gemma2:9b', onGpu: false });
    expect(recommendOllamaModel({ ramGB: 8, gpus: [] })).toMatchObject({ tag: 'llama3.2:3b', onGpu: false });
    expect(recommendOllamaModel({ ramGB: 4, gpus: [] }).tag).toBe('llama3.2:1b');
  });

  it('integrated graphics memory never counts as a GPU fit', () => {
    expect(recommendOllamaModel({ ramGB: 4, gpus: [gpu('Intel Arc iGPU', 'intel', 16384)] }).onGpu).toBe(false);
  });
});

describe('computeCapabilities', () => {
  it('core tools and voice are ready on any PC', () => {
    const caps = computeCapabilities(profile({ ramGB: 4 }));
    expect(cap(caps, 'core').state).toBe('ready');
    expect(cap(caps, 'voice').state).toBe('ready');
  });

  it('local chat walks install -> start -> download model -> ready', () => {
    const p = profile({ gpus: [gpu('RTX 3060', 'nvidia', 12288)] });
    expect(cap(computeCapabilities(p), 'local-chat')).toMatchObject({ state: 'needs-setup', actions: [{ kind: 'install', target: 'ollama' }, { kind: 'link' }] });

    const installed = profile({ gpus: p.gpus }, { ollama: { installed: true, running: false, version: null, models: [] } });
    expect(cap(computeCapabilities(installed), 'local-chat').summary).toMatch(/not running/);

    const running = profile({ gpus: p.gpus }, { ollama: { installed: true, running: true, version: '0.12', models: ['llama3:latest'] } });
    expect(cap(computeCapabilities(running), 'local-chat').actions[0]).toMatchObject({ kind: 'pull-model', target: 'gemma4:12b' });

    const ready = profile({ gpus: p.gpus }, { ollama: { installed: true, running: true, version: '0.12', models: ['gemma4:12b'] } });
    expect(cap(computeCapabilities(ready), 'local-chat').state).toBe('ready');
  });

  it('image AI needs an NVIDIA card: none, too small, 6-8 GB limited, 8 GB+ ready', () => {
    expect(cap(computeCapabilities(profile({ gpus: [gpu('Radeon RX 7900', 'amd', 24576)] })), 'image-ai').state).toBe('not-supported');
    expect(cap(computeCapabilities(profile({ gpus: [gpu('GTX 1650', 'nvidia', 4096)] })), 'image-ai').state).toBe('not-supported');
    expect(cap(computeCapabilities(profile({ gpus: [gpu('RTX 2060', 'nvidia', 6144)] }, { comfyui: { running: true, configuredPath: null } })), 'image-ai').state).toBe('limited');
    expect(cap(computeCapabilities(profile({ gpus: [gpu('RTX 2070', 'nvidia', 8192)] }, { comfyui: { running: true, configuredPath: null } })), 'image-ai').state).toBe('ready');
    expect(cap(computeCapabilities(profile({ gpus: [gpu('RTX 2070', 'nvidia', 8192)] })), 'image-ai').state).toBe('needs-setup');
  });

  it('flags the NVIDIA edition on a PC without an NVIDIA card', () => {
    const caps = computeCapabilities(profile({ edition: 'nvidia', gpus: [gpu('Radeon', 'amd', 8192)] }));
    expect(cap(caps, 'edition').state).toBe('limited');
    expect(cap(caps, 'fine-tune').state).toBe('not-supported');
    expect(computeCapabilities(profile({ edition: 'nvidia', gpus: [gpu('RTX 2070', 'nvidia', 8192)] })).some((c) => c.id === 'edition')).toBe(false);
  });

  it('Brain B is limited by low free disk space', () => {
    expect(cap(computeCapabilities(profile({ freeDiskGB: 1 })), 'brain-b').state).toBe('limited');
    expect(cap(computeCapabilities(profile({ freeDiskGB: null })), 'brain-b').state).toBe('needs-setup');
  });

  it('an installed Brain B reads as ready, whatever the disk space', () => {
    const c = cap(computeCapabilities(profile({ freeDiskGB: 1 }, { brainB: '1.1.0' })), 'brain-b');
    expect(c.state).toBe('ready');
    expect(c.summary).toMatch(/1\.1\.0/);
  });

  it('never offers a download link for something already found', () => {
    const caps = computeCapabilities(profile({ gpus: [gpu('RTX 2070', 'nvidia', 8192)] }, { python: 'Python 3.12.7', photocraft: 'C:\\pc\\photocraft.exe' }));
    expect(cap(caps, 'texture-tools').state).toBe('ready');
    expect(cap(caps, 'image-ai').actions.map((a) => a.target)).not.toContain('python');
  });

  it('offers opt-in installs only for what Mossy can verify; ComfyUI gets a link and written steps', () => {
    const caps = computeCapabilities(profile({ gpus: [gpu('RTX 2070', 'nvidia', 8192)] }));
    expect(cap(caps, 'texture-tools').actions.map((a) => `${a.kind}:${a.target}`)).toEqual(['install:python', 'install:photocraft']);
    const img = cap(caps, 'image-ai');
    expect(img.actions.every((a) => a.kind === 'link')).toBe(true);
    expect(img.setupSteps?.length).toBeGreaterThan(2);
  });

  it('offers the Creative Director helpers only once Python and Ollama exist', () => {
    expect(cap(computeCapabilities(profile()), 'cd-helpers')).toMatchObject({ state: 'limited', actions: [] });
    const ready = profile({}, { python: 'Python 3.13.17', ollama: { installed: true, running: true, version: '0.12', models: [] } });
    expect(cap(computeCapabilities(ready), 'cd-helpers').actions[0]).toMatchObject({ kind: 'install', target: 'cd-helpers' });
    expect(cap(computeCapabilities(profile({}, { cdHelpers: 'D:\\Helpers' })), 'cd-helpers').state).toBe('ready');
  });

  it('lets the user move Ollama models to another drive once Ollama runs', () => {
    const running = profile({}, { ollama: { installed: true, running: true, version: '0.12', models: [] } });
    expect(cap(computeCapabilities(running), 'local-chat').actions.some((a) => a.kind === 'models-folder')).toBe(true);
  });
});
