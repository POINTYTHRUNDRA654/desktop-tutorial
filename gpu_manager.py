"""
gpu_manager.py
==============
GPU detection and multi-GPU workload distribution for the Mossy FO4 addon.

Automatically detects all available CUDA GPUs, their VRAM, compute capability,
and driver-reported CUDA version.  Exposes helpers for distributing tile-based
and batch workloads across multiple GPUs — no NVLink required.

On a dual RTX 2070 system each card has its own 8 GB VRAM.  The manager
assigns tile ranges (texture processing) or file lists (batch operations)
so both cards run simultaneously, roughly halving wall-clock time.
"""

import bpy
import os
import sys
import subprocess
import threading
from dataclasses import dataclass, field
from typing import List, Optional


# ---------------------------------------------------------------------------
# GPU info dataclass
# ---------------------------------------------------------------------------

@dataclass
class GPUInfo:
    index:        int
    name:         str
    vram_mb:      int          # total VRAM in MB
    vram_free_mb: int          # free VRAM at detection time
    cuda_cap:     str          # compute capability e.g. "7.5"
    driver_cuda:  str          # driver max CUDA e.g. "12.4"
    is_primary:   bool = False

    @property
    def vram_gb(self) -> float:
        return round(self.vram_mb / 1024, 1)

    @property
    def vram_free_gb(self) -> float:
        return round(self.vram_free_mb / 1024, 1)

    def __str__(self):
        return (f"GPU {self.index}: {self.name} "
                f"({self.vram_gb} GB total, {self.vram_free_gb} GB free, "
                f"CUDA {self.cuda_cap})")


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

_gpu_cache: Optional[List[GPUInfo]] = None
_cache_lock = threading.Lock()


def detect_gpus(force_refresh: bool = False) -> List[GPUInfo]:
    """Return a list of available CUDA GPUs.

    Results are cached for the Blender session.  Pass force_refresh=True
    after a driver change or after installing a new card.
    """
    global _gpu_cache
    with _cache_lock:
        if _gpu_cache is not None and not force_refresh:
            return _gpu_cache
        _gpu_cache = _detect_gpus_impl()
    return _gpu_cache


