"""Validate the active reference revision against pinned assets and the project catalog."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
REGISTER = ROOT / 'art/cards/traveler-geo/design-revisions.json'
EXPECTED = {'strike', 'defend', 'bash', 'whirlwind', 'barricade', 'demon_form'}


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify(private_dir=None):
    meta = json.loads(REGISTER.read_bytes())
    assert meta['schemaVersion'] == 1 and meta['currentProductionArt'] is None
    refs = meta['references']
    assert refs['id'] == meta['activeReview'] and refs['status'] == 'reference-only'
    assert set(refs['cards']) == EXPECTED
    assert set(refs['cards'][x]['sourceId'] for x in ('strike', 'defend')) == {'strike_r', 'defend_r'}
    assert meta['archive']['status'] == 'superseded-for-current-art-review'
    for artifact in (meta['archive']['catalog'], meta['archive']['review'], meta['historicalNative']['catalog']):
        path = artifact['path']
        frozen = subprocess.check_output(['git', 'show', f"{meta['projectBaseCommit']}:{path}"], cwd=ROOT)
        assert digest(frozen) == artifact['sha256'] == digest((ROOT / path).read_bytes()), path
    catalog = json.loads((ROOT / meta['archive']['catalog']['path']).read_bytes())
    assert len(catalog['candidates']) == meta['archive']['count']
    assert sorted(catalog['cards']) == sorted(meta['historicalNative']['ids'])
    assert catalog['runtime']['status'] == meta['historicalNative']['runtimeStatus']
    if private_dir is not None:
        assert not private_dir.resolve().is_relative_to(ROOT), 'reference images belong outside the worktree'
        for row in refs['cards'].values():
            path = private_dir / Path(row['sourcePath']).name
            raw = path.read_bytes()
            assert digest(raw) == row['sha256'] and len(raw) == row['bytes'], path
            with Image.open(path) as im:
                assert im.format == 'PNG' and list(im.size) == row['size'], path
                assert list(im.convert('RGBA').getbbox(alpha_only=True)) == row['alphaBounds'], path
    return dict(activeReview=refs['id'], references=len(refs['cards']), archived=meta['archive']['count'],
                verifiedPrivateBytes=private_dir is not None)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--private-dir', type=Path)
    args = parser.parse_args()
    print(json.dumps(verify(args.private_dir)))
