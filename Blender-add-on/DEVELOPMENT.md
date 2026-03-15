# Development Guide

## Project Structure

```
Blender-add-on/
├── __init__.py                    # Main Blender add-on file
├── example_tutorial_server.py     # Example desktop tutorial server
├── README.md                      # User documentation
├── DEVELOPMENT.md                 # This file
├── LICENSE                        # MIT License
└── .gitignore                     # Git ignore patterns
```

## Setting Up Development Environment

### Prerequisites

1. **Blender** (2.80 or higher)
   - Download from [blender.org](https://www.blender.org/)
   - Blender includes Python, so no separate Python installation is needed

2. **Text Editor/IDE**
   - VS Code with Python extension (recommended)
   - PyCharm
   - Any text editor of your choice

### Installing the Add-on for Development

1. Clone this repository
2. Create a symbolic link or copy `__init__.py` to Blender's add-ons directory:
   - **Windows**: `%APPDATA%\Blender Foundation\Blender\<version>\scripts\addons\`
   - **macOS**: `~/Library/Application Support/Blender/<version>/scripts/addons/`
   - **Linux**: `~/.config/blender/<version>/scripts/addons/`

3. Restart Blender or reload scripts (`F3` > "Reload Scripts")

### Development Workflow

1. **Make changes** to `__init__.py`
2. **Reload scripts** in Blender:
   - Press `F3` to open search
   - Type "Reload Scripts"
   - Press Enter
3. **Test changes** in Blender
4. **Repeat** as needed

## Code Structure

### Main Components

#### 1. Add-on Metadata (`bl_info`)
Contains information about the add-on:
- Name, author, version
- Blender version compatibility
- Category and location
- Description and documentation

#### 2. Preferences (`TutorialAddonPreferences`)
User-configurable settings:
- Server host and port
- Auto-connect option
- Drawn in Edit > Preferences > Add-ons

#### 3. Operators
Actions that can be triggered by users:
- `TUTORIAL_OT_connect`: Connect to tutorial app
- `TUTORIAL_OT_disconnect`: Disconnect from app
- `TUTORIAL_OT_send_event`: Send custom events
- `TUTORIAL_OT_request_next_step`: Request next step
- `TUTORIAL_OT_mark_complete`: Mark step complete

#### 4. Panels (`TUTORIAL_PT_main_panel`)
UI elements in the 3D viewport sidebar:
- Connection status display
- Tutorial controls
- Current step information

#### 5. Properties
Custom properties stored in WindowManager:
- `tutorial_connected`: Connection status
- `tutorial_host`: Server hostname
- `tutorial_port`: Server port
- `tutorial_current_step`: Current step number
- `tutorial_step_description`: Step description

### Registration System

Blender add-ons must register/unregister all classes and properties:

```python
def register():
    # Register classes
    for cls in classes:
        bpy.utils.register_class(cls)
    
    # Add custom properties
    bpy.types.WindowManager.property_name = PropertyType(...)

def unregister():
    # Remove properties
    del bpy.types.WindowManager.property_name
    
    # Unregister classes
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
```

## Testing

### Manual Testing

1. **Start the example server**:
   ```bash
   python example_tutorial_server.py
   ```

2. **In Blender**:
   - Open the Tutorial panel (N key > Tutorial tab)
   - Click "Connect to Tutorial App"
   - Test various operations

3. **Verify functionality**:
   - Connection status updates
   - Operators work correctly
   - Events are logged in server console
   - No errors in Blender console

### Testing Checklist

- [ ] Add-on installs without errors
- [ ] Add-on enables without errors
- [ ] Preferences are accessible and editable
- [ ] Panel appears in 3D viewport sidebar
- [ ] Connect button works
- [ ] Disconnect button works
- [ ] Next step button works
- [ ] Mark complete button works
- [ ] Connection status displays correctly
- [ ] Server receives events correctly

## Debugging

### View Blender Console

- **Windows**: Window > Toggle System Console
- **macOS/Linux**: Run Blender from terminal

### Common Issues

1. **Import errors**: Make sure all required modules are available
2. **Registration errors**: Check that all classes have proper `bl_` attributes
3. **Property errors**: Ensure properties are properly typed and initialized
4. **UI not appearing**: Check `bl_space_type`, `bl_region_type`, and `bl_category`

### Debug Print Statements

Use `print()` statements to debug:
```python
def execute(self, context):
    print("Debug: Execute called")
    print(f"Debug: Context = {context}")
    # ... rest of code
```

Output appears in Blender console.

## Extending the Add-on

### Adding New Operators

1. Create a new operator class:
```python
class TUTORIAL_OT_my_operator(Operator):
    bl_idname = "tutorial.my_operator"
    bl_label = "My Operator"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        # Your code here
        return {'FINISHED'}
```

2. Add to `classes` tuple
3. Add button to panel:
```python
layout.operator("tutorial.my_operator")
```

### Adding New Properties

1. Define property in `register()`:
```python
bpy.types.WindowManager.my_property = StringProperty(
    name="My Property",
    default="default_value",
)
```

2. Clean up in `unregister()`:
```python
del bpy.types.WindowManager.my_property
```

3. Use in operators or panels:
```python
wm = context.window_manager
value = wm.my_property
```

### Adding New UI Elements

Add to panel's `draw()` method:
```python
def draw(self, context):
    layout = self.layout
    
    # Label
    layout.label(text="My Label")
    
    # Button
    layout.operator("tutorial.my_operator")
    
    # Property
    layout.prop(context.window_manager, "my_property")
    
    # Box
    box = layout.box()
    box.label(text="In a box")
```

## Communication Protocol

### Request Format

POST requests should send JSON:
```json
{
  "type": "event_type",
  "data": "event_data",
  "timestamp": 1
}
```

### Response Format

Server should respond with JSON:
```json
{
  "success": true,
  "message": "Response message",
  "data": {}
}
```

## Best Practices

1. **Follow Blender naming conventions**:
   - Operators: `CATEGORY_OT_name`
   - Panels: `CATEGORY_PT_name`
   - Properties: Use `bl_idname`, `bl_label`, etc.

2. **Use proper operators**:
   - `{'REGISTER'}`: Registers in operator history
   - `{'UNDO'}`: Supports undo/redo
   - `{'REGISTER', 'UNDO'}`: Both

3. **Report to user**:
   ```python
   self.report({'INFO'}, "Success message")
   self.report({'WARNING'}, "Warning message")
   self.report({'ERROR'}, "Error message")
   ```

4. **Handle errors gracefully**:
   ```python
   try:
       # risky code
       return {'FINISHED'}
   except Exception as e:
       self.report({'ERROR'}, f"Failed: {str(e)}")
       return {'CANCELLED'}
   ```

5. **Clean up resources**:
   - Close connections in `unregister()`
   - Stop threads before unloading
   - Remove timers

## Publishing

### Packaging

1. Ensure `__init__.py` has correct `bl_info`
2. Test thoroughly in clean Blender installation
3. Create release archive (optional):
   ```bash
   zip -r desktop_tutorial_addon.zip __init__.py README.md LICENSE
   ```

### Distribution

- Share `__init__.py` directly
- Upload to GitHub releases
- Submit to Blender Market or other platforms

## Resources

- [Blender Python API Documentation](https://docs.blender.org/api/current/)
- [Blender Add-on Tutorial](https://docs.blender.org/manual/en/latest/advanced/scripting/addon_tutorial.html)
- [Blender Operators](https://docs.blender.org/api/current/bpy.types.Operator.html)
- [Blender Panels](https://docs.blender.org/api/current/bpy.types.Panel.html)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For questions or issues:
1. Check existing GitHub issues
2. Create a new issue with:
   - Blender version
   - Add-on version
   - Steps to reproduce
   - Error messages/screenshots
