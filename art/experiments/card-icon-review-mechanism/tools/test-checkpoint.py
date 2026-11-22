#!/usr/bin/env python3
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("checkpoint", ROOT / "tools/check-checkpoint.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class CheckpointTests(unittest.TestCase):
    def setUp(self):
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        for name in ("production-status.json", "design-acceptance.json", "review-receipt.json"):
            shutil.copyfile(ROOT / name, self.root / name)
        for name in ("samples", "batches"):
            shutil.copytree(ROOT / name, self.root / name)
        self.status = self.root / "production-status.json"
        self.receipts = self.root / "design-acceptance.json"

    def update(self, path, change):
        value = json.loads(path.read_text(encoding="utf-8"))
        change(value)
        path.write_text(json.dumps(value), encoding="utf-8")

    def test_checked_in_records(self):
        self.assertGreater(mod.check(self.root)["DESIGN_PILOT_PASS"], 0)

    def test_duplicate_roster_id_rejected(self):
        self.update(self.status, lambda r: r["cards"][1].update(id=r["cards"][0]["id"]))
        with self.assertRaisesRegex(ValueError, "unique"):
            mod.check(self.root)

    def test_unreviewed_promotion_rejected(self):
        def promote(r):
            c = next(c for c in r["cards"] if c["state"] == "QUEUED")
            c.update(state="DESIGN_PILOT_PASS", asset=f"samples/{c['id']}.svg")
        self.update(self.status, promote)
        with self.assertRaisesRegex(ValueError, "missing acceptance"):
            mod.check(self.root)

    def test_replaced_svg_rejected(self):
        svg = self.root / "samples/defend.svg"
        svg.write_bytes(svg.read_bytes() + b"\n")
        with self.assertRaisesRegex(ValueError, "Digest mismatch"):
            mod.check(self.root)

    def test_rehashed_baked_background_rejected(self):
        p = self.root / "samples/defend.png"
        with Image.open(p) as raw:
            img = raw.copy()
        img.putpixel((0, 0), (33, 33, 33, 255))
        img.save(p)
        self.update(self.receipts, lambda r: r["artifacts"]["defend"].update(
            pngSha256=sha256(p.read_bytes()).hexdigest()))
        with self.assertRaisesRegex(ValueError, "corner pixels"):
            mod.check(self.root)

    def test_manually_reworded_evidence_rejected(self):
        p = self.root / "review-receipt.json"
        p.write_bytes(p.read_bytes() + b"\n")
        with self.assertRaisesRegex(ValueError, "exact review evidence changed"):
            mod.check(self.root)


if __name__ == "__main__":
    unittest.main()
