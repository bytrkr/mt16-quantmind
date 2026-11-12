
import { glob } from 'glob';
import fs from 'fs';

const files = glob.sync('src/{services,hooks}/**/*.ts');
let found = false;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  // Strip comments so documentation and instruction headers don't cause false positives in actual code
  const codeOnly = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n\r]*/g, '');

  // Look for patterns like || 100, || 0, ?? 100, ?? 0
  const forbiddenPatterns = [
    /\|\|\s*0/,
    /\?\?\s*0/,
    /\|\|\s*\d+/,
    /\?\?\s*\d+/
  ];
  
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(codeOnly)) {
      console.error(`[CI FAILED] Potential fallback found in ${file}. Pattern ${pattern} violates Constitutional Rule 3 (Fallback Yasağı).`);
      found = true;
    }
  }
}

if (found) {
  process.exit(1);
}
console.log('CI Fallback check passed.');
