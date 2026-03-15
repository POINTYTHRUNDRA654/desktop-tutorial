# Working with Embedded Python Installations

This guide covers working with embedded Python installations, commonly found in portable Windows applications like ComfyUI portable builds.

## What is Embedded Python?

Embedded Python is a minimal Python installation packaged within an application directory. It includes:
- Python interpreter
- Standard library
- pip (package installer)
- No system-wide installation
- Self-contained in application folder

Common locations:
- `python_embeded\` (ComfyUI portable)
- `python\` (some applications)
- `Python310\` (versioned folders)

## Why Use Embedded Python?

**Advantages:**
- ✅ No system Python installation needed
- ✅ Isolated from other Python installations
- ✅ Portable - works on any machine
- ✅ No PATH configuration required
- ✅ No permission issues
- ✅ Easy to backup/transfer

**Disadvantages:**
- ❌ Separate packages for each installation
- ❌ More disk space if multiple apps use it
- ❌ Need to use full path for commands

## Using Embedded Python

### Basic Commands

**Check Python version:**
```cmd
# Windows
.\python_embeded\python.exe --version

# Or relative path
python_embeded\python.exe --version
```

**Check pip version:**
```cmd
.\python_embeded\python.exe -m pip --version
```

**List installed packages:**
```cmd
.\python_embeded\python.exe -m pip list
```

### Installing Packages

#### From requirements.txt

**General format:**
```cmd
.\python_embeded\python.exe -s -m pip install -r requirements.txt
```

**For ComfyUI-GGUF:**
```cmd
# First clone to correct location
git clone https://github.com/city96/ComfyUI-GGUF ComfyUI\custom_nodes\ComfyUI-GGUF

# Then install requirements from ComfyUI root
cd ComfyUI
.\python_embeded\python.exe -s -m pip install -r .\custom_nodes\ComfyUI-GGUF\requirements.txt
```

**For other custom nodes (general pattern):**
```cmd
# Clone extension
git clone <repo_url> ComfyUI\custom_nodes\<node_name>

# Install requirements
cd ComfyUI
.\python_embeded\python.exe -s -m pip install -r .\custom_nodes\<node_name>\requirements.txt
```

**Explanation of flags:**
- `-s`: Skip user site-packages (use only embedded Python)
- `-m pip`: Run pip as module
- `-r`: Install from requirements file

#### Individual Packages

```cmd
# Install single package
.\python_embeded\python.exe -s -m pip install numpy

# Install specific version
.\python_embeded\python.exe -s -m pip install torch==2.0.0

# Install with specific index
.\python_embeded\python.exe -s -m pip install torch --index-url https://download.pytorch.org/whl/cu118
```

#### Upgrade Packages

```cmd
# Upgrade pip itself
.\python_embeded\python.exe -s -m pip install --upgrade pip

# Upgrade specific package
.\python_embeded\python.exe -s -m pip install --upgrade setuptools

# Upgrade all packages (not recommended)
.\python_embeded\python.exe -s -m pip list --outdated
```

### Running Python Scripts

```cmd
# Run script with embedded Python
.\python_embeded\python.exe script.py

# Run with arguments
.\python_embeded\python.exe script.py --arg1 value1

# Run module
.\python_embeded\python.exe -m module_name
```

## ComfyUI Portable Specific

### Directory Structure

```
ComfyUI/
├── python_embeded/          # Embedded Python
│   ├── python.exe           # Python interpreter
│   ├── Scripts/
│   │   └── pip.exe          # Pip executable
│   └── Lib/                 # Python libraries
├── custom_nodes/            # ComfyUI extensions
│   ├── ComfyUI-GGUF/
│   │   └── requirements.txt
│   └── ...
├── models/                  # AI models
├── main.py                  # ComfyUI main script
└── requirements.txt         # ComfyUI requirements
```

### Installation Workflow

**Step 1: Install ComfyUI dependencies**
```cmd
cd ComfyUI
.\python_embeded\python.exe -s -m pip install -r requirements.txt
```

**Step 2: Install PyTorch (CUDA)**
```cmd
.\python_embeded\python.exe -s -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

**Step 4: Install ComfyUI extensions**
```cmd
cd custom_nodes

# Essential extensions
git clone https://github.com/ltdrdata/ComfyUI-Manager.git
git clone https://github.com/city96/ComfyUI-GGUF.git
git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git
git clone https://github.com/KohakuBlueleaf/z-tipo-extension.git

cd ..
.\python_embeded\python.exe -s -m pip install -r .\custom_nodes\ComfyUI-GGUF\requirements.txt
```

**Step 5: Verify installation**
```cmd
.\python_embeded\python.exe -m pip list
```

**Step 6: Run ComfyUI**
```cmd
.\python_embeded\python.exe main.py
```

### Troubleshooting

#### "python.exe not found"

**Problem:** Can't find embedded Python

**Solution:**
```cmd
# Check if python_embeded exists
dir python_embeded

# Check for different folder names
dir python
dir Python310

# Use full path
C:\path\to\ComfyUI\python_embeded\python.exe --version
```

