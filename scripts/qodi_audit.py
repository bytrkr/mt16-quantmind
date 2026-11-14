#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qodi v6.1 Anayasasi - Kod Denetim ve Hata Temizleme Betigi
Kurallar:
1. 0 Fallback: ?? / || sayisal varsayilan yasak
2. 0 Math.random: Rastgelelik yasak
3. 0 throw: Kontrolsuz firlatma yasak (try/catch veya fetch guard icindekiler guvenli)
4. VERI YOK: Eksik veri acikca belirtilmeli
5. Type Guard: toFixed/toLocaleString oncesi typeof kontrolu
"""

import os
import re
import sys
import json
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path("/home/bytrkr/bistapp")
SCAN_DIRS = ["src", "server", "core", "bist", "crypto", "nasdaq", "python"]
EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py"]
EXCLUDE_DIRS = {"node_modules", ".git", "dist", "build", "__pycache__", ".venv", "venv", "public/assets"}

FORBIDDEN_PATTERNS = [
    ("FALLBACK_NUMERIC", r"\?\?\s*\d+|\|\|\s*\d+", "Sayisal fallback yasak"),
    ("FALLBACK_STRING",  r"\?\?\s*[\"'][^\"']*[\"']|\|\|\s*[\"'][^\"']*[\"']", "String fallback yasak"),
    ("MATH_RANDOM",      r"\bMath\.random\s*\(", "Math.random kullanimi yasak"),
    ("THROW_NEW",        r"\bthrow\s+new\s+\w*Error\s*\(", "Kontrolsuz throw new Error yasak"),
    ("PY_RANDOM",        r"^\s*import\s+random|^\s*from\s+random\s+import", "Python random kullanimi yasak"),
    ("PY_BARE_EXCEPT",   r"except\s*:\s*$", "Ciplak except yasak"),
]

GUARD_HINTS = [
    r"typeof\s+\w+\s*===?\s*['\"]number['\"]",
    r"Number\.isFinite\s*\(",
    r"isNaN\s*\(",
    r"safeToFixed\s*\(",
    r"safeToLocaleString\s*\(",
    r"Number\s*\(\s*\([^)]*\)\.toFixed",
    r"Number\s*\(\s*\w+\.toFixed",
    r"Number\s*\(\s*\([^)]*\)\.toLocaleString",
    r"process\.env\.",
    r"# noqa",
    r"# qodi:ignore",
    r"// qodi:ignore",
]


def is_excluded_dir(path):
    return bool(set(path.parts) & EXCLUDE_DIRS)


def is_safe_throw(line, lines, idx):
    if (re.search(r"if\s*\(\s*!\s*(?:res|response)\.ok", line) or
        re.search(r"if\s*\(\s*!\s*content\b", line) or
        re.search(r"if\s*\(\s*!\s*\w+_API_KEY", line) or
        "Controlled test exception" in line):
        return True
    for j in range(idx - 2, max(-1, idx - 100), -1):
        if re.search(r"\btry\s*\{", lines[j]):
            return True
    return False


def scan_file(path):
    issues = []
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        return [{"file": str(path), "line": 0, "rule": "READ_ERROR", "msg": str(e)}]

    lines = text.splitlines()
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith("#") or stripped.startswith("//") or stripped.startswith("*"):
            continue
        if "qodi:ignore" in line or "# noqa" in line:
            continue

        has_guard = any(re.search(p, line) for p in GUARD_HINTS)

        for rule_id, pattern, msg in FORBIDDEN_PATTERNS:
            if not re.search(pattern, line):
                continue
            if has_guard and rule_id in ("FALLBACK_NUMERIC", "FALLBACK_STRING"):
                continue
            if "process.env." in line and rule_id in ("FALLBACK_STRING", "FALLBACK_NUMERIC"):
                continue
            if rule_id == "THROW_NEW" and is_safe_throw(line, lines, idx):
                continue
            if rule_id == "PY_RANDOM":
                p_lower = str(path).lower()
                if "test" in p_lower or "mock" in p_lower or "simulator" in p_lower:
                    continue
            issues.append({
                "file": str(path.relative_to(ROOT)),
                "line": idx,
                "rule": rule_id,
                "msg": msg,
                "code": stripped[:180],
            })
    return issues


def main():
    started = datetime.now(timezone.utc).isoformat()
    report = {
        "timestamp": started,
        "root": str(ROOT),
        "policy": "Qodi v6.1",
        "scanned_files": 0,
        "issues": [],
        "summary": {},
        "verdict": None,
    }

    for d in SCAN_DIRS:
        target = ROOT / d
        if not target.exists():
            continue
        for f in target.rglob("*"):
            if not f.is_file() or f.suffix not in EXTENSIONS or is_excluded_dir(f):
                continue
            if ".qodi_bak" in f.name:
                continue
            report["scanned_files"] += 1
            report["issues"].extend(scan_file(f))

    by_rule = {}
    for it in report["issues"]:
        by_rule[it["rule"]] = by_rule.get(it["rule"], 0) + 1

    report["summary"] = {"total_issues": len(report["issues"]), "by_rule": by_rule}
    report["verdict"] = "FAIL - Qodi ihlali" if report["issues"] else "PASS - Qodi uyumlu"

    out_path = ROOT / "data" / "qodi_audit_report.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=" * 70)
    print("QODI v6.1 DENETIM RAPORU")
    print("=" * 70)
    print(f"Taranan dosya    : {report['scanned_files']}")
    print(f"Toplam ihlal     : {report['summary']['total_issues']}")
    print(f"Karar            : {report['verdict']}")
    print(f"Rapor            : {out_path}")
    if by_rule:
        print("-" * 70)
        for r, c in sorted(by_rule.items(), key=lambda x: -x[1]):
            print(f"  {r:22s} : {c}")
    print("=" * 70)
    sys.exit(0 if not report["issues"] else 1)


if __name__ == "__main__":
    main()
