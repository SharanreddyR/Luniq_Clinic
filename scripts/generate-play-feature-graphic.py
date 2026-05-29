"""Generate Google Play feature graphic (1024x500 PNG)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = ROOT / "assets" / "images" / "brand-logo.png"
OUT_PATH = ROOT / "assets" / "images" / "play-store-feature-graphic.png"

W, H = 1024, 500

TEAL_DARK = (10, 82, 87)       # #0A5257
TEAL_MID = (20, 109, 114)      # #146D70
TEAL_PRIMARY = (34, 184, 174)   # #22B8AE
WHITE = (255, 255, 255)
MUTED = (200, 230, 226)


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def vertical_gradient(size: tuple[int, int]) -> Image.Image:
    img = Image.new("RGB", size)
    px = img.load()
    w, h = size
    for y in range(h):
        t = y / max(h - 1, 1)
        r = lerp(TEAL_DARK[0], TEAL_MID[0], t * 0.55)
        g = lerp(TEAL_DARK[1], TEAL_MID[1], t * 0.55)
        b = lerp(TEAL_DARK[2], TEAL_MID[2], t * 0.55)
        for x in range(w):
            hx = abs(x - w / 2) / (w / 2)
            fade = 1 - 0.12 * hx
            px[x, y] = (int(r * fade), int(g * fade), int(b * fade))
    return img


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        [
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
        if bold
        else [
            "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    )
    for path in candidates:
        p = Path(path)
        if p.exists():
            return ImageFont.truetype(str(p), size=size)
    return ImageFont.load_default()


def fit_logo(logo: Image.Image, max_w: int, max_h: int) -> Image.Image:
    lw, lh = logo.size
    scale = min(max_w / lw, max_h / lh)
    new_size = (max(1, int(lw * scale)), max(1, int(lh * scale)))
    return logo.resize(new_size, Image.Resampling.LANCZOS)


def main() -> None:
    canvas = vertical_gradient((W, H))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, H - 6, W, H), fill=TEAL_PRIMARY)

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((40, 70, 360, 430), fill=(34, 184, 174, 42))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), glow)

    logo = fit_logo(Image.open(LOGO_PATH).convert("RGBA"), 300, 300)
    canvas.paste(logo, (88, (H - logo.height) // 2), logo)

    draw = ImageDraw.Draw(canvas)

    title_font = load_font(62, bold=True)
    sub_font = load_font(28, bold=False)
    tag_font = load_font(22, bold=False)

    text_x = 450
    title_y = 148
    draw.text((text_x, title_y), "Luniq Clinic", font=title_font, fill=WHITE)
    draw.line((text_x, title_y + 78, text_x + 220, title_y + 78), fill=TEAL_PRIMARY, width=4)
    draw.text(
        (text_x, title_y + 98),
        "The clinic app for Luniq Health",
        font=sub_font,
        fill=MUTED,
    )
    draw.text(
        (text_x, title_y + 148),
        "Patient visits  ·  Claims  ·  Appointments",
        font=tag_font,
        fill=(170, 215, 210),
    )

    for i, alpha in enumerate((90, 60, 40)):
        r = 5 - i
        x = W - 80 - i * 28
        y = 72 + i * 10
        dot = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(dot).ellipse(
            (x - r, y - r, x + r, y + r),
            fill=(196, 245, 66, alpha),
        )
        canvas = Image.alpha_composite(canvas, dot)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUT_PATH, format="PNG", optimize=True)
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
