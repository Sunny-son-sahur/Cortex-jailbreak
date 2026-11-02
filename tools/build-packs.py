#!/usr/bin/env python3
"""Turn the downloaded files in jailbreaks/ into what the site serves.

For every model it writes:
    site/packs/<pack>/<model>.md    the text the Copy button copies
    site/packs/<pack>/<model>.zip   cortex-<pack>/<FILE> inside, for Download

Run from anywhere:  python3 tools/build-packs.py
"""

import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "jailbreaks"
OUT = ROOT / "site" / "packs"
ASSETS = ROOT / "site" / "assets"

# pack id, model id, filename inside the ZIP, glob that finds the source file
MAP = [
    ("chatgpt",  "md7dbcd87", "AGENTS.md",  "*6.1 SOL*"),
    ("chatgpt",  "m0b28343c", "AGENTS.md",  "*ASTRA 6*"),
    ("claude",   "m90be2b8f", "CLAUDE.md",  "*Opus 4.7*"),
    ("claude",   "mb59b01e7", "AGENTS.md",  "*Sonnet 4.6*"),
    ("grok",     "m51548b3f", "AGENTS.md",  "*Grok Web*"),
    ("deepseek", "mf8e53157", "AGENTS.md",  "*V4.1 Flash*"),
    ("deepseek", "m69cfb5f2", "AGENTS.md",  "*Deepseek Web*"),
    ("opencode", "m753d774f", "AGENTS.md",  "*Opencode Universal*"),
]


def find(pattern):
    if not SRC.is_dir():
        return None
    hits = sorted(p for p in SRC.rglob(pattern) if p.is_file())
    return hits[0] if hits else None


def main():
    if not SRC.is_dir():
        sys.exit(f"No {SRC} folder — put the downloaded packs there first.")

    missing = []
    made = 0

    for pack, model, inner, pattern in MAP:
        src = find(pattern)
        if src is None:
            missing.append(f"{pack}/{model} ({pattern})")
            continue

        folder = OUT / pack
        folder.mkdir(parents=True, exist_ok=True)

        md = folder / f"{model}.md"
        shutil.copyfile(src, md)

        data = md.read_bytes()
        zpath = folder / f"{model}.zip"
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
            info = zipfile.ZipInfo(f"cortex-{pack}/{inner}")
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, data)

        made += 1
        print(f"  {pack}/{model}  {len(data):>7,} chars  ->  cortex-{pack}/{inner}")

    # The mark and the model logos.
    ASSETS.mkdir(parents=True, exist_ok=True)
    mark = ROOT / "image.png"
    if mark.is_file():
        shutil.copyfile(mark, ASSETS / "mark.png")
        print(f"  assets/mark.png  ({mark.stat().st_size:,} bytes)")

    logos_src = ROOT / "ojailbreaks.com" / "assets" / "logos"
    if logos_src.is_dir():
        dest = ASSETS / "logos"
        dest.mkdir(parents=True, exist_ok=True)
        for svg in logos_src.glob("*.svg"):
            shutil.copyfile(svg, dest / svg.name)
        print(f"  assets/logos/  ({len(list(dest.glob('*.svg')))} files)")

    print(f"\n{made} of {len(MAP)} models built.")
    if missing:
        print("Not found in jailbreaks/:")
        for m in missing:
            print("  -", m)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
