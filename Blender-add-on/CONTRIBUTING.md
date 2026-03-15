# Contributing to Fallout 4 Tutorial Add-on

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

### Our Pledge
- Be respectful and inclusive
- Welcome newcomers
- Focus on what's best for the community
- Show empathy towards others

### Our Standards
- Use welcoming and inclusive language
- Respect differing viewpoints
- Accept constructive criticism gracefully
- Focus on the issue, not the person

## How Can I Contribute?

### 1. Reporting Bugs
Found a bug? Help us fix it!

**Before reporting:**
- Check if it's already reported in Issues
- Try the latest version
- Collect relevant information

**Bug Report Should Include:**
- Clear title
- Blender version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Error messages from console

### 2. Suggesting Features
Have an idea? We'd love to hear it!

**Feature Request Should Include:**
- Clear description of the feature
- Why it would be useful
- How it should work
- Examples or mockups if possible

### 3. Writing Documentation
Documentation is always welcome!

**Documentation Contributions:**
- Fix typos or unclear sections
- Add examples
- Improve tutorials
- Translate to other languages
- Create video tutorials

### 4. Writing Code
Ready to code? Great!

**Good First Issues:**
- Bug fixes
- Documentation improvements
- Adding validation checks
- Improving error messages
- Adding tests

**Advanced Contributions:**
- New features
- Performance improvements
- API extensions
- Integration with other tools

## Development Setup

### Prerequisites
- Blender 3.0 or higher
- Python 3.x
- Git
- Text editor or IDE (VS Code, PyCharm recommended)

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/Blender-add-on..git
   cd Blender-add-on.
   ```

2. **Install add-on in development mode**
   ```bash
   # Linux/Mac
   ln -s /path/to/repo ~/.config/blender/3.x/scripts/addons/fo4_tutorial
   
   # Windows
   mklink /D "%APPDATA%\Blender Foundation\Blender\3.x\scripts\addons\fo4_tutorial" "C:\path\to\repo"
   ```

3. **Enable in Blender**
   - Open Blender
   - Edit > Preferences > Add-ons
   - Enable "Fallout 4 Tutorial Helper"

4. **Enable Blender Console**
   - Windows: Window > Toggle System Console
   - Mac/Linux: Launch Blender from terminal

### Development Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/my-new-feature
   # or
   git checkout -b fix/bug-description
   ```

2. **Make changes**
   - Edit code
   - Test in Blender
   - Check console for errors

3. **Reload add-on in Blender**
   ```python
   # In Blender's Python console
   import sys
   modules = [m for m in sys.modules if m.startswith('fo4')]
   for m in modules:
       del sys.modules[m]
   
   import bpy
   bpy.ops.preferences.addon_disable(module='fo4_tutorial')
   bpy.ops.preferences.addon_enable(module='fo4_tutorial')
   ```

4. **Test thoroughly**
   - Test your specific changes
   - Test related functionality
   - Check for errors in console

5. **Commit changes**
   ```bash
   git add .
   git commit -m "Add feature: description"
   ```

## Coding Standards

### Python Style
Follow PEP 8 with these specifics:

```python
# Use 4 spaces for indentation (no tabs)
def my_function(param1, param2):
    """Docstring describing the function."""
    result = param1 + param2
    return result

# Class names: PascalCase
class MyHelperClass:
    pass

# Function names: snake_case
def calculate_something():
    pass

# Constants: UPPER_SNAKE_CASE
MAX_POLYGON_COUNT = 65535
```

### Blender Conventions

```python
# Operator naming
class FO4_OT_OperatorName(bpy.types.Operator):
    """Operator description."""
    bl_idname = "fo4.operator_name"
    bl_label = "Operator Name"
    bl_options = {'REGISTER', 'UNDO'}

# Panel naming
class FO4_PT_PanelName(bpy.types.Panel):
    """Panel description."""
    bl_idname = "FO4_PT_panel_name"
    bl_label = "Panel Name"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
```

### Documentation

```python
def my_function(obj, option=True):
    """
    Short description of what function does.
    
    Parameters:
    - obj (bpy.types.Object): The object to process
    - option (bool): Enable special processing
    
    Returns:
    - success (bool): True if operation succeeded
    - message (str): Status message or error description
    
    Example:
    >>> success, msg = my_function(obj, True)
    >>> print(msg)
    """
    # Implementation
    return True, "Success"
```

### Error Handling

```python
# Always return success status and message
def process_mesh(obj):
    if obj.type != 'MESH':
        return False, "Object is not a mesh"
    
    try:
        # Do processing
        return True, "Processing completed"
    except Exception as e:
        return False, f"Error: {str(e)}"

# Use validation
def validate_input(obj):
    issues = []
    
    if not obj:
        issues.append("No object provided")
    if obj.type != 'MESH':
        issues.append("Object is not a mesh")
    
    return len(issues) == 0, issues
```

### Comments

```python
# Good comments explain WHY, not WHAT
poly_count = len(mesh.polygons)  # FO4 has 65535 limit

# Avoid obvious comments
poly_count = len(mesh.polygons)  # Bad: Get polygon count
```

## Submitting Changes

### Pull Request Process

1. **Update documentation**
   - Update README if adding features
   - Update API_REFERENCE for new functions
   - Add to CHANGELOG

2. **Write good commit messages**
   ```
   Add mesh validation for FO4 limits
   
   - Check polygon count against 65535 limit
   - Validate UV map presence
   - Check for applied scale
   
   Fixes #123
   ```

3. **Create pull request**
   - Clear title describing the change
   - Description of what and why
   - Reference related issues
   - Screenshots for UI changes

4. **Respond to feedback**
   - Address reviewer comments
   - Make requested changes
   - Keep discussion focused

### What Makes a Good PR?

✅ **Good PR:**
- Focused on single feature/fix
- Well-tested
- Documented
- Follows coding standards
- Includes examples
- Updates relevant docs

❌ **Avoid:**
- Multiple unrelated changes
- Breaking existing functionality
- No documentation
- Untested code
- Reformatting large files

## Testing

### Manual Testing Checklist

Before submitting:
- [ ] Add-on loads without errors
- [ ] All panels appear correctly
- [ ] All buttons work as expected
- [ ] No console errors
- [ ] Validation functions work
- [ ] Export functions work
- [ ] No regression in existing features

### Test Scenarios

1. **New User Flow**
   - Install add-on
   - Follow QUICKSTART
   - Complete basic tutorial

2. **Common Workflows**
   - Create mesh > Optimize > Export
   - Setup textures > Validate > Export
   - Create animation > Validate > Export

3. **Edge Cases**
   - Empty scene
   - Invalid objects
   - Missing files
   - Large meshes

## Areas Needing Contribution

### High Priority
- [ ] Direct NIF export support
- [ ] More validation checks
- [ ] Better error messages
- [ ] Performance optimization
- [ ] Test coverage

### Medium Priority
- [ ] Additional tutorials
- [ ] Material presets
- [ ] Batch processing tools
- [ ] Video tutorials
- [ ] Translation support

### Nice to Have
- [ ] Advanced FO4 features (dismemberment, LOD)
- [ ] Integration with other tools
- [ ] Cloud asset library
- [ ] VR preview

## Questions?

- Open an issue for questions
- Check existing issues and discussions
- Join community forums

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Thanked in the community

Thank you for contributing! 🎉
