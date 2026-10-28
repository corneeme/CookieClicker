const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

// Helper to convert local assets to Base64 Data URIs
function fileToDataURI(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'text/plain';
    
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.mp3') mimeType = 'audio/mpeg';
    else if (ext === '.ogg') mimeType = 'audio/ogg';
    else if (ext === '.css') mimeType = 'text/css';
    else if (ext === '.js') mimeType = 'text/javascript';

    const data = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${data.toString('base64')}`;
}

// 1. Read index.html
let html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

// 2. Inline CSS Files
html = html.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi, (match, cssPath) => {
    const fullPath = path.join(rootDir, cssPath);
    if (fs.existsSync(fullPath)) {
        const cssContent = fs.readFileSync(fullPath, 'utf8');
        return `<style>\n${cssContent}\n</style>`;
    }
    return match;
});

// 3. Read main.js into a plain text string instead of relying purely on dynamic async fetch
const mainJsPath = path.join(rootDir, 'main.js');
let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

// 4. Inject a runtime loader hook directly before </body>
const scriptInjection = `
<script>
  window.addEventListener('DOMContentLoaded', () => {
    // Intercept LoadScript calls so Cookie Clicker loads local data URIs or inline code
    const originalLoadScript = window.LoadScript;
    window.LoadScript = function(url, callback) {
      if (url === 'main.js') {
        try {
          ${mainJsContent}
          if (callback) callback();
        } catch (e) {
          console.error('Error executing main.js:', e);
        }
      } else if (typeof originalLoadScript === 'function') {
        originalLoadScript(url, callback);
      }
    };

    // Auto-trigger game launch once DOM elements (like #game) exist
    if (window.Game && window.Game.Init) {
      window.Game.Init();
    }
  });
</script>
`;

html = html.replace('</body>', `${scriptInjection}\n</body>`);

// 5. Output bundled standalone file
fs.writeFileSync(path.join(rootDir, 'cookie_clicker_standalone.html'), html);
console.log('Successfully generated cookie_clicker_standalone.html');
