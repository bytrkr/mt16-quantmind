#!/usr/bin/env bash
set -u

echo "=== [1] .GITIGNORE GUVENLIK & TEMIZLIK KURALLARI ==="
touch .gitignore

for entry in \
  ".env" \
  ".env.*" \
  "!.env.example" \
  "_temizlik_yedek/" \
  "_arsiv_cift_kopyalar/" \
  "_pipeline_backups/" \
  "_fix_step2_backups/" \
  "_fix_step4_backups/" \
  "_fix_step5_backups/" \
  "_fix_step6_backups/" \
  "_fix_step7_backups/" \
  "_fix_step8_backups/" \
  "_fix_step9_backups/" \
  "node_modules/" \
  "__pycache__/" \
  "*.pyc" \
  "*.log" \
  "*_rapor.txt" \
  "pipeline_rapor.txt"
do
  if ! grep -qxF "$entry" .gitignore; then
    echo "$entry" >> .gitignore
    echo "Eklendi (.gitignore): $entry"
  fi
done

echo "=== [2] GIT REPO & REMOTE KONTROLU ==="
git status -s || true
git remote -v || true

echo "=== [3] GITHINGEST ICIN HASSAS / BUYUK DOSYA KONTROLU ==="
find . -maxdepth 3 -not -path '*/.*' -not -path './node_modules*' -not -path './_*' -size +5M 2>/dev/null || true
