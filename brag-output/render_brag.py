import os
import sys
import math
import gc
import io
import subprocess
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(OUTPUT_DIR)
WIDTH = 1280
HEIGHT = 720
FPS = 30
DURATION = 20.0
TOTAL_FRAMES = int(FPS * DURATION)

FONT_PATH = os.path.join(OUTPUT_DIR, "Lexend.ttf")

def get_font(size):
    try:
        return ImageFont.truetype(FONT_PATH, size)
    except:
        return ImageFont.load_default()

font_title_lg = get_font(48)
font_title_md = get_font(32)
font_title_sm = get_font(24)
font_body_lg = get_font(20)
font_body_md = get_font(16)
font_body_sm = get_font(13)
font_mono = get_font(12)

# Load and pre-scale screenshots
workspace_shot_path = os.path.join(PROJECT_DIR, "workspace_shot.png")
ws_scaled = None
if os.path.exists(workspace_shot_path):
    ws_raw = Image.open(workspace_shot_path).convert("RGBA")
    box_w = WIDTH - 160
    box_h = 560
    inner_w = box_w - 40
    inner_h = box_h - 130
    ws_scaled = ws_raw.resize((inner_w, inner_h), Image.Resampling.LANCZOS)

def ease_out_cubic(t):
    return 1.0 - math.pow(1.0 - max(0.0, min(1.0, t)), 3)

def ease_in_out_quad(t):
    t = max(0.0, min(1.0, t))
    return 2 * t * t if t < 0.5 else 1 - math.pow(-2 * t + 2, 2) / 2

# Colors
C_PAPER = (255, 251, 243)
C_SAGE = (205, 228, 214)
C_SKY = (207, 224, 239)
C_CREAM = (251, 246, 232)
C_LAVENDER = (223, 206, 239)
C_NAVY = (40, 63, 125)
C_TERRACOTTA = (236, 99, 61)
C_INK = (22, 24, 27)
C_MUTED = (110, 118, 125)

def draw_grid(draw, width, height, spacing=30, color=(228, 222, 210)):
    for x in range(0, width, spacing):
        draw.line([(x, 0), (x, height)], fill=color, width=1)
    for y in range(0, height, spacing):
        draw.line([(0, y), (width, y)], fill=color, width=1)

def draw_hud(draw, t, width, height):
    cx = 14.20 + 8.5 * math.sin(t * 1.2)
    cy = 8.45 + 5.2 * math.cos(t * 1.5)
    coord_text = f"X {cx:.2f}  Y {cy:.2f}"
    draw.text((30, 22), coord_text, font=font_mono, fill=(140, 130, 115))
    
    # Top badge
    draw.rounded_rectangle([width - 240, 18, width - 30, 46], radius=4, fill=(245, 238, 224), outline=(210, 200, 185), width=1)
    draw.text((width - 228, 24), "CALIBRATED FOR IRLEN & DYSLEXIA", font=font_mono, fill=C_NAVY)

    draw.text((30, height - 35), "DYSLEXIA-ASSISTANT v2.4", font=font_mono, fill=(160, 150, 135))
    draw.text((width - 190, height - 35), "100% OFFLINE-FIRST PWA", font=font_mono, fill=(160, 150, 135))

