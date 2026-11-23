/**
 * Modern local image models for AI Image Studio -- added 2026-11-19 ALONGSIDE the SDXL
 * checkpoint path in main.ts (buildComfyTxt2ImgWorkflow & co. are untouched).
 *
 *  - Z-Image-Turbo (Tongyi-MAI, Apache-2.0): best text and concept art, ~30 s / 1024 px on an RTX 2070.
 *  - FLUX.2 [klein] 4B distilled (Black Forest Labs, Apache-2.0): most realistic surface textures,
 *    10-16 s / 1024 px, and reference-image editing ("make this wood wet with moss").
 *    NOT the 9B klein: that one is non-commercial.
 *  Both share the qwen_3_4b text encoder. Graphs are copied from ComfyUI's own official workflow
 *  templates (comfyui_workflow_templates_json: image_z_image_turbo_int8.json,
 *  image_flux2_klein_text_to_image.json "Distilled", image_flux2_klein_image_edit_4b_distilled.json)
 *  and were run live on ComfyUI 0.35.1 before being wired in here.
 *
 * Make Seamless (textures:make-seamless) -- every step exists because the simpler version failed a
 * real test (2026-11-19, rust metal + wood planks, seam strength 3.4x-10.4x before, 1.0x-2.0x after,
 * where 1.0x = an edge pixel step no bigger than any other pixel step):
 *   1. Roll the image by half: the old edges now meet in a cross in the middle, and the new edges are
 *      neighbouring interior pixels, so the wrap is continuous by construction.
 *   2. Detect grain at 1/8 size (fine rust/dirt speckle hides it at full size).
 *   3. Linear-bridge ONLY the band that cuts across the grain, so no hard seam line is left for the
 *      model to keep. Bridging along the grain made the model draw planks sideways.
 *   4. Z-Image masked repaint of the cross (denoise 0.75, band 20 %), with "one continuous surface,
 *      no joints" appended -- otherwise it draws a bolted panel joint right on the old seam.
 *   5. Per-channel tone match fitted in a 48 px ring the AI repainted but the composite keeps original
 *      (without it the repaint reads as a greyer rectangle).
 *   6. 24 px fade at the band border (a wide fade ghosts two images into a blurred stripe).
 *   Every pixel outside the band is the original, bit for bit -- checked, and the call fails if not.
 * Keep real photo detail (klein edit, keepDetail): klein edits at ~1 MP, so the photo's fine detail (pits, grain,
 * scratches) is put back at full size by frequency separation: result = upscale(edit) + mask * highpass(photo
 * luminance). mask = local correlation of the mid-frequency band of edit vs photo, so detail only returns where
 * the edit kept the photo's structure (recoloured is fine, moved or invented is not). Tuned 2026-11-20 on real CC0
 * scans (rust metal, planks, concrete): far closer to a photo at 100 % than the raw edit or pure generation.
 * klein's masked repaint is NOT used for this: it turned green paint beige. klein EDIT is not used
 * either: an edit model keeps its input faithfully, including the seam line.
 */
import sharp from 'sharp';
import { readLibraryFile, licenceOf } from './textureLibrary';

type Register = (channel: string, handler: (event: any, ...args: any[]) => any) => void;

export const MODERN_MODEL_FILES = {
  zimage: { unet: 'z_image_turbo_int8_convrot.safetensors', clip: 'qwen_3_4b.safetensors', vae: 'ae.safetensors' },
  klein: { unet: 'flux-2-klein-4b.safetensors', clip: 'qwen_3_4b.safetensors', vae: 'flux2-vae.safetensors' },
} as const;
export type ModernFamily = keyof typeof MODERN_MODEL_FILES;

const REQUIRED_NODES: Record<ModernFamily, string[]> = {
  zimage: ['UNETLoader', 'CLIPLoader', 'ModelSamplingAuraFlow', 'EmptySD3LatentImage', 'ConditioningZeroOut', 'SetLatentNoiseMask', 'LoadImageMask'],
  klein: ['UNETLoader', 'CLIPLoader', 'Flux2Scheduler', 'EmptyFlux2LatentImage', 'ReferenceLatent', 'CFGGuider', 'SamplerCustomAdvanced', 'ImageScaleToTotalPixels', 'GetImageSize'],
};

