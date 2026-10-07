"""Log / crash pattern mining (Drain3) -- runs entirely on this computer.

Reads log text (CKPE log, Papyrus log, crash-report text), groups lines that
differ only in numbers / FormIDs / file names into one pattern, remembers the
patterns between runs, and says which ones are NEW since last time and which
keep repeating. State is a small JSON file per log source.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Iterable

from drain3 import TemplateMiner
from drain3.masking import MaskingInstruction
from drain3.template_miner_config import TemplateMinerConfig

MAX_LINES = 20000
MAX_BYTES = 8 * 1024 * 1024
ALLOWED_SUFFIXES = {".log", ".txt"}
SEVERE_WORDS = re.compile(r"\b(error|fatal|fail(ed|ure)?|crash(ed)?|exception|cannot|can't|unable|missing|invalid|corrupt\w*|access violation)\b", re.I)
WARN_WORDS = re.compile(r"\b(warn(ing)?|deprecated|conflict|mismatch|ignored|skipp(ed|ing))\b", re.I)

_MASKS = [
    (r"\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?\]?", "TIMESTAMP"),
    (r"\[\d{1,2}/\d{1,2}/\d{2,4} \d{1,2}:\d{2}:\d{2}(?: ?[AP]M)?\]", "TIMESTAMP"),
    (r"(?i)[a-z]:\\[^\s'\"<>|]+", "PATH"),
    (r"(?i)\b[\w .()'-]+\.(?:esp|esm|esl|nif|dds|pex|psc|ba2|hkx|wav|xwm|fuz|swf)\b", "FILE"),
    (r"(?i)\b0x[0-9a-f]+\b", "HEX"),
    (r"(?i)\b[0-9a-f]{8}\b", "FORMID"),
    (r"\b\d+(?:\.\d+)?\b", "NUM"),
]


def _config() -> TemplateMinerConfig:
    cfg = TemplateMinerConfig()
    cfg.drain_sim_th = 0.5
    cfg.drain_depth = 4
    cfg.drain_max_children = 100
    cfg.drain_max_clusters = 2000
    cfg.snapshot_interval_minutes = 10_000  # we save ourselves
    cfg.masking_instructions = [MaskingInstruction(p, n) for p, n in _MASKS]
    return cfg


def severity(template: str) -> str:
    if SEVERE_WORDS.search(template):
        return "error"
    if WARN_WORDS.search(template):
        return "warning"
    return "info"


def _safe_label(label: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", label or "log")[:60] or "log"


class LogPatternMiner:
    def __init__(self, state_dir: str | os.PathLike, label: str):
        self.dir = Path(state_dir)
        self.label = _safe_label(label)
        self.state_file = self.dir / f"logpatterns_{self.label}.json"
        self.miner = TemplateMiner(config=_config())
        self.seen: dict[int, dict] = {}   # cluster_id -> {"template","total","first_run"}
        self.runs = 0
        self._load()

    # -- persistence: we store the lines' templates and replay them, which keeps the
    # state human-readable and independent of drain3's own snapshot format.
    def _load(self) -> None:
        try:
            data = json.loads(self.state_file.read_text(encoding="utf-8"))
        except Exception:
            return
        self.runs = int(data.get("runs", 0))
        for tpl, total in data.get("templates", []):
            res = self.miner.add_log_message(str(tpl))
            cid = res["cluster_id"]
            self.seen[cid] = {"template": res["template_mined"], "total": int(total), "first_run": 0}

    def save(self) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)
        payload = {"runs": self.runs, "templates": [[v["template"], v["total"]] for v in self.seen.values()]}
        tmp = self.state_file.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload), encoding="utf-8")
        os.replace(tmp, self.state_file)

    def mine(self, lines: Iterable[str]) -> dict:
        baseline = not self.seen
        batch: dict[int, int] = {}
        total_lines = 0
        for raw in lines:
            line = raw.strip()
            if not line:
                continue
            total_lines += 1
            res = self.miner.add_log_message(line)
            cid = res["cluster_id"]
            batch[cid] = batch.get(cid, 0) + 1
        self.runs += 1
        out = []
        for cid, n in batch.items():
            cluster = self.miner.drain.id_to_cluster.get(cid)
            tpl = cluster.get_template() if cluster else ""
            prev = self.seen.get(cid)
            is_new = prev is None
            if is_new:
                self.seen[cid] = {"template": tpl, "total": n, "first_run": self.runs}
            else:
                prev["template"] = tpl
                prev["total"] += n
            out.append({"id": cid, "template": tpl, "count": n, "total": self.seen[cid]["total"],
                        "new": is_new and not baseline, "severity": severity(tpl)})
        order = {"error": 0, "warning": 1, "info": 2}
        out.sort(key=lambda t: (not t["new"], order[t["severity"]], -t["count"]))
        self.save()
        return {
            "label": self.label, "baseline": baseline, "total_lines": total_lines,
            "pattern_count": len(out), "new_count": sum(1 for t in out if t["new"]),
            "patterns": out[:60],
        }


def read_tail_lines(path: str | os.PathLike) -> list[str]:
    p = Path(path)
    if p.suffix.lower() not in ALLOWED_SUFFIXES:
        raise ValueError("only .log and .txt files can be read")
    size = p.stat().st_size
    with open(p, "rb") as f:
        if size > MAX_BYTES:
            f.seek(size - MAX_BYTES)
            f.readline()  # drop the partial first line
        text = f.read().decode("utf-8", errors="replace")
    return text.splitlines()[-MAX_LINES:]
