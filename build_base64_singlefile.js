const fs = require('fs');
const path = require('path');

// List of core JS dependencies to inline as Base64
const jsFiles = [
  'main.js',
  'minigameGarden.js',
  'minigamePantheon.js',
  'minigameGrimoire.js',
  'minigameMarket.js'
];

let dataURIs = {};

// 1. Read JavaScript files and convert to Base64
jsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file);
    const base64 = content.toString('base64');
    dataURIs[file] = `data:text/javascript;base64,${base64}`;
  }
});

// 2. Build output HTML wrapper
const htmlOutput = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cookie Clicker Standalone</title>
  <style>
    ${fs.existsSync('style.css') ? fs.readFileSync('style.css', 'utf8') : ''}
  </style>
  <script>
    // Embedded Data URIs
    const dataURIs = ${JSON.stringify(dataURIs, null, 2)};

    // Dynamically inject scripts into the DOM from memory
    window.addEventListener('DOMContentLoaded', () => {
      Object.keys(dataURIs).forEach(fileName => {
        const script = document.createElement('script');
        script.src = dataURIs[fileName];
        document.head.appendChild(script);
      });
    });
  </script>
</head>
<body>
  ${fs.existsSync('index.html') ? fs.readFileSync('index.html', 'utf8') : ''}
</body>
</html>`;

// 3. Write output to dist/
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/cookie-clicker-standalone.html', htmlOutput);
console.log('Successfully generated Base64 standalone HTML!');
