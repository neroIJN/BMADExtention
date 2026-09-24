import { builtinModules } from 'module';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MAX_VSIX_BYTES = 5 * 1024 * 1024;
const MAX_SINGLE_FILE_BYTES = 2 * 1024 * 1024;

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const args = process.argv.slice(2);
const vsixFlagIndex = args.indexOf('--vsix');
const vsixPath = vsixFlagIndex >= 0 ? args[vsixFlagIndex + 1] : undefined;

const allowedTopLevelFiles = new Set(['package.json', 'readme.md', 'license', 'license.txt']);
const allowedPrefixes = ['dist/', 'media/'];
const requiredPackageFiles = ['package.json', 'readme.md', 'dist/extension.js', 'dist/webview/bundle.js'];
const blockedPrefixes = [
  '.git/',
  '.github/',
  '.vscode/',
  'src/',
  'test/',
  'scripts/',
  'node_modules/',
  '_bmad/',
  '_bmad-output/'
];
const blockedNamePattern = /(^|\/)(\.env(\..*)?|id_rsa|id_dsa|id_ed25519|\.npmrc|\.yarnrc|.*\.(pem|key|pfx|p12))$/i;

function fail(message) {
  console.error(`[Error] ${message}`);
  process.exit(1);
}

function normalize(file) {
  return file.replace(/^extension\//, '').replace(/\\/g, '/');
}

function isAllowed(normalizedPath) {
  const lower = normalizedPath.toLowerCase();
  return allowedTopLevelFiles.has(lower) || allowedPrefixes.some((prefix) => lower.startsWith(prefix));
}

function hasBlockedSegment(filePath) {
  return blockedPrefixes.some((prefix) => filePath.startsWith(prefix));
}

function verifyPackageManifest() {
  console.log('[Check Package] Verifying VS Code extension metadata...');

  const requiredFields = ['name', 'displayName', 'publisher', 'version', 'engines', 'repository', 'license', 'categories', 'main'];
  for (const field of requiredFields) {
    if (!pkg[field]) {
      fail(`Missing required field in package.json: ${field}`);
    }
  }

  if (!pkg.engines?.vscode) {
    fail('package.json must specify engines.vscode');
  }

  if (!Array.isArray(pkg.activationEvents) || pkg.activationEvents.length === 0) {
    fail('package.json should define at least one activation event.');
  }

  if (!Array.isArray(pkg.files) || pkg.files.length === 0) {
    fail('package.json must define a non-empty "files" allowlist for deterministic packaging.');
  }

  if (!pkg.repository?.url || !/^https:\/\//i.test(pkg.repository.url)) {
    fail('package.json repository.url must be an HTTPS URL.');
  }

  if (!pkg.homepage || !/^https:\/\//i.test(pkg.homepage)) {
    fail('package.json homepage must be an HTTPS URL.');
  }

  if (!pkg.bugs?.url || !/^https:\/\//i.test(pkg.bugs.url)) {
    fail('package.json bugs.url must be an HTTPS URL.');
  }

  if (typeof pkg.main !== 'string' || pkg.main !== './dist/extension.js') {
    fail('package.json main must point to ./dist/extension.js');
  }
}

function ensureBuildArtifacts() {
  if (!fs.existsSync('dist/extension.js') || !fs.existsSync('dist/webview/bundle.js')) {
    console.log('[Check Package] Build artifacts missing. Running build...');
    execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
  }
}

function verifyBundledRuntimeDependencies() {
  console.log('[Check Package] Verifying extension host bundle dependencies...');
  const bundlePath = path.resolve('dist/extension.js');
  const extensionBundle = fs.readFileSync(bundlePath, 'utf8');
  const requirePattern = /\brequire\((['"`])([^'"`]+)\1\)/g;
  const requires = new Set();
  let match;

  while ((match = requirePattern.exec(extensionBundle)) !== null) {
    requires.add(match[2]);
  }

  const builtins = new Set([
    ...builtinModules,
    ...builtinModules.map((moduleName) => moduleName.replace(/^node:/, '')),
    ...builtinModules.map((moduleName) => `node:${moduleName.replace(/^node:/, '')}`)
  ]);

  const externalRuntimeRequires = [...requires].filter((specifier) => {
    if (specifier === 'vscode') {
      return false;
    }
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      return false;
    }
    return !builtins.has(specifier);
  });

  if (externalRuntimeRequires.length > 0) {
    fail(`Bundle includes unresolved external runtime dependencies: ${externalRuntimeRequires.join(', ')}`);
  }

  const declaredRuntimeDeps = Object.keys(pkg.dependencies || {});
  const unbundledDeclaredDeps = declaredRuntimeDeps.filter((dep) =>
    [...requires].some((specifier) => specifier === dep || specifier.startsWith(`${dep}/`))
  );

  if (unbundledDeclaredDeps.length > 0) {
    fail(`Declared runtime dependencies are not bundled into dist/extension.js: ${unbundledDeclaredDeps.join(', ')}`);
  }
}

function verifyDistContent() {
  console.log('[Check Package] Auditing dist artifacts...');
  const distDir = path.resolve('dist');
  const stack = [distDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      const relative = path.relative(path.resolve('.'), fullPath).replace(/\\/g, '/');
      if (relative.endsWith('.map') || relative.endsWith('.ts') || relative.endsWith('.tsx')) {
        fail(`Unexpected source or sourcemap artifact in dist: ${relative}`);
      }

      const size = fs.statSync(fullPath).size;
      if (size > MAX_SINGLE_FILE_BYTES) {
        fail(`Artifact is too large (${size} bytes): ${relative}`);
      }
    }
  }
}

function verifyPackagedFileList(files, modeLabel) {
  console.log(`[Check Package] Auditing ${modeLabel} file inclusions...`);

  const normalizedFiles = files
    .map((file) => normalize(file.trim()))
    .filter(Boolean)
    .filter((file) => file !== '[Content_Types].xml' && file !== 'extension.vsixmanifest');

  if (normalizedFiles.length === 0) {
    fail(`${modeLabel} produced an empty file list.`);
  }

  for (const file of normalizedFiles) {
    if (file.startsWith('/')) {
      fail(`Unexpected absolute path in package list: ${file}`);
    }
    if (file.includes('..')) {
      fail(`Unexpected parent directory traversal in package list: ${file}`);
    }
    if (hasBlockedSegment(file)) {
      fail(`Blocked file path found in package list: ${file}`);
    }
    if (blockedNamePattern.test(file)) {
      fail(`Potential secret/private file path found in package list: ${file}`);
    }
    if (file.endsWith('.map') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      fail(`Source or sourcemap file should not be shipped: ${file}`);
    }
    if (!isAllowed(file)) {
      fail(`Unexpected packaged file outside package.json files allowlist: ${file}`);
    }
  }

  const normalizedFilesLower = normalizedFiles.map((file) => file.toLowerCase());
  for (const requiredFile of requiredPackageFiles) {
    if (!normalizedFilesLower.includes(requiredFile)) {
      fail(`Required packaged file missing: ${requiredFile}`);
    }
  }

  console.log(`[Check Package] Total files validated (${modeLabel}): ${normalizedFiles.length}`);
}

function checkVsceDryRun() {
  const output = execFileSync('npx', ['@vscode/vsce', 'ls', '--no-dependencies'], { encoding: 'utf8' });
  const files = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  verifyPackagedFileList(files, 'vsce ls');
}

function checkVsixArchive(vsixFilePath) {
  if (!vsixFilePath) {
    fail('Missing VSIX path. Usage: npm run package:check:vsix -- <path-to-vsix>');
  }
  const resolved = path.resolve(vsixFilePath);
  if (!fs.existsSync(resolved)) {
    fail(`VSIX file not found: ${resolved}`);
  }

  const stats = fs.statSync(resolved);
  if (stats.size > MAX_VSIX_BYTES) {
    fail(`VSIX is too large (${stats.size} bytes).`);
  }

  const output = execFileSync('unzip', ['-Z', '-1', resolved], { encoding: 'utf8' });
  const files = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  verifyPackagedFileList(files, 'VSIX archive');
}

verifyPackageManifest();
ensureBuildArtifacts();
verifyDistContent();
verifyBundledRuntimeDependencies();

if (vsixPath) {
  checkVsixArchive(vsixPath);
} else {
  checkVsceDryRun();
}

console.log('✓ All package verification checks passed successfully!');
