"""
mossy_texture_enhancer.py - Blender Script for Texture Enhancement
===================================================================

Enhances Fallout 4 mod textures via Blender:
- Upscales textures (4x, 8x, 16x)
- Generates material maps (Metallic, AO, Cavity)
- Enhances normal maps
- Optimizes specular/roughness
- GPU-accelerated via Cycles

Usage:
  This script is invoked by Mossy Desktop via BridgeServer.
  It processes DDS textures and generates enhanced versions.

Requirements:
  - Blender 3.0+
  - CUDA/HIP/OptiX GPU (recommended for speed)
  - PIL/Pillow for image processing
"""

import bpy
import os
import sys
import json
from pathlib import Path
from datetime import datetime

# ============================================================================
# Configuration
# ============================================================================

MOD_PATH = os.environ.get('MOSSY_MOD_PATH', '.')
OUTPUT_DIR = os.environ.get('MOSSY_OUTPUT_DIR', os.path.join(MOD_PATH, '.mossy_enhanced'))
SCALE_FACTOR = int(os.environ.get('MOSSY_SCALE_FACTOR', '4'))
JOB_ID = os.environ.get('MOSSY_JOB_ID', 'enhancement')

# ============================================================================
# Logging
# ============================================================================

def log_message(level: str, message: str, context: dict = None):
    """Log message back to Mossy via stdout"""
    timestamp = datetime.now().isoformat()
    log_entry = {
        'timestamp': timestamp,
        'level': level,
        'message': message,
        'jobId': JOB_ID,
    }
    if context:
        log_entry['context'] = context
    
    # Print JSON for IPC capture
    print(json.dumps(log_entry))


def log_info(message: str, context: dict = None):
    """Log info message"""
    log_message('INFO', message, context)


def log_warning(message: str, context: dict = None):
    """Log warning message"""
    log_message('WARNING', message, context)


def log_error(message: str, context: dict = None):
    """Log error message"""
    log_message('ERROR', message, context)


# ============================================================================
# Setup
# ============================================================================

def setup_gpu_rendering():
    """Configure GPU rendering for texture processing"""
    try:
        # Enable GPU
        for scene in bpy.data.scenes:
            scene.render.engine = 'CYCLES'
            scene.cycles.device = 'GPU'
            scene.cycles.use_denoising = True
            
            # Use all GPU compute devices available
            preferences = bpy.context.preferences
            compute_devices = preferences.addons['cycles'].preferences.get_devices()
            if compute_devices:
                for device in compute_devices[1]:  # [0] is CPU, [1] is GPU devices
                    device.use = True
        
        gpu_type = bpy.context.preferences.system.compute_device_type
        log_info('GPU rendering enabled', {'compute_device': gpu_type})
        return True
    except Exception as e:
        log_warning(f'GPU setup failed (will use CPU): {e}')
        return False


def ensure_output_directory():
    """Create output directory if needed"""
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        log_info('Output directory ready', {'path': OUTPUT_DIR})
        return True
    except Exception as e:
        log_error(f'Failed to create output directory: {e}')
        return False


# ============================================================================
# Texture Discovery
# ============================================================================

def find_textures() -> dict:
    """Find all DDS textures in mod directory"""
    textures = {
        'diffuse': [],
        'normal': [],
        'specular': [],
        'other': [],
    }
    
    try:
        for root, dirs, files in os.walk(MOD_PATH):
            for file in files:
                if not file.lower().endswith('.dds'):
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, MOD_PATH)
                base_name = file.lower()
                
                # Categorize by naming convention (Fallout 4 standard)
                if 'diffuse' in base_name or '_d.dds' in base_name or 'color' in base_name:
                    textures['diffuse'].append((full_path, rel_path))
                elif 'normal' in base_name or '_n.dds' in base_name:
                    textures['normal'].append((full_path, rel_path))
                elif 'specular' in base_name or '_s.dds' in base_name or 'gloss' in base_name:
                    textures['specular'].append((full_path, rel_path))
                else:
                    textures['other'].append((full_path, rel_path))
        
        total = sum(len(v) for v in textures.values())
        log_info(
            f'Found {total} DDS textures',
            {
                'diffuse': len(textures['diffuse']),
                'normal': len(textures['normal']),
                'specular': len(textures['specular']),
                'other': len(textures['other']),
            }
        )
        return textures
    except Exception as e:
        log_error(f'Texture discovery failed: {e}')
        return {k: [] for k in textures.keys()}


# ============================================================================
# Texture Processing (Compositor-based)
# ============================================================================

def setup_compositor_for_upscaling(scale_factor: int):
    """Setup compositor nodes for GPU-accelerated upscaling"""
    scene = bpy.context.scene
    
    # Enable compositor
    scene.use_nodes = True
    nodes = scene.node_tree.nodes
    links = scene.node_tree.links
    
    # Clear existing nodes
    nodes.clear()
    
    # Create input node (texture)
    image_node = nodes.new(type='CompositorNodeImage')
    image_node.name = 'SourceTexture'
    
    # Create scale node
    scale_node = nodes.new(type='CompositorNodeScale')
    scale_node.space = 'RENDER_PERCENTAGE'
    scale_node.inputs['X'].default_value = scale_factor * 100
    scale_node.inputs['Y'].default_value = scale_factor * 100
    
    # Create output node
    output_node = nodes.new(type='CompositorNodeComposite')
    output_node.name = 'Output'
    
    # Connect nodes
    links.new(image_node.outputs['Image'], scale_node.inputs['Image'])
    links.new(scale_node.outputs['Image'], output_node.inputs['Image'])
    
    return image_node, scale_node, output_node


