"""Fit a 144×64 illustration with an explicitly registered and authorized source."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import runpy
import time

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
W, H = 144, 64
BUDGETS = (60, 100, 160, 250, 400)
RECT, ELLIPSE, TRI = 100001, 100002, 100003
GRID = runpy.run_path(str(ROOT / 'scripts/art/build-performance-pack.py'))['rectangles']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def footprint(shape):
    asset, cx, cy, width, height, angle = shape[:6]
    angle = math.radians(angle)
    c, s = math.cos(angle), math.sin(angle)
    dx = (abs(c) * width + abs(s) * height) / 2
    dy = (abs(s) * width + abs(c) * height) / 2
    l, r = max(0, math.floor(cx - dx)), min(W, math.ceil(cx + dx))
    t, b = max(0, math.floor(cy - dy)), min(H, math.ceil(cy + dy))
    yy, xx = np.ogrid[t:b, l:r]
    x = 2 * ((xx + .5 - cx) * c - (yy + .5 - cy) * s) / width
    y = 2 * ((xx + .5 - cx) * s + (yy + .5 - cy) * c) / height
    if asset == ELLIPSE:
        inside = x*x + y*y <= 1
    elif asset == TRI:
        inside = (np.abs(y) <= 1) & (2 * np.abs(x) <= y + 1)
    else:
        inside = (np.abs(y) <= 1) & (np.abs(x) <= 1)
    return (slice(t, b), slice(l, r)), inside


def composite(screen, shape):
    box, mask = footprint(shape)
    opacity = shape[9] / 255
    screen[box][mask] = screen[box][mask] * (1 - opacity) + np.array(shape[6:9]) * opacity


def metrics(source, rendered, edges):
    delta = source - rendered
    mse = float(np.mean(delta**2))
    err = np.mean(abs(delta), axis=2)
    # Standard local SSIM on Rec. 709 luminance with an 11×11 Gaussian window.
    from numpy.lib.stride_tricks import sliding_window_view
    taps = np.exp(-.5 * (np.arange(11) - 5)**2 / 1.5**2)
    taps /= taps.sum()

    def blur(data):
        padded = np.pad(data, 5, mode='reflect')
        horiz = sliding_window_view(padded, 11, axis=1) @ taps
        return sliding_window_view(horiz, 11, axis=0) @ taps

    lum = np.array([.2126, .7152, .0722])
    a, b = source @ lum, rendered @ lum
    x, y = blur(a), blur(b)
    ab, aa, bb = blur(a*b)-x*y, blur(a*a)-x*x, blur(b*b)-y*y
    ssim = (2*x*y+6.5025)*(2*ab+58.5225)/((x*x+y*y+6.5025)*(aa+bb+58.5225))
    return dict(mae=round(float(err.mean()), 4), edgeMae=round(float(np.average(err, weights=edges)), 4),
                psnr=round(10*math.log10(255**2/mse), 4) if mse else None,
                ssim=round(float(ssim.mean()), 5))


def grids(image):
    for height in range(4, 21):
        width = round(height * W / H)
        rows, _ = GRID(image, (width, height), (W, H), False)
        shapes = [[r[0], r[1] + W/2, H/2 - r[2], r[3], r[4], 0, *r[-4:]] for r in rows]
        yield (width, height), shapes


def paint(source, weights, seed, mixed):
    rng = np.random.default_rng(seed)
    screen = np.zeros_like(source)
    fill = [RECT, W/2, H/2, W, H, 0, *np.average(source.reshape(-1, 3), axis=0,
            weights=weights.ravel()).round().astype(int).tolist(), 255]
    shapes = [fill]
    composite(screen, fill)
    palettes = [(96, 40), (74, 24), (48, 19), (32, 11), (20, 14), (15, 8), (10, 6), (7, 4), (4, 3), (2, 2)]
    for step in range(1, max(BUDGETS)):
        energy = np.sum((source - screen)**2, axis=2) * weights
        pdf = energy.ravel() ** .72
        if not pdf.sum():
            break
        centers = rng.choice(W*H, size=72, p=pdf/pdf.sum(), replace=True)
        best = None
        for i, idx in enumerate(centers):
            y, x = divmod(int(idx), W)
            w, h = palettes[i % len(palettes)]
            if step > 125 and i % 10 < 3:
                w, h = palettes[6+i % 4]
            if i % 5 == 1:
                w, h = h, w
            kind = [RECT, ELLIPSE, TRI][i % 3] if mixed else RECT
            angle = (0, 24, -24, 55, -55, 90, 140, 180, -130)[i % 9] if mixed and i % 4 else 0
            if not mixed or not angle:
                w, h = min(w, W), min(h, H)
            c, s = abs(math.cos(math.radians(angle))), abs(math.sin(math.radians(angle)))
            dx, dy = (c*w+s*h)/2, (s*w+c*h)/2
            # Unmasked native artwork must fit the physical art aperture.
            if dx > W/2 or dy > H/2:
                continue
            cx, cy = round(float(np.clip(x + .5, dx, W-dx)), 2), round(float(np.clip(y + .5, dy, H-dy)), 2)
            shape = [kind, cx, cy, w, h, angle]
            box, mask = footprint(shape)
            if not mask.any():
                continue
            inp, prev, weight = source[box][mask], screen[box][mask], weights[box][mask]
            alpha = 200 if mixed and i % 7 == 1 else 255
            retain = 1 - alpha / 255
            color = np.clip(np.average(inp-prev*retain, axis=0, weights=weight)/(1-retain), 0, 255).round()
            gain = float(energy[box][mask].sum() - np.sum(weight[:, None]*(inp-prev*retain-color*(1-retain))**2))
            if best is None or gain > best[0]:
                best = gain, [*shape, *color.astype(int).tolist(), alpha]
        if not best or best[0] <= 0:
            break
        shapes.append(best[1])
        composite(screen, best[1])
        if len(shapes) in BUDGETS:
            yield len(shapes), shapes[:], screen.copy()


def image(rgb):
    return Image.fromarray(np.clip(np.round(rgb), 0, 255).astype(np.uint8))


def fit(card_id, path, destination):
    raw = path.read_bytes()
    with Image.open(path) as original:
        if original.size != (W, H):
            raise ValueError(f'{path}: expected the registered 144×64 crop')
        source_image = original.convert('RGB')
    destination.mkdir(parents=True, exist_ok=False)
    source_image.save(destination / 'source.png')
    source = np.asarray(source_image, dtype=np.float64)
    gx, gy = np.gradient(source @ np.array([.2126, .7152, .0722]))
    edges = 1 + np.minimum(np.hypot(gx, gy) / 22, 2)
    opts = {b: {} for b in BUDGETS}

    def consider(family, budget, shapes, rendered, recipe, elapsed):
        rendered = np.round(rendered)
        quality = metrics(source, rendered, edges)
        quality['score'] = round(.55*quality['mae']+.45*quality['edgeMae'], 5)
        prior = opts[budget].get(family)
        key = quality['score'], len(shapes)
        if prior and key >= (prior['score'], prior['images']):
            return
        output = image(rendered)
        opts[budget][family] = dict(quality, images=len(shapes), recipe=recipe, elapsedMs=round(elapsed, 2),
                                   rows=shapes, pixelSha256=sha(output.tobytes()), preview=output)

    started = time.perf_counter()
    for grid, shapes in grids(source_image):
        rendered = np.zeros_like(source)
        for row in shapes:
            composite(rendered, row)
        for b in BUDGETS:
            if len(shapes) <= b:
                consider('grid', b, shapes, rendered, grid, (time.perf_counter()-started)*1000)
    for family in ('rect', 'mixed'):
        started = time.perf_counter()
        for b, shapes, rendered in paint(source, edges if family == 'mixed' else np.ones_like(edges), 94, family == 'mixed'):
            consider(family, b, shapes, rendered, {'seed': 94, 'edgeWeight': family == 'mixed'},
                     (time.perf_counter()-started)*1000)
    sheet = Image.new('RGB', (6*W, 3*(H+17)), '#171924')
    label = ImageDraw.Draw(sheet)
    for i, family in enumerate(('grid', 'rect', 'mixed')):
        top = i*(H+17)
        sheet.paste(source_image, (0, top))
        label.text((4, top+H+1), family, fill='white')
        for j, b in enumerate(BUDGETS, 1):
            obj = opts[b][family]
            output = obj.pop('preview')
            output.save(destination / f'{family}-{b}.png')
            if family == 'mixed':
                diff = 3 * abs(source - np.asarray(output, dtype=np.float64))
                image(diff).save(destination / f'difference-{b}.png')
            sheet.paste(output, (j*W, top))
            label.text((j*W+4, top+H+1), f'{b} / {obj["images"]}', fill='white')
    sheet.save(destination / 'comparison-1x.png')
    sheet.resize((sheet.width*3, sheet.height*3), Image.Resampling.NEAREST).save(destination / 'comparison-3x.png')
    report = {'cardId':card_id, 'sourceSha256':sha(raw), 'canvas':[W,H], 'tiers':opts,
              'pareto':[], 'versions':{'numpy':np.__version__, 'pillow':Image.__version__}}
    best_score = math.inf
    for count, score, family, budget in sorted((o['images'],o['score'],kind,b) for b,fs in opts.items() for kind,o in fs.items()):
        if score < best_score:
            report['pareto'].append({'count':count, 'budget':budget, 'family':family, 'score':score})
            best_score = score
    (destination/'fit.json').write_text(json.dumps(report, separators=(',', ':'))+'\n', encoding='utf8')
    print(card_id, [(b, min(opts[b], key=lambda k:opts[b][k]['score']), opts[b]['mixed']['ssim']) for b in BUDGETS], flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--id', required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--approved-source-sha256', required=True)
    args = parser.parse_args()
    from revisions import REGISTER
    refs = json.loads(REGISTER.read_bytes())
    project_pack = json.loads((ROOT/'art/performance/compact-v1.json').read_bytes())['assets']
    if not args.id.isidentifier() or args.id not in project_pack:
        parser.error('a registered project card id is required')
    source = sha(args.source.read_bytes())
    if source != args.approved_source_sha256:
        parser.error('source does not match the approved revision SHA-256')
    if any(source == row['sha256'] for row in refs['references']['cards'].values()):
        parser.error('original game reference is restricted to visual inspection')
    if any(source == row['sha256'] for row in project_pack.values()):
        parser.error('the archived Compact sources are excluded from this round')
    fit(args.id, args.source, args.output/args.id)


if __name__ == '__main__':
    main()
