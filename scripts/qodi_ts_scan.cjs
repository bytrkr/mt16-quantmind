#!/usr/bin/env node
/**
 * Qodi TypeScript AST Scanner (CommonJS)
 * Math.random() ve throw new Error() kullanımlarını AST ile bulur
 */
const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const ROOT = '/home/bytrkr/bistapp';
const SCAN_DIRS = ['src', 'server', 'core', 'bist', 'crypto', 'nasdaq'];
const EXCLUDE = ['node_modules', '.git', 'dist', 'build', '.qodi_bak'];

const project = new Project({
  tsConfigFilePath: path.join(ROOT, 'tsconfig.json'),
  skipAddingFilesFromTsConfig: true,
});

// Sadece hedef klasörlerdeki dosyaları ekle
for (const dir of SCAN_DIRS) {
  const dirPath = path.join(ROOT, dir);
  if (!fs.existsSync(dirPath)) continue;
  project.addSourceFilesAtPaths(`${dirPath}/**/*.{ts,tsx,js,jsx}`);
}

const results = [];

for (const file of project.getSourceFiles()) {
  const filePath = file.getFilePath();
  if (EXCLUDE.some(ex => filePath.includes(ex))) continue;

  const relPath = path.relative(ROOT, filePath);

  // 1. Math.random() çağrıları
  try {
    file.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
      const expr = call.getExpression();
      if (expr.getText() === 'Math.random') {
        results.push({
          file: relPath,
          line: call.getStartLineNumber(),
          kind: 'MATH_RANDOM',
          code: (call.getParent()?.getText() || call.getText()).slice(0, 150),
        });
      }
    });
  } catch (e) { /* bazı dosyalar parse edilemeyebilir */ }

  // 2. throw new Error
  try {
    file.getDescendantsOfKind(SyntaxKind.ThrowStatement).forEach(throwStmt => {
      const expr = throwStmt.getExpression();
      if (!expr) return;
      if (expr.getKind() === SyntaxKind.NewExpression) {
        const ident = expr.getExpression();
        if (ident && ident.getText().endsWith('Error')) {
          const inTry = throwStmt.getFirstAncestor(a => a.getKind() === SyntaxKind.TryStatement);
          results.push({
            file: relPath,
            line: throwStmt.getStartLineNumber(),
            kind: 'THROW_NEW',
            code: throwStmt.getText().slice(0, 150),
            in_try_catch: !!inTry,
          });
        }
      }
    });
  } catch (e) { /* parse hataları */ }
}

// Rapor
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'data', 'qodi_ts_ast_report.json'),
  JSON.stringify(results, null, 2)
);

// Özet
const byFile = {};
for (const r of results) {
  byFile[r.file] = (byFile[r.file] || 0) + 1;
}

console.log(`\n=== Toplam: ${results.length} bulgu ===\n`);
console.log('Dosya bazında:');
Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([f, c]) => {
    console.log(`  ${String(c).padStart(3)}  ${f}`);
  });

const mathRandom = results.filter(r => r.kind === 'MATH_RANDOM');
const throwOutsideTry = results.filter(r => r.kind === 'THROW_NEW' && !r.in_try_catch);

console.log(`\n=== Kritik Özet ===`);
console.log(`Math.random() toplam: ${mathRandom.length}`);
console.log(`Kontrolsüz throw (try dışı): ${throwOutsideTry.length}`);
console.log(`\nDetay: data/qodi_ts_ast_report.json`);
