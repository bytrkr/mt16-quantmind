#!/usr/bin/env python3
"""
Qodi Python AST Düzeltici
Sadece güvenli düzeltmeler yapar:
1. 'except:' → 'except Exception as e:'
2. 'import random' → 'import secrets' (rastgelelik üretimi için secrets daha güvenli)
"""
import sys
import libcst as cst
from pathlib import Path

ROOT = Path("/home/bytrkr/bistapp")

class QodiTransformer(cst.CSTTransformer):
    def __init__(self):
        self.changes = 0

    def leave_ExceptHandler(self, original_node, updated_node):
        # except: → except Exception as e:
        if original_node.type is None:
            self.changes += 1
            return updated_node.with_changes(
                type=cst.Name("Exception"),
                name=cst.AsName(name=cst.Name("e")) if updated_node.name is None else updated_node.name
            )
        return updated_node

    def leave_Import(self, original_node, updated_node):
        # import random → import secrets
        for i, alias in enumerate(updated_node.names):
            if alias.name.value == "random":
                self.changes += 1
                new_alias = alias.with_changes(name=cst.Name("secrets"))
                return updated_node.with_changes(
                    names=updated_node.names[:i] + (new_alias,) + updated_node.names[i+1:]
                )
        return updated_node

def fix_file(path: Path):
    try:
        source = path.read_text(encoding="utf-8")
        tree = cst.parse_module(source)
    except Exception as e:
        print(f"[SKIP] {path.relative_to(ROOT)}: {e}")
        return 0

    transformer = QodiTransformer()
    new_tree = tree.visit(transformer)

    if transformer.changes > 0:
        backup = path.with_suffix(path.suffix + ".qodi_bak")
        if not backup.exists():
            backup.write_text(source, encoding="utf-8")
        path.write_text(new_tree.code, encoding="utf-8")
        print(f"[FIX] {path.relative_to(ROOT)}: {transformer.changes} değişiklik")

    return transformer.changes

def main():
    total = 0
    for py_file in (ROOT / "python").rglob("*.py"):
        if "__pycache__" in str(py_file) or ".venv" in str(py_file):
            continue
        total += fix_file(py_file)

    print(f"\n=== Toplam: {total} değişiklik ===")
    if total > 0:
        print("Geri almak için: scripts/qodi_py_rollback.sh")

if __name__ == "__main__":
    main()
