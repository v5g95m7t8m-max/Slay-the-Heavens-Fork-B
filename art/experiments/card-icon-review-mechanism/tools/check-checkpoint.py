#!/usr/bin/env python3
"""Validate exact approved design artifacts; does not adjudicate visual quality."""
import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import re
import sys

from PIL import Image


def check(root):
    def read(rel):
        return json.loads((root / rel).read_text(encoding="utf-8"))

    def require(test, message):
        if not test:
            raise ValueError(message)

    def artifact(rel, suffix, digest):
        p = (root / rel).resolve()
        require(p.is_relative_to(root) and p.suffix == suffix, f"Invalid artifact: {rel}")
        require(p.is_file(), f"Missing artifact: {rel}")
        require(sha256(p.read_bytes()).hexdigest() == digest, f"Digest mismatch: {rel}")
        return p

    cards = read("production-status.json")["cards"]
    receipts = read("design-acceptance.json")["artifacts"]
    require(len(cards) == 75, f"Expected 75 cards, got {len(cards)}")
    ids = [c["id"] for c in cards]
    require(len(set(ids)) == 75 and all(re.fullmatch(r"[a-z][a-z0-9_]*", i) for i in ids),
            "Card IDs must be unique and valid")
    require([c["index"] for c in cards] == list(range(1, 76)), "Incorrect card sequence")
    counts = Counter()
    approved = set()
    for c in cards:
        i, state = c["id"], c["state"]
        require(state in {"QUEUED", "HOLD_REWORK", "KEEP_OWNER_APPROVED_ROUGH_ART",
                          "DESIGN_PILOT_PASS"}, f"{i}: unknown state {state}")
        require(c["runtime"] == "not-integrated", f"{i}: runtime claim outside branch scope")
        counts[state] += 1
        if state != "DESIGN_PILOT_PASS":
            require("asset" not in c, f"{i}: unapproved row points to a release candidate")
            continue
        approved.add(i)
        require(i in receipts, f"{i}: missing acceptance receipt")
        receipt = receipts[i]
        require(c["asset"] == receipt["svg"], f"{i}: SVG path differs from receipt")
        svg = artifact(receipt["svg"], ".svg", receipt["svgSha256"])
        png = artifact(receipt["png"], ".png", receipt["pngSha256"])
        require(svg.stem == png.stem == i, f"{i}: file names must match the stable card ID")
        require(svg.parent == png.parent, f"{i}: put both artifacts in the same batch")
        evidence = (root / receipt["evidence"]).resolve()
        require(evidence.is_relative_to(root) and evidence.is_file(),
                f"{i}: review evidence missing or outside the checkpoint")
        require(sha256(evidence.read_bytes()).hexdigest() == receipt["evidenceSha256"],
                f"{i}: exact review evidence changed")
        with Image.open(png) as im:
            require(im.format == "PNG" and im.size == (256, 256) and im.mode == "RGBA",
                    f"{i}: expected a 256×256 RGBA PNG")
            alpha = im.getchannel("A")
            require(alpha.getextrema() == (0, 255), f"{i}: no opaque subject or transparent background")
            require(all(alpha.getpixel((x, y)) == 0 for x in (0, 255) for y in (0, 255)),
                    f"{i}: corner pixels must not bake the card background")
    require(set(receipts) == approved, "Acceptance receipts and passed roster must match exact IDs")
    return counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkpoint", nargs="?", type=Path,
                        default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args()
    try:
        counts = check(args.checkpoint.resolve())
    except (KeyError, ValueError, OSError, TypeError) as exc:
        sys.exit(f"Checkpoint FAIL: {exc}")
    print("Checkpoint OK (source integrity only): " + json.dumps(counts, sort_keys=True))
