"""
Third-Party Add-on Integration System
Allows loading tutorials and integrations for other Blender add-ons
"""

import bpy
import json
import os
from pathlib import Path
from bpy.props import StringProperty, BoolProperty, CollectionProperty
from bpy.types import PropertyGroup

class ThirdPartyAddon(PropertyGroup):
    """Represents an integrated third-party add-on"""
    addon_id: StringProperty(
        name="Add-on ID",
        description="Blender add-on module name",
        default=""
    )
    
    name: StringProperty(
        name="Add-on Name",
        description="Display name",
        default=""
    )
    
    description: StringProperty(
        name="Description",
        description="What this add-on does",
        default=""
    )
    
    is_installed: BoolProperty(
        name="Installed",
        description="Whether this add-on is installed",
        default=False
    )
    
    is_enabled: BoolProperty(
        name="Enabled",
        description="Whether this add-on is enabled",
        default=False
    )
    
    integration_file: StringProperty(
        name="Integration File",
        description="Path to integration data file",
        default="",
        subtype='FILE_PATH'
    )
    
    tutorial_available: BoolProperty(
        name="Tutorial Available",
        description="Whether tutorial is available",
        default=False
    )
    
    fo4_use_cases: StringProperty(
        name="FO4 Use Cases",
        description="How this add-on helps with FO4 modding",
        default=""
    )

