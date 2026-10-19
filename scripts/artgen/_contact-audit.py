# Contact-sheet audit for generated concept art: tiles each webp with
# its concept label so a human/agent can flag wrong-subject renders
# in bulk. Output: artgen-out/_audit/sheet-NN.png (48 cells each).
import os, sys
from PIL import Image, ImageDraw, ImageFont

SRC = 'public/images/concepts'
OUT = 'artgen-out/_audit'
CELL = 200          # image cell px
LABEL = 34          # label strip height
COLS, ROWS = 8, 6   # 48 per sheet
os.makedirs(OUT, exist_ok=True)

files = sorted(f for f in os.listdir(SRC) if f.endswith('.webp'))
# only concepts that were bespoke-regenerated (mtime >= Oct 19) OR all
# - pass argv 'all' to include everything.
if len(sys.argv) > 1 and sys.argv[1] == 'all':
    pass
else:
    files = [f for f in files if os.path.getmtime(os.path.join(SRC, f)) > 1760726400]  # 2025-10-18

try:
    font = ImageFont.truetype('arial.ttf', 18)
except OSError:
    font = ImageFont.load_default()

per = COLS * ROWS
for s in range(0, len(files), per):
    batch = files[s:s + per]
    W, H = COLS * CELL, ROWS * (CELL + LABEL)
    sheet = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(batch):
        x, y = (i % COLS) * CELL, (i // COLS) * (CELL + LABEL)
        try:
            im = Image.open(os.path.join(SRC, f)).convert('RGB').resize((CELL - 8, CELL - 8), Image.LANCZOS)
            sheet.paste(im, (x + 4, y + 4))
        except Exception as e:
            d.text((x + 8, y + 60), 'ERR ' + str(e)[:30], fill='red', font=font)
        name = f.replace('concept-', '').rsplit('-', 1)[0]
        d.rectangle([x, y + CELL, x + CELL, y + CELL + LABEL], fill=(240, 240, 240))
        d.text((x + 6, y + CELL + 6), name, fill='black', font=font)
        d.rectangle([x, y, x + CELL - 1, y + CELL + LABEL - 1], outline=(180, 180, 180))
    path = os.path.join(OUT, f'sheet-{s // per:02d}.png')
    sheet.save(path)
    print(path, len(batch))
print('total files:', len(files))
