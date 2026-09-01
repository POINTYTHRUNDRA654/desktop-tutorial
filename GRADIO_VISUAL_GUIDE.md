# Gradio Python Assistant - Visual Guide

This guide shows what the Gradio interface looks like and how to use it.

## Interface Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🐍 Mossy Python Code Writing Assistant                             │
│ Create, edit, and validate Python scripts for Fallout 4 modding.   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┬─────────────────────────────────┐
│  Python Code Editor             │  Actions                        │
│  ─────────────────              │  ───────                        │
│  1  # Start writing Python...   │  ✓ Validate Syntax              │
│  2  print('Hello from Mossy!')  │  ┌─────────────────────────────┐│
│  3                               │  │ Validation Result           ││
│  4                               │  │ ✅ Syntax is valid!         ││
│  5                               │  └─────────────────────────────┘│
│  ...                             │                                 │
│  20                              │  Code Formatting                │
│                                  │  ────────────────               │
│  Load Template: [Blender v]     │  Formatter: ⚫ black            │
│  [📋 Load Template]              │            ⚪ autopep8          │
│                                  │  [✨ Format Code]               │
│                                  │  ┌─────────────────────────────┐│
│                                  │  │ Format Status               ││
│                                  │  │ ✅ Code formatted with...   ││
│                                  │  └─────────────────────────────┘│
│                                  │                                 │
│                                  │  Safe Execution                 │
│                                  │  ───────────────                │
│                                  │  ☐ ⚠️ Enable code execution   │
│                                  │  [▶️ Run Code]                  │
│                                  │  ┌─────────────────────────────┐│
│                                  │  │ Execution Output            ││
│                                  │  │ 📤 Output:                  ││
│                                  │  │ Hello from Mossy!           ││
│                                  │  │                             ││
│                                  │  └─────────────────────────────┘│
└─────────────────────────────────┴─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 💡 Tips & Best Practices                                      [▼]   │
└─────────────────────────────────────────────────────────────────────┘
```

## Code Editor Section

The left side features a full-featured code editor:
- **Syntax highlighting** for Python
- **Line numbers** for easy navigation
- **20+ visible lines** (scrollable for more)
- **Copy/paste** support
- **Undo/redo** functionality

## Template Dropdown

Choose from pre-built templates:
```
┌──────────────────────────────┐
│ Load Template:               │
│ ┌──────────────────────────┐ │
│ │ Papyrus Script Template  │ │
│ │ Blender Script Template  │ │
│ │ Python Utility Template  │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Click **📋 Load Template** to load selected template.

## Validation Section

```
┌────────────────────────────────┐
│ [✓ Validate Syntax]            │
│ ┌────────────────────────────┐ │
│ │ Validation Result          │ │
│ │                            │ │
│ │ ✅ Syntax is valid!        │ │
│ │                            │ │
│ │ OR                         │ │
│ │                            │ │
│ │ ❌ Syntax Error at line 5: │ │
│ │ invalid syntax             │ │
│ │ print('hello'              │ │
│ │       ^                    │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

Instant feedback on Python syntax errors with:
- Line number
- Error description
- Code snippet showing the error

## Formatting Section

```
┌────────────────────────────────┐
│ Code Formatting                │
│                                │
│ Formatter:                     │
│  ⚫ black      ⚪ autopep8     │
│                                │
│ [✨ Format Code]               │
│                                │
│ ┌────────────────────────────┐ │
│ │ Format Status              │ │
│ │ ✅ Code formatted with...  │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

Before formatting:
```python
def calculate_damage(base,mod,perk):
    return (base+mod)*perk
```

After formatting with Black:
```python
def calculate_damage(base, mod, perk):
    return (base + mod) * perk
```

## Execution Section

```
┌────────────────────────────────┐
│ Safe Execution                 │
│                                │
│ ☑ ⚠️ Enable code execution   │
│                                │
│ [▶️ Run Code]                  │
│                                │
│ ┌────────────────────────────┐ │
│ │ Execution Output           │ │
│ │                            │ │
│ │ 📤 Output:                 │ │
│ │ Hello from Mossy!          │ │
│ │ Calculation result: 42     │ │
│ │                            │ │
│ │ ✅ Code executed           │ │
│ │    successfully            │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

**Safety Features**:
- Execution disabled by default
- Must check "Enable code execution" checkbox
- Sandboxed environment (limited file/network access)
- Output and errors captured separately

## Example: Blender Script Template

When you load the Blender Script Template, you see:

```python
import bpy

# Blender script for Fallout 4 asset creation
# Standard scale: 1.0 units = 1 meter
# Standard FPS: 30

def main():
    # Select all objects
    bpy.ops.object.select_all(action='SELECT')
    
    # Your code here
    print("Script executed successfully")

if __name__ == "__main__":
    main()
```

## Tips Panel (Expandable)

Click to expand tips and best practices:

```
┌─────────────────────────────────────────────────┐
│ 💡 Tips & Best Practices                  [▲]   │
│                                                  │
│ ### Blender Scripts (for Fallout 4)             │
│ - Use scale 1.0 = 1 meter                       │
│ - Set animation to 30 FPS                       │
│ - Export as .nif using NifSkope                 │
│                                                  │
│ ### Python Best Practices                       │
│ - Use descriptive variable names                │
│ - Add docstrings to functions                   │
│ - Follow PEP 8 style guide                      │
│ - Test code in safe environments                │
│                                                  │
│ ### Safety Notes                                │
│ - Code execution runs in restricted environment │
│ - File system access is limited                 │
│ - Always review generated code before using     │
└─────────────────────────────────────────────────┘
```

## Keyboard Shortcuts (Standard Web Editor)

- **Ctrl+A**: Select all
- **Ctrl+C**: Copy
- **Ctrl+V**: Paste
- **Ctrl+Z**: Undo
- **Ctrl+Y** / **Ctrl+Shift+Z**: Redo
- **Tab**: Indent
- **Shift+Tab**: Dedent

## Color Scheme

The interface uses Gradio's Soft theme:
- **Primary buttons**: Blue gradient
- **Secondary buttons**: Gray
- **Success messages**: Green with ✅
- **Error messages**: Red with ❌
- **Warning messages**: Orange with ⚠️
- **Info messages**: Blue with ℹ️

## Mobile Responsive

The interface adapts to smaller screens:
- Code editor and actions stack vertically
- Buttons expand to full width
- Touch-friendly sizing

## Accessibility

- Screen reader compatible
- Keyboard navigation support
- High contrast mode support
- Focus indicators on interactive elements

---

**Experience it yourself**: `python launch_gradio.py`
