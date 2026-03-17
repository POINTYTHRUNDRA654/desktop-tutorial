"""
Preset Library System for Fallout 4 Add-on
Store and reuse creations for increased productivity
"""

import bpy
import json
import os
from pathlib import Path
from bpy.props import StringProperty, EnumProperty, BoolProperty, CollectionProperty
from bpy.types import PropertyGroup

class PresetItem(PropertyGroup):
    """Represents a stored preset"""
    name: StringProperty(
        name="Preset Name",
        description="Name of the preset",
        default="Unnamed Preset"
    )
    
    category: EnumProperty(
        name="Category",
        items=[
            ('MESH', "Mesh", "Mesh preset"),
            ('MATERIAL', "Material", "Material preset"),
            ('VEGETATION', "Vegetation", "Vegetation preset"),
            ('WEAPON', "Weapon", "Weapon preset"),
            ('ARMOR', "Armor", "Armor preset"),
            ('NPC', "NPC", "NPC preset"),
            ('ITEM', "Item", "Item preset"),
            ('WORLD', "World Building", "World building preset"),
            ('WORKFLOW', "Workflow", "Complete workflow preset"),
        ],
        default='MESH'
    )
    
    description: StringProperty(
        name="Description",
        description="Description of what this preset contains",
        default=""
    )
    
    filepath: StringProperty(
        name="File Path",
        description="Path to preset data file",
        default="",
        subtype='FILE_PATH'
    )
    
    thumbnail: StringProperty(
        name="Thumbnail",
        description="Path to thumbnail image",
        default="",
        subtype='FILE_PATH'
    )
    
    tags: StringProperty(
        name="Tags",
        description="Search tags (comma separated)",
        default=""
    )
    
    use_count: bpy.props.IntProperty(
        name="Use Count",
        description="Number of times this preset has been used",
        default=0
    )
    
    date_created: StringProperty(
        name="Date Created",
        description="Creation date",
        default=""
    )
    
    date_modified: StringProperty(
        name="Date Modified",
        description="Last modification date",
        default=""
    )

