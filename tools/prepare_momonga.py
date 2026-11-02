"""Convert only the ten supplied poses; source PNGs stay outside the repository.

Usage: python tools/prepare_momonga.py /path/to/出来上がった画像/momonga
Requires Pillow for this authoring step only, not for the website.
"""
import argparse
import io
from pathlib import Path
from PIL import Image, ImageOps

POSES = 'stand wave crouch jump glide land think surprise sleepy yuagari'.split()


def convert(source, destination, budget=100 * 1024):
    image = ImageOps.exif_transpose(Image.open(source)).convert('RGBA')
    if image.getchannel('A').getextrema()[0] == 255:
        raise ValueError(f'{source.name}: transparent background required')
    image.thumbnail((640, 640), Image.Resampling.LANCZOS)
    while True:
        for quality in range(92, 39, -4):
            output = io.BytesIO()
            image.save(output, 'WEBP', quality=quality, method=6)
            if output.tell() <= budget:
                destination.write_bytes(output.getvalue())
                check = Image.open(destination)
                assert check.mode == 'RGBA' and check.getchannel('A').getextrema()[0] == 0
                print(f'{destination.name}: {output.tell():,} bytes, {image.width}x{image.height}, alpha retained')
                return
        image.thumbnail((int(image.width * .9), int(image.height * .9)), Image.Resampling.LANCZOS)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'photos/momonga')
    args = parser.parse_args()
    sources = {name: args.source / f'{name}.png' for name in POSES}
    if not sources['stand'].exists():
        sources['stand'] = args.source / 'standmomonga.png'
    missing = [str(path) for path in sources.values() if not path.is_file()]
    if missing:
        parser.error('Missing poses: ' + ', '.join(missing))
    args.output.mkdir(parents=True, exist_ok=True)
    for name, source in sources.items():
        convert(source, args.output / f'{name}.webp')
