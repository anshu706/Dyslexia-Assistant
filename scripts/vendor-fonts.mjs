import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  fs.mkdirSync('public/fonts', { recursive: true });

  console.log('Fetching OpenDyslexic CSS...');
  const cdnCss = (await get('https://fonts.cdnfonts.com/css/opendyslexic')).toString();
  const fontMatches = [...cdnCss.matchAll(/url\(['"]?(https:\/\/[^)'"]+)['"]?\)/g)];
  console.log(`Found ${fontMatches.length} OpenDyslexic font files.`);

  let fontCss = `/* Locally vendored typography for 100% offline Dyslexia Assistant */\n`;

  for (let i = 0; i < Math.min(fontMatches.length, 4); i++) {
    const rawUrl = fontMatches[i][1].replace(/['"]/g, '');
    const filename = path.basename(new URL(rawUrl).pathname);
    console.log(`Downloading font: ${filename}`);
    const fontData = await get(rawUrl);
    fs.writeFileSync(path.join('public/fonts', filename), fontData);
  }

  // Write local OpenDyslexic font faces
  fontCss += `
@font-face {
    font-family: 'OpenDyslexic';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('../fonts/OpenDyslexic-Regular.woff') format('woff');
}
@font-face {
    font-family: 'OpenDyslexic';
    font-style: italic;
    font-weight: 400;
    font-display: swap;
    src: url('../fonts/OpenDyslexic-Italic.woff') format('woff');
}
@font-face {
    font-family: 'OpenDyslexic';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('../fonts/OpenDyslexic-Bold.woff') format('woff');
}
`;

  // Fetch Lexend
  console.log('Fetching Lexend CSS...');
  const gCss = (await get('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;600;700&display=swap')).toString();
  const gMatches = [...gCss.matchAll(/url\((https:\/\/[^)]+)\)/g)];
  console.log(`Found ${gMatches.length} Lexend font files.`);

  for (let i = 0; i < Math.min(gMatches.length, 4); i++) {
    const rawUrl = gMatches[i][1].replace(/['"]/g, '');
    const filename = `lexend-${i}.woff2`;
    console.log(`Downloading font: ${filename}`);
    const fontData = await get(rawUrl);
    fs.writeFileSync(path.join('public/fonts', filename), fontData);
    fontCss += `
@font-face {
    font-family: 'Lexend';
    font-style: normal;
    font-weight: ${[300, 400, 600, 700][i] || 400};
    font-display: swap;
    src: url('../fonts/${filename}') format('woff2');
}
`;
  }

  fs.writeFileSync('public/css/fonts.css', fontCss);
  fs.writeFileSync('css/fonts.css', fontCss);
  console.log('Vendored fonts and generated public/css/fonts.css.');
}

run().catch(console.error);
