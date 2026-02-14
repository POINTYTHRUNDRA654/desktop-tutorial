/**
 * Blender Bridge
 * Python-based automation for Blender operations
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ScriptRunOptions {
  background?: boolean;
  captureOutput?: boolean;
  timeout?: number;
  workingDirectory?: string;
}

export interface ConversionOptions {
  scale?: number;
  applyModifiers?: boolean;
  exportTextures?: boolean;
  targetVersion?: string; // NIF version
}

export interface BatchProcessOptions {
  parallel?: boolean;
  maxConcurrent?: number;
  continueOnError?: boolean;
  progressCallback?: (current: number, total: number, file: string) => void;
}

export class BlenderBridge {
  private blenderPath: string;
  private pythonScriptPath: string;
  private tempDir: string;

  constructor(blenderPath?: string, pythonScriptPath?: string) {
    this.blenderPath = blenderPath || this.detectBlender();
    this.pythonScriptPath = pythonScriptPath || path.join(os.tmpdir(), 'mossy_blender_scripts');
    this.tempDir = path.join(os.tmpdir(), 'mossy_blender_temp');

    // Ensure temp directories exist
    if (!fs.existsSync(this.pythonScriptPath)) {
      fs.mkdirSync(this.pythonScriptPath, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Run custom Python script in Blender
   */
  async runScript(
    scriptContent: string,
    args: any = {},
    options: ScriptRunOptions = {}
  ): Promise<any> {
    const {
      background = true,
      captureOutput = true,
      timeout = 300000,
      workingDirectory
    } = options;

    if (!fs.existsSync(this.blenderPath)) {
      throw new Error(`Blender not found: ${this.blenderPath}`);
    }

    // Create temp script file
    const scriptPath = path.join(this.pythonScriptPath, `script_${Date.now()}.py`);
    
    // Wrap script with argument injection
    const wrappedScript = this.wrapScript(scriptContent, args);
    fs.writeFileSync(scriptPath, wrappedScript);

    try {
      const blenderArgs = [];
      
      if (background) {
        blenderArgs.push('--background');
      }
      
      blenderArgs.push('--python', scriptPath);

      const execOptions: any = {
        maxBuffer: 20 * 1024 * 1024,
        timeout
      };

      if (workingDirectory) {
        execOptions.cwd = workingDirectory;
      }

      const { stdout, stderr } = await execFileAsync(this.blenderPath, blenderArgs, execOptions);

      if (captureOutput) {
        // Parse output for results (convert Buffer to string)
        return this.parseScriptOutput(stdout.toString(), stderr.toString());
      }

      return { success: true };
    } catch (error: any) {
      throw new Error(`Blender script execution failed: ${error.message}`);
    } finally {
      // Cleanup temp script
      if (fs.existsSync(scriptPath)) {
        try {
          fs.unlinkSync(scriptPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Convert FBX to NIF using Blender NIF plugin
   */
  async convertFBXToNIF(
    fbxPath: string,
    nifPath: string,
    options: ConversionOptions = {}
  ): Promise<void> {
    if (!fs.existsSync(fbxPath)) {
      throw new Error(`FBX file not found: ${fbxPath}`);
    }

    const {
      scale = 1.0,
      applyModifiers = true,
      exportTextures = true,
      targetVersion = '20.2.0.7'
    } = options;

    const script = `
import bpy
import os

# Clear scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import FBX
print("Importing FBX: ${fbxPath.replace(/\\/g, '\\\\')}")
try:
    bpy.ops.import_scene.fbx(
        filepath="${fbxPath.replace(/\\/g, '\\\\')}",
        use_manual_orientation=True,
        global_scale=${scale},
        use_custom_normals=True,
        use_image_search=True
    )
    print("FBX import successful")
except Exception as e:
    print(f"FBX import error: {e}")
    exit(1)

# Apply modifiers if requested
${applyModifiers ? `
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        for mod in obj.modifiers:
            try:
                bpy.ops.object.modifier_apply(modifier=mod.name)
            except:
                pass
` : ''}

# Export NIF
print("Exporting NIF: ${nifPath.replace(/\\/g, '\\\\')}")
try:
    # Check if NIF plugin is available
    if hasattr(bpy.ops, 'export_scene') and hasattr(bpy.ops.export_scene, 'nif'):
        bpy.ops.export_scene.nif(
            filepath="${nifPath.replace(/\\/g, '\\\\')}",
            scale_correction=${scale},
            apply_scale=${applyModifiers ? 'True' : 'False'},
            game='FALLOUT_4',
            nif_version='${targetVersion}'
        )
        print("NIF export successful")
    else:
        print("ERROR: Blender NIF plugin not installed!")
        print("Please install io_scene_niftools addon")
        exit(1)
except Exception as e:
    print(f"NIF export error: {e}")
    exit(1)

print("Conversion complete")
`;

    await this.runScript(script, {}, { background: true });

    // Verify output was created
    if (!fs.existsSync(nifPath)) {
      throw new Error('NIF conversion failed - output file not created');
    }
  }

  /**
   * Convert NIF to FBX using Blender NIF plugin
   */
  async convertNIFToFBX(
    nifPath: string,
    fbxPath: string,
    options: ConversionOptions = {}
  ): Promise<void> {
    if (!fs.existsSync(nifPath)) {
      throw new Error(`NIF file not found: ${nifPath}`);
    }

    const {
      scale = 1.0,
      exportTextures = true
    } = options;

    const script = `
import bpy
import os

# Clear scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import NIF
print("Importing NIF: ${nifPath.replace(/\\/g, '\\\\')}")
try:
    if hasattr(bpy.ops, 'import_scene') and hasattr(bpy.ops.import_scene, 'nif'):
        bpy.ops.import_scene.nif(
            filepath="${nifPath.replace(/\\/g, '\\\\')}",
            scale_correction=${scale}
        )
        print("NIF import successful")
    else:
        print("ERROR: Blender NIF plugin not installed!")
        exit(1)
except Exception as e:
    print(f"NIF import error: {e}")
    exit(1)

# Export FBX
print("Exporting FBX: ${fbxPath.replace(/\\/g, '\\\\')}")
try:
    bpy.ops.export_scene.fbx(
        filepath="${fbxPath.replace(/\\/g, '\\\\')}",
        global_scale=${scale},
        apply_unit_scale=True,
        use_mesh_modifiers=True,
        mesh_smooth_type='FACE'
    )
    print("FBX export successful")
except Exception as e:
    print(f"FBX export error: {e}")
    exit(1)

print("Conversion complete")
`;

    await this.runScript(script, {}, { background: true });

    if (!fs.existsSync(fbxPath)) {
      throw new Error('FBX conversion failed - output file not created');
    }
  }

  /**
   * Batch process multiple files with specified operation
   */
  async batchProcess(
    files: string[],
    operation: 'fbx-to-nif' | 'nif-to-fbx' | 'optimize' | 'validate',
    options: BatchProcessOptions = {}
  ): Promise<BatchResult> {
    const {
      continueOnError = true,
      progressCallback
    } = options;

    const result: BatchResult = {
      totalFiles: files.length,
      successCount: 0,
      failureCount: 0,
      results: []
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (progressCallback) {
        progressCallback(i + 1, files.length, file);
      }

      try {
        let success = false;

        switch (operation) {
          case 'fbx-to-nif': {
            const nifPath = file.replace(/\.fbx$/i, '.nif');
            await this.convertFBXToNIF(file, nifPath);
            success = true;
            result.results.push({ file, success, outputPath: nifPath });
            break;
          }
          case 'nif-to-fbx': {
            const fbxPath = file.replace(/\.nif$/i, '.fbx');
            await this.convertNIFToFBX(file, fbxPath);
            success = true;
            result.results.push({ file, success, outputPath: fbxPath });
            break;
          }
          case 'optimize': {
            await this.optimizeMesh(file);
            success = true;
            result.results.push({ file, success });
            break;
          }
          case 'validate': {
            const isValid = await this.validateFile(file);
            success = isValid;
            result.results.push({ file, success });
            break;
          }
        }

        if (success) {
          result.successCount++;
        } else {
          result.failureCount++;
        }
      } catch (error: any) {
        result.failureCount++;
        result.results.push({ 
          file, 
          success: false, 
          error: error.message 
        });

        if (!continueOnError) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Check if Blender NIF plugin is installed
   */
  async checkNIFPlugin(): Promise<PluginStatus> {
    const script = `
import bpy

# Check for NIF plugin
has_nif = hasattr(bpy.ops, 'export_scene') and hasattr(bpy.ops.export_scene, 'nif')
has_import = hasattr(bpy.ops, 'import_scene') and hasattr(bpy.ops.import_scene, 'nif')

if has_nif and has_import:
    print("STATUS:INSTALLED")
    
    # Try to get version
    try:
        import io_scene_niftools
        version = io_scene_niftools.bl_info.get('version', 'Unknown')
        print(f"VERSION:{version}")
    except:
        print("VERSION:Unknown")
else:
    print("STATUS:NOT_INSTALLED")
`;

    try {
      const result = await this.runScript(script, {}, { background: true });
      
      if (result.output && result.output.includes('STATUS:INSTALLED')) {
        const versionMatch = result.output.match(/VERSION:(.+)/);
        return {
          installed: true,
          version: versionMatch ? versionMatch[1].trim() : 'Unknown'
        };
      } else {
        return {
          installed: false,
          error: 'Blender NIF plugin (io_scene_niftools) not found'
        };
      }
    } catch (error: any) {
      return {
        installed: false,
        error: error.message
      };
    }
  }

  /**
   * Optimize mesh (reduce polygons, clean up)
   */
  private async optimizeMesh(meshPath: string): Promise<void> {
    const script = `
import bpy

# Load file
bpy.ops.wm.read_factory_settings(use_empty=True)

ext = "${path.extname(meshPath).toLowerCase()}"
if ext == '.fbx':
    bpy.ops.import_scene.fbx(filepath="${meshPath.replace(/\\/g, '\\\\')}")
elif ext == '.nif':
    bpy.ops.import_scene.nif(filepath="${meshPath.replace(/\\/g, '\\\\')}")
else:
    print("Unsupported file type")
    exit(1)

# Optimize all meshes
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        
        # Remove doubles
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.0001)
        bpy.ops.mesh.delete_loose()
        bpy.ops.object.mode_set(mode='OBJECT')

# Save back to original file
if ext == '.fbx':
    bpy.ops.export_scene.fbx(filepath="${meshPath.replace(/\\/g, '\\\\')}")
elif ext == '.nif':
    bpy.ops.export_scene.nif(filepath="${meshPath.replace(/\\/g, '\\\\')}")

print("Optimization complete")
`;

    await this.runScript(script, {}, { background: true });
  }

  /**
   * Validate file can be imported
   */
  private async validateFile(filePath: string): Promise<boolean> {
    const script = `
import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)

ext = "${path.extname(filePath).toLowerCase()}"
try:
    if ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath="${filePath.replace(/\\/g, '\\\\')}")
    elif ext == '.nif':
        bpy.ops.import_scene.nif(filepath="${filePath.replace(/\\/g, '\\\\')}")
    else:
        exit(1)
    print("VALID")
except Exception as e:
    print(f"INVALID: {e}")
    exit(1)
`;

    try {
      const result = await this.runScript(script, {}, { background: true });
      return result.output && result.output.includes('VALID');
    } catch {
      return false;
    }
  }

  /**
   * Detect Blender installation
   */
  private detectBlender(): string {
    const commonPaths = [
      'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender\\blender.exe',
      'C:\\Program Files (x86)\\Blender Foundation\\Blender\\blender.exe'
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error('Blender not found. Please install Blender or specify path manually.');
  }

  /**
   * Wrap script with argument injection and output capture
   */
  private wrapScript(scriptContent: string, args: any): string {
    const argsJson = JSON.stringify(args).replace(/"/g, '\\"');
    
    return `
import json
import sys

# Inject arguments
SCRIPT_ARGS = json.loads("${argsJson}")

# Original script
${scriptContent}

# Make sure we flush output
sys.stdout.flush()
sys.stderr.flush()
`;
  }

  /**
   * Parse script output for structured results
   */
  private parseScriptOutput(stdout: string, stderr: string): any {
    const output = stdout + '\n' + stderr;
    
    // Look for JSON output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Not valid JSON, return raw output
      }
    }

    return {
      success: !output.toLowerCase().includes('error'),
      output: output.trim()
    };
  }
}

interface BatchResult {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    file: string;
    success: boolean;
    outputPath?: string;
    error?: string;
  }>;
}

interface PluginStatus {
  installed: boolean;
  version?: string;
  error?: string;
}
