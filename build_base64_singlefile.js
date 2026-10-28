const fs = require('fs');
const path = require('path');

// 1. All JS dependencies to package into memory
const jsFiles = [
  'main.js',
  'minigameGarden.js',
  'minigamePantheon.js',
  'minigameGrimoire.js',
  'minigameMarket.js',
  'loc/EN.js' // English localization
];

let dataURIs = {};

// Read and encode JavaScript files
jsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // --- SEVER INTERNET CONNECTIONS & PATCH MAIN.JS ---
    if (file === 'main.js') {
      console.log('Patching main.js to run completely offline...');

      // Neutralize external analytics, ads, and update pings
      content = content.replace(/https?:\/\/orteil\.dashnet\.org\/[^\s'"]+/g, '');
      content = content.replace(/https?:\/\/www\.google-analytics\.com\/[^\s'"]+/g, '');

      // Override dynamic script loading so it loads from local dataURIs instead of fetching over network
      content = content.replace(
        /App\.loadScript\s*=\s*function\s*\(([^)]+)\)\s*\{/g,
        `App.loadScript = function(url, callback) {
          const fileName = url.split('/').pop();
          if (window.dataURIs && window.dataURIs[fileName]) {
            const s = document.createElement('script');
            s.src = window.dataURIs[fileName];
            if (callback) s.onload = callback;
            document.head.appendChild(s);
            return;
          }
        `
      );

      // Prevent ajax/XHR network calls from throwing uncaught errors
      content = content.replace(
        /function ajax\(url,callback\)\{/g,
        `function ajax(url,callback){ if(callback) callback(''); return false;`
      );
    }

    const base64 = Buffer.from(content).toString('base64');
    const keyName = path.basename(file);
    dataURIs[keyName] = `data:text/javascript;base64,${base64}`;
  }
});

// Read HTML & CSS
const cssContent = fs.existsSync('style.css') ? fs.readFileSync('style.css', 'utf8') : '';
const htmlBody = fs.existsSync('index.html') ? fs.readFileSync('index.html', 'utf8') : '';

// Generate self-contained HTML
const htmlOutput = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cookie Clicker Offline</title>
  <style>
    ${cssContent}
  </style>
  <script>
    // Store bundled scripts in global scope
    window.dataURIs = ${JSON.stringify(dataURIs, null, 2)};

    // Boot main game engine directly from memory
    window.addEventListener('DOMContentLoaded', () => {
      if (window.dataURIs['main.js']) {
        const script = document.createElement('script');
        script.src = window.dataURIs['main.js'];
        document.head.appendChild(script);
      }
    });
  </script>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/cookie-clicker-standalone.html', htmlOutput);
console.log('Successfully generated offline-isolated HTML file!');