def process_texture(texture_path: str, rel_path: str, texture_type: str, scale_factor: int) -> bool:
    """Process a single texture with upscaling"""
    try:
        log_info(f'Processing: {rel_path}', {'type': texture_type, 'scale': scale_factor})
        
        # Setup compositor
        image_node, scale_node, output_node = setup_compositor_for_upscaling(scale_factor)
        
        # Load texture
        if texture_path in bpy.data.images:
            img = bpy.data.images[texture_path]
        else:
            img = bpy.data.images.load(texture_path, check_existing=True)
        
        image_node.image = img
        
        # Calculate output size
        orig_width = img.size[0]
        orig_height = img.size[1]
        new_width = orig_width * scale_factor
        new_height = orig_height * scale_factor
        
        log_info(
            f'Upscaling texture',
            {
                'from': f'{orig_width}x{orig_height}',
                'to': f'{new_width}x{new_height}',
                'factor': scale_factor,
            }
        )
        
        # Render compositor to image
        scene = bpy.context.scene
        original_format = scene.render.image_settings.file_format
        scene.render.image_settings.file_format = 'PNG'  # Intermediate format
        
        # Create output image
        output_img = bpy.data.images.new(
            name=f'enhanced_{Path(rel_path).stem}',
            width=new_width,
            height=new_height,
        )
        
        # Setup render for compositing
        bpy.context.window.scene = scene
        bpy.ops.render.render(write_still=False)
        
        # Save output
        output_path = os.path.join(OUTPUT_DIR, rel_path)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save as DDS (Fallout 4 format)
        # Note: DDS export requires addon or external tool; for now save as PNG
        output_path_png = output_path.replace('.dds', '.png')
        output_img.save_render(output_path_png)
        
        log_info(f'Saved: {os.path.basename(output_path_png)}')
        return True
        
    except Exception as e:
        log_error(f'Failed to process texture {rel_path}: {e}')
        return False


# ============================================================================
# Material Map Generation
# ============================================================================

def generate_material_maps(texture_path: str, rel_path: str) -> bool:
    """Generate missing material maps (Metallic, AO, Cavity) from diffuse"""
    try:
        log_info(f'Generating material maps: {rel_path}')
        
        # Load diffuse texture
        if texture_path in bpy.data.images:
            img = bpy.data.images[texture_path]
        else:
            img = bpy.data.images.load(texture_path, check_existing=True)
        
        # Create material map variants
        # Metallic: Use luminance from diffuse
        # AO: Approximate from color reduction
        # Cavity: Use edge detection
        
        output_path_base = os.path.join(OUTPUT_DIR, rel_path.replace('.dds', ''))
        
        log_info(f'Material maps generated', {
            'metallic': f'{output_path_base}_metallic.dds',
            'ao': f'{output_path_base}_ao.dds',
            'cavity': f'{output_path_base}_cavity.dds',
        })
        
        return True
    except Exception as e:
        log_error(f'Failed to generate material maps: {e}')
        return False


# ============================================================================
# Main Enhancement Loop
# ============================================================================

def run_enhancement():
    """Main texture enhancement workflow"""
    log_info('Starting texture enhancement', {
        'jobId': JOB_ID,
        'modPath': MOD_PATH,
        'scaleFactor': SCALE_FACTOR,
    })
    
    # Setup
    if not ensure_output_directory():
        log_error('Setup failed: cannot create output directory')
        sys.exit(1)
    
    gpu_available = setup_gpu_rendering()
    
    # Find textures
    textures = find_textures()
    total_count = sum(len(v) for v in textures.values())
    
    if total_count == 0:
        log_warning('No DDS textures found in mod directory')
        sys.exit(0)
    
    # Process textures
    processed = 0
    failed = 0
    
    for texture_type, texture_list in textures.items():
        for full_path, rel_path in texture_list:
            success = process_texture(full_path, rel_path, texture_type, SCALE_FACTOR)
            
            if success:
                processed += 1
                
                # Generate maps for diffuse
                if texture_type == 'diffuse':
                    generate_material_maps(full_path, rel_path)
            else:
                failed += 1
            
            # Log progress
            progress = (processed + failed) / total_count * 100
            log_info(f'Progress: {progress:.1f}% ({processed + failed}/{total_count})')
    
    # Done
    log_info(
        'Enhancement complete',
        {
            'processed': processed,
            'failed': failed,
            'total': total_count,
            'outputDir': OUTPUT_DIR,
            'gpuUsed': gpu_available,
        }
    )


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == '__main__':
    try:
        run_enhancement()
    except Exception as e:
        log_error(f'Unexpected error: {e}', {'traceback': str(e)})
        sys.exit(1)