#### "No module named pip"

**Problem:** pip not included in embedded Python

**Solution:**
```cmd
# Download get-pip.py
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py

# Install pip
.\python_embeded\python.exe get-pip.py

# Verify
.\python_embeded\python.exe -m pip --version
```

#### Package Installation Fails

**Problem:** Network issues or package conflicts

**Solution:**
```cmd
# Try with verbose output
.\python_embeded\python.exe -s -m pip install -r requirements.txt -v

# Try one package at a time
.\python_embeded\python.exe -s -m pip install numpy
.\python_embeded\python.exe -s -m pip install pillow

# Clear pip cache
.\python_embeded\python.exe -s -m pip cache purge

# Reinstall
.\python_embeded\python.exe -s -m pip install --force-reinstall -r requirements.txt
```

#### Permission Denied

**Problem:** Write permissions

**Solution:**
```cmd
# Run Command Prompt as Administrator
# Right-click CMD → "Run as administrator"

# Or install to user directory
.\python_embeded\python.exe -s -m pip install --user package_name
```

#### CUDA/GPU Not Working

**Problem:** PyTorch not using GPU

**Solution:**
```cmd
# Uninstall CPU version
.\python_embeded\python.exe -s -m pip uninstall torch torchvision

# Install CUDA version explicitly
.\python_embeded\python.exe -s -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Verify CUDA
.\python_embeded\python.exe -c "import torch; print(torch.cuda.is_available())"
```

## Batch Scripts for Common Tasks

### install_comfyui_deps.bat

```batch
@echo off
echo Installing ComfyUI dependencies with embedded Python...
cd /d "%~dp0"

if not exist "python_embeded\python.exe" (
    echo Error: python_embeded not found!
    pause
    exit /b 1
)

echo Installing core requirements...
.\python_embeded\python.exe -s -m pip install -r requirements.txt

echo Installing PyTorch (CUDA)...
.\python_embeded\python.exe -s -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

echo Done!
pause
```

### install_custom_node.bat

```batch
@echo off
echo Installing custom node dependencies...
cd /d "%~dp0"

set /p NODE_NAME="Enter custom node folder name: "

if not exist "custom_nodes\%NODE_NAME%\requirements.txt" (
    echo Error: requirements.txt not found for %NODE_NAME%
    pause
    exit /b 1
)

.\python_embeded\python.exe -s -m pip install -r ".\custom_nodes\%NODE_NAME%\requirements.txt"

echo Done!
pause
```

### run_comfyui.bat

```batch
@echo off
echo Starting ComfyUI...
cd /d "%~dp0"

.\python_embeded\python.exe main.py

pause
```

## Best Practices

### DO:
- ✅ Use `-s` flag to isolate from system Python
- ✅ Use `-m pip` instead of calling pip.exe directly
- ✅ Keep embedded Python updated
- ✅ Document which packages are installed
- ✅ Use requirements.txt for reproducibility
- ✅ Test after each installation

### DON'T:
- ❌ Mix embedded and system Python packages
- ❌ Install packages system-wide if using embedded
- ❌ Modify embedded Python files directly
- ❌ Share embedded Python between applications
- ❌ Delete python_embeded folder

## Integration with Blender Add-on

### Using ComfyUI from Blender

Blender also uses embedded Python. To use ComfyUI from Blender:

**Option 1: Run ComfyUI separately**
```cmd
# Terminal 1: Start ComfyUI
cd ComfyUI
.\python_embeded\python.exe main.py

# Blender: Connect via HTTP
# Use Blender add-on to send/receive data
```

**Option 2: Install packages in Blender's Python**
```cmd
# Find Blender's Python
# Usually: C:\Program Files\Blender Foundation\Blender 3.x\3.x\python\bin

# Install in Blender's Python
"C:\Program Files\Blender Foundation\Blender 3.x\3.x\python\bin\python.exe" -m pip install requests pillow
```

**Option 3: Use Gradio bridge**
```python
# In Blender add-on
# Send request to ComfyUI server
import requests
response = requests.post("http://localhost:8188/api/...", json=data)
```

## Platform Differences

### Windows
- Uses backslashes: `python_embeded\python.exe`
- Requires `.exe` extension
- Case-insensitive paths
- May need admin rights

### Linux/macOS
- Uses forward slashes: `python_embeded/python`
- No `.exe` extension
- Case-sensitive paths
- May need `chmod +x` for executables

**Note:** Embedded Python is most common on Windows. Linux/macOS typically use system Python or virtual environments.

## Summary

**Key Points:**
- Embedded Python is self-contained
- Use full path: `.\python_embeded\python.exe`
- Use `-s -m pip` for package installation
- Keep dependencies documented
- Isolated from system Python

**For ComfyUI-GGUF:**
```cmd
cd ComfyUI
.\python_embeded\python.exe -s -m pip install -r .\custom_nodes\ComfyUI-GGUF\requirements.txt
```

This ensures packages are installed in the correct Python environment!

---

**Version:** 1.0  
**Last Updated:** 2026-02-17  
**Platform:** Primarily Windows, adaptable to other platforms
