# Quick Start: Gradio Python Assistant

Get started with Mossy's Gradio Python code assistant in 3 minutes!

## Step 1: Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `gradio` - Web UI framework
- `black` - Code formatter (recommended)
- `autopep8` - Alternative formatter
- Other Mossy Python dependencies

**Estimated time**: 2-3 minutes

## Step 2: Launch the Interface

```bash
python launch_gradio.py
```

Or directly:

```bash
python gradio_interface.py
```

You should see:
```
🚀 Starting Mossy Python Code Assistant...
📝 Features: Code templates, syntax validation, formatting, safe execution
Running on local URL:  http://127.0.0.1:7860
```

**The interface automatically opens in your default browser.**

## Step 3: Start Writing Python Code!

### Try These Actions:

1. **Load a Template**
   - Select "Blender Script Template" from dropdown
   - Click "📋 Load Template"
   - See the template code appear in the editor

2. **Validate Syntax**
   - Edit the code or write your own
   - Click "✓ Validate Syntax"
   - See instant feedback on syntax errors

3. **Format Code**
   - Write some messy Python code
   - Select "black" formatter
   - Click "✨ Format Code"
   - Watch your code get beautifully formatted!

4. **Safe Execution** (Optional)
   - Check "⚠️ Enable code execution"
   - Click "▶️ Run Code"
   - See the output in the execution panel

## Example Workflow

```python
# 1. Load the "Python Utility Template"
# 2. Modify the main() function:

def main():
    """Calculate Fallout 4 damage formula"""
    base_damage = 25
    weapon_mod_bonus = 5
    perk_multiplier = 1.3
    
    total_damage = (base_damage + weapon_mod_bonus) * perk_multiplier
    print(f"Total Damage: {total_damage:.1f}")

# 3. Click "✓ Validate Syntax" - should say "✅ Syntax is valid!"
# 4. Click "✨ Format Code" - code gets formatted
# 5. Enable execution and click "▶️ Run Code" - see "Total Damage: 39.0"
```

## Tips for Best Results

### Code Templates
- **Papyrus Script Template**: For Fallout 4 scripting pseudocode
- **Blender Script Template**: For 3D asset creation (1.0 scale, 30 FPS)
- **Python Utility Template**: For general modding utilities

### Code Formatting
- Use **Black** for opinionated, consistent formatting (recommended)
- Use **autopep8** for PEP 8 compliance with more options
- Format early and often for clean code

### Syntax Validation
- Validate after every major change
- Pay attention to line numbers in error messages
- Fix errors before running code

### Safe Execution
- Only enable for code you trust
- Execution is sandboxed (limited file/network access)
- Use for testing logic, not for production runs

## Common Issues

### "Module 'gradio' not found"
**Solution**: Run `pip install -r requirements.txt`

### "Port 7860 is already in use"
**Solution**: Close existing Gradio instance or change port in `gradio_interface.py`

### "Black formatter not found"
**Solution**: Run `pip install black`

### Browser doesn't open automatically
**Solution**: Manually visit `http://127.0.0.1:7860` in your browser

## Next Steps

- Read [GRADIO_PYTHON_ASSISTANT.md](GRADIO_PYTHON_ASSISTANT.md) for full documentation
- Explore the code templates
- Try the AI integration (coming soon)
- Share your scripts with the community!

## Stopping the Interface

Press `Ctrl+C` in the terminal where Gradio is running.

---

**Happy coding with Mossy! 🐍✨**
