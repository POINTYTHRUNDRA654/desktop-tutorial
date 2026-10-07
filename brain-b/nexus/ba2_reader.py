"""Minimal reader for Fallout 4 general-format (GNRL) BA2 archives."""
from __future__ import annotations

import struct
import zlib
from typing import Iterator


class Ba2:
    def __init__(self, path: str):
        self.path = path
        self.f = open(path, "rb")
        magic, version, kind, count, names_off = struct.unpack("<4sI4sIQ", self.f.read(24))
        if magic != b"BTDX" or kind != b"GNRL":
            raise ValueError("not a general BA2")
        self.count = count
        self.f.seek(24)
        raw = self.f.read(36 * count)
        self.records = [struct.unpack_from("<I4sIIQIII", raw, 36 * i) for i in range(count)]
        self.f.seek(names_off)
        names = []
        for _ in range(count):
            (n,) = struct.unpack("<H", self.f.read(2))
            names.append(self.f.read(n).decode("latin-1"))
        self.names = names

    def read(self, i: int) -> bytes:
        _h, _ext, _dir, _flags, offset, packed, unpacked, _pad = self.records[i]
        self.f.seek(offset)
        data = self.f.read(packed or unpacked)
        return zlib.decompress(data) if packed else data

    def items(self, suffix: str = "") -> Iterator[tuple[str, int]]:
        sfx = suffix.lower()
        for i, n in enumerate(self.names):
            if n.lower().endswith(sfx):
                yield n, i

    def close(self):
        self.f.close()