def draw_folder_tab(draw, x, y, width, height, label, fill=(226, 210, 179)):
    draw.polygon([
        (x, y + height),
        (x + 15, y),
        (x + width - 15, y),
        (x + width, y + height)
    ], fill=fill)
    bbox = font_mono.getbbox(label)
    lw = bbox[2] - bbox[0]
    draw.text((x + (width - lw) // 2, y + (height - 15) // 2), label, font=font_mono, fill=C_INK)

def render_frame(frame_idx):
    t = frame_idx / float(FPS)
    img = Image.new("RGB", (WIDTH, HEIGHT), C_PAPER)
    draw = ImageDraw.Draw(img)

    draw_grid(draw, WIDTH, HEIGHT)
    draw_hud(draw, t, WIDTH, HEIGHT)

    # Scene 1: 0.0s - 5.0s (The Glare vs The Calming Irlen Tint)
    if t < 5.0:
        tab_y = 65
        draw_folder_tab(draw, 80, tab_y, 280, 32, "01 · CALMING DYSLEXIA TINTS", fill=C_SAGE)

        box_top = 97
        box_h = 560
        box_w = WIDTH - 160
        
        tint_progress = ease_out_cubic(min(1.0, max(0.0, (t - 0.6) / 1.5)))
        r = int(255 + (C_SAGE[0] - 255) * tint_progress)
        g = int(251 + (C_SAGE[1] - 251) * tint_progress)
        b = int(243 + (C_SAGE[2] - 243) * tint_progress)
        box_color = (r, g, b)

        draw.rounded_rectangle([80, box_top, 80 + box_w, box_top + box_h], radius=12, fill=box_color, outline=(190, 205, 195), width=2)

        # Title
        title_alpha = min(1.0, max(0.0, (t - 0.3) / 0.8))
        title_y = int(145 - (1.0 - ease_out_cubic(title_alpha)) * 25)
        draw.text((120, title_y), "Dyslexia Assistant", font=font_title_lg, fill=C_INK)
        draw.text((120, title_y + 60), "The Agentic Reading & Learning Workspace", font=font_title_md, fill=C_NAVY)

        sub_y = title_y + 115
        sub_text = "A quieter way to read, write, listen, and learn. Soften harsh contrast,\nstabilize dancing letters, and experience dyslexia-tested pastel overlays."
        draw.text((120, sub_y), sub_text, font=font_body_lg, fill=(60, 68, 75))

        # Swatch pills
        swatches = [
            ("Midnight Dark", (22, 24, 27)),
            ("Sage Green", (205, 228, 214)),
            ("Soft Cream", (251, 246, 232)),
            ("Sky Blue", (207, 224, 239)),
            ("Lavender", (223, 206, 239)),
        ]
        
        swatch_start_y = sub_y + 85
        draw.text((120, swatch_start_y), "CLINICAL SPECTRAL TINT OVERLAYS (IRLEN METHODOLOGY):", font=font_mono, fill=C_NAVY)
        
        sx = 120
        sy = swatch_start_y + 28
        for i, (name, col) in enumerate(swatches):
            is_active = (i == 1)
            outline_col = C_NAVY if is_active else (190, 190, 190)
            outline_w = 2 if is_active else 1
            pw = 195
            draw.rounded_rectangle([sx, sy, sx + pw, sy + 52], radius=26, fill=(255, 255, 255), outline=outline_col, width=outline_w)
            draw.ellipse([sx + 10, sy + 12, sx + 38, sy + 40], fill=col, outline=(140, 140, 140), width=1)
            draw.text((sx + 48, sy + 16), name, font=font_body_sm, fill=C_INK)
            if is_active and t > 2.2:
                draw.text((sx + 48, sy + 32), "● ACTIVE OVERLAY", font=font_mono, fill=C_TERRACOTTA)
            sx += pw + 20

        # Quote box
        if t > 2.0:
            draw.rounded_rectangle([120, sy + 90, 80 + box_w - 40, sy + 165], radius=8, fill=(255, 255, 255), outline=(200, 215, 205), width=1)
            draw.text((145, sy + 105), '“The rhythm of reading changes the moment the page stops fighting your eyes.”', font=font_body_md, fill=C_NAVY)
            draw.text((145, sy + 135), '— Clinically formulated to eliminate Scotopic Sensitivity visual friction', font=font_body_sm, fill=C_MUTED)

    # Scene 2: 5.0s - 10.5s (Specialized Neuro-Typography Engine)
    elif t < 10.5:
        p2 = (t - 5.0) / 5.5
        slide_x = int((1.0 - ease_out_cubic(min(1.0, p2 * 3.5))) * 40)

        tab_y = 65
        draw_folder_tab(draw, 80 + slide_x, tab_y, 310, 32, "02 · NEURO-TYPOGRAPHIC ENGINE", fill=C_SKY)

        box_top = 97
        box_h = 560
        box_w = WIDTH - 160
        draw.rounded_rectangle([80 + slide_x, box_top, 80 + box_w + slide_x, box_top + box_h], radius=12, fill=(247, 251, 255), outline=(195, 215, 235), width=2)

        draw.text((120 + slide_x, 135), "Type Calibrated for Dyslexic Minds", font=font_title_lg, fill=C_INK)
        draw.text((120 + slide_x, 195), "OpenDyslexic glyph weighting + Bionic saccadic fixation + Syllable segmentation", font=font_body_md, fill=C_NAVY)

        pill_y = 245
        pills = [
            ("Aa Lexend Font", True),
            ("Bionic Fixation: ON", t >= 6.8),
            ("Syl·la·ble Breaks: ON", t >= 8.2),
            ("Word Focus Box: ON", True)
        ]
        px = 120 + slide_x
        for label, active in pills:
            bg_col = C_NAVY if active else (240, 240, 240)
            txt_col = (255, 255, 255) if active else (100, 100, 100)
            pw = 210
            draw.rounded_rectangle([px, pill_y, px + pw, pill_y + 42], radius=6, fill=bg_col)
            draw.text((px + 15, pill_y + 11), label, font=font_body_sm, fill=txt_col)
            px += pw + 15

        card_y = 310
        card_w = box_w - 80
        draw.rounded_rectangle([120 + slide_x, card_y, 120 + slide_x + card_w, card_y + 245], radius=10, fill=(255, 255, 255), outline=(210, 225, 240), width=2)
        
        words = [
            ("The", "The"), ("rhythm", "rhy·thm"), ("of", "of"), ("reading", "read·ing"),
            ("changes", "chan·ges"), ("the", "the"), ("moment", "mo·ment"), ("the", "the"),
            ("page", "page"), ("stops", "stops"), ("fighting", "fight·ing"), ("your", "your"),
            ("eyes.", "eyes.")
        ]
        
        line_x = 150 + slide_x
        line_y = card_y + 45
        
        draw.text((line_x, line_y - 25), "LIVE SACCADE GUIDANCE DEMONSTRATION:", font=font_mono, fill=C_TERRACOTTA)
        
        is_bionic = (t >= 6.8)
        is_syllable = (t >= 8.2)

        for w_norm, w_syl in words:
            display_word = w_syl if is_syllable else w_norm
            split_idx = max(1, len(display_word) // 2) if is_bionic else 0
            
            w_head = display_word[:split_idx]
            w_tail = display_word[split_idx:]
            
            if is_bionic and w_head:
                draw.text((line_x, line_y), w_head, font=font_title_md, fill=C_NAVY)
                bb = font_title_md.getbbox(w_head)
                hw = bb[2] - bb[0]
                draw.text((line_x + hw, line_y), w_tail, font=font_title_md, fill=(90, 95, 105))
                bbt = font_title_md.getbbox(w_tail)
                tw = bbt[2] - bbt[0]
                line_x += hw + tw + 18
            else:
                draw.text((line_x, line_y), display_word, font=font_title_md, fill=C_INK)
                bb = font_title_md.getbbox(display_word)
                line_x += (bb[2] - bb[0]) + 18
                
            if line_x > 120 + slide_x + card_w - 180:
                line_x = 150 + slide_x
                line_y += 55

        bullet_y = card_y + 175
        draw.rounded_rectangle([150 + slide_x, bullet_y, 120 + slide_x + card_w - 30, bullet_y + 55], radius=6, fill=(240, 246, 255))
        draw.text((170 + slide_x, bullet_y + 10), "✦ Weighted bottoms prevent flipping & rotation of letters like b, d, p, and q", font=font_body_sm, fill=C_NAVY)
        draw.text((170 + slide_x, bullet_y + 30), "✦ Micro-fixation bolding pulls your eyes forward to eliminate regression re-reading", font=font_body_sm, fill=(50, 60, 75))

    # Scene 3: 10.5s - 16.0s (The Assistive Reading Workspace in Action)
    elif t < 16.0:
        p3 = (t - 10.5) / 5.5
        slide_y = int((1.0 - ease_out_cubic(min(1.0, p3 * 3.5))) * 40)

        tab_y = 65
        draw_folder_tab(draw, 80, tab_y, 340, 32, "03 · COGNITIVE WORKSPACE SUITE", fill=C_CREAM)

        box_top = 97
        box_h = 560
        box_w = WIDTH - 160
        draw.rounded_rectangle([80, box_top + slide_y, 80 + box_w, box_top + box_h + slide_y], radius=12, fill=(255, 255, 255), outline=(215, 210, 195), width=2)

        # Header bar of mockup window
        draw.rounded_rectangle([80, box_top + slide_y, 80 + box_w, box_top + 38 + slide_y], radius=12, fill=(245, 240, 230))
        draw.ellipse([98, box_top + 14 + slide_y, 110, box_top + 26 + slide_y], fill=(235, 95, 85))
        draw.ellipse([118, box_top + 14 + slide_y, 130, box_top + 26 + slide_y], fill=(245, 190, 70))
        draw.ellipse([138, box_top + 14 + slide_y, 150, box_top + 26 + slide_y], fill=(100, 200, 90))
        
        draw.text((175, box_top + 12 + slide_y), "workspace.da — Reader Sheet [Mode: Irlen Mint]", font=font_mono, fill=(120, 110, 95))
        draw.text((box_w - 90, box_top + 12 + slide_y), "● SPEECH ENGINE READY", font=font_mono, fill=C_NAVY)

        if ws_scaled:
            img.paste(ws_scaled, (100, box_top + 48 + slide_y))

        # Reading Ruler / Focus Beam animation
        ruler_progress = (t - 11.5) / 4.0
        if 0.0 <= ruler_progress <= 1.0:
            ry = int(box_top + 180 + ruler_progress * 190 + slide_y)
            draw.rectangle([100, ry, 100 + box_w - 40, ry + 4], fill=C_TERRACOTTA)

        # Word Focus Box tracking token
        active_words = ["Upload", "Document", "Experience", "Dyslexia-Friendly", "Reading", "Flow"]
        token_idx = int((t - 11.0) * 1.5) % len(active_words)
        curr_token = active_words[token_idx]

        hud_box_x = WIDTH // 2 - 180
        hud_box_y = box_top + box_h - 68 + slide_y
        draw.rounded_rectangle([hud_box_x, hud_box_y, hud_box_x + 360, hud_box_y + 48], radius=8, fill=C_NAVY, outline=(255, 255, 255), width=2)
        draw.text((hud_box_x + 18, hud_box_y + 8), "SYNCHRONIZED FOCUS TOKEN:", font=font_mono, fill=(180, 205, 255))
        draw.text((hud_box_x + 18, hud_box_y + 22), f"“{curr_token}”", font=font_body_lg, fill=(255, 255, 255))
        draw.text((hud_box_x + 240, hud_box_y + 18), "1.0× Indian TTS", font=font_mono, fill=(200, 230, 220))

    # Scene 4: 16.0s - 20.0s (Zero Glare, 100% Offline, Privacy First)
    else:
        tab_y = 65
        draw_folder_tab(draw, WIDTH // 2 - 170, tab_y, 340, 32, "04 · ZERO FRICTION LEARNING", fill=C_LAVENDER)

        box_top = 97
        box_h = 560
        box_w = WIDTH - 160
        draw.rounded_rectangle([80, box_top, 80 + box_w, box_top + box_h], radius=12, fill=(255, 253, 248), outline=(220, 210, 200), width=2)

        draw.text((WIDTH // 2 - 240, box_top + 45), "Dyslexia Assistant", font=font_title_lg, fill=C_INK)
        draw.text((WIDTH // 2 - 280, box_top + 110), "A quieter way to read, write, listen, and learn.", font=font_title_md, fill=C_NAVY)

        pillars = [
            ("100% Offline-First PWA", "Zero internet required. Caches instantly for classrooms, flights, and deep focus."),
            ("Irlen Spectral Overlays", "8 clinically tested pastel tints that cancel harsh stark-white monitor glare."),
            ("100% Private & Local", "Zero cloud telemetry. Your reading files never leave your personal browser.")
        ]
        
        card_w = (box_w - 80) // 3
        card_y = box_top + 185
        for i, (title, desc) in enumerate(pillars):
            pop_in = min(1.0, max(0.0, (t - (16.2 + i * 0.4)) / 0.5))
            if pop_in > 0:
                cx = 120 + i * (card_w + 20)
                cy = card_y + int((1.0 - ease_out_cubic(pop_in)) * 20)
                draw.rounded_rectangle([cx, cy, cx + card_w, cy + 155], radius=10, fill=(245, 241, 233), outline=(215, 205, 190), width=1)
                draw.rounded_rectangle([cx + 15, cy + 15, cx + 55, cy + 38], radius=4, fill=C_TERRACOTTA)
                draw.text((cx + 25, cy + 18), f"0{i+1}", font=font_mono, fill=(255, 255, 255))
                draw.text((cx + 65, cy + 18), title, font=font_body_sm, fill=C_NAVY)
                
                words_desc = desc.split(" ")
                lines = []
                cur = ""
                for w in words_desc:
                    if len(cur + " " + w) > 32:
                        lines.append(cur)
                        cur = w
                    else:
                        cur = (cur + " " + w).strip()
                if cur:
                    lines.append(cur)
                dy = cy + 55
                for l in lines:
                    draw.text((cx + 18, dy), l, font=font_body_sm, fill=C_MUTED)
                    dy += 22

        cta_y = box_top + 385
        btn_x = WIDTH // 2 - 160
        draw.rounded_rectangle([btn_x, cta_y, btn_x + 320, cta_y + 54], radius=6, fill=C_NAVY, outline=(255, 255, 255), width=2)
        draw.text((btn_x + 50, cta_y + 14), "Launch Free Workspace →", font=font_body_md, fill=(255, 255, 255))

        draw.text((WIDTH // 2 - 170, cta_y + 75), "github.com/anshu706/Dyslexia-Assistant", font=font_mono, fill=C_MUTED)

    return img

def main():
    print(f"Starting brag video render: {TOTAL_FRAMES} frames @ {FPS} fps ({WIDTH}x{HEIGHT})...")
    
    raw_video = os.path.join(OUTPUT_DIR, "brag_visuals.mp4")
    music_file = os.path.join(OUTPUT_DIR, "composition", "assets", "music", "bg-music.mp3")
    click_sfx = os.path.join(OUTPUT_DIR, "composition", "assets", "sfx", "click.ogg")
    pop_sfx = os.path.join(OUTPUT_DIR, "composition", "assets", "sfx", "pop.ogg")
    final_video = os.path.join(OUTPUT_DIR, "brag.mp4")
    poster_jpg = os.path.join(OUTPUT_DIR, "brag.jpg")

    cmd = [
        "ffmpeg", "-y",
        "-f", "image2pipe",
        "-vcodec", "mjpeg",
        "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264",
        "-threads", "1",
        "-preset", "fast",
        "-crf", "19",
        "-pix_fmt", "yuv420p",
        raw_video
    ]
    
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    poster_frame_idx = 240  # 8.0s - settled Scene 2 with full Bionic Typography & swatches!
    
    for f in range(TOTAL_FRAMES):
        frame_img = render_frame(f)
        if f == poster_frame_idx:
            frame_img.save(poster_jpg, quality=95)
            print(f"Saved settled poster frame at t={f/FPS:.2f}s -> {poster_jpg}")
            
        buf = io.BytesIO()
        frame_img.save(buf, "JPEG", quality=92)
        proc.stdin.write(buf.getvalue())
        
        if f % 100 == 0 or f == TOTAL_FRAMES - 1:
            print(f"Rendered {f + 1}/{TOTAL_FRAMES} frames ({(f + 1) / TOTAL_FRAMES * 100:.1f}%)")
            gc.collect()

    proc.stdin.close()
    proc.wait()
    print("Visual encoding complete!")

    print("Compositing audio and beat-synced SFX tracks...")
    audio_cmd = [
        "ffmpeg", "-y",
        "-i", raw_video,
        "-i", music_file,
        "-i", click_sfx,
        "-i", pop_sfx,
        "-filter_complex",
        (
            "[1:a]atrim=0:20,afade=t=out:st=18.5:d=1.5,volume=0.82[m]; "
            "[2:a]adelay=2460|2460,volume=0.9[s1]; "
            "[2:a]adelay=5190|5190,volume=0.9[s2]; "
            "[2:a]adelay=6800|6800,volume=0.9[s3]; "
            "[3:a]adelay=8200|8200,volume=1.0[s4]; "
            "[3:a]adelay=10500|10500,volume=1.0[s5]; "
            "[3:a]adelay=16200|16200,volume=1.0[s6]; "
            "[m][s1][s2][s3][s4][s5][s6]amix=inputs=7:duration=first:dropout_transition=0[aout]"
        ),
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        os.path.join(OUTPUT_DIR, "brag_merged.mp4")
    ]
    subprocess.run(audio_cmd, check=True)

    print("Baking settled poster into frame 0...")
    bake_cmd = [
        "ffmpeg", "-y",
        "-i", os.path.join(OUTPUT_DIR, "brag_merged.mp4"),
        "-i", poster_jpg,
        "-filter_complex", "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]",
        "-map", "[v]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-threads", "1",
        "-crf", "19",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        final_video
    ]
    subprocess.run(bake_cmd, check=True)

    try:
        os.remove(raw_video)
        os.remove(os.path.join(OUTPUT_DIR, "brag_merged.mp4"))
    except:
        pass

    print(f"Success! Deliverables ready:\n - Video: {final_video}\n - Poster: {poster_jpg}\n - Share copy: {os.path.join(OUTPUT_DIR, 'share-copy.txt')}")

if __name__ == "__main__":
    main()