class AddonIntegrationSystem:
    """System for integrating with third-party add-ons"""
    
    @staticmethod
    def get_integrations_path():
        """Get path to third-party integrations directory"""
        config_path = bpy.utils.user_resource('CONFIG')
        integrations_path = os.path.join(config_path, 'fo4_addon_integrations')
        os.makedirs(integrations_path, exist_ok=True)
        return integrations_path
    
    @staticmethod
    def get_integration_index_path():
        """Get path to integration index file"""
        integrations_path = AddonIntegrationSystem.get_integrations_path()
        return os.path.join(integrations_path, 'integration_index.json')
    
    @staticmethod
    def load_integration_index():
        """Load integration index"""
        index_path = AddonIntegrationSystem.get_integration_index_path()
        
        if os.path.exists(index_path):
            try:
                with open(index_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading integration index: {e}")
                return {"integrations": []}
        
        return {"integrations": []}
    
    @staticmethod
    def save_integration_index(index_data):
        """Save integration index"""
        index_path = AddonIntegrationSystem.get_integration_index_path()
        
        try:
            with open(index_path, 'w') as f:
                json.dump(index_data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving integration index: {e}")
            return False
    
    @staticmethod
    def check_addon_installed(addon_id):
        """Check if a Blender add-on is installed"""
        try:
            import importlib
            # Try to import the module
            importlib.import_module(addon_id)
            return True
        except ImportError:
            return False
    
    @staticmethod
    def check_addon_enabled(addon_id):
        """Check if a Blender add-on is enabled"""
        prefs = bpy.context.preferences
        return addon_id in prefs.addons
    
    @staticmethod
    def scan_for_known_addons():
        """Scan for known useful add-ons for FO4 modding"""
        known_addons = {
            'io_scene_niftools': {
                'name': 'Blender NIF Plugin',
                'description': 'Import/export NIF files (Fallout 4 format)',
                'fo4_use_cases': 'Direct export to NIF format, read vanilla FO4 assets',
                'download_url': 'https://github.com/niftools/blender_niftools_addon'
            },
            'object_print3d_utils': {
                'name': '3D Print Toolbox',
                'description': 'Check mesh for errors',
                'fo4_use_cases': 'Validate meshes for errors before export',
                'download_url': 'Built-in to Blender'
            },
            'uv_texture_tools': {
                'name': 'UV Texture Tools',
                'description': 'Advanced UV mapping tools',
                'fo4_use_cases': 'Better UV unwrapping for textures',
                'download_url': 'Various on Blender Market/GitHub'
            },
            'mesh_f2': {
                'name': 'F2',
                'description': 'Quick face creation',
                'fo4_use_cases': 'Speed up modeling workflow',
                'download_url': 'Built-in to Blender'
            },
            'mesh_looptools': {
                'name': 'Loop Tools',
                'description': 'Mesh editing tools',
                'fo4_use_cases': 'Clean topology for better optimization',
                'download_url': 'Built-in to Blender'
            },
            'rigify': {
                'name': 'Rigify',
                'description': 'Advanced rigging system',
                'fo4_use_cases': 'Create complex character rigs for NPCs',
                'download_url': 'Built-in to Blender'
            },
            'boneweight_copy': {
                'name': 'Bone Weight Copy',
                'description': 'Transfer weights between meshes',
                'fo4_use_cases': 'Transfer weights from vanilla FO4 assets to custom armor',
                'download_url': 'Various on Blender Market'
            }
        }
        
        detected = []
        
        for addon_id, info in known_addons.items():
            is_installed = AddonIntegrationSystem.check_addon_installed(addon_id)
            is_enabled = AddonIntegrationSystem.check_addon_enabled(addon_id)
            
            detected.append({
                'addon_id': addon_id,
                'name': info['name'],
                'description': info['description'],
                'is_installed': is_installed,
                'is_enabled': is_enabled,
                'fo4_use_cases': info['fo4_use_cases'],
                'download_url': info.get('download_url', '')
            })
        
        return detected
    
    @staticmethod
    def add_integration(addon_id, name, description, tutorial_data, fo4_use_cases):
        """Add a new integration for a third-party add-on"""
        integrations_path = AddonIntegrationSystem.get_integrations_path()
        
        # Create safe filename
        safe_name = "".join(c for c in addon_id if c.isalnum() or c in ('_', '-'))
        integration_file = os.path.join(integrations_path, f"{safe_name}.json")
        
        # Create integration data
        integration_data = {
            'addon_id': addon_id,
            'name': name,
            'description': description,
            'fo4_use_cases': fo4_use_cases,
            'tutorial': tutorial_data,
            'created': bpy.app.version_string
        }
        
        # Save integration file
        try:
            with open(integration_file, 'w') as f:
                json.dump(integration_data, f, indent=2)
        except Exception as e:
            return False, f"Failed to save integration: {e}"
        
        # Update index
        index = AddonIntegrationSystem.load_integration_index()
        
        # Check if exists
        existing = None
        for integ in index.get('integrations', []):
            if integ['addon_id'] == addon_id:
                existing = integ
                break
        
        if existing:
            existing['name'] = name
            existing['description'] = description
            existing['integration_file'] = integration_file
        else:
            if 'integrations' not in index:
                index['integrations'] = []
            index['integrations'].append({
                'addon_id': addon_id,
                'name': name,
                'description': description,
                'integration_file': integration_file,
                'fo4_use_cases': fo4_use_cases
            })
        
        AddonIntegrationSystem.save_integration_index(index)
        
        return True, f"Integration added for {name}"
    
    @staticmethod
    def load_integration(integration_file):
        """Load integration data from file"""
        try:
            with open(integration_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading integration: {e}")
            return None
    
    @staticmethod
    def get_integration_tutorial(addon_id):
        """Get tutorial steps for a third-party add-on"""
        index = AddonIntegrationSystem.load_integration_index()
        
        for integration in index.get('integrations', []):
            if integration['addon_id'] == addon_id:
                integration_file = integration.get('integration_file')
                if integration_file and os.path.exists(integration_file):
                    data = AddonIntegrationSystem.load_integration(integration_file)
                    return data.get('tutorial', {})
        
        return None
    
    @staticmethod
    def create_default_integrations():
        """Create default integration packs for common add-ons"""
        
        # NIF Plugin Integration
        nif_tutorial = {
            'title': 'Using Blender NIF Plugin with FO4',
            'steps': [
                {
                    'title': 'Install NIF Plugin',
                    'description': 'Download from GitHub: niftools/blender_niftools_addon',
                    'tips': 'Make sure to get the version compatible with your Blender version'
                },
                {
                    'title': 'Enable the Add-on',
                    'description': 'Go to Edit > Preferences > Add-ons, search for "NIF", and enable it',
                    'tips': 'You may need to restart Blender'
                },
                {
                    'title': 'Export to NIF',
                    'description': 'File > Export > NetImmerse/Gamebryo (.nif)',
                    'tips': 'Select Fallout 4 as the game preset'
                },
                {
                    'title': 'Import FO4 Assets',
                    'description': 'File > Import > NetImmerse/Gamebryo (.nif)',
                    'tips': 'Use this to study vanilla FO4 meshes and learn from them'
                },
                {
                    'title': 'Integration with FO4 Add-on',
                    'description': 'Use our add-on to prepare meshes, then export with NIF Plugin',
                    'tips': 'Run validation and optimization in our add-on first'
                }
            ],
            'common_issues': [
                {
                    'issue': 'NIF export fails',
                    'solution': 'Make sure mesh is triangulated and scale is applied'
                },
                {
                    'issue': 'Textures not showing in-game',
                    'solution': 'Check texture paths in NIF settings match your mod structure'
                }
            ]
        }
        
        AddonIntegrationSystem.add_integration(
            'io_scene_niftools',
            'Blender NIF Plugin',
            'Import/export NIF files (Fallout 4 format)',
            nif_tutorial,
            'Direct export to NIF format instead of FBX conversion'
        )
        
        # Rigify Integration
        rigify_tutorial = {
            'title': 'Using Rigify for FO4 Character Rigging',
            'steps': [
                {
                    'title': 'Enable Rigify',
                    'description': 'Edit > Preferences > Add-ons, search for "Rigify", enable it',
                    'tips': 'Rigify is built into Blender'
                },
                {
                    'title': 'Create Metarig',
                    'description': 'Add > Armature > Basic Human (Metarig)',
                    'tips': 'Scale and position to match your character mesh'
                },
                {
                    'title': 'Adjust Metarig',
                    'description': 'In Edit Mode, adjust bone positions to match your character',
                    'tips': 'Pay attention to hand and foot positions'
                },
                {
                    'title': 'Generate Rig',
                    'description': 'Select metarig, go to Armature Properties, click Generate Rig',
                    'tips': 'This creates a full animation-ready rig'
                },
                {
                    'title': 'Export for FO4',
                    'description': 'Use our add-on to validate and export the rigged character',
                    'tips': 'FO4 has bone count limits - simplify if needed'
                }
            ]
        }
        
        AddonIntegrationSystem.add_integration(
            'rigify',
            'Rigify',
            'Advanced rigging system for characters',
            rigify_tutorial,
            'Create complex character rigs for custom NPCs and creatures'
        )
        
        return True

def register():
    """Register third-party integration classes"""
    bpy.utils.register_class(ThirdPartyAddon)
    
    # Add properties
    bpy.types.Scene.fo4_third_party_addons = CollectionProperty(type=ThirdPartyAddon)
    bpy.types.Scene.fo4_show_addon_tutorials = BoolProperty(
        name="Show Add-on Tutorials",
        description="Display tutorials for third-party add-ons",
        default=True
    )

def unregister():
    """Unregister third-party integration classes"""
    if hasattr(bpy.types.Scene, 'fo4_third_party_addons'):
        del bpy.types.Scene.fo4_third_party_addons
    if hasattr(bpy.types.Scene, 'fo4_show_addon_tutorials'):
        del bpy.types.Scene.fo4_show_addon_tutorials
    
    bpy.utils.unregister_class(ThirdPartyAddon)
