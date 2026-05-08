# Gradio Python Code Assistant for Mossy

## Overview

Mossy now includes a **Gradio-powered Python code assistant** to help you write, format, and validate Python scripts for Fallout 4 modding.

## Features

### 🎨 Code Templates
- **Papyrus Script Template**: Pseudocode template for Papyrus scripts
- **Blender Script Template**: Python scripts for Blender with F4 standards (1.0 scale, 30 FPS)
- **Python Utility Template**: General Python utility scripts

### ✨ Code Formatting
- **Black**: Opinionated Python formatter (recommended)
- **autopep8**: PEP 8 compliant formatter
- One-click formatting for clean, professional code

### ✓ Syntax Validation
- Real-time Python syntax checking
- Detailed error messages with line numbers
- Helps catch errors before execution

### ▶️ Safe Code Execution
- Optional sandboxed code execution
- Captured output and error messages
- Safety checkbox prevents accidental execution

## Installation

### 1. Install Python Dependencies

From the Mossy root directory:

```bash
pip install -r requirements.txt
```

This installs:
- `gradio` - Web UI framework
- `black` - Code formatter
- `autopep8` - Alternative formatter
- All other Mossy Python dependencies

### 2. Verify Installation

```bash
python -m gradio --version
```

You should see the Gradio version number (4.0.0 or higher).

## Usage

### Method 1: Direct Launch (Command Line)

```bash
python launch_gradio.py
```

Or directly:

```bash
python gradio_interface.py
```

This will start the Gradio interface at `http://127.0.0.1:7860`

### Method 2: Launch from Mossy Desktop App

1. Open Mossy desktop application
2. Navigate to **Workshop** or **The Scribe**
3. Click **"Launch Python Assistant"** button
4. The Gradio interface opens in your default browser

### Method 3: Integration with Neural Link

The Gradio interface can be started automatically when Neural Link detects Python code writing tasks.

## Interface Guide

### Main Code Editor
- Full Python syntax highlighting
- Line numbers
- 20+ lines visible by default
- Supports copy/paste

### Template Loading
1. Select a template from dropdown
2. Click **"📋 Load Template"**
3. Template code appears in editor

### Syntax Validation
1. Write or paste code in editor
2. Click **"✓ Validate Syntax"**
3. See validation result below

### Code Formatting
1. Choose formatter: `black` (recommended) or `autopep8`
2. Click **"✨ Format Code"**
3. Code is automatically formatted in place

### Safe Execution
1. **⚠️ Important**: Only enable for trusted code
2. Check **"Enable code execution"** checkbox
3. Click **"▶️ Run Code"**
4. See output in the execution panel

## Best Practices

### For Blender Scripts
- Use scale: 1.0 units = 1 meter (Fallout 4 standard)
- Set FPS to 30 (Fallout 4 animation standard)
- Test in Blender before using in game
- Export as .nif for Fallout 4

### For Python Scripts
- Follow PEP 8 style guide (use Black formatter)
- Add docstrings to functions
- Use descriptive variable names
- Test in safe environments first

### Code Safety
- Never execute untrusted code
- Review AI-generated code before running
- Sandboxed execution is limited (file I/O restricted)
- Keep sensitive data out of test scripts

## Advanced Usage

### Custom Templates

Edit `gradio_interface.py` to add your own templates:

```python
TEMPLATES = {
    "My Custom Template": """
# Your template code here
print("Custom template loaded")
""",
    # ... other templates
}
```

### Integration with AI

The Gradio interface can be enhanced with:
- OpenAI Codex for code completion
- Code explanations from GPT-4
- Automated documentation generation

See `ADVANCED_AI_INTEGRATION.md` for details.

### Port Configuration

Default port: `7860`

To change the port, edit `gradio_interface.py`:

```python
demo.launch(
    server_name="127.0.0.1",
    server_port=YOUR_PORT,  # Change this
    share=False
)
```

## Troubleshooting

### "Gradio is not installed"
```bash
pip install gradio
```

### "Port 7860 is already in use"
- Close any existing Gradio instance
- Or change the port in `gradio_interface.py`

### "Black formatter not found"
```bash
pip install black
```

### "Code execution disabled"
- This is intentional for safety
- Enable the checkbox to allow execution

## Integration Examples

### Launch from Electron (TypeScript)

```typescript
import { spawn } from 'child_process';

function launchGradioAssistant() {
  const pythonProcess = spawn('python', ['launch_gradio.py'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  
  pythonProcess.on('error', (error) => {
    console.error('Failed to start Gradio:', error);
  });
}
```

### Open in Default Browser

```typescript
import { shell } from 'electron';

// After launching Gradio
setTimeout(() => {
  shell.openExternal('http://127.0.0.1:7860');
}, 2000);
```

## Security Notes

1. **Local Only**: Interface binds to `127.0.0.1` (localhost only)
2. **No Public Sharing**: `share=False` prevents Gradio public links
3. **Sandboxed Execution**: Code runs with limited permissions
4. **Manual Enablement**: Execution requires explicit checkbox
5. **No Network Access**: Executed code cannot make network requests

## Updates & Maintenance

### Update Gradio
```bash
pip install --upgrade gradio
```

### Update All Dependencies
```bash
pip install --upgrade -r requirements.txt
```

## Future Enhancements

Planned features:
- [ ] AI-powered code suggestions
- [ ] Integration with Mossy AI chat
- [ ] Code snippet library
- [ ] Git integration
- [ ] Collaborative editing
- [ ] Dark/light theme toggle
- [ ] Export formatted code to files

## Related Documentation

- [BACKEND_SETUP.md](BACKEND_SETUP.md) - Backend server setup
- [BLENDER_ADDON_TUTORIAL.md](BLENDER_ADDON_TUTORIAL.md) - Blender scripting
- [PAPERSCRIPT_GUIDE.md](PAPERSCRIPT_GUIDE.md) - Papyrus scripting
- [PYTHON_INTEGRATION.md](PYTHON_INTEGRATION.md) - Python integration details

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in terminal
3. Open an issue on GitHub
4. Ask in the Mossy community

---

**Happy Coding with Mossy! 🐍✨**
