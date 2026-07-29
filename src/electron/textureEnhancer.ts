/**
 * Texture Enhancement Engine - Orchestrates via BridgeServer + Blender
 * 
 * Routes texture processing to Blender (Neural Link) using existing infrastructure.
 * No external ESRGAN/Python - uses Blender's native image & shader capabilities.
 */

import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { BridgeServer } from './BridgeServer';
import {
  generateMaterialDefinitions,
  saveMaterialManifest,
  validateMaterialManifest,
  type MossyMaterialManifest,
} from './materialDefinitions';

// Job registry for tracking enhancement status
interface EnhancementJobStatus {
  jobId: string;
  modPath: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  currentFile: string;
  totalFiles: number;
  startTime: number;
  error?: string;
  manifest?: MossyMaterialManifest;
}

const jobRegistry = new Map<string, EnhancementJobStatus>();

export interface TextureAnalysis {
  totalTextures: number;
  diffuseCount: number;
  normalCount: number;
  specularCount: number;
  totalSize: number;
  estimatedEnhancedSize: number;
  textures: {
    diffuse: string[];
    normal: string[];
    specular: string[];
  };
}

export interface EnhancementRequest {
  jobId: string;
  modPath: string;
  level: 4 | 8 | 16;
  materials?: string[];
}

/**
 * Analyze mod for DDS textures
 */
export async function analyzeModTextures(modPath: string): Promise<TextureAnalysis> {
  const analysis: TextureAnalysis = {
    totalTextures: 0,
    diffuseCount: 0,
    normalCount: 0,
    specularCount: 0,
    totalSize: 0,
    estimatedEnhancedSize: 0,
    textures: {
      diffuse: [],
      normal: [],
      specular: [],
    },
  };

  try {
    // Walk directory tree looking for .dds files
    const walkDir = (dirPath: string) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.dds')) {
          const stat = fs.statSync(fullPath);
          const relativePath = path.relative(modPath, fullPath);
          const baseName = path.basename(entry.name).toLowerCase();

          // Categorize by naming convention (Fallout 4 standard)
          if (
            baseName.includes('diffuse') ||
            baseName.includes('_d.dds') ||
            baseName.includes('color')
          ) {
            analysis.textures.diffuse.push(relativePath);
            analysis.diffuseCount++;
          } else if (
            baseName.includes('normal') ||
            baseName.includes('_n.dds')
          ) {
            analysis.textures.normal.push(relativePath);
            analysis.normalCount++;
          } else if (
            baseName.includes('specular') ||
            baseName.includes('_s.dds') ||
            baseName.includes('gloss')
          ) {
            analysis.textures.specular.push(relativePath);
            analysis.specularCount++;
          }

          analysis.totalTextures++;
          analysis.totalSize += stat.size;
        }
      }
    };

    walkDir(modPath);

    // Estimate enhancement size (4x upscaling ~= 4x original per mip-map level)
    // Average DDS with mipmaps is ~2x the base texture, so 4x upscaling gives ~8x data increase
    // But we'll be more conservative: 4-5x
    analysis.estimatedEnhancedSize = analysis.totalSize * 4.5;

    return analysis;
  } catch (err) {
    console.error('[TextureEnhancer] Analysis failed:', err);
    throw err;
  }
}

/**
 * Route enhancement request to Blender via BridgeServer
 */
