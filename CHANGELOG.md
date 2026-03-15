# Changelog

All notable changes to the Fallout 4 Tutorial Add-on will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-02-19

### Added
- Add-on preferences field for Havok2FBX folder with sidebar panel status so users can point to an existing install and avoid duplicate binaries.
- Export panel shows Havok2FBX configured/not-found status alongside current FBX-first workflow note.
- Placeholder Batch Processing panel to keep registration stable until batch actions land.

### Fixed
- Verified clean register/unregister in Blender 4.5.x after panel additions; optional deps (Hunyuan3D-2, HY-Motion) continue to warn as expected.
- Bump add-on version to 2.1.1 for this drop.

## [1.0.0] - 2026-02-12

### Added
- **Tutorial System**
  - Interactive step-by-step tutorials for basic mesh creation
  - Texture setup tutorial
  - Animation workflow tutorial
  - Tutorial progress tracking
  - In-panel tutorial guidance

- **Error Notification System**
  - Real-time error detection and notifications
  - Automatic validation checks
  - Warning and error messages with clear descriptions
  - Notification history (last 10 notifications)
  - Integration with Blender's UI notification system

- **Mesh Creation Helpers**
  - `create_base_mesh()` - Creates FO4-optimized base meshes
  - `optimize_mesh()` - Optimizes meshes for Fallout 4 (triangulation, cleanup)
  - `validate_mesh()` - Validates mesh compatibility with FO4
  - `add_collision_mesh()` - Creates simplified collision meshes
  - Automatic UV map creation
  - Poly count checking (65,535 limit)
  - Loose vertex detection
  - Scale application checking

- **Texture Installation Helpers**
  - `setup_fo4_material()` - Creates FO4-compatible material with proper node setup
  - `install_texture()` - Easy texture loading for diffuse, normal, and specular maps
  - `validate_textures()` - Validates texture setup and properties
  - Automatic colorspace configuration
  - Power-of-2 dimension checking
  - Material node graph creation with proper connections

- **Animation Tools**
  - `setup_fo4_armature()` - Creates basic FO4-compatible skeleton
  - `auto_weight_paint()` - Automatic mesh weight painting
  - `validate_animation()` - Validates armatures and animations
  - `create_idle_animation()` - Creates basic idle animations
  - Bone count validation (256 limit)
  - Root bone checking
  - Bone naming validation

- **Export Functionality**
  - `export_mesh_to_nif()` - Export to FBX (convertible to NIF)
  - `export_complete_mod()` - Export all scene assets
  - `validate_before_export()` - Pre-export validation
  - `create_mod_structure()` - Creates proper FO4 mod directory structure
  - Manifest file generation
  - Batch export support

- **UI Panels**
  - Main tutorial panel in 3D Viewport sidebar
  - Mesh Helpers panel with all mesh operations
  - Texture Helpers panel with material and texture tools
  - Animation Helpers panel with armature tools
  - Export panel with validation and export options
  - Collapsible sub-panels for better organization
  - Notification display in main panel

- **Documentation**
  - Comprehensive README with feature overview
  - Detailed INSTALLATION guide
  - Step-by-step TUTORIALS guide
  - Complete API_REFERENCE for scripting
  - QUICKSTART guide for new users
  - FAQ with common questions and solutions
  - Example Python script demonstrating API usage

- **Project Infrastructure**
  - MIT License
  - .gitignore for Python and Blender files
  - Modular code structure with separate helper modules
  - Python 3.x compatibility
  - Blender 3.0+ compatibility

### Technical Details
- Modular architecture with separated concerns:
  - `__init__.py` - Main add-on registration
  - `ui_panels.py` - UI panel definitions
  - `operators.py` - Blender operators for all actions
  - `tutorial_system.py` - Tutorial management
  - `notification_system.py` - Error and notification handling
  - `mesh_helpers.py` - Mesh creation and validation
  - `texture_helpers.py` - Material and texture management
  - `animation_helpers.py` - Armature and animation tools
  - `export_helpers.py` - Export functionality

- All functions return (success, message/issues) tuples for error handling
- Extensive validation at every step
- Integration with Blender's native systems
- Property groups for persistent data
- Scene-level storage for tutorial state

### Known Limitations
- Direct NIF export not yet implemented (requires PyNifly)
- FBX export used as intermediate format
- Animation export requires external Havok tools
- Some advanced FO4 features not yet supported:
  - Dismemberment
  - LOD generation
  - Collision physics properties
  - Advanced shader configurations

## [Unreleased]

### Planned Features
- Direct NIF export support via PyNifly integration
- More tutorial content (weapons, armor, etc.)
- Advanced FO4 features (dismemberment, LOD)
- Material preset library
- Texture pack installer
- In-app texture converter (PNG to DDS)
- Animation timeline helpers
- Batch processing tools
- Project templates
- Integration with Creation Kit
- Mod packaging automation

### Under Consideration
- Video tutorial integration
- Community tutorial sharing
- Cloud asset library
- Multi-language support
- VR preview support
- Performance profiling tools

---

## Version History

### Version Numbering
- MAJOR version for incompatible API changes
- MINOR version for new functionality (backwards-compatible)
- PATCH version for backwards-compatible bug fixes

### Release Notes
Each release includes:
- New features and improvements
- Bug fixes
- Breaking changes (if any)
- Migration guide (if needed)

---

[1.0.0]: https://github.com/POINTYTHRUNDRA654/Blender-add-on./releases/tag/v1.0.0
