/**
 * Real binary .bgsm (Fallout 4 material) writer.
 *
 * Field order and types verified against the widely-used open-source
 * ousnius/Material-Editor reference implementation (MaterialLib/BaseMaterialFile.cs
 * + MaterialLib/BGSM.cs, original format reverse-engineering credited to "gibbed"),
 * https://github.com/ousnius/Material-Editor — not guessed from memory. Scoped to
 * BGSM version 2 (the Fallout 4 version; FO76's v20+ format has different fields
 * and is intentionally not supported here rather than guessed at).
 *
 * Binary conventions (confirmed from the reference source):
 *  - Signature: literal ASCII bytes "BGSM" (4 bytes)
 *  - All multi-byte numbers are little-endian (standard .NET BinaryWriter)
 *  - bool  -> 1 byte (0/1)
 *  - string -> uint32 length (= string length + 1 for the null terminator) followed
 *              by that many ASCII bytes, the last of which is '\0'
 *  - Color -> three float32 (R, G, B), each 0.0-1.0 — NOT a packed uint32
 */
import * as fs from 'fs';

export interface BgsmWriteInput {
  sDiffuseTexture?: string;
  sNormalTexture?: string;
  sSmoothSpecTexture?: string;
  sGreyscaleTexture?: string;
  sEnvMapTexture?: string;
  sInnerLayerTexture?: string;
  sDisplacementTexture?: string;
  sRootMaterialPath?: string;

  sf1?: Record<string, boolean>;
  sf2?: Record<string, boolean>;

  bEnableEditorAlphaRef?: boolean;
  fAlphaTestRef?: number;

  bRimLighting?: boolean;
  fRimPower?: number;
  fBackLightPower?: number;
  bSubsurfaceLighting?: boolean;
  fSubsurfaceLightingRolloff?: number;
  bAnisoLighting?: boolean;

  bSpecularEnabled?: boolean;
  cSpecularColor?: string; // hex "#rrggbb"
  fSpecularMult?: number;
  fSmoothness?: number;
  fFresnelPower?: number;

  fWetnessControl_SpecScale?: number;
  fWetnessControl_SpecPowerScale?: number;
  fWetnessControl_SpecMinvar?: number;
  fWetnessControl_EnvMapScale?: number;
  fWetnessControl_FresnelPower?: number;
  fWetnessControl_Metalness?: number;

  bEnvironmentMapping?: boolean;
  fEnvironmentMappingMaskScale?: number;
  bEnvironmentMappingEye?: boolean;

  bEmitEnabled?: boolean;
  cEmittanceColor?: string;
  fEmittanceMult?: number;
  bExternalEmittance?: boolean;
  bModelSpaceNormals?: boolean;
  bBackLighting?: boolean;

  bReceiveShadows?: boolean;
  bCastShadows?: boolean;
  bGlowmap?: boolean;
  bHair?: boolean;
  cHairTintColor?: string;
  bTree?: boolean;
  bFacegen?: boolean;
  bSkinTint?: boolean;

  bTessellate?: boolean;
  fDisplacementTextureBias?: number;
  fDisplacementTextureScale?: number;
  fTessellationPnScale?: number;
  fTessellationBaseFactor?: number;
  fTessellationFadeDistance?: number;

  fGrayscaleToPaletteScale?: number;
  bSkewSpecularAlpha?: boolean;

  fGlassRefractionScaler?: number;
}

class BgsmBufferWriter {
  private chunks: Buffer[] = [];

  bool(v: boolean | undefined): this {
    this.chunks.push(Buffer.from([v ? 1 : 0]));
    return this;
  }

  byte(v: number | undefined): this {
    const b = Buffer.alloc(1);
    b.writeUInt8(Math.max(0, Math.min(255, Math.round(v ?? 0))), 0);
    this.chunks.push(b);
    return this;
  }

  uint32(v: number): this {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(v >>> 0, 0);
    this.chunks.push(b);
    return this;
  }

  float(v: number | undefined): this {
    const b = Buffer.alloc(4);
    b.writeFloatLE(typeof v === 'number' && isFinite(v) ? v : 0, 0);
    this.chunks.push(b);
    return this;
  }

  /** Length-prefixed string: uint32(len+1) + ascii bytes + trailing '\0'. */
  string(v: string | undefined): this {
    const s = v || '';
    this.uint32(s.length + 1);
    this.chunks.push(Buffer.from(s, 'ascii'));
    this.chunks.push(Buffer.from([0]));
    return this;
  }

  /** Color stored as 3 floats (R,G,B), 0.0-1.0 — from a "#rrggbb" hex string. */
  color(hex: string | undefined): this {
    const clean = (hex || '#ffffff').replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    return this.float(isNaN(r) ? 1 : r).float(isNaN(g) ? 1 : g).float(isNaN(b) ? 1 : b);
  }