def _detect_gpus_impl() -> List[GPUInfo]:
    gpus: List[GPUInfo] = []

    # ── Primary: nvidia-smi (always available on NVIDIA systems) ─────────
    try:
        result = subprocess.run(
            ["nvidia-smi",
             "--query-gpu=index,name,memory.total,memory.free,compute_cap,driver_version",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            driver_cuda = _parse_driver_cuda(result.stdout)
            for line in result.stdout.strip().splitlines():
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 5:
                    try:
                        gpu = GPUInfo(
                            index        = int(parts[0]),
                            name         = parts[1],
                            vram_mb      = int(parts[2]),
                            vram_free_mb = int(parts[3]),
                            cuda_cap     = parts[4],
                            driver_cuda  = driver_cuda,
                        )
                        gpus.append(gpu)
                    except (ValueError, IndexError):
                        pass
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        pass

    # ── Secondary: PyTorch (richer info, only if torch is loaded) ────────
    if not gpus:
        try:
            import torch
            if torch.cuda.is_available():
                for i in range(torch.cuda.device_count()):
                    props = torch.cuda.get_device_properties(i)
                    total_mb = props.total_memory // (1024 * 1024)
                    gpus.append(GPUInfo(
                        index        = i,
                        name         = props.name,
                        vram_mb      = total_mb,
                        vram_free_mb = total_mb,  # torch doesn't expose free easily
                        cuda_cap     = f"{props.major}.{props.minor}",
                        driver_cuda  = "unknown",
                    ))
        except Exception:
            pass

    if gpus:
        gpus[0].is_primary = True

    return gpus


def _parse_driver_cuda(smi_output: str) -> str:
    """Extract CUDA version from nvidia-smi output."""
    import re
    m = re.search(r"CUDA Version:\s*(\d+\.\d+)", smi_output)
    return m.group(1) if m else "unknown"


def get_best_gpu() -> Optional[GPUInfo]:
    """Return the GPU with the most free VRAM."""
    gpus = detect_gpus()
    return max(gpus, key=lambda g: g.vram_free_mb) if gpus else None


def gpu_count() -> int:
    return len(detect_gpus())


def is_multi_gpu() -> bool:
    return gpu_count() > 1


def gpu_summary() -> str:
    """Human-readable summary for display in the UI."""
    gpus = detect_gpus()
    if not gpus:
        return "No CUDA GPUs detected"
    lines = [f"  {g}" for g in gpus]
    if len(gpus) > 1:
        total_vram = sum(g.vram_gb for g in gpus)
        lines.append(f"  Total: {len(gpus)} GPUs, {total_vram:.1f} GB VRAM combined")
        lines.append("  Multi-GPU mode: workload split across all cards")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Workload distribution
# ---------------------------------------------------------------------------

def split_tile_ranges(total_tiles: int) -> List[tuple]:
    """Split a tile grid across available GPUs.

    Returns a list of (gpu_index, start_tile, end_tile) tuples.
    If only one GPU is available the whole range goes to GPU 0.
    """
    gpus = detect_gpus()
    n    = len(gpus)
    if n == 0 or total_tiles == 0:
        return [(0, 0, total_tiles)]

    # Weight by free VRAM so a card with more headroom gets more tiles
    weights    = [max(g.vram_free_mb, 1) for g in gpus]
    total_w    = sum(weights)
    ranges     = []
    start      = 0
    for i, gpu in enumerate(gpus):
        share = weights[i] / total_w
        count = round(total_tiles * share) if i < n - 1 else (total_tiles - start)
        end   = min(start + count, total_tiles)
        if end > start:
            ranges.append((gpu.index, start, end))
        start = end
    return ranges


def split_file_list(files: List[str]) -> List[tuple]:
    """Split a file list across available GPUs.

    Returns list of (gpu_index, [file_paths]) tuples.
    """
    gpus = detect_gpus()
    n    = len(gpus)
    if n == 0:
        return [(0, files)]

    weights = [max(g.vram_free_mb, 1) for g in gpus]
    total_w = sum(weights)
    result  = []
    start   = 0
    for i, gpu in enumerate(gpus):
        share = weights[i] / total_w
        count = round(len(files) * share) if i < n - 1 else (len(files) - start)
        end   = min(start + count, len(files))
        if end > start:
            result.append((gpu.index, files[start:end]))
        start = end
    return result


def run_realesrgan_multi_gpu(esrgan_exe: str,
                              input_file: str,
                              output_file: str,
                              scale: int = 4,
                              tile_size: int = 512) -> tuple:
    """Run Real-ESRGAN using the best available GPU.

    On a multi-GPU system picks the GPU with the most free VRAM.
    Returns (success, output_path_or_error).
    """
    gpu   = get_best_gpu()
    gpu_id = gpu.index if gpu else 0

    cmd = [
        esrgan_exe,
        "-i", input_file,
        "-o", output_file,
        "-s", str(scale),
        "-n", "realesrgan-x4plus",
        "-t", str(tile_size),
        "-g", str(gpu_id),   # explicit GPU selection
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode == 0 and os.path.isfile(output_file):
            gpu_name = gpu.name if gpu else f"GPU {gpu_id}"
            return True, output_file
        return False, f"ESRGAN failed on GPU {gpu_id}: {result.stderr.strip()}"
    except subprocess.TimeoutExpired:
        return False, "ESRGAN timed out (10 min)"
    except Exception as exc:
        return False, str(exc)


def run_batch_multi_gpu(esrgan_exe: str,
                         input_files: List[str],
                         output_dir: str,
                         scale: int = 4,
                         tile_size: int = 512) -> List[tuple]:
    """Batch process files across all available GPUs in parallel threads.

    Returns list of (success, output_path_or_error) in same order as input_files.
    """
    gpus = detect_gpus()
    if not gpus:
        # No CUDA — run sequentially on CPU
        results = []
        for f in input_files:
            out = os.path.join(output_dir, os.path.basename(f))
            ok, msg = run_realesrgan_multi_gpu(esrgan_exe, f, out, scale, tile_size)
            results.append((ok, msg))
        return results

    splits      = split_file_list(input_files)
    all_results = [None] * len(input_files)
    file_index  = {f: i for i, f in enumerate(input_files)}
    threads     = []

    def _process_chunk(gpu_idx: int, chunk_files: List[str]):
        for fpath in chunk_files:
            out = os.path.join(output_dir,
                               os.path.splitext(os.path.basename(fpath))[0] + "_enhanced.png")
            cmd = [
                esrgan_exe,
                "-i", fpath,
                "-o", out,
                "-s", str(scale),
                "-n", "realesrgan-x4plus",
                "-t", str(tile_size),
                "-g", str(gpu_idx),
            ]
            try:
                r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
                ok  = r.returncode == 0 and os.path.isfile(out)
                msg = out if ok else r.stderr.strip()
            except Exception as exc:
                ok, msg = False, str(exc)
            idx = file_index.get(fpath)
            if idx is not None:
                all_results[idx] = (ok, msg)

    for gpu_idx, chunk in splits:
        t = threading.Thread(target=_process_chunk, args=(gpu_idx, chunk), daemon=True)
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    # Fill any None slots (shouldn't happen)
    return [(r if r is not None else (False, "unprocessed")) for r in all_results]


# ---------------------------------------------------------------------------
# Blender UI helpers
# ---------------------------------------------------------------------------

class FO4_OT_DetectGPUs(bpy.types.Operator):
    """Detect and display all available CUDA GPUs."""
    bl_idname  = "fo4.detect_gpus"
    bl_label   = "Detect GPUs"
    bl_options = {'REGISTER'}

    def execute(self, context):
        gpus = detect_gpus(force_refresh=True)
        summary = gpu_summary()
        print(f"\n[GPU Manager]\n{summary}\n")
        if gpus:
            self.report({'INFO'},
                f"Found {len(gpus)} GPU(s): {', '.join(g.name for g in gpus)}")
        else:
            self.report({'WARNING'}, "No CUDA GPUs detected")
        return {'FINISHED'}


def draw_gpu_status(layout, compact: bool = False):
    """Draw GPU status into any panel layout."""
    gpus = detect_gpus()
    box  = layout.box()
    if not gpus:
        box.label(text="No CUDA GPUs detected", icon='ERROR')
        box.operator("fo4.detect_gpus", text="Detect GPUs", icon='SYSTEM')
        return

    if compact:
        row = box.row()
        row.label(
            text=f"{len(gpus)} GPU(s): {' + '.join(g.name for g in gpus)}",
            icon='CHECKMARK',
        )
        row.operator("fo4.detect_gpus", text="", icon='FILE_REFRESH')
    else:
        hdr = box.row()
        hdr.label(
            text=f"{'Multi-GPU' if len(gpus) > 1 else 'Single GPU'} — {len(gpus)} card(s) detected",
            icon='CHECKMARK',
        )
        hdr.operator("fo4.detect_gpus", text="", icon='FILE_REFRESH')
        for g in gpus:
            row = box.row()
            row.scale_y = 0.75
            primary = " [PRIMARY]" if g.is_primary else ""
            row.label(
                text=f"  GPU {g.index}: {g.name}{primary}  —  "
                     f"{g.vram_free_gb}/{g.vram_gb} GB free  |  CUDA {g.cuda_cap}",
                icon='RESTRICT_RENDER_OFF',
            )
        if len(gpus) > 1:
            note = box.row()
            note.scale_y = 0.7
            note.label(
                text=f"  Workload split across all {len(gpus)} cards automatically",
                icon='PLAY',
            )


_CLASSES = [FO4_OT_DetectGPUs]


def register():
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            pass


def unregister():
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
