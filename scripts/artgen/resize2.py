# Mass-regen post-process: artgen-out/{id}.png -> the `out` path carried
# inside each manifest2 entry (exact same path -> bank rows stay valid).
import sys, io, json, re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artgen-out'
PUB = ROOT / 'public' / 'images'
MANIFESTS = [Path(__file__).parent / 'manifest2.mjs']
# Non-JSON manifests (JS literal entries) handled by stem glob below.
GLOBS = [('land-', 'lands', 1024, 88), ('emblem-', 'emblems', 512, 85)]

def entries():
    # Cheap parse: manifest2.mjs is `export const ASSETS = [...]` (JSON).
    out = []
    for m in MANIFESTS:
        txt = m.read_text(encoding='utf-8')
        out.extend(json.loads(txt[txt.index('['):txt.rindex(']') + 1]))
    # manifest-lands entries are JS literals (template prompts) - derive
    # the same record from the id stem + GLOBS table instead.
    for prefix, sub, size, q in GLOBS:
        for png in sorted(OUT.glob(f'{prefix}*.png')):
            out.append({'id': png.stem, 'out': f'{sub}/{png.stem}.webp', 'size': size, 'q': q})
    return out

def main():
    done = []
    missing = 0
    for e in entries():
        src = OUT / f"{e['id']}.png"
        if not src.exists():
            missing += 1
            continue
        im = Image.open(src).convert('RGB')
        w, h = im.size
        s = min(w, h)
        size = e.get('size', 512)
        im = im.crop(((w - s)//2, (h - s)//2, (w + s)//2, (h + s)//2)).resize((size, size), Image.LANCZOS)
        dst = PUB / e['out']
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, 'WEBP', quality=e.get('q', 85), method=6)
        done.append(dst)
    print(f'{len(done)} written, {missing} png not yet generated')

if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    main()
