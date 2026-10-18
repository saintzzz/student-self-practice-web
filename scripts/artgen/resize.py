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
    # Bé Heo mood poses (feedback rig art).
    'be-heo-idle': ('mascot', 512, 88),
    'be-heo-thinking': ('mascot', 512, 88),
    'be-heo-happy': ('mascot', 512, 88),
    'be-heo-celebrating': ('mascot', 512, 88),
    'be-heo-encouraging': ('mascot', 512, 88),
    # Sticker album badges + pet-home collectibles.
    **{s: ('stickers', 256, 85) for s in [
        'sticker-first-batch','sticker-perfect-round','sticker-explorer','sticker-star-hoard',
        'sticker-correct-100','sticker-correct-500','sticker-review-10','sticker-skill-grammar',
        'sticker-skill-listening','sticker-skill-spelling','sticker-skill-reading','sticker-streak-3',
        'sticker-streak-7','sticker-arena-first','sticker-arena-win','sticker-arena-5',
        'sticker-quest-perfect','sticker-quest-3','sticker-pet-baby','sticker-pet-adult']},
    **{h: ('home', 256, 85) for h in [
        'home-ball','home-balloon','home-kite','home-teddy','home-sunflower','home-cactus',
        'home-mushroom','home-castle','home-tent','home-carousel','home-slide','home-yoyo',
        'home-palette','home-guitar','home-drum','home-bike','home-canoe','home-star-lamp',
        'home-rainbow','home-moon','home-sun','home-tree','home-fish','home-butterfly']},
    # Companion pets (CR-36 egg->baby->kid->adult arc).
    'pet-egg': ('pets', 256, 85),
    'pet-cat-1': ('pets', 256, 85),
    'pet-cat-2': ('pets', 256, 85),
    'pet-cat-3': ('pets', 256, 85),
    'pet-dragon-1': ('pets', 256, 85),
    'pet-dragon-2': ('pets', 256, 85),
    'pet-dragon-3': ('pets', 256, 85),
    'pet-bunny-1': ('pets', 256, 85),
    'pet-bunny-2': ('pets', 256, 85),
    'pet-bunny-3': ('pets', 256, 85),
    # Concept regen: stem only routes through CONCEPT_OVERWRITE below -
    # the real filename carries the bank's hash suffix.
    **{c: ('concepts', 512, 85) for c in [
        'teacher','student','doctor','nurse','policeman','policewoman','farmer','chef','cook',
        'factory-worker','office-worker','firefighter','pilot','soldier','artist','singer','dancer',
        'basketball-player','cowboy','merman','baby','aunt','uncle','grandma','grandpa','brother',
        'sister','cousin','friend','person','wheelchair','snowman','children-crossing-sign',
        'amazed','angry','annoyed','cry','happy','headache','laugh','proud','sad','scared',
        'surprised','tired','ear','eye','foot','footprints','finger-heart','hair','hand',
        'handshake','head','hearing-aid','mouth','nose']},
}

CONCEPT_OVERWRITE = {  # generated concept files replaced in place (same filename -> bank rows stay)
    'festival': 'concept-festival-db5864.webp',
    'apricot-blossom': 'concept-apricot-blossom-5bcdb9.webp',
    'dragon-dance': 'concept-dragon-dance-b2b4fe.webp',
    'teacher': 'concept-teacher-7758b8.webp',
    'student': 'concept-student-ae0953.webp',
    'doctor': 'concept-doctor-368f2b.webp',
    'nurse': 'concept-nurse-f72795.webp',
    'policeman': 'concept-policeman-2337fd.webp',
    'policewoman': 'concept-policewoman-d5026f.webp',
    'farmer': 'concept-farmer-860730.webp',
    'chef': 'concept-chef-413a93.webp',
    'cook': 'concept-cook-359f50.webp',
    'factory-worker': 'concept-factory-worker-7b543a.webp',
    'office-worker': 'concept-office-worker-d45d68.webp',
    'firefighter': 'concept-firefighter-b28f04.webp',
    'pilot': 'concept-pilot-62f7bc.webp',
    'soldier': 'concept-soldier-67e6ee.webp',
    'artist': 'concept-artist-6997b6.webp',
    'singer': 'concept-singer-5c6a3b.webp',
    'dancer': 'concept-dancer-fb9374.webp',
    'basketball-player': 'concept-basketball-player-f8132f.webp',
    'cowboy': 'concept-cowboy-f7af7e.webp',
    'merman': 'concept-merman-117031.webp',
    'baby': 'concept-baby-5da21f.webp',
    'aunt': 'concept-aunt-63270b.webp',
    'uncle': 'concept-uncle-775b02.webp',
    'grandma': 'concept-grandma-e643ba.webp',
    'grandpa': 'concept-grandpa-373cba.webp',
    'brother': 'concept-brother-b20d42.webp',
    'sister': 'concept-sister-ca8eb4.webp',
    'cousin': 'concept-cousin-18e2a8.webp',
    'friend': 'concept-friend-dd0e4e.webp',
    'person': 'concept-person-91eaba.webp',
    'wheelchair': 'concept-wheelchair-8fd8c3.webp',
    'snowman': 'concept-snowman-e7a98c.webp',
    'children-crossing-sign': 'concept-children-crossing-sign-7e1c48.webp',
    'amazed': 'concept-amazed-6c1675.webp',
    'angry': 'concept-angry-538b0a.webp',
    'annoyed': 'concept-annoyed-56cb26.webp',
    'cry': 'concept-cry-fb20d1.webp',
    'happy': 'concept-happy-36c403.webp',
    'headache': 'concept-headache-9be212.webp',
    'laugh': 'concept-laugh-4c47a0.webp',
    'proud': 'concept-proud-05b220.webp',
    'sad': 'concept-sad-5a2c8e.webp',
    'scared': 'concept-scared-395ee9.webp',
    'surprised': 'concept-surprised-d70454.webp',
    'tired': 'concept-tired-63d314.webp',
    'ear': 'concept-ear-caabd7.webp',
    'eye': 'concept-eye-61fb35.webp',
    'foot': 'concept-foot-e249d5.webp',
    'footprints': 'concept-footprints-8e0f73.webp',
    'finger-heart': 'concept-finger-heart-b5114e.webp',
    'hair': 'concept-hair-ea98f7.webp',
    'hand': 'concept-hand-214f4b.webp',
    'handshake': 'concept-handshake-79ce9d.webp',
    'head': 'concept-head-0b4967.webp',
    'hearing-aid': 'concept-hearing-aid-ec18db.webp',
    'mouth': 'concept-mouth-a9fcf7.webp',
    'nose': 'concept-nose-d104ed.webp',
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
        if stem in CONCEPT_OVERWRITE:
            # In-place replace: the bank's hashed filename stays stable.
            cp = PUB / 'concepts' / CONCEPT_OVERWRITE[stem]
            cp.parent.mkdir(parents=True, exist_ok=True)
            im.save(cp, 'WEBP', quality=q, method=6)
            done.append(cp)
            print(f'  overwrote {cp.name}')
            if d == 'concepts':
                continue
        dst = PUB / d / f'{stem}.webp'
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, 'WEBP', quality=q, method=6)
        done.append(dst)
        print(f'{stem}.png -> {dst.relative_to(ROOT)}')
    print(f'{len(done)} file(s) written')

if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    main()
