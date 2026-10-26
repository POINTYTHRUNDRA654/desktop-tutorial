/**
 * What this PC can run -- pure decision logic shared by the main process
 * (which measures the hardware) and the onboarding "Your PC" step (which
 * shows the result). No I/O here, so every rule is unit-tested directly.
 *
 * Thresholds come from what the features really load:
 *  - Ollama chat models: a model runs well when its weights fit in VRAM
 *    (or, CPU-only, in spare RAM). Sizes are what `ollama list` reports for
 *    the default tags (measured 2026-10-26; llama3.2 sizes from ollama.com).
 *  - Image AI (ComfyUI SDXL img2img: AI Image Studio, Glowing Sea Studio,
 *    AI Detail Synthesis): SDXL needs ~8 GB VRAM on NVIDIA/CUDA; 6 GB works
 *    with --lowvram, slowly. Measured here: 4096px img2img took 21.7 min on
 *    an 8 GB RTX 2070 SUPER.
 *  - Brain B: CPU-only package; 235 MB download (v1.1.0 release asset),
 *    1.3 GB once unpacked (measured on an installed copy) -- 2 GB free is required here.
 */

export interface GpuInfo {
  name: string;
  vendor: 'nvidia' | 'amd' | 'intel' | 'other';
  /** Dedicated video memory in MB, or null when it couldn't be measured. */
  vramMB: number | null;
  /** Where vramMB came from -- nvidia-smi and the driver registry are exact; null = unknown. */
  vramSource: 'nvidia-smi' | 'registry' | null;
  driverVersion?: string | null;
}

export interface PrerequisiteStatus {
  /** Found on this PC (version string or path), or null when not found. */
  ollama: { installed: boolean; running: boolean; version: string | null; models: string[] };
  python: string | null;
  git: string | null;
  dotnet: string | null;
  comfyui: { running: boolean; configuredPath: string | null };
  photocraft: string | null;
  /** Installed Brain B version (from its install record), or null. */
  brainB: string | null;
}

export interface HardwareProfile {
  measuredAt: number;
  os: { release: string; build: number | null };
  cpu: { model: string; logicalCores: number };
  ramGB: number;
  /** Free space on the drive Mossy stores its data on, in GB; null if unknown. */
  freeDiskGB: number | null;
  gpus: GpuInfo[];
  /** Which Mossy build is installed (from the packaged app id). */
  edition: 'nvidia' | 'universal';
  prerequisites: PrerequisiteStatus;
}

export type CapabilityState = 'ready' | 'needs-setup' | 'limited' | 'not-supported';

export interface CapabilityAction {
  kind: 'link' | 'pull-model' | 'open-panel' | 'install' | 'models-folder';
  label: string;
  /**
   * link: URL. pull-model: Ollama model tag. open-panel: app route.
   * install: a component Mossy can download, verify and set up itself ('ollama' | 'python' | 'photocraft').
   * models-folder: choose where Ollama stores models (target unused).
   */
  target: string;
}

export interface Capability {
  id: 'core' | 'local-chat' | 'brain-b' | 'image-ai' | 'texture-tools' | 'voice' | 'fine-tune' | 'edition';
  title: string;
  state: CapabilityState;
  /** One plain sentence saying what is true on this PC. */
  summary: string;
  actions: CapabilityAction[];
  /** For things Mossy can't install itself: what it's for and how to set it up, step by step. */
  setupSteps?: string[];
}

export const LINKS = {
  ollama: 'https://ollama.com/download/windows',
  python: 'https://www.python.org/downloads/windows/',
  comfyui: 'https://github.com/comfyanonymous/ComfyUI/releases',
  photocraft: 'https://github.com/storytold/photocraft/releases',
  nvidiaDriver: 'https://www.nvidia.com/en-us/drivers/',
  mossyReleases: 'https://github.com/POINTYTHRUNDRA654/desktop-tutorial/releases',
} as const;

