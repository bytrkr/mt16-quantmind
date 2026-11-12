#!/bin/bash
cd "$(dirname "$0")/.." || exit 1
{
echo '# PROJECT_TREE'
echo ''
echo '> Otomatik uretilir: `bash scripts/update_tree.sh`'
echo ''
echo '```'
find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*' -not -path './.aistudio/*' -not -path './.env' -not -name '*.bak-*' | sort
echo '```'
} > docs/PROJECT_TREE.md
echo 'PROJECT_TREE.md guncellendi'