export async function enhanceTexturesViaBlender(
  request: EnhancementRequest,
  bridgeServer: BridgeServer,
  textureAnalysis: TextureAnalysis,
  mainWindow?: BrowserWindow
): Promise<{ success: boolean; message: string; jobId: string; manifest?: MossyMaterialManifest }> {
  try {
    // Register job in registry
    const jobStatus: EnhancementJobStatus = {
      jobId: request.jobId,
      modPath: request.modPath,
      status: 'processing',
      progress: 0,
      currentFile: 'Initializing...',
      totalFiles: textureAnalysis.totalTextures,
      startTime: Date.now(),
    };
    jobRegistry.set(request.jobId, jobStatus);

    // Notify renderer of job start
    if (mainWindow) {
      mainWindow.webContents.send('enhancer:job-started', {
        jobId: request.jobId,
        totalFiles: textureAnalysis.totalTextures,
        estimatedSize: textureAnalysis.totalSize,
      });
    }

    // Generate Blender Python script for texture processing
    const blenderScript = generateBlenderEnhancementScript(
      request.modPath,
      request.level,
      request.materials
    );

    console.log(
      `[TextureEnhancer] Sending enhancement job ${request.jobId} to Blender...`
    );

    // Send to BridgeServer for execution via Neural Link
    // The BridgeServer will forward to Blender addon on port 9999
    const result = await bridgeServer.executeBlenderScript({
      script: blenderScript,
      jobId: request.jobId,
    });

    // Update job status: processing -> generating materials
    jobStatus.progress = 75;
    jobStatus.currentFile = 'Generating material definitions...';
    if (mainWindow) {
      mainWindow.webContents.send('enhancer:progress', jobStatus);
    }

    // Generate material manifest after successful enhancement
    const outputDir = path.join(request.modPath, '.mossy_enhanced');
    const modName = path.basename(request.modPath);
    const manifest = generateMaterialDefinitions(
      request.modPath,
      textureAnalysis.textures,
      request.level,
      modName,
      Math.floor((Date.now() - jobStatus.startTime) / 1000)
    );

    // Save manifest
    saveMaterialManifest(outputDir, manifest);

    // Validate manifest
    const validation = validateMaterialManifest(manifest);
    if (!validation.valid) {
      console.warn('[TextureEnhancer] Manifest validation warnings:', validation.errors);
    }

    // Update job status: complete
    jobStatus.status = 'complete';
    jobStatus.progress = 100;
    jobStatus.currentFile = 'Complete!';
    jobStatus.manifest = manifest;
    jobRegistry.set(request.jobId, jobStatus);

    // Notify renderer of completion
    if (mainWindow) {
      mainWindow.webContents.send('enhancer:complete', {
        jobId: request.jobId,
        manifest,
        processingTimeSeconds: Math.floor((Date.now() - jobStatus.startTime) / 1000),
      });
    }

    return {
      success: true,
      message: `Enhancement job ${request.jobId} completed successfully`,
      jobId: request.jobId,
      manifest,
    };
  } catch (err) {
    console.error('[TextureEnhancer] Blender execution failed:', err);

    // Update job status: error
    const jobStatus = jobRegistry.get(request.jobId);
    if (jobStatus) {
      jobStatus.status = 'error';
      jobStatus.error = String(err);
      jobRegistry.set(request.jobId, jobStatus);

      // Notify renderer of error
      if (mainWindow) {
        mainWindow.webContents.send('enhancer:error', {
          jobId: request.jobId,
          error: String(err),
        });
      }
    }

    return {
      success: false,
      message: `Failed to send job to Blender: ${err}`,
      jobId: request.jobId,
    };
  }
}

/**
 * Generate Blender Python script for texture enhancement
 * Uses PIL/Pillow for upscaling + Blender for material map generation
 */
function generateBlenderEnhancementScript(
  modPath: string,
  level: 4 | 8 | 16,
  materials?: string[]
): string {
  const scaleFactor = level; // 4x, 8x, or 16x
  const outputDir = path.join(modPath, '.mossy_enhanced');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return `
import bpy
import os
import json
from pathlib import Path
from PIL import Image
import numpy as np

# Texture Enhancement via Blender + Pillow
# Supports: Upscaling, normal map enhancement, PBR map generation

MOD_PATH = r"${modPath.replace(/\\/g, '\\\\')}"
OUTPUT_DIR = r"${outputDir.replace(/\\/g, '\\\\')}"
SCALE_FACTOR = ${scaleFactor}
JOB_ID = "${materials?.[0] || 'enhancement'}"

print(f"[Mossy] Starting texture enhancement: {MOD_PATH}")
print(f"[Mossy] Scale factor: {SCALE_FACTOR}x")
print(f"[Mossy] Using Pillow + Blender for enhancement")

# Ensure output dir exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Enable GPU acceleration in Blender if available
for scene in bpy.data.scenes:
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU'
    scene.cycles.use_denoising = True

# Find all DDS textures in mod
dds_files = []
for root, dirs, files in os.walk(MOD_PATH):
    for file in files:
        if file.lower().endswith('.dds'):
            dds_files.append(os.path.join(root, file))

print(f"[Mossy] Found {len(dds_files)} DDS textures")

# Classify textures by naming convention
def classify_texture(filename):
    """Classify texture by naming convention"""
    lower = filename.lower()
    if 'diffuse' in lower or '_d.dds' in lower or 'color' in lower:
        return 'diffuse'
    elif 'normal' in lower or '_n.dds' in lower:
        return 'normal'
    elif 'specular' in lower or '_s.dds' in lower or 'gloss' in lower:
        return 'specular'
    elif 'roughness' in lower or 'rough' in lower:
        return 'roughness'
    elif 'metallic' in lower or 'metal' in lower:
        return 'metallic'
    elif 'ao' in lower or 'ambient' in lower or 'occlusion' in lower:
        return 'ao'
    else:
        return 'unknown'

# Process each texture
processed_count = 0
error_count = 0

for i, texture_path in enumerate(dds_files):
    try:
        rel_path = os.path.relpath(texture_path, MOD_PATH)
        output_path = os.path.join(OUTPUT_DIR, rel_path)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        progress = int((i / len(dds_files)) * 100)
        print(f"[Mossy] [{progress}%] Processing [{i+1}/{len(dds_files)}]: {rel_path}")
        
        # Load image with Pillow
        img = Image.open(texture_path)
        original_format = img.format
        
        # Get texture classification
        tex_type = classify_texture(os.path.basename(texture_path))
        
        # Calculate new dimensions for upscaling
        new_width = img.width * SCALE_FACTOR
        new_height = img.height * SCALE_FACTOR
        
        # Upscale using high-quality resampling
        # Lanczos is good for photo-like upscaling
        upscaled = img.resize(
            (new_width, new_height),
            Image.Resampling.LANCZOS
        )
        
        # For normal maps: enhance details with unsharp mask
        if tex_type == 'normal':
            # Convert to numpy array for processing
            img_array = np.array(upscaled)
            
            # Apply slight sharpening to normal details
            # Unsharp mask: (original - blurred) * strength + original
            from PIL import ImageFilter
            blurred = upscaled.filter(ImageFilter.GaussianBlur(radius=1.0))
            blurred_array = np.array(blurred)
            
            # Blend for controlled sharpening
            strength = 1.2
            enhanced_array = (img_array.astype(float) - blurred_array.astype(float)) * strength + img_array.astype(float)
            enhanced_array = np.clip(enhanced_array, 0, 255).astype(np.uint8)
            
            upscaled = Image.fromarray(enhanced_array)
            print(f"[Mossy]   → Enhanced normal map with detail sharpening")
        
        # Save upscaled texture in DDS format
        upscaled.save(output_path)
        print(f"[Mossy]   → Upscaled {SCALE_FACTOR}x ({img.width}x{img.height} → {new_width}x{new_height})")
        print(f"[Mossy]   → Type: {tex_type}")
        print(f"[Mossy]   → Saved: {os.path.basename(output_path)}")
        
        processed_count += 1
        
    except Exception as e:
        error_count += 1
        print(f"[Mossy] ERROR processing {texture_path}: {e}")

# Generate material manifest
print(f"[Mossy] Generating material manifest...")

manifest = {
    "version": "1.0",
    "modName": os.path.basename(MOD_PATH),
    "enhancedAt": str(Path.ctime(Path(OUTPUT_DIR))),
    "enhancementLevel": SCALE_FACTOR,
    "totalTextures": processed_count,
    "textureStatistics": {
        "diffuseCount": len([f for f in dds_files if 'diffuse' in f.lower() or '_d.dds' in f.lower()]),
        "normalCount": len([f for f in dds_files if 'normal' in f.lower() or '_n.dds' in f.lower()]),
        "specularCount": len([f for f in dds_files if 'specular' in f.lower() or '_s.dds' in f.lower()]),
    },
    "processingStatus": {
        "processed": processed_count,
        "errors": error_count,
    }
}

# Save manifest
manifest_path = os.path.join(OUTPUT_DIR, '.mossy_enhanced_manifest.json')
with open(manifest_path, 'w') as f:
    json.dump(manifest, f, indent=2)

print(f"[Mossy] Enhancement complete!")
print(f"[Mossy]   → Processed: {processed_count} textures")
print(f"[Mossy]   → Errors: {error_count}")
print(f"[Mossy]   → Output: {OUTPUT_DIR}")
print(f"[Mossy]   → Manifest: {manifest_path}")
print(f"[Mossy] Job ID: {JOB_ID}")
`;
}

