import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');

async function main() {
  console.log('--- Generating Brand Icon Assets ---');

  const svgPath = path.resolve(publicDir, 'favicon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  // Launch Chromium to render the SVG cleanly at 1024x1024
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 2
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1024px;
      height: 1024px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    }
    svg {
      width: 1024px;
      height: 1024px;
    }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

  await page.setContent(html);
  const masterPngPath = path.resolve(rootDir, 'temp-master-icon.png');
  await page.screenshot({ path: masterPngPath, omitBackground: true });
  await browser.close();

  console.log('Captured master 1024x1024 SVG render via Playwright Chromium.');

  // Run Python Pillow script to downsample and generate all favicons & ICO
  const pyScript = `
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

rootDir = r"${rootDir.replace(/\\/g, '\\\\')}"
pubDir = r"${publicDir.replace(/\\/g, '\\\\')}"
masterPath = os.path.join(rootDir, "temp-master-icon.png")

master = Image.open(masterPath).convert("RGBA")

# 1. Standard PNG sizes
sizes = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "favicon-48x48.png": 48,
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
}

for name, s in sizes.items():
    resized = master.resize((s, s), Image.Resampling.LANCZOS)
    resized.save(os.path.join(rootDir, name))
    resized.save(os.path.join(pubDir, name))
    print(f"Generated {name} ({s}x{s})")

# 2. Multi-size ICO file containing 16, 32, 48
ico16 = master.resize((16, 16), Image.Resampling.LANCZOS)
ico32 = master.resize((32, 32), Image.Resampling.LANCZOS)
ico48 = master.resize((48, 48), Image.Resampling.LANCZOS)

ico_path_root = os.path.join(rootDir, "favicon.ico")
ico_path_pub = os.path.join(pubDir, "favicon.ico")

ico32.save(ico_path_root, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
ico32.save(ico_path_pub, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print("Generated multi-resolution favicon.ico (16, 32, 48)")

# 3. Maskable PWA icons (with 15% safe padding on solid background #FFFBF3)
for s, name in [(192, "icon-maskable-192.png"), (512, "icon-maskable-512.png")]:
    maskable = Image.new("RGBA", (s, s), (255, 251, 243, 255))
    inner_s = int(s * 0.76)
    inner_img = master.resize((inner_s, inner_s), Image.Resampling.LANCZOS)
    offset = (s - inner_s) // 2
    maskable.paste(inner_img, (offset, offset), inner_img)
    maskable.save(os.path.join(rootDir, name))
    maskable.save(os.path.join(pubDir, name))
    print(f"Generated maskable {name}")

# 4. Open Graph Social Preview Card (1200 x 630)
og = Image.new("RGBA", (1200, 630), (22, 24, 27, 255)) # Dark theme Plamo background
draw = ImageDraw.Draw(og)

# Add subtle warm terracotta ambient glow on the left
for r in range(400, 0, -20):
    alpha = int(22 * (r / 400))
    glow_color = (236, 99, 61, alpha)
    draw.ellipse([80 - r//2, 315 - r//2, 80 + r//2, 315 + r//2], fill=glow_color)

# Paste prominent 220x220 logo icon on the left
icon_large = master.resize((220, 220), Image.Resampling.LANCZOS)
og.paste(icon_large, (100, 205), icon_large)

# Draw decorative separator line
draw.line([(380, 160), (380, 470)], fill=(60, 64, 72, 255), width=2)

# Save OG image
og.convert("RGB").save(os.path.join(rootDir, "og-image.png"), quality=95)
og.convert("RGB").save(os.path.join(pubDir, "og-image.png"), quality=95)
print("Generated og-image.png (1200x630)")

# Clean up temp master
if os.path.exists(masterPath):
    os.remove(masterPath)
`;

  fs.writeFileSync(path.resolve(rootDir, 'temp-gen.py'), pyScript, 'utf8');
  execSync('python temp-gen.py', { cwd: rootDir, stdio: 'inherit' });
  fs.unlinkSync(path.resolve(rootDir, 'temp-gen.py'));

  console.log('--- Brand Assets Generated Successfully ---');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
