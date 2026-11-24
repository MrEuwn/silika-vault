"""
SILIKA Thermal & Die Floorplan Plate Generator
Generates 20 deterministic 512x320 .webp plates in public/assets/plate-slk-01.webp .. plate-slk-20.webp
using Python Pillow 12.3.0. Zero external assets or network requests.
"""

from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "assets"
WIDTH = 512
HEIGHT = 320

MODULES = [
    ("SLK-01", "Kestrel T1-SXM", "sxm-sled", "3nm N3P", "#38BDF8", "#0284C7", "Cryo Cyan", 700),
    ("SLK-02", "Kestrel T2-Dual", "sxm-sled", "2nm GAA", "#F59E0B", "#DC2626", "Amber Thermal", 950),
    ("SLK-03", "Vireo Edge-NPU", "sxm-sled", "4nm 4NP", "#34D399", "#059669", "Phosphor Mint", 320),
    ("SLK-04", "Raptor X4-Reticle", "sxm-sled", "2nm GAA", "#F43F5E", "#FB923C", "IR Crimson", 1200),
    ("SLK-05", "Basalt HBM3e-8H", "hbm-tower", "1beta DRAM", "#38BDF8", "#22D3EE", "Cobalt Stack", 95),
    ("SLK-06", "Basalt HBM3e-12H", "hbm-tower", "1beta DRAM", "#2DD4BF", "#0EA5E9", "Teal Flux", 115),
    ("SLK-07", "Monolith HBM4-16H", "hbm-tower", "1gamma + 4nm", "#FBBF24", "#38BDF8", "Amber Ice", 140),
    ("SLK-08", "Monolith HBM4-PIM", "hbm-tower", "1gamma + 3nm", "#FB7185", "#F59E0B", "Copper Gradient", 165),
    ("SLK-09", "Lumen C4-Wave", "photonic-blade", "SiPh 45nm", "#22D3EE", "#10B981", "Laser Cyan", 85),
    ("SLK-10", "Lumen M8-Prism", "photonic-blade", "SiPh 45nm", "#34D399", "#38BDF8", "Waveguide Emerald", 110),
    ("SLK-11", "Helix O16-CPO", "photonic-blade", "SiPh 28nm", "#60A5FA", "#34D399", "Optical Indigo", 145),
    ("SLK-12", "Helix O32-Fabric", "photonic-blade", "SiPh 28nm", "#F472B6", "#38BDF8", "Prism Magenta", 175),
    ("SLK-13", "Boreal Q4-Cryo", "cryo-hex", "Cryo-CMOS 14nm", "#7DD3FC", "#2563EB", "Liquid Nitrogen", 48),
    ("SLK-14", "Boreal Q8-JJ", "cryo-hex", "NbTiN 77K", "#38BDF8", "#14B8A6", "Cryo Horizon", 62),
    ("SLK-15", "Kelvin S12-4K", "cryo-hex", "NbTiN 4K", "#A5F3FC", "#3B82F6", "Superfluid Ice", 84),
    ("SLK-16", "Kelvin S24-Flux", "cryo-hex", "NbTiN 4K", "#38BDF8", "#818CF8", "Flux Cobalt", 110),
    ("SLK-17", "Aegis W1-Monolith", "wafer-slab", "5nm CoWoS-L", "#F97316", "#FACC15", "Wafer Solar", 2800),
    ("SLK-18", "Aegis W2-Stitched", "wafer-slab", "3nm CoWoS-L", "#EF4444", "#F59E0B", "Reticle Crimson", 3600),
    ("SLK-19", "Stratum W3-Cluster", "wafer-slab", "3nm N3P", "#38BDF8", "#F43F5E", "Dual Thermal", 4400),
    ("SLK-20", "Stratum W4-Apex", "wafer-slab", "2nm GAA", "#F59E0B", "#38BDF8", "Apex Telemetry", 5200),
]


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def blend(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def draw_thermal_backdrop(img, c_pri, c_sec, idx, archetype):
    bg = (7, 11, 18)
    px = img.load()
    # Deterministic multi-lobe thermal flux field
    seed_a = (idx * 1.37) % 6.283
    seed_b = (idx * 2.19) % 6.283
    c1x = 0.36 + 0.12 * math.cos(seed_a)
    c1y = 0.48 + 0.10 * math.sin(seed_a)
    c2x = 0.64 + 0.12 * math.cos(seed_b)
    c2y = 0.52 + 0.10 * math.sin(seed_b)

    for y in range(HEIGHT):
        ny = y / HEIGHT
        scan = 0.90 if (y % 4 == 0) else 1.0
        for x in range(WIDTH):
            nx = x / WIDTH
            d1 = math.hypot((nx - c1x) * 1.45, ny - c1y)
            d2 = math.hypot((nx - c2x) * 1.45, ny - c2y)
            if archetype == "cryo-hex":
                dc = math.hypot((nx - 0.5) * 1.4, ny - 0.5)
                h1 = math.exp(-(dc * dc) * 9.0)
                h2 = math.exp(-((dc - 0.22) ** 2) * 32.0) * 0.55
            elif archetype == "photonic-blade":
                band = math.exp(-((ny - 0.5) ** 2) * 18.0)
                wave = 0.5 + 0.5 * math.sin(nx * 14.0 + idx)
                h1 = band * (0.45 + 0.45 * wave)
                h2 = math.exp(-d2 * d2 * 10.0) * 0.7
            else:
                h1 = math.exp(-d1 * d1 * 11.5)
                h2 = math.exp(-d2 * d2 * 12.5)

            col = blend(bg, c_sec, min(1.0, h2 * 0.72))
            col = blend(col, c_pri, min(1.0, h1 * 0.85))
            if scan < 1.0:
                col = (int(col[0] * scan), int(col[1] * scan), int(col[2] * scan))
            px[x, y] = col


def draw_floorplan(draw, mod_id, name, archetype, node, c_pri, c_sec, palette_name, idx):
    grid_sub = (17, 27, 43)
    grid_maj = (30, 46, 71)
    ink = (232, 238, 247)
    muted = (139, 158, 184)

    for x in range(0, WIDTH, 16):
        draw.line([(x, 0), (x, HEIGHT)], fill=grid_maj if x % 64 == 0 else grid_sub, width=1)
    for y in range(0, HEIGHT, 16):
        draw.line([(0, y), (WIDTH, y)], fill=grid_maj if y % 64 == 0 else grid_sub, width=1)

    if archetype == "sxm-sled":
        # Twin 8x8 systolic MAC core banks flanked by HBM PHY strips
        for bank_x in (116, 276):
            draw.rectangle([bank_x - 4, 72, bank_x + 124, 248], outline=c_pri, width=2)
            for r in range(8):
                for c in range(8):
                    cx = bank_x + c * 15
                    cy = 80 + r * 20
                    tone = blend(c_sec, c_pri, ((r + c + idx) % 6) / 5.0)
                    draw.rectangle([cx, cy, cx + 11, cy + 15], fill=tone, outline=(12, 18, 28))
        for strip_x in (58, 78, 418, 438):
            for s in range(6):
                sy = 78 + s * 28
                draw.rectangle([strip_x, sy, strip_x + 14, sy + 20], fill=(24, 38, 58), outline=c_sec)

    elif archetype == "hbm-tower":
        # Dense 16x10 micro-bump TSV grid + 4 vertical bus corridors
        for col in range(16):
            cx = 92 + col * 21
            if col in (3, 7, 8, 12):
                draw.line([(cx + 6, 56), (cx + 6, 264)], fill=c_pri, width=2)
            for row in range(10):
                cy = 68 + row * 19
                fill = blend(c_sec, c_pri, ((row * 3 + col + idx) % 9) / 8.0)
                draw.rectangle([cx, cy, cx + 13, cy + 12], fill=fill, outline=(10, 16, 26))
        for tier in range(4):
            ty = 60 + tier * 54
            draw.rectangle([76, ty, 436, ty + 46], outline=(139, 158, 184), width=1)

    elif archetype == "photonic-blade":
        # 8 parallel optical waveguides + Mach-Zehnder interferometer rings
        for lane in range(8):
            ly = 74 + lane * 24
            draw.line([(44, ly), (468, ly)], fill=c_pri if lane % 2 == 0 else c_sec, width=2)
            for ring in range(3):
                rx = 132 + ring * 116 + ((lane % 2) * 28)
                draw.ellipse([rx - 14, ly - 10, rx + 14, ly + 10], outline=ink if ring == 1 else c_pri, width=1)
        draw.rectangle([38, 60, 62, 260], outline=c_pri, width=2)
        draw.rectangle([450, 60, 474, 260], outline=c_sec, width=2)

    elif archetype == "cryo-hex":
        # Concentric octagonal thermal guard rings + hexagonal JJ array
        cx, cy = WIDTH // 2, HEIGHT // 2 + 6
        for radius, col in [(112, c_sec), (88, c_pri), (62, ink), (36, c_pri)]:
            pts = []
            for k in range(8):
                ang = math.radians(k * 45 + 22.5)
                pts.append((cx + math.cos(ang) * radius * 1.28, cy + math.sin(ang) * radius * 0.92))
            draw.polygon(pts, outline=col, width=2)
        for row in range(-2, 3):
            for col in range(-3, 4):
                hx = cx + col * 24 + (row % 2) * 12
                hy = cy + row * 20
                if math.hypot((hx - cx) / 1.25, hy - cy) < 70:
                    draw.ellipse([hx - 5, hy - 5, hx + 5, hy + 5], fill=c_pri, outline=(8, 12, 20))

    else:  # wafer-slab
        # 6x4 stitched reticle matrix separated by dicing-lane busbars
        for r in range(4):
            for c in range(6):
                rx = 74 + c * 62
                ry = 64 + r * 52
                tone = blend(c_sec, c_pri, ((r * 2 + c + idx) % 7) / 6.0)
                draw.rectangle([rx, ry, rx + 52, ry + 42], fill=tone, outline=ink, width=1)
                draw.line([(rx + 6, ry + 21), (rx + 46, ry + 21)], fill=(12, 18, 28), width=1)
        draw.rectangle([62, 52, 450, 272], outline=c_pri, width=2)

    # Corner calibration brackets
    b = 14
    for (x0, y0, dx, dy) in [
        (16, 16, 1, 1),
        (WIDTH - 16, 16, -1, 1),
        (16, HEIGHT - 16, 1, -1),
        (WIDTH - 16, HEIGHT - 16, -1, -1),
    ]:
        draw.line([(x0, y0), (x0 + b * dx, y0)], fill=c_pri, width=2)
        draw.line([(x0, y0), (x0, y0 + b * dy)], fill=c_pri, width=2)

    # Top-left etched metadata pill
    font = ImageFont.load_default()
    draw.rectangle([24, 22, 314, 44], fill=(6, 9, 15), outline=(42, 58, 84))
    draw.text((32, 27), f"{mod_id} // {node} // {palette_name}", fill=ink, font=font)

    # Bottom-right 10mm scale bar
    draw.rectangle([372, 282, 488, 302], fill=(6, 9, 15), outline=(42, 58, 84))
    draw.line([(382, 294), (442, 294)], fill=c_pri, width=2)
    draw.line([(382, 290), (382, 298)], fill=ink, width=1)
    draw.line([(442, 290), (442, 298)], fill=ink, width=1)
    draw.text((448, 286), "10mm", fill=muted, font=font)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for idx, (mod_id, name, archetype, node, pri_hex, sec_hex, palette_name, _tdp) in enumerate(MODULES, start=1):
        c_pri = hex_to_rgb(pri_hex)
        c_sec = hex_to_rgb(sec_hex)
        img = Image.new("RGB", (WIDTH, HEIGHT), (7, 11, 18))
        draw_thermal_backdrop(img, c_pri, c_sec, idx, archetype)
        draw = ImageDraw.Draw(img)
        draw_floorplan(draw, mod_id, name, archetype, node, c_pri, c_sec, palette_name, idx)

        slug = mod_id.lower()
        out_path = OUT_DIR / f"plate-{slug}.webp"
        img.save(out_path, format="WEBP", quality=86, method=6)
        size_kb = out_path.stat().st_size / 1024.0
        print(f"Generated {out_path.name}: {WIDTH}x{HEIGHT}, {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
