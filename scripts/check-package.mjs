import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('[Check Package] Verifying VS Code extension packaging configuration...');

// 1. Verify package.json required marketplace fields
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredFields = ['name', 'displayName', 'publisher', 'version', 'engines', 'repository', 'license', 'categories'];

for (const field of requiredFields) {
  if (!pkg[field]) {
    console.error(`[Error] Missing required field in package.json: ${field}`);
    process.exit(1);
  }
}

if (!pkg.engines?.vscode) {
  console.error('[Error] package.json must specify engines.vscode');
  process.exit(1);
}

// Ensure dist exists before auditing package contents
if (!fs.existsSync('dist/extension.js') || !fs.existsSync('dist/webview/bundle.js')) {
  console.log('[Check Package] Compiling extension before auditing...');
  execSync('npm run build', { stdio: 'inherit' });
}

// 2. Verify files produced by vsce ls
console.log('[Check Package] Auditing vsce ls file inclusions...');
let fileListOutput;
try {
  fileListOutput = execSync('npx @vscode/vsce ls --no-dependencies', { encoding: 'utf8' });
} catch (err) {
  console.error('[Error] Failed to run vsce ls:', err.message);
  process.exit(1);
}

const files = fileListOutput
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean);

console.log(`[Check Package] Total files to be packaged: ${files.length}`);

// Forbidden patterns
const forbiddenPrefixes = [
  'src/',
  'test/',
  '_bmad/',
  '_bmad-output/',
  '.claude/',
  '.agents/',
  '.github/',
  '.vscode/',
  'scripts/',
  'node_modules/'
];

const forbiddenFiles = files.filter((f) =>
  forbiddenPrefixes.some((prefix) => f.startsWith(prefix)) || f.endsWith('.ts')
);

if (forbiddenFiles.length > 0) {
  console.error('[Error] Forbidden files detected in packaging list:');
  for (const f of forbiddenFiles) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

// Must contain essential files
const essential = ['package.json', 'README.md', 'dist/extension.js', 'dist/webview/bundle.js'];
for (const req of essential) {
  if (!files.some((f) => f === req || f.endsWith(req))) {
    console.error(`[Error] Essential file missing from package: ${req}`);
    process.exit(1);
  }
}

console.log('✓ All package verification checks passed successfully!');
process.exit(0);
