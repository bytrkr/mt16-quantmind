#!/bin/bash

# Project Tree Generator
# Generates a detailed project tree with descriptions in docs/PROJECT_TREE.md

OUTPUT_FILE="docs/PROJECT_TREE.md"
DATE=$(date +"%Y-%m-%d %H:%M:%S")

cat <<EOF > $OUTPUT_FILE
# Project Tree
Son Güncelleme: $DATE

This is an auto-generated file. Do not edit manually. Use \`npm run update-tree\` to refresh.

EOF

# Function to get description
get_description() {
    local file=$1
    case $file in
        *server/routes/analyze.ts) echo "Analiz isteğini doğru borsaya yönlendirir." ;;
        *server/index.ts) echo "Express sunucusu ve API rotaları ana giriş noktası." ;;
        *src/App.tsx) echo "Ana React uygulaması ve rota yönetimi." ;;
        *src/components/BistTab.tsx) echo "BIST sekmesi bileşeni." ;;
        *package.json) echo "Proje bağımlılıkları ve scriptleri." ;;
        *README.md) echo "Proje açıklaması." ;;
        *.ts) echo "TypeScript kaynak dosyası." ;;
        *.tsx) echo "React bileşeni." ;;
        *) echo "Dosya veya konfigürasyon." ;;
    esac
}

# Generate file list and descriptions
find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*' | sort | while read -r file; do
    desc=$(get_description "$file")
    echo "$file — $desc" >> $OUTPUT_FILE
done