/**
 * Register IPC handlers for texture enhancement
 */
export function registerTextureEnhancerHandlers(
  bridgeServer: BridgeServer,
  mainWindow?: BrowserWindow
) {
  /**
   * Analyze mod textures
   */
  ipcMain.handle(
    'texture-enhancer:analyze',
    async (event, modPath: string) => {
      try {
        const analysis = await analyzeModTextures(modPath);
        return { success: true, analysis };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
        };
      }
    }
  );

  // NOTE: 'texture-enhancer:enhance' is intentionally NOT registered here.
  // The real, current handler lives in main.ts (registerHandler('texture-enhancer:enhance', ...))
  // and is registered earlier during startup. Since ipcMain.handle() throws on a duplicate
  // channel registration, registering it again here used to abort this function midway —
  // silently skipping the 'texture-enhancer:status' registration below AND the
  // registerCloudSyncHandlers() call made right after this function returns.

  /**
   * Get enhancement job status
   */
  ipcMain.handle(
    'texture-enhancer:status',
    async (event, jobId: string) => {
      const job = jobRegistry.get(jobId);
      if (!job) {
        return {
          success: false,
          error: `Job ${jobId} not found`,
        };
      }
      return {
        success: true,
        jobId,
        status: job.status,
        progress: job.progress,
        currentFile: job.currentFile,
        totalFiles: job.totalFiles,
        error: job.error,
      };
    }
  );

  /**
   * Get available texture files for a material
   */
  ipcMain.handle(
    'material:browse-textures',
    async (event, modPath: string) => {
      try {
        const textures: string[] = [];
        
        // Walk mod directory for DDS files
        const walkDir = (dirPath: string, relativePath = '') => {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relPath = relativePath ? `${relativePath}\\${entry.name}` : entry.name;

            if (entry.isDirectory()) {
              walkDir(fullPath, relPath);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.dds')) {
              textures.push(relPath);
            }
          }
        };

        walkDir(modPath);
        return { success: true, textures };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
          textures: [],
        };
      }
    }
  );

  console.log('[TextureEnhancer] IPC handlers registered');
}

export default {
  analyzeModTextures,
  enhanceTexturesViaBlender,
  registerTextureEnhancerHandlers,
};
