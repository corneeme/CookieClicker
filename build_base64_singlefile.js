const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

// Helper to convert binary files to Base64 Data URIs
function fileToDataURI(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let mimeType = 'application/octet-stream';

  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.txt': 'text/plain',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };

  if (mimeMap[ext]) mimeType = mimeMap[ext];

  const data = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${data.toString('base64')}`;
}

// Recursively gather all local asset files to embed into dataURIs
function getAssetMap(dir, baseDir = dir) {
  const assets = {};
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    // Skip node_modules, git directories, and the build outputs
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        Object.assign(assets, getAssetMap(fullPath, baseDir));
      }
    } else if (entry.isFile()) {
      if (!entry.name.endsWith('.html') && entry.name !== 'build_base64_singlefile.js') {
        assets[relPath] = fileToDataURI(fullPath);
      }
    }
  }
  return assets;
}

console.log('Encoding assets into Data URIs...');
const assetMap = getAssetMap(rootDir);

// 1. Read index.html
let html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

// 2. Inline CSS files directly into <style> tags
html = html.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi, (match, cssPath) => {
  const fullPath = path.join(rootDir, cssPath);
  if (fs.existsSync(fullPath)) {
    const cssContent = fs.readFileSync(fullPath, 'utf8');
    return `<style>\n${cssContent}\n</style>`;
  }
  return match;
});

// 3. Inject global runtime polyfills & dataURIs dictionary right after <head>
const runtimePatch = `
<script>
  window.dataURIs = ${JSON.stringify(assetMap, null, 2)};

  // 1. Hook into window.LoadScript to serve scripts from embedded Data URIs
  const originalLoadScript = window.LoadScript;
  window.LoadScript = function(url, callback) {
    const cleanUrl = url.replace(/^\\.\\//, '');
    if (window.dataURIs[cleanUrl]) {
      const script = document.createElement('script');
      script.src = window.dataURIs[cleanUrl];
      if (callback) script.onload = callback;
      document.head.appendChild(script);
    } else if (typeof originalLoadScript === 'function') {
      originalLoadScript(url, callback);
    }
  };

  // 2. Patch XMLHttpRequest / fetch to return local Data URIs for ajax() calls
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    const cleanUrl = url.replace(/^\\.\\//, '');
    if (window.dataURIs[cleanUrl]) {
      url = window.dataURIs[cleanUrl];
    }
    return originalXhrOpen.call(this, method, url, ...args);
  };
</script>
`;

html = html.replace('<head>', `<head>\n${runtimePatch}`);

// 4. Ensure main.js triggers correctly after DOM loads
const bootstrapper = `
<script>
  window.addEventListener('DOMContentLoaded', () => {
    if (window.dataURIs['main.js']) {
      const script = document.createElement('script');
      script.src = window.dataURIs['main.js'];
      document.body.appendChild(script);
    }
  });
</script>
`;

html = html.replace('</body>', `${bootstrapper}\n</body>`);

// Write to final output file
fs.writeFileSync(path.join(rootDir, 'cookie_clicker_standalone.html'), html);
console.log('Build complete: cookie_clicker_standalone.html generated!');