/** Chat model ladder, largest first. sizeGB = download / approximate memory need (q4). */
export const OLLAMA_MODEL_LADDER: { tag: string; sizeGB: number; label: string }[] = [
  { tag: 'gemma4:12b', sizeGB: 7.0, label: 'Gemma 4 12B' },
  { tag: 'qwen3.5:9b', sizeGB: 6.1, label: 'Qwen 3.5 9B' },
  { tag: 'gemma2:9b', sizeGB: 5.1, label: 'Gemma 2 9B' },
  { tag: 'llama3.2:3b', sizeGB: 2.0, label: 'Llama 3.2 3B' },
  { tag: 'llama3.2:1b', sizeGB: 1.3, label: 'Llama 3.2 1B' },
];

export function bestNvidiaGpu(gpus: GpuInfo[]): GpuInfo | null {
  const nv = gpus.filter((g) => g.vendor === 'nvidia');
  if (!nv.length) return null;
  return nv.reduce((a, b) => ((b.vramMB ?? 0) > (a.vramMB ?? 0) ? b : a));
}

export function bestGpuVramGB(gpus: GpuInfo[]): number {
  const best = Math.max(0, ...gpus.filter((g) => g.vendor !== 'intel').map((g) => g.vramMB ?? 0));
  return Math.round((best / 1024) * 10) / 10;
}

/**
 * Picks the chat model for this PC. On a GPU (NVIDIA CUDA or AMD ROCm via
 * Ollama) it is the largest model that fits in VRAM with ~1 GB spare.
 * CPU-only, size is capped for speed rather than by what fits: a CPU writes
 * only a few words per second with a 9-12B model, which is too slow to tutor
 * with (a judgement, not a benchmark), so 9B is offered only with 32 GB+ RAM,
 * 3B from 8 GB, and 1B below that.
 */
export function recommendOllamaModel(profile: Pick<HardwareProfile, 'gpus' | 'ramGB'>): { tag: string; label: string; sizeGB: number; onGpu: boolean } {
  const vram = bestGpuVramGB(profile.gpus);
  const gpuFit = OLLAMA_MODEL_LADDER.find((m) => m.sizeGB + 1 <= vram);
  if (gpuFit) return { ...gpuFit, onGpu: true };
  const cpuTag = profile.ramGB >= 32 ? 'gemma2:9b' : profile.ramGB >= 8 ? 'llama3.2:3b' : 'llama3.2:1b';
  return { ...OLLAMA_MODEL_LADDER.find((m) => m.tag === cpuTag)!, onGpu: false };
}

const hasModel = (installed: string[], tag: string) => {
  const want = tag.toLowerCase();
  return installed.some((m) => m.toLowerCase() === want || m.toLowerCase() === `${want}:latest`);
};

