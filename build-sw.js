const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const SW_PATH = path.join(ROOT_DIR, 'sw.js');

const EXCLUDE_DIRS = new Set(['.git', '.github', 'node_modules']);
const EXCLUDE_FILES = new Set([
  'sw.js',
  'build-sw.js',
  'generate-sw.js',
  'inject-sw.js',
  'sw-register.js',
  'project.mobirise',
  'README.md',
  'CNAME'
]);

function collectAssets(dir, baseDir = dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        results = results.concat(collectAssets(fullPath, baseDir));
      }
    } else if (entry.isFile()) {
      if (!EXCLUDE_FILES.has(entry.name)) {
        const stats = fs.statSync(fullPath);
        results.push({ url: relPath, size: stats.size });
      }
    }
  }
  return results;
}

const assets = collectAssets(ROOT_DIR);
// Ensure root '/' maps to '/index.html' size without double-counting
const indexAsset = assets.find((a) => a.url === '/index.html');
const manifestMap = {};
let totalBytes = 0;

for (const item of assets) {
  manifestMap[item.url] = item.size;
  totalBytes += item.size;
}
if (indexAsset) {
  manifestMap['/'] = indexAsset.size;
}

const cacheVersion = `rorabina-pwa-${Date.now()}`;
const swTemplate = fs.readFileSync(SW_PATH, 'utf8');

const updatedSw = swTemplate
  .replace(/const CACHE_NAME = ['"`].*?['"`];/, `const CACHE_NAME = '${cacheVersion}';`)
  .replace(/const TOTAL_CACHE_BYTES = \d+;/, `const TOTAL_CACHE_BYTES = ${totalBytes};`)
  .replace(
    /const ASSET_MANIFEST = \{[\s\S]*?\};/,
    `const ASSET_MANIFEST = ${JSON.stringify(manifestMap, null, 2)};`
  );

fs.writeFileSync(SW_PATH, updatedSw, 'utf8');
console.log(`Updated sw.js (${assets.length} files, ${(totalBytes / (1024 * 1024)).toFixed(2)} MB)`);