class PresetLibrary:
    """Main preset library class for managing presets"""
    
    @staticmethod
    def get_library_path():
        """Get the path to the preset library directory"""
        # Create library in user's Blender config directory
        config_path = bpy.utils.user_resource('CONFIG')
        library_path = os.path.join(config_path, 'fo4_preset_library')
        
        # Create directory if it doesn't exist
        os.makedirs(library_path, exist_ok=True)
        
        # Create category subdirectories
        categories = ['meshes', 'materials', 'vegetation', 'weapons', 'armor', 
                     'npcs', 'items', 'world', 'workflows']
        for category in categories:
            os.makedirs(os.path.join(library_path, category), exist_ok=True)
        
        return library_path
    
    @staticmethod
    def get_preset_index_path():
        """Get path to preset index file"""
        library_path = PresetLibrary.get_library_path()
        return os.path.join(library_path, 'preset_index.json')
    
    @staticmethod
    def load_index():
        """Load preset index from disk"""
        index_path = PresetLibrary.get_preset_index_path()
        
        if os.path.exists(index_path):
            try:
                with open(index_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading preset index: {e}")
                return {"presets": []}
        
        return {"presets": []}
    
    @staticmethod
    def save_index(index_data):
        """Save preset index to disk"""
        index_path = PresetLibrary.get_preset_index_path()
        
        try:
            with open(index_path, 'w') as f:
                json.dump(index_data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving preset index: {e}")
            return False
    
    @staticmethod
    def save_preset(preset_name, category, data, description="", tags=""):
        """Save a new preset to the library"""
        import datetime
        
        library_path = PresetLibrary.get_library_path()
        
        # Create filename from preset name
        safe_name = "".join(c for c in preset_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_name = safe_name.replace(' ', '_')
        
        # Determine category folder
        category_folders = {
            'MESH': 'meshes',
            'MATERIAL': 'materials',
            'VEGETATION': 'vegetation',
            'WEAPON': 'weapons',
            'ARMOR': 'armor',
            'NPC': 'npcs',
            'ITEM': 'items',
            'WORLD': 'world',
            'WORKFLOW': 'workflows'
        }
        
        category_folder = category_folders.get(category, 'meshes')
        preset_path = os.path.join(library_path, category_folder, f"{safe_name}.json")
        
        # Save preset data
        try:
            with open(preset_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            return False, f"Failed to save preset data: {e}"
        
        # Update index
        index = PresetLibrary.load_index()
        
        # Check if preset already exists
        existing = None
        for p in index['presets']:
            if p['filepath'] == preset_path:
                existing = p
                break
        
        if existing:
            # Update existing preset
            existing['name'] = preset_name
            existing['category'] = category
            existing['description'] = description
            existing['tags'] = tags
            existing['date_modified'] = datetime.datetime.now().isoformat()
        else:
            # Add new preset
            preset_entry = {
                'name': preset_name,
                'category': category,
                'description': description,
                'filepath': preset_path,
                'thumbnail': '',
                'tags': tags,
                'use_count': 0,
                'date_created': datetime.datetime.now().isoformat(),
                'date_modified': datetime.datetime.now().isoformat()
            }
            index['presets'].append(preset_entry)
        
        # Save index
        if PresetLibrary.save_index(index):
            return True, f"Preset saved: {preset_name}"
        else:
            return False, "Failed to update preset index"
    
    @staticmethod
    def load_preset(preset_path):
        """Load preset data from file"""
        try:
            with open(preset_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading preset: {e}")
            return None
    
    @staticmethod
    def delete_preset(preset_path):
        """Delete a preset from the library"""
        # Remove file
        try:
            if os.path.exists(preset_path):
                os.remove(preset_path)
        except Exception as e:
            return False, f"Failed to delete preset file: {e}"
        
        # Update index
        index = PresetLibrary.load_index()
        index['presets'] = [p for p in index['presets'] if p['filepath'] != preset_path]
        
        if PresetLibrary.save_index(index):
            return True, "Preset deleted"
        else:
            return False, "Failed to update index"
    
    @staticmethod
    def get_presets_by_category(category=None):
        """Get all presets, optionally filtered by category"""
        index = PresetLibrary.load_index()
        presets = index.get('presets', [])
        
        if category:
            presets = [p for p in presets if p['category'] == category]
        
        return presets
    
    @staticmethod
    def search_presets(query):
        """Search presets by name, description, or tags"""
        index = PresetLibrary.load_index()
        presets = index.get('presets', [])
        
        query = query.lower()
        results = []
        
        for preset in presets:
            if (query in preset['name'].lower() or
                query in preset['description'].lower() or
                query in preset['tags'].lower()):
                results.append(preset)
        
        return results
    
    @staticmethod
    def increment_use_count(preset_path):
        """Increment the use count for a preset"""
        index = PresetLibrary.load_index()
        
        for preset in index['presets']:
            if preset['filepath'] == preset_path:
                preset['use_count'] = preset.get('use_count', 0) + 1
                break
        
        PresetLibrary.save_index(index)
    
    @staticmethod
    def get_recent_presets(count=10):
        """Get most recently used presets"""
        index = PresetLibrary.load_index()
        presets = index.get('presets', [])
        
        # Sort by date modified
        presets.sort(key=lambda p: p.get('date_modified', ''), reverse=True)
        
        return presets[:count]
    
    @staticmethod
    def get_popular_presets(count=10):
        """Get most frequently used presets"""
        index = PresetLibrary.load_index()
        presets = index.get('presets', [])
        
        # Sort by use count
        presets.sort(key=lambda p: p.get('use_count', 0), reverse=True)
        
        return presets[:count]

def register():
    """Register preset library classes"""
    bpy.utils.register_class(PresetItem)
    
    # Add preset collection to scene
    bpy.types.Scene.fo4_preset_library = CollectionProperty(type=PresetItem)
    bpy.types.Scene.fo4_active_preset_index = bpy.props.IntProperty(default=0)
    bpy.types.Scene.fo4_preset_search = StringProperty(
        name="Search",
        description="Search presets",
        default=""
    )
    bpy.types.Scene.fo4_preset_filter_category = EnumProperty(
        name="Category Filter",
        items=[
            ('ALL', "All", "Show all presets"),
            ('MESH', "Meshes", "Mesh presets"),
            ('MATERIAL', "Materials", "Material presets"),
            ('VEGETATION', "Vegetation", "Vegetation presets"),
            ('WEAPON', "Weapons", "Weapon presets"),
            ('ARMOR', "Armor", "Armor presets"),
            ('NPC', "NPCs", "NPC presets"),
            ('ITEM', "Items", "Item presets"),
            ('WORLD', "World", "World building presets"),
            ('WORKFLOW', "Workflows", "Workflow presets"),
        ],
        default='ALL'
    )

def unregister():
    """Unregister preset library classes"""
    if hasattr(bpy.types.Scene, 'fo4_preset_library'):
        del bpy.types.Scene.fo4_preset_library
    if hasattr(bpy.types.Scene, 'fo4_active_preset_index'):
        del bpy.types.Scene.fo4_active_preset_index
    if hasattr(bpy.types.Scene, 'fo4_preset_search'):
        del bpy.types.Scene.fo4_preset_search
    if hasattr(bpy.types.Scene, 'fo4_preset_filter_category'):
        del bpy.types.Scene.fo4_preset_filter_category
    
    bpy.utils.unregister_class(PresetItem)