export function computeCapabilities(p: HardwareProfile): Capability[] {
  const caps: Capability[] = [];
  const nv = bestNvidiaGpu(p.gpus);
  const nvGB = nv?.vramMB ? Math.round((nv.vramMB / 1024) * 10) / 10 : 0;
  const pre = p.prerequisites;

  caps.push({
    id: 'core',
    title: 'Modding tools, guides and checks',
    state: 'ready',
    summary: 'Works on any PC: plugin, load order, packaging, Papyrus, texture and crash tools need no AI hardware.',
    actions: [],
  });

  // Edition sanity: the NVIDIA build on a PC without an NVIDIA GPU still runs, but its CUDA parts can't.
  if (p.edition === 'nvidia' && !nv) {
    caps.push({
      id: 'edition',
      title: 'Mossy edition',
      state: 'limited',
      summary: 'You installed Mossy NVIDIA, but no NVIDIA graphics card was found. Everything still works except the CUDA-only parts; the Universal edition is the better fit for this PC.',
      actions: [{ kind: 'link', label: 'Get Mossy Universal', target: LINKS.mossyReleases }],
    });
  }

  // Local AI chat (Ollama)
  const rec = recommendOllamaModel(p);
  const tooLittleRam = p.ramGB < 8;
  if (!pre.ollama.installed) {
    caps.push({
      id: 'local-chat',
      title: 'Mossy AI chat (local, private)',
      state: tooLittleRam ? 'limited' : 'needs-setup',
      summary: `Needs Ollama (free), the program that runs AI models on your own PC. On this PC the best model is ${rec.label} (${rec.sizeGB} GB, runs on ${rec.onGpu ? 'your graphics card' : 'the CPU'}).${tooLittleRam ? ' With under 8 GB of RAM, replies will be slow.' : ''}`,
      actions: [
        { kind: 'install', label: 'Download and set up Ollama for me (1.7 GB)', target: 'ollama' },
        { kind: 'link', label: 'Ollama download page', target: LINKS.ollama },
      ],
    });
  } else if (!pre.ollama.running) {
    caps.push({
      id: 'local-chat',
      title: 'Mossy AI chat (local, private)',
      state: 'needs-setup',
      summary: 'Ollama is installed but not running. Start Ollama from the Start menu, then press Recheck.',
      actions: [],
    });
  } else if (!hasModel(pre.ollama.models, rec.tag)) {
    caps.push({
      id: 'local-chat',
      title: 'Mossy AI chat (local, private)',
      state: 'needs-setup',
      summary: `Ollama is running. Download the model that fits this PC: ${rec.label} (${rec.sizeGB} GB, ${rec.onGpu ? 'graphics card' : 'CPU'}).${pre.ollama.models.length ? ` Already downloaded: ${pre.ollama.models.slice(0, 4).join(', ')}.` : ''}`,
      actions: [
        { kind: 'pull-model', label: `Download ${rec.label}`, target: rec.tag },
        { kind: 'models-folder', label: 'Choose where models are stored', target: '' },
      ],
    });
  } else {
    caps.push({
      id: 'local-chat',
      title: 'Mossy AI chat (local, private)',
      state: 'ready',
      summary: `Ready: Ollama is running with ${rec.label}, the best fit for this PC.`,
      actions: [{ kind: 'models-folder', label: 'Choose where models are stored', target: '' }],
    });
  }

  // Brain B: CPU-only FO4 knowledge engine (installed from Settings)
  const brainBDiskOk = p.freeDiskGB === null || p.freeDiskGB >= 2;
  if (pre.brainB) caps.push({
    id: 'brain-b',
    title: 'Brain B (cited Fallout 4 answers)',
    state: 'ready',
    summary: `Installed (version ${pre.brainB}). Start, stop or update it from Settings.`,
    actions: [{ kind: 'open-panel', label: 'Brain B settings', target: '/settings' }],
  });
  else caps.push({
    id: 'brain-b',
    title: 'Brain B (cited Fallout 4 answers)',
    state: p.ramGB < 8 || !brainBDiskOk ? 'limited' : 'needs-setup',
    summary: !brainBDiskOk
      ? `Needs about 2 GB of free disk space; only ${p.freeDiskGB} GB is free.`
      : p.ramGB < 8
        ? 'Runs on the CPU, but with under 8 GB of RAM it will compete with the game for memory.'
        : 'Runs on the CPU, so it works on this PC. One-click install from Settings (235 MB download, about 1.3 GB on disk).',
    actions: [{ kind: 'open-panel', label: 'Set up Brain B', target: '/settings' }],
  });

  // Image AI (ComfyUI / SDXL)
  if (!nv) {
    caps.push({
      id: 'image-ai',
      title: 'AI image tools (AI Image Studio, Glowing Sea Studio, Detail Synthesis)',
      state: 'not-supported',
      summary: 'Needs an NVIDIA graphics card with 8 GB of video memory. None was found, so these tools stay off.',
      actions: [],
    });
  } else if (nvGB < 6) {
    caps.push({
      id: 'image-ai',
      title: 'AI image tools (AI Image Studio, Glowing Sea Studio, Detail Synthesis)',
      state: 'not-supported',
      summary: `Your ${nv.name} has ${nvGB} GB of video memory; SDXL image generation needs at least 6 GB (8 GB recommended).`,
      actions: [],
    });
  } else {
    const ready = pre.comfyui.running || !!pre.comfyui.configuredPath;
    const lowNote = nvGB < 8 ? ` With ${nvGB} GB, start ComfyUI with --lowvram; large textures will be slow.` : '';
    caps.push({
      id: 'image-ai',
      title: 'AI image tools (AI Image Studio, Glowing Sea Studio, Detail Synthesis)',
      state: ready ? (nvGB < 8 ? 'limited' : 'ready') : 'needs-setup',
      summary: (ready
        ? `ComfyUI found. Your ${nv.name} (${nvGB} GB) can run SDXL.`
        : `Your ${nv.name} (${nvGB} GB) can run SDXL. Needs ComfyUI (free), the program that runs image models; Mossy sends it the work.`) + lowNote,
      actions: ready ? [] : [{ kind: 'link', label: 'ComfyUI download page', target: LINKS.comfyui }],
      setupSteps: ready ? undefined : [
        'On the ComfyUI page, download the Windows portable build for NVIDIA (a .7z file, about 2 GB). It includes its own Python.',
        'Extract it with 7-Zip (free, 7-zip.org) to a drive with at least 20 GB free; models take most of the space.',
        'Download an SDXL checkpoint (Mossy\'s AI Image Studio can fetch one for you once ComfyUI runs) into ComfyUI\\models\\checkpoints.',
        `Start ComfyUI with run_nvidia_gpu.bat${nvGB < 8 ? ' (add --lowvram to that file\'s command line on this card)' : ''}. Leave its window open while you use the image tools.`,
        'In Mossy, open Textures & Materials > AI Image Studio and set the ComfyUI folder, then press Recheck here.',
      ],
    });
  }

  // Texture batch tools that run locally without a GPU (Glowing Sea pipeline stages 1/3/4, PhotoCraft)
  caps.push({
    id: 'texture-tools',
    title: 'Texture batch tools (PhotoCraft, mask-lock, DDS output)',
    state: pre.python && pre.photocraft ? 'ready' : 'needs-setup',
    summary: pre.python && pre.photocraft
      ? 'Ready: Python and PhotoCraft were found.'
      : `Work on any PC. Missing: ${[!pre.python && 'Python', !pre.photocraft && 'PhotoCraft (optional editor)'].filter(Boolean).join(' and ')}.`,
    actions: [
      ...(pre.python ? [] : [{ kind: 'install' as const, label: 'Download and set up Python for me (30 MB)', target: 'python' }]),
      ...(pre.photocraft ? [] : [{ kind: 'install' as const, label: 'Download and set up PhotoCraft for me (90 MB)', target: 'photocraft' }]),
    ],
  });

  caps.push({
    id: 'voice',
    title: 'Mossy\'s voice',
    state: 'ready',
    summary: 'Uses the voices built into Windows, so it works on every PC. Pick a voice in the next steps or in Settings.',
    actions: [],
  });

  // Local fine-tuning (NVIDIA edition, Unsloth)
  if (p.edition === 'nvidia') {
    caps.push({
      id: 'fine-tune',
      title: 'Train your own Mossy model (advanced)',
      state: nv && nvGB >= 8 ? 'needs-setup' : 'not-supported',
      summary: nv && nvGB >= 8
        ? `Your ${nv.name} (${nvGB} GB) can fine-tune small models. Optional${pre.python ? ': set it up from the Fine-Tune panel when you want it.' : '; needs Python.'}`
        : 'Fine-tuning needs an NVIDIA card with at least 8 GB of video memory.',
      actions: nv && nvGB >= 8 && !pre.python ? [{ kind: 'install', label: 'Download and set up Python for me (30 MB)', target: 'python' }] : [],
    });
  }

  return caps;
}