const SEAM = { band: 0.2, fade: 24, aiMargin: 48, denoise: 0.75, grainRatio: 1.25 };
const SEAM_PROMPT_SUFFIX = ', one continuous surface, no joints, no seams, no borders, no overlap, flat even lighting';

type SeamStats = { wrapLR: number; wrapTB: number; crossV: number; crossH: number };

export function registerModernImagingHandlers(registerHandler: Register, comfyBase: string): void {
  const getJson = async (url: string, timeoutMs = 5000): Promise<any> => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  };
  const nodeInfo = async (node: string) => (await getJson(`${comfyBase}/object_info/${node}`))?.[node] ?? null;
  const listFor = async (node: string, input: string): Promise<string[]> =>
    (await nodeInfo(node))?.input?.required?.[input]?.[0] ?? [];

  async function upload(buf: Buffer, filename: string): Promise<string> {
    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(buf)], { type: 'image/png' }), filename);
    form.append('overwrite', 'true');
    const r = await fetch(`${comfyBase}/upload/image`, { method: 'POST', body: form as any, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`Upload to ComfyUI failed (${r.status}).`);
    return ((await r.json()) as { name: string }).name;
  }

  /** Queue a workflow and return the first output image as PNG bytes. 10 min limit (2048 px repaints are slow on 8 GB). */
  async function run(workflow: Record<string, unknown>, timeoutMs = 10 * 60 * 1000): Promise<Buffer> {
    const q = await fetch(`${comfyBase}/prompt`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }), signal: AbortSignal.timeout(15000),
    });
    if (!q.ok) throw new Error(`ComfyUI refused the job (${q.status}): ${(await q.text().catch(() => '')).slice(0, 300)}`);
    const { prompt_id } = (await q.json()) as { prompt_id: string };
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise<void>(r => setTimeout(r, 1500));
      const hist = await getJson(`${comfyBase}/history/${prompt_id}`, 15000);
      const job = hist?.[prompt_id];
      if (!job) continue;
      if (job.status?.status_str === 'error') {
        const msg = (job.status?.messages || []).find((m: any) => m?.[0] === 'execution_error')?.[1]?.exception_message;
        throw new Error(`ComfyUI: ${String(msg || 'the job failed').slice(0, 300)}`);
      }
      for (const out of Object.values(job.outputs || {}) as any[]) {
        const img = out?.images?.[0];
        if (!img) continue;
        const qs = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder ?? '', type: img.type });
        const r = await fetch(`${comfyBase}/view?${qs}`, { signal: AbortSignal.timeout(60000) });
        if (!r.ok) throw new Error('Could not fetch the finished image from ComfyUI.');
        return Buffer.from(await r.arrayBuffer());
      }
    }
    throw new Error(`ComfyUI did not finish within ${Math.round(timeoutMs / 60000)} minutes.`);
  }

  const loaders = (f: ModernFamily) => ({
    unet: { class_type: 'UNETLoader', inputs: { unet_name: MODERN_MODEL_FILES[f].unet, weight_dtype: 'default' } },
    clip: { class_type: 'CLIPLoader', inputs: { clip_name: MODERN_MODEL_FILES[f].clip, type: f === 'zimage' ? 'lumina2' : 'flux2', device: 'default' } },
    vae: { class_type: 'VAELoader', inputs: { vae_name: MODERN_MODEL_FILES[f].vae } },
  });

  function textGraph(f: ModernFamily, prompt: string, w: number, h: number, seed: number) {
    const g: Record<string, unknown> = {
      ...loaders(f),
      pos: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['clip', 0] } },
      neg: { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['pos', 0] } },
      dec: { class_type: 'VAEDecode', inputs: { samples: ['smp', 0], vae: ['vae', 0] } },
      save: { class_type: 'SaveImage', inputs: { images: ['dec', 0], filename_prefix: `mossy_${f}_` } },
    };
    if (f === 'zimage') {
      Object.assign(g, {
        lat: { class_type: 'EmptySD3LatentImage', inputs: { width: w, height: h, batch_size: 1 } },
        ms: { class_type: 'ModelSamplingAuraFlow', inputs: { model: ['unet', 0], shift: 3 } },
        smp: { class_type: 'KSampler', inputs: { seed, steps: 8, cfg: 1, sampler_name: 'res_multistep', scheduler: 'simple', denoise: 1, model: ['ms', 0], positive: ['pos', 0], negative: ['neg', 0], latent_image: ['lat', 0] } },
      });
    } else {
      Object.assign(g, {
        lat: { class_type: 'EmptyFlux2LatentImage', inputs: { width: w, height: h, batch_size: 1 } },
        gd: { class_type: 'CFGGuider', inputs: { model: ['unet', 0], positive: ['pos', 0], negative: ['neg', 0], cfg: 1 } },
        sm: { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } },
        sc: { class_type: 'Flux2Scheduler', inputs: { steps: 4, width: w, height: h } },
        nz: { class_type: 'RandomNoise', inputs: { noise_seed: seed } },
        smp: { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['nz', 0], guider: ['gd', 0], sampler: ['sm', 0], sigmas: ['sc', 0], latent_image: ['lat', 0] } },
      });
    }
    return g;
  }

  function editGraph(instruction: string, imgName: string, seed: number) {
    return {
      ...loaders('klein'),
      img: { class_type: 'LoadImage', inputs: { image: imgName } },
      scl: { class_type: 'ImageScaleToTotalPixels', inputs: { image: ['img', 0], upscale_method: 'nearest-exact', megapixels: 1, resolution_steps: 1 } },
      size: { class_type: 'GetImageSize', inputs: { image: ['scl', 0] } },
      enc: { class_type: 'VAEEncode', inputs: { pixels: ['scl', 0], vae: ['vae', 0] } },
      pos: { class_type: 'CLIPTextEncode', inputs: { text: instruction, clip: ['clip', 0] } },
      neg: { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['pos', 0] } },
      rpos: { class_type: 'ReferenceLatent', inputs: { conditioning: ['pos', 0], latent: ['enc', 0] } },
      rneg: { class_type: 'ReferenceLatent', inputs: { conditioning: ['neg', 0], latent: ['enc', 0] } },
      gd: { class_type: 'CFGGuider', inputs: { model: ['unet', 0], positive: ['rpos', 0], negative: ['rneg', 0], cfg: 1 } },
      sm: { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } },
      sc: { class_type: 'Flux2Scheduler', inputs: { steps: 4, width: ['size', 0], height: ['size', 1] } },
      lat: { class_type: 'EmptyFlux2LatentImage', inputs: { width: ['size', 0], height: ['size', 1], batch_size: 1 } },
      nz: { class_type: 'RandomNoise', inputs: { noise_seed: seed } },
      smp: { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['nz', 0], guider: ['gd', 0], sampler: ['sm', 0], sigmas: ['sc', 0], latent_image: ['lat', 0] } },
      dec: { class_type: 'VAEDecode', inputs: { samples: ['smp', 0], vae: ['vae', 0] } },
      save: { class_type: 'SaveImage', inputs: { images: ['dec', 0], filename_prefix: 'mossy_klein_edit_' } },
    };
  }

  function repaintGraph(prompt: string, imgName: string, maskName: string, seed: number) {
    return {
      ...loaders('zimage'),
      img: { class_type: 'LoadImage', inputs: { image: imgName } },
      msk: { class_type: 'LoadImageMask', inputs: { image: maskName, channel: 'red' } },
      enc: { class_type: 'VAEEncode', inputs: { pixels: ['img', 0], vae: ['vae', 0] } },
      lat: { class_type: 'SetLatentNoiseMask', inputs: { samples: ['enc', 0], mask: ['msk', 0] } },
      pos: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['clip', 0] } },
      neg: { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['pos', 0] } },
      ms: { class_type: 'ModelSamplingAuraFlow', inputs: { model: ['unet', 0], shift: 3 } },
      smp: { class_type: 'KSampler', inputs: { seed, steps: 8, cfg: 1, sampler_name: 'res_multistep', scheduler: 'simple', denoise: SEAM.denoise, model: ['ms', 0], positive: ['pos', 0], negative: ['neg', 0], latent_image: ['lat', 0] } },
      dec: { class_type: 'VAEDecode', inputs: { samples: ['smp', 0], vae: ['vae', 0] } },
      save: { class_type: 'SaveImage', inputs: { images: ['dec', 0], filename_prefix: 'mossy_seamless_raw_' } },
    };
  }

  async function familyStatus(f: ModernFamily, unets: string[], clips: string[], vaes: string[]) {
    const files = MODERN_MODEL_FILES[f];
    const missingFiles: string[] = [];
    if (!unets.includes(files.unet)) missingFiles.push(`diffusion_models/${files.unet}`);
    if (!clips.includes(files.clip)) missingFiles.push(`text_encoders/${files.clip}`);
    if (!vaes.includes(files.vae)) missingFiles.push(`vae/${files.vae}`);
    const missingNodes: string[] = [];
    for (const n of REQUIRED_NODES[f]) if (!(await nodeInfo(n))) missingNodes.push(n);
    return { ready: missingFiles.length === 0 && missingNodes.length === 0, missingFiles, missingNodes };
  }

  registerHandler('textures:modern-status', async () => {
    const stats = await getJson(`${comfyBase}/system_stats`, 3000);
    if (!stats) return { online: false };
    const [unets, clips, vaes] = await Promise.all([
      listFor('UNETLoader', 'unet_name'), listFor('CLIPLoader', 'clip_name'), listFor('VAELoader', 'vae_name'),
    ]);
    return {
      online: true,
      comfyVersion: stats?.system?.comfyui_version ?? null,
      zimage: await familyStatus('zimage', unets, clips, vaes),
      klein: await familyStatus('klein', unets, clips, vaes),
    };
  });

  const toDataUrl = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`;
  const randomSeed = () => Math.floor(Math.random() * 2147483647);

  registerHandler('textures:modern-generate', async (_e, p: { family: ModernFamily; prompt: string; width: number; height: number; seed?: number }) => {
    try {
      if (p.family !== 'zimage' && p.family !== 'klein') return { success: false, error: `Unknown model family: ${p.family}` };
      const w = Math.max(256, Math.round((p.width || 1024) / 16) * 16), h = Math.max(256, Math.round((p.height || 1024) / 16) * 16);
      const png = await run(textGraph(p.family, p.prompt, w, h, p.seed ?? randomSeed()));
      return { success: true, imageData: toDataUrl(png) };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  });

  /** Source image: a file from the scanned texture library (sourcePath) or an uploaded image (imageBase64). */
  const readSource = async (p: { imageBase64?: string; sourcePath?: string }): Promise<Buffer> =>
    p.sourcePath ? readLibraryFile(p.sourcePath) : Buffer.from(String(p.imageBase64 || ''), 'base64');

  registerHandler('textures:klein-edit', async (_e, p: {
    imageBase64?: string; sourcePath?: string; instruction: string; seed?: number;
    keepDetail?: boolean; outSize?: number;   // outSize: longest side of the result; 0 = the photo's own size (max 4096)
  }) => {
    try {
      const src = await readSource(p);
      const smallPng = await sharp(src, { limitInputPixels: false }).rotate().removeAlpha().resize(1536, 1536, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
      const name = await upload(smallPng, `mossy_edit_in_${Date.now()}.png`);
      const edited = await run(editGraph(p.instruction, name, p.seed ?? randomSeed()));
      const licence = p.sourcePath ? licenceOf(p.sourcePath) : null;
      if (!p.keepDetail) {
        const meta = await sharp(edited).metadata();
        return { success: true, imageData: toDataUrl(edited), width: meta.width, height: meta.height, licence };
      }
      const r = await keepPhotoDetail(src, edited, p.outSize ?? 2048);
      return { success: true, imageData: toDataUrl(r.png), width: r.width, height: r.height, detailCoverage: r.coverage, licence };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  });

  registerHandler('textures:make-seamless', async (_e, p: { imageBase64?: string; sourcePath?: string; prompt: string; seed?: number }) => {
    try {
      const licence = p.sourcePath ? licenceOf(p.sourcePath) : null;
      return { success: true, licence, ...(await makeSeamless(await readSource(p), p.prompt, p.seed ?? randomSeed())) };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  });

  async function makeSeamless(input: Buffer, prompt: string, seed: number) {
    const t0 = Date.now();
    const { data: a, info } = await sharp(input).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height, C = info.channels;
    if (C !== 3) throw new Error(`Expected an RGB image, got ${C} channels.`);
    if (w < 64 || h < 64) throw new Error('Image is too small to make seamless (needs at least 64x64).');
    const before = seamStats(a, w, h);

    // 1. roll by half
    const dx = Math.floor(w / 2), dy = Math.floor(h / 2);
    const rolled = Buffer.alloc(a.length);
    for (let y = 0; y < h; y++) {
      const ty = (y + dy) % h;
      for (let x = 0; x < w; x++) {
        const s = (y * w + x) * 3, d = (ty * w + ((x + dx) % w)) * 3;
        rolled[d] = a[s]; rolled[d + 1] = a[s + 1]; rolled[d + 2] = a[s + 2];
      }
    }

    // 2. grain at 1/8 size (box average)
    const sw = Math.max(8, Math.floor(w / 8)), sh = Math.max(8, Math.floor(h / 8));
    const bx = Math.floor(w / sw), by = Math.floor(h / sh);
    const small = new Float32Array(sw * sh);
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      let sum = 0;
      for (let y = j * by; y < (j + 1) * by; y++) for (let x = i * bx; x < (i + 1) * bx; x++) {
        const o = (y * w + x) * 3; sum += (a[o] + a[o + 1] + a[o + 2]) / 3;
      }
      small[j * sw + i] = sum / (bx * by);
    }
    let ex = 0, ey = 0;
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw - 1; i++) ex += Math.abs(small[j * sw + i + 1] - small[j * sw + i]);
    for (let j = 0; j < sh - 1; j++) for (let i = 0; i < sw; i++) ey += Math.abs(small[(j + 1) * sw + i] - small[j * sw + i]);
    ex /= sh * (sw - 1); ey /= (sh - 1) * sw;
    const grain: 'vertical' | 'horizontal' | 'none' = ex > SEAM.grainRatio * ey ? 'vertical' : ey > SEAM.grainRatio * ex ? 'horizontal' : 'none';

    // band rectangles (the cross over the old seams)
    const bw = Math.floor(w * SEAM.band), bh = Math.floor(h * SEAM.band);
    const vx0 = Math.floor(w / 2) - Math.floor(bw / 2), vx1 = Math.floor(w / 2) + Math.floor(bw / 2); // [vx0, vx1)
    const hy0 = Math.floor(h / 2) - Math.floor(bh / 2), hy1 = Math.floor(h / 2) + Math.floor(bh / 2); // [hy0, hy1)
    const inBand = (x: number, y: number) => (x >= vx0 && x < vx1) || (y >= hy0 && y < hy1);

    // 3. bridge only the band across the grain
    const toAi = Buffer.from(rolled);
    if (grain === 'vertical') {
      const y0 = hy0 - 1, y1 = hy1;
      for (let y = y0; y <= y1; y++) {
        const t = (y - y0) / (y1 - y0);
        for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
          toAi[(y * w + x) * 3 + c] = Math.round(rolled[(y0 * w + x) * 3 + c] * (1 - t) + rolled[(y1 * w + x) * 3 + c] * t);
        }
      }
    } else if (grain === 'horizontal') {
      const x0 = vx0 - 1, x1 = vx1;
      for (let x = x0; x <= x1; x++) {
        const t = (x - x0) / (x1 - x0);
        for (let y = 0; y < h; y++) for (let c = 0; c < 3; c++) {
          toAi[(y * w + x) * 3 + c] = Math.round(rolled[(y * w + x0) * 3 + c] * (1 - t) + rolled[(y * w + x1) * 3 + c] * t);
        }
      }
    }

    // masks: AI repaint area = band grown by aiMargin; composite = band, softened by a short fade
    const m = SEAM.aiMargin;
    const aiMask = Buffer.alloc(w * h * 3);
    const band = Buffer.alloc(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (inBand(x, y)) band[y * w + x] = 255;
      const inAi = (x >= vx0 - m && x < vx1 + m) || (y >= hy0 - m && y < hy1 + m);
      if (inAi) { const o = (y * w + x) * 3; aiMask[o] = aiMask[o + 1] = aiMask[o + 2] = 255; }
    }
    // extractChannel(0): sharp otherwise hands a blurred 1-channel raw image back as sRGB (3 channels), which
    // read as 1 channel gives a striped, too-small mask (found in the first test of this module).
    const soft = await sharp(band, { raw: { width: w, height: h, channels: 1 } }).blur(SEAM.fade).extractChannel(0).raw().toBuffer();
    if (soft.length !== w * h) throw new Error(`Internal check failed: fade mask has ${soft.length} bytes, expected ${w * h}.`);

    // 4. Z-Image masked repaint
    const fullPrompt = prompt.trim().replace(/[.\s]+$/, '') + SEAM_PROMPT_SUFFIX;
    const stamp = Date.now();
    const imgName = await upload(await sharp(toAi, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer(), `mossy_seam_in_${stamp}.png`);
    const maskName = await upload(await sharp(aiMask, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer(), `mossy_seam_mask_${stamp}.png`);
    const outPng = await run(repaintGraph(fullPrompt, imgName, maskName, seed));
    const o = await sharp(outPng).removeAlpha().resize(w, h, { fit: 'fill' }).raw().toBuffer();

    // 5. tone match in the ring (repainted by the AI, kept original in the composite)
    const gain = [1, 1, 1], bias = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      let n = 0, so = 0, so2 = 0, sr = 0, sr2 = 0;
      for (let i = 0; i < w * h; i++) {
        if (aiMask[i * 3] === 0 || band[i] !== 0) continue;
        const ov = o[i * 3 + c], rv = rolled[i * 3 + c];
        n++; so += ov; so2 += ov * ov; sr += rv; sr2 += rv * rv;
      }
      if (n > 100) {
        const mo = so / n, mr = sr / n;
        const sdo = Math.sqrt(Math.max(0, so2 / n - mo * mo)) + 1e-6, sdr = Math.sqrt(Math.max(0, sr2 / n - mr * mr));
        gain[c] = sdr / sdo; bias[c] = mr - mo * gain[c];
      }
    }

    // 6. composite; outside the softened band the result IS the rolled original
    const out = Buffer.alloc(a.length);
    let untouched = 0, changedOutside = 0;
    for (let i = 0; i < w * h; i++) {
      const k = soft[i] / 255;
      for (let c = 0; c < 3; c++) {
        const r = rolled[i * 3 + c];
        const ai = o[i * 3 + c] * gain[c] + bias[c];
        out[i * 3 + c] = k === 0 ? r : Math.max(0, Math.min(255, Math.round(r * (1 - k) + ai * k)));
      }
      if (soft[i] === 0) {
        untouched++;
        if (out[i * 3] !== rolled[i * 3] || out[i * 3 + 1] !== rolled[i * 3 + 1] || out[i * 3 + 2] !== rolled[i * 3 + 2]) changedOutside++;
      }
    }
    if (changedOutside) throw new Error(`Internal check failed: ${changedOutside} pixels outside the seam band changed.`);

    const after = seamStats(out, w, h);
    const png = await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
    return {
      imageData: toDataUrl(png),
      width: w, height: h, grain,
      before, after,
      untouchedPercent: Math.round((untouched / (w * h)) * 100),
      seconds: Math.round((Date.now() - t0) / 100) / 10,
    };
  }
}

/** Gaussian blur approximated by three box blurs (O(n) per pass whatever the sigma), edges clamped. */
function gauss(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const n = 3;
  let wl = Math.floor(Math.sqrt((12 * sigma * sigma) / n + 1));
  if (wl % 2 === 0) wl--;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  const radii = [0, 1, 2].map(i => ((i < m ? wl : wl + 2) - 1) / 2);
  let a = Float32Array.from(src);
  const b = new Float32Array(src.length);
  for (const r of radii) {
    if (r <= 0) continue;
    const inv = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
      const o = y * w; let acc = 0;
      for (let i = -r; i <= r; i++) acc += a[o + Math.min(w - 1, Math.max(0, i))];
      for (let x = 0; x < w; x++) { b[o + x] = acc * inv; acc += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += b[Math.min(h - 1, Math.max(0, i)) * w + x];
      for (let y = 0; y < h; y++) { a[y * w + x] = acc * inv; acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; }
    }
  }
  return a;
}

/**
 * Put the real photo's fine detail back onto a ~1 MP AI edit of it, at full size. See the header comment.
 * outSize: longest side of the result (0 = the photo's own size), capped at 4096 and at the photo's size.
 */
async function keepPhotoDetail(photo: Buffer, edited: Buffer, outSize: number) {
  const meta = await sharp(photo, { limitInputPixels: false }).rotate().metadata();
  const pw = meta.autoOrient?.width ?? meta.width ?? 2048, ph = meta.autoOrient?.height ?? meta.height ?? 2048;
  const longest = Math.min(4096, Math.max(pw, ph), outSize > 0 ? outSize : 4096);
  const scale = longest / Math.max(pw, ph);
  const W = Math.max(64, Math.round(pw * scale)), H = Math.max(64, Math.round(ph * scale));
  const o = await sharp(photo, { limitInputPixels: false }).rotate().removeAlpha().resize(W, H, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();
  const e = await sharp(edited).removeAlpha().resize(W, H, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();
  const N = W * H, k = Math.max(W, H) / 2048;
  const lo = new Float32Array(N), le = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    lo[i] = 0.299 * o[i * 3] + 0.587 * o[i * 3 + 1] + 0.114 * o[i * 3 + 2];
    le[i] = 0.299 * e[i * 3] + 0.587 * e[i * 3 + 1] + 0.114 * e[i * 3 + 2];
  }
  const lb = gauss(lo, W, H, 2.5 * k);
  const bo = gauss(lo, W, H, 3 * k), bo2 = gauss(lo, W, H, 10 * k);
  const be = gauss(le, W, H, 3 * k), be2 = gauss(le, W, H, 10 * k);
  const pab = new Float32Array(N), paa = new Float32Array(N), pbb = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = bo[i] - bo2[i], b = be[i] - be2[i];
    pab[i] = a * b; paa[i] = a * a; pbb[i] = b * b;
  }
  const sab = gauss(pab, W, H, 12 * k), saa = gauss(paa, W, H, 12 * k), sbb = gauss(pbb, W, H, 12 * k);
  const out = Buffer.alloc(N * 3);
  let cover = 0;
  for (let i = 0; i < N; i++) {
    const ncc = sab[i] / Math.sqrt(saa[i] * sbb[i] + 1e-6);
    const mask = Math.min(1, Math.max(0, (ncc - 0.15) / 0.35));
    cover += mask;
    const hp = mask * (lo[i] - lb[i]);
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.max(0, Math.min(255, Math.round(e[i * 3 + c] + hp)));
  }
  const png = await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  return { png, width: W, height: H, coverage: Math.round((cover / N) * 100) };
}

/** Seam strength: mean |step across the edge| / mean |step between neighbours| (1.0 = invisible). */
export function seamStats(px: Buffer | Uint8Array, w: number, h: number): SeamStats {
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = (px[i * 3] + px[i * 3 + 1] + px[i * 3 + 2]) / 3;
  let nx = 0, ny = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) nx += Math.abs(g[y * w + x + 1] - g[y * w + x]);
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w; x++) ny += Math.abs(g[(y + 1) * w + x] - g[y * w + x]);
  nx = nx / (h * (w - 1)) + 1e-6; ny = ny / ((h - 1) * w) + 1e-6;
  let lr = 0, tb = 0, cv = 0, ch = 0;
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  for (let y = 0; y < h; y++) { lr += Math.abs(g[y * w] - g[y * w + w - 1]); cv += Math.abs(g[y * w + cx] - g[y * w + cx - 1]); }
  for (let x = 0; x < w; x++) { tb += Math.abs(g[x] - g[(h - 1) * w + x]); ch += Math.abs(g[cy * w + x] - g[(cy - 1) * w + x]); }
  const r = (v: number) => Math.round(v * 10) / 10;
  return { wrapLR: r(lr / h / nx), wrapTB: r(tb / w / ny), crossV: r(cv / h / nx), crossH: r(ch / w / ny) };
}
