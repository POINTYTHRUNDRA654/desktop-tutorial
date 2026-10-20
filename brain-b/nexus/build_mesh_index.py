"""Build the vanilla mesh feature index from the game's BA2 archives. Dev machine only.

    python build_mesh_index.py "<Fallout 4>/Data" mesh_index.npz
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import ba2_reader
import nif_features as nf


# Machine-generated or distance-LOD meshes: nobody exports a mesh meant to look like these.
SKIP_PREFIXES = ("meshes/precombined/", "meshes/lod/", "meshes/landscape/", "meshes/terrain/", "meshes/scol/", "meshes/vis/")


def main(data_dir, out):
    names, vecs, meta = [], [], []
    skipped = 0
    archives = sorted(p for p in Path(data_dir).glob("*.ba2")
                      if p.name.lower().startswith(("fallout4 - meshes", "dlc")) and "- main" in p.name.lower()
                      or p.name.lower().startswith("fallout4 - meshes"))
    for path in archives:
        try:
            ba = ba2_reader.Ba2(str(path))
        except ValueError:
            continue
        n_here = 0
        for name, i in ba.items(".nif"):
            if name.replace("\\", "/").lower().startswith(SKIP_PREFIXES):
                continue
            f = nf.extract(ba.read(i))
            if f is None or f["shapes"] == 0:
                skipped += 1
                continue
            names.append(name.replace("\\", "/"))
            vecs.append(nf.vector(f))
            meta.append([f["bsx"], f["shader_type"], f["shader_f1"] & 0xFFFFFFFF if f["shader_f1"] >= 0 else 0,
                         f["shader_f2"] & 0xFFFFFFFF if f["shader_f2"] >= 0 else 0, f["verts"], f["tris"], f["shapes"]])
            n_here += 1
        ba.close()
        print(f"{path.name}: {n_here} meshes")
    X = np.array(vecs, dtype=np.float32)
    mean, std = X.mean(axis=0), X.std(axis=0)
    std[std < 1e-6] = 1.0
    np.savez_compressed(out, X=X, mean=mean.astype(np.float32), std=std.astype(np.float32),
                        meta=np.array(meta, dtype=np.int64), names="\n".join(names),
                        features="\n".join(nf.FEATURE_NAMES))
    print(f"{len(names)} meshes indexed ({skipped} without geometry skipped) -> {out} ({Path(out).stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
