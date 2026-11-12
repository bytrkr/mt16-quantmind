import os
from pathlib import Path

root_dir = Path("/app/applet")
exclude_dirs = {".git", "node_modules", "dist", ".aistudio"}

print("Starting MT16 QuantMind rebranding replacement...")

# 1. Rename DB file if exists
db_old = root_dir / "python" / "bistapp_users.db"
db_new = root_dir / "python" / "mt16_quantmind.db"
if db_old.exists():
    db_old.rename(db_new)
    print(f"Renamed {db_old} -> {db_new}")

# 2. Replace text in files
for path in root_dir.glob("**/*"):
    if any(ex in path.parts for ex in exclude_dirs):
        continue
    if path.is_file() and path.suffix in [".py", ".ts", ".tsx", ".md", ".json", ".html", ".css"]:
        try:
            content = path.read_text(encoding="utf-8")
            orig = content
            
            # Replacements
            content = content.replace("Bistapp MT16", "MT16 QuantMind")
            content = content.replace("BistApp MT16", "MT16 QuantMind")
            content = content.replace("BISTAPP", "MT16_QUANTMIND")
            content = content.replace("Bistapp", "MT16 QuantMind")
            content = content.replace("BistApp", "MT16 QuantMind")
            content = content.replace("bistapp", "mt16")
            
            if content != orig:
                path.write_text(content, encoding="utf-8")
                print(f"Updated branding in: {path.relative_to(root_dir)}")
        except Exception as e:
            print(f"Error reading {path}: {e}")

print("Rebranding replacement completed successfully!")