  raw(buf: Buffer): this {
    this.chunks.push(buf);
    return this;
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

/**
 * Write a real Fallout 4 BGSM v2 binary file. Only version 2 is supported —
 * FO76's v20+ format has additional/different fields that aren't implemented
 * here (would need separate verification, not guessed).
 */
export function writeBgsmFile(data: BgsmWriteInput, outputPath: string): void {
  const sf1 = data.sf1 || {};
  const sf2 = data.sf2 || {};
  const w = new BgsmBufferWriter();

  // ── Base material header (BaseMaterialFile, version-2 branch) ──────────
  w.raw(Buffer.from('BGSM', 'ascii')); // signature
  w.uint32(2); // version
  w.uint32(3); // tileFlags: bit1(TileV)|bit2(TileU) — default both tiling enabled
  w.float(0); // UOffset
  w.float(0); // VOffset
  w.float(1); // UScale
  w.float(1); // VScale
  w.float(1); // Alpha (overall material alpha — not separately exposed in the editor UI)
  // Alpha blend mode (3 raw fields) — defaulted to "no blending" baseline;
  // AlphaTest/AlphaTestRef below is what actually drives cutout transparency
  // for the presets this editor exposes (foliage/decal), which is unaffected.
  w.byte(0);
  w.uint32(0);
  w.uint32(0);
  w.byte(data.fAlphaTestRef); // AlphaTestRef
  w.bool(!!sf1.alphaTest); // AlphaTest
  w.bool(sf2.zbuffer_write !== false); // ZBufferWrite
  w.bool(true); // ZBufferTest
  w.bool(!!sf1.screenSpaceRefl); // ScreenSpaceReflections
  w.bool(!!sf1.wetness); // WetnessControlScreenSpaceReflections
  w.bool(!!sf1.decal); // Decal
  w.bool(!!sf2.two_sided); // TwoSided
  w.bool(!!sf2.no_fade); // DecalNoFade
  w.bool(false); // NonOccluder
  w.bool(!!sf2.refractive); // Refraction
  w.bool(!!sf1.refractionFalloff); // RefractionFalloff
  w.float(data.fGlassRefractionScaler); // RefractionPower
  w.bool(!!data.bEnvironmentMapping); // EnvironmentMapping (version < 10 — always for v2)
  w.float(data.fEnvironmentMappingMaskScale ?? 1); // EnvironmentMappingMaskScale
  w.bool(!!sf1.grayscaleToPalette); // GrayscaleToPaletteColor

  // ── BGSM-specific fields (version-2 branch) ─────────────────────────────
  w.string(data.sDiffuseTexture);
  w.string(data.sNormalTexture);
  w.string(data.sSmoothSpecTexture);
  w.string(data.sGreyscaleTexture);
  w.string(data.sEnvMapTexture); // EnvmapTexture (v <= 2)
  w.string(data.sInnerLayerTexture); // (v <= 2)
  w.string(data.sDisplacementTexture); // (v <= 2)
  w.bool(!!data.bEnableEditorAlphaRef);
  // RimLighting group (v < 8 — always for v2)
  w.bool(!!data.bRimLighting);
  w.float(data.fRimPower ?? 2.0);
  w.float(data.fBackLightPower ?? 0.0);
  w.bool(!!data.bSubsurfaceLighting);
  w.float(data.fSubsurfaceLightingRolloff ?? 0.3);
  w.bool(!!data.bSpecularEnabled);
  w.color(data.cSpecularColor);
  w.float(data.fSpecularMult ?? 1.0);
  w.float(data.fSmoothness ?? 1.0);
  w.float(data.fFresnelPower ?? 5.0);
  w.float(data.fWetnessControl_SpecScale ?? 0);
  w.float(data.fWetnessControl_SpecPowerScale ?? 0);
  w.float(data.fWetnessControl_SpecMinvar ?? 0);
  w.float(data.fWetnessControl_EnvMapScale ?? 0); // (v < 10 — always for v2)
  w.float(data.fWetnessControl_FresnelPower ?? 0);
  w.float(data.fWetnessControl_Metalness ?? 0);
  w.string(data.sRootMaterialPath);
  w.bool(!!data.bAnisoLighting);
  w.bool(!!data.bEmitEnabled);
  if (data.bEmitEnabled) {
    w.color(data.cEmittanceColor); // only present in the stream when EmitEnabled
  }
  w.float(data.fEmittanceMult ?? 1.0);
  w.bool(!!data.bModelSpaceNormals);
  w.bool(!!data.bExternalEmittance);
  // BackLighting (v < 8 — always for v2)
  w.bool(!!data.bBackLighting);
  w.bool(data.bReceiveShadows !== false);
  w.bool(false); // HideSecret
  w.bool(data.bCastShadows !== false);
  w.bool(false); // DissolveFade
  w.bool(false); // AssumeShadowmask
  w.bool(!!data.bGlowmap);
  w.bool(false); // EnvironmentMappingWindow (v < 7 — always for v2)
  w.bool(!!data.bEnvironmentMappingEye); // EnvironmentMappingEye (v < 7)
  w.bool(!!data.bHair);
  w.color(data.cHairTintColor);
  w.bool(!!data.bTree);
  w.bool(!!data.bFacegen);
  w.bool(!!data.bSkinTint);
  w.bool(!!data.bTessellate);
  // Displacement/tessellation group (v < 3 — always for v2)
  w.float(data.fDisplacementTextureBias ?? -0.5);
  w.float(data.fDisplacementTextureScale ?? 10.0);
  w.float(data.fTessellationPnScale ?? 1.0);
  w.float(data.fTessellationBaseFactor ?? 1.0);
  w.float(data.fTessellationFadeDistance ?? 0.0);
  w.float(data.fGrayscaleToPaletteScale ?? 1.0);
  w.bool(!!data.bSkewSpecularAlpha); // (v >= 1 — always for v2)
  // Terrain fields (v >= 3) are intentionally omitted — not applicable at v2.

  fs.writeFileSync(outputPath, w.toBuffer());
}
