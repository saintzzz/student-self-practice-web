# artgen post-process: artgen-out/*.png -> public/images/{dir}/{id}.webp
# games art 320x320 q86; vocab art 256x256 q85. Also refreshes the two
# culturally-wrong concept webps in place (same filename -> bank rows stay).
import sys, io, os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artgen-out'
PUB = ROOT / 'public' / 'images'

JOBS = {  # stem -> (dir, size, quality)
    **{g: ('games', 320, 86) for g in [
        'memory-match','balloon-pop','racing-cars','fishing-catch','letter-catch',
        'tic-tac-toe','whack-a-mole','feed-the-pig','picture-reveal',
        'treasure-chest','gold-quest','quiz-show','maze-chase','word-worm','castle-guard']},
    **{v: ('vocab', 256, 85) for v in ['festival','apricot-blossom','dragon-dance']},
    'be-heo-portrait': ('mascot', 512, 88),
    'be-heo-face': ('mascot', 512, 88),
}

CONCEPT_OVERWRITE = {  # wrong-art concept files replaced in place
    'festival': 'concept-festival-db5864.webp',
    'apricot-blossom': 'concept-apricot-blossom-5bcdb9.webp',
    'dragon-dance': 'concept-dragon-dance-b2b4fe.webp',
}

def main():
    done = []
    for stem, (d, size, q) in JOBS.items():
        src = OUT / f'{stem}.png'
        if not src.exists():
            print(f'skip {stem} (no png)')
            continue
        im = Image.open(src).convert('RGB')
        # center-crop to square then resize
        w, h = im.size
        s = min(w, h)
        im = im.crop(((w - s)//2, (h - s)//2, (w + s)//2, (h + s)//2)).resize((size, size), Image.LANCZOS)
        dst = PUB / d / f'{stem}.webp'
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, 'WEBP', quality=q, method=6)
        done.append(dst)
        if stem in CONCEPT_OVERWRITE:
            cp = PUB / 'concepts' / CONCEPT_OVERWRITE[stem]
            im.resize((512, 512), Image.LANCZOS).save(cp, 'WEBP', quality=85, method=6)
            print(f'  overwrote {cp.name}')
        print(f'{stem}.png -> {dst.relative_to(ROOT)}')
    print(f'{len(done)} file(s) written')

if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    main()
