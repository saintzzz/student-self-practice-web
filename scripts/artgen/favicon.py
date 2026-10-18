# favicon.py - artgen-out/be-heo-face.png -> public/favicon.ico +
# icon-{180,192,512}.png. Design: brand indigo rounded square holding a
# white medallion with the pig face - readable silhouette at 16px.
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'artgen-out' / 'be-heo-face.png'
PUB = ROOT / 'public'
INDIGO = (79, 70, 229, 255)  # #4F46E5 - matches the previous SVG favicon


def rounded_square(size):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=INDIGO)
    return im


def medallion(size):
    """White circle the pig face sits inside."""
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 0, size - 1, size - 1], fill=(255, 255, 255, 255))
    return im


def circle_mask(size):
    m = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([0, 0, size - 1, size - 1], fill=255)
    return m


def compose(canvas):
    """Full-res icon at `canvas` px."""
    face = Image.open(SRC).convert('RGBA')
    w, h = face.size
    s = min(w, h)
    face = face.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))

    icon = rounded_square(canvas)
    # Medallion fills ~92% of the tile; face ~96% inside the medallion.
    med = int(canvas * 0.92)
    off = (canvas - med) // 2
    inner = int(med * 0.96)
    inner_off = off + (med - inner) // 2

    icon.alpha_composite(medallion(med), (off, off))
    face_r = face.resize((inner, inner), Image.LANCZOS)
    icon.paste(face_r, (inner_off, inner_off), circle_mask(inner))
    return icon


def main():
    if not SRC.exists():
        raise SystemExit(f'missing {SRC} - run artgen first')
    compose(512).save(PUB / 'icon-512.png', 'PNG')
    compose(192).save(PUB / 'icon-192.png', 'PNG')
    compose(180).save(PUB / 'apple-touch-icon.png', 'PNG')
    # Multi-size ICO - browsers pick per-context (tab 16/32, shortcut 48).
    compose(48).save(PUB / 'favicon.ico', 'ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print('favicon.ico + icon-{180,192,512}.png written')


if __name__ == '__main__':
    main()
