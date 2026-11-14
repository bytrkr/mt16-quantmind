#!/usr/bin/env node
/**
 * Qodi TypeScript AST Scanner
 * Math.random() ve throw new Error() kullanımlarını AST ile bulur
 * (Regex değil, gerçek sözdizimi analizi)
 */
const { Project } = require('ts-morph');
const path = require('path');

const ROOT = '/home/bytrkr/bistapp';
const SCAN_DIRS = ['src', 'server', 'core', 'bist', 'crypto', 'nasdaq'];
const EXCLUDE = ['node_modules', '.git', 'dist', 'build'];

const project = new Project({
  tsConfigFilePath: path.join(ROOT, 'tsconfig.json'),
});

const results = [];

for (const dir of SCAN_DIRS) {
  const dirPath = path.join(ROOT, dir);
  if (!require('fs').existsSync(dirPath)) continue;

  const sourceFiles = project.getSourceFiles(`${dirPath}/**/*.{ts,tsx,js,jsx}`);

  for (const file of sourceFiles) {
    const filePath = file.getFilePath();
    if (EXCLUDE.some(ex => filePath.includes(ex))) continue;
    if (filePath.includes('.qodi_bak')) continue;

    const relPath = path.relative(ROOT, filePath);

    // 1. Math.random() çağrıları
    file.getDescendantsOfKind(require('ts-morph').SyntaxKind.CallExpression).forEach(call => {
      const expr = call.getExpression();
      if (expr.getText() === 'Math.random') {
        const line = call.getStartLineNumber();
        results.push({ file: relPath, line, kind: 'MATH_RANDOM', code: call.getParent().getText().slice(0, 150) });
      }
    });

    // 2. throw new Error
    file.getDescendantsOfKind(require('ts-morph').SyntaxKind.ThrowStatement).forEach(throwStmt => {
      const expr = throwStmt.getExpression();
      if (expr.getKind() === require('ts-morph').SyntaxKind.NewExpression) {
        const newExpr = expr;
        const ident = newExpr.getExpression();
        if (ident.getText().endsWith('Error')) {
          const line = throwStmt.getStartLineNumber();
          const inTry = throwStmt.getFirstAncestor(a => a.getKind() === require('ts-morph').SyntaxKind.TryStatement);
          results.push({
            file: relPath,
            line,
            kind: 'THROW_NEW',
            code: throwStmt.getText().slice(0, 150),
            in_try_catch: !!inTry
          });
        }
      }
    });
  }
}

// Rapor
const fs = require('fs');
fs.writeFileSync(path.join(ROOT, 'data', 'qodi_ts_ast_report.json'), JSON.stringify(results, null, 2));

// Özet
const byFile = {};
for (const r of results) {
  byFile[r.file] = (byFile[r.file] || 0) + 1;
}

console.log(`Toplam: ${results.length} bulgu`);
console.log('\nDosya bazında:');
Object.entries(byFile).sort((a,b) => b[1]-a[1]).slice(0, 20).forEach(([f, c]) => {
  console.log(`  ${String(c).padStart(3)}  ${f}`);
});

console.log(`\nDetay: data/qodi_ts_ast_report.json`);
