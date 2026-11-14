import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import fs from 'node:fs';
import { execSync, spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workDir = resolve(__dirname);
const rootDir = resolve(workDir, '..', '..');
const outDir = resolve(workDir, '..');
const framesDir = resolve(workDir, 'frames');

fs.mkdirSync(framesDir, { recursive: true });

async function main() {
  console.log('Starting compositor HTTP server...');
  const serverProcess = spawn('node', [resolve(workDir, 'server.mjs')], { stdio: 'inherit' });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Launching headless browser at 1920x1080...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  const url = 'http://localhost:4180/brag-output-pro/work/compositor.html';
  console.log(`Navigating to compositor: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for fonts and video
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);

  const fps = 30;
  const duration = 22; // 22s total
  const totalFrames = fps * duration; // 660 frames

  console.log(`Rendering ${totalFrames} frames with real live interaction video at 30 fps...`);

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;
    await page.evaluate((time) => window.seek(time), t);
    // Give browser a tiny tick to paint video frame
    await page.waitForTimeout(30);

    const framePath = join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });

    if (i % 60 === 0 || i === totalFrames - 1) {
      console.log(`Rendered frame ${i + 1}/${totalFrames} (${t.toFixed(1)}s)`);
    }
  }

  // Extract poster frame at 20.5s (frame 615)
  const posterSource = join(framesDir, 'frame_0615.png');
  const posterDest = resolve(outDir, 'brag.jpg');
  if (fs.existsSync(posterSource)) {
    fs.copyFileSync(posterSource, posterDest);
    fs.copyFileSync(posterSource, join(framesDir, 'frame_0000.png'));
    console.log(`Saved poster image: ${posterDest} and baked as frame 0`);
  }

  await browser.close();
  serverProcess.kill();

  console.log('All frames captured! Encoding pro video with FFmpeg...');

  const soundtrackPath = resolve(rootDir, 'brag-output-2026-11-14-134800', 'work', 'soundtrack.mp3');
  const mp4Path = resolve(outDir, 'brag.mp4');

  const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${join(framesDir, 'frame_%04d.png')}" -i "${soundtrackPath}" -filter_complex "[1:a]atrim=0:22,afade=t=out:st=20.5:d=1.5[aout]" -map 0:v -map "[aout]" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 256k -shortest "${mp4Path}"`;

  console.log(`Executing FFmpeg composite...`);
  execSync(ffmpegCmd, { stdio: 'inherit' });

  console.log(`\n🎉 PRO brag.mp4 created successfully at:\n${mp4Path}`);
}

main().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
