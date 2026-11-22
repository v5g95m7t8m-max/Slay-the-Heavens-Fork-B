"""Build a fixed 144×64, text-free review board and a separate private key.

From this directory with Pillow installed:
python tools/blind-board.py --seed review-1 --out /tmp/card-board samples/*.png
Send only the PNG to reviewers. Withhold the key until literal reads are frozen.
"""
import argparse
import hashlib
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('sources', type=Path, nargs='+')
    ap.add_argument('--seed', required=True)
    ap.add_argument('--out', type=Path, required=True)
    opt = ap.parse_args()
    paths = sorted(opt.sources)
    if not 1 <= len(paths) <= 26 or len(set(paths)) != len(paths):
        ap.error('pass 1 to 26 distinct transparent PNGs')
    random.Random(opt.seed).shuffle(paths)
    board = Image.new('RGB', (508, (len(paths) + 2) // 3 * 104 + 24), '#151E29')
    d = ImageDraw.Draw(board)
    key = {'seed': opt.seed, 'artSize': [144, 64], 'iconMaxSize': [56, 56], 'items': {}}
    for n, path in enumerate(paths):
        with Image.open(path) as src:
            if 'A' not in src.getbands():
                ap.error(f'{path.name} lacks alpha')
            icon = ImageOps.contain(src.convert('RGBA'), (56, 56), Image.Resampling.LANCZOS)
        a = icon.getchannel('A')
        if a.getextrema() != (0, 255):
            ap.error(f'{path.name} lacks fully clear or fully solid pixels')
        gray = ImageOps.grayscale(icon).convert('RGBA')
        gray.putalpha(a)
        slot = Image.new('RGBA', (144, 64), '#293545')
        slot.alpha_composite(gray, ((144 - gray.width) // 2, (64 - gray.height) // 2))
        x, y = 12 + n % 3 * 164, 12 + n // 3 * 104
        letter = chr(65 + n)
        board.paste(slot.convert('RGB'), (x, y))
        d.text((x, y + 69), letter, fill='#D1E2EE')
        key['items'][letter] = {'file': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    board.save(opt.out.with_suffix('.png'), optimize=True)
    opt.out.with_suffix('.key.json').write_text(json.dumps(key, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
