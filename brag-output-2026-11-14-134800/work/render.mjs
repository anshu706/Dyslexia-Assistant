import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workDir = resolve(__dirname);
const rootDir = resolve(workDir, '..', '..');
const outDir = resolve(workDir, '..');
const framesDir = resolve(workDir, 'frames');

fs.mkdirSync(framesDir, { recursive: true });

async function main() {
  console.log('Launching headless browser at 1920x1080...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  const storyboardUrl = 'file:///' + resolve(workDir, 'storyboard.html').replace(/\\/g, '/');
  
  console.log(`Loading storyboard from: ${storyboardUrl}`);
  await page.goto(storyboardUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const fps = 30;
  const duration = 20; // 20.0s
  const totalFrames = fps * duration; // 600 frames

  console.log(`Capturing ${totalFrames} frames at ${fps} fps (1920x1080)...`);

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;
    await page.evaluate((time) => window.seek(time), t);
    const framePath = join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });

    if (i % 60 === 0 || i === totalFrames - 1) {
      console.log(`Rendered frame ${i + 1}/${totalFrames} (${t.toFixed(1)}s)`);
    }
  }

  // Extract poster frame at 18.0s (frame 540)
  const posterSource = join(framesDir, 'frame_0540.png');
  const posterDest = resolve(outDir, 'brag.jpg');
  if (fs.existsSync(posterSource)) {
    fs.copyFileSync(posterSource, posterDest);
    // Also bake into frame 0 so it serves as idle thumbnail
    fs.copyFileSync(posterSource, join(framesDir, 'frame_0000.png'));
    console.log(`Saved poster image: ${posterDest} and baked as frame 0`);
  }

  await browser.close();
  console.log('All frames captured! Encoding high-production video with FFmpeg...');

  const soundtrackPath = resolve(workDir, 'soundtrack.mp3');
  const mp4Path = resolve(outDir, 'brag.mp4');

  // FFmpeg command:
  // - High quality H.264 video encoding with 30fps
  // - Audio trimmed to 20s with 1.5s exponential fade-out at end (afade=t=out:st=18.5:d=1.5)
  // - AAC audio 256kbps
  const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${join(framesDir, 'frame_%04d.png')}" -i "${soundtrackPath}" -filter_complex "[1:a]atrim=0:20,afade=t=out:st=18.5:d=1.5[aout]" -map 0:v -map "[aout]" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 256k -shortest "${mp4Path}"`;
  
  console.log(`Executing FFmpeg composite...`);
  execSync(ffmpegCmd, { stdio: 'inherit' });

  console.log(`\n🎉 High-production brag.mp4 created successfully at:\n${mp4Path}`);
}

main().catch((err) => {
  console.error('Render error:', err);
  process.exit(1);
});
