# External Tools

These tools are **not included** in the Git repository because they contain large binary files that would exceed GitHub's file-size limits. They must be downloaded and set up separately.

> **Note:** The `tools/` directory is excluded from Git tracking via `.gitignore`. Do not attempt to commit executables or other large binaries directly into the repository — use Git LFS (already configured for `*.exe`, `*.dll`, `*.pdb`, `*.msi`, `*.zip`, and similar types via `.gitattributes`) if a tool absolutely must live inside the repo.

---

## FFmpeg (Video/Audio Processing)

Used for video conversion and audio extraction features in the addon.

1. Download the **essentials build** for Windows from [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/)
2. Extract the archive so the directory structure matches:
   ```
   tools/ffmpeg/ffmpeg-<version>-essentials_build/bin/ffmpeg.exe
   tools/ffmpeg/ffmpeg-<version>-essentials_build/bin/ffplay.exe
   tools/ffmpeg/ffmpeg-<version>-essentials_build/bin/ffprobe.exe
   ```

Alternatively, run the provided installer script:
```powershell
python tools/install_all_tools.py
```

---

## TexConv (Texture Conversion)

Used for converting textures to DDS format for Fallout 4.

- Download from [https://github.com/Microsoft/DirectXTex/releases](https://github.com/Microsoft/DirectXTex/releases)
- Place `texconv.exe` in `tools/texconv/`

---

## NVTT (NVIDIA Texture Tools)

Used for GPU-accelerated texture compression.

- Download from [https://developer.nvidia.com/nvidia-texture-tools-exporter](https://developer.nvidia.com/nvidia-texture-tools-exporter)
- Extract to `tools/nvtt/`

---

## Havok2FBX

Used for converting Havok animation files.

- Follow setup instructions in `tools/install_all_tools.py`

---

## Why are these excluded from Git?

Binary executables can be very large (the FFmpeg binaries alone are ~95 MB each). Storing them directly in Git:
- Slows down `git clone`, `git pull`, and `git push` for everyone
- Can cause push failures in GitHub Desktop and Visual Studio due to GitHub's 100 MB per-file limit
- Bloats the repository permanently (Git keeps the full history of every file)

The `.gitattributes` file is configured to route `*.exe`, `*.dll`, `*.pdb`, `*.msi`, `*.zip`, and similar types through **Git LFS** if they are ever added to the repository, which handles large files safely.
