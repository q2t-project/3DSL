"""Subset the HG-V1 specimen fonts; does not alter the production font bundle.

Usage: python build-legend-fonts.py /path/to/NotoSerifJP-source.ttf
Source and redistribution notices are retained beside the generated WOFF2 files.
"""
from pathlib import Path
import hashlib
import json
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

repo = Path(__file__).resolve().parents[3]
lab = repo / 'apps/reconstruction/ssot/legend_lab'
serif = Path(sys.argv[1])
fonts = lab / 'fonts'
fonts.mkdir(exist_ok=True)
texts = []
for path in sorted(lab.rglob('*')):
    if 'fonts' not in path.relative_to(lab).parts and path.suffix in ('.html', '.js', '.css', '.json'):
        texts.append(path.read_text())
characters = set(''.join(texts)) | set(chr(n) for n in range(32, 127))
characters -= set('\n\r\t')
sources = [
    (repo / 'packages/vendor/fonts/noto-sans-jp/NotoSansJP-Regular.ttf', 'NotoSansJP.woff2'),
    (repo / 'packages/vendor/fonts/noto-sans-jp/NotoSansJP-Bold.ttf', 'NotoSansJP-Bold.woff2'),
    (serif, 'NotoSerifJP.woff2'),
]
records = []
for source, name in sources:
    font = TTFont(source)
    cmap = font.getBestCmap()
    missing = sorted(ord(c) for c in characters if ord(c) not in cmap)
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    options.notdef_glyph = True
    options.notdef_outline = True
    engine = subset.Subsetter(options=options)
    engine.populate(text=''.join(sorted(characters)))
    engine.subset(font)
    font.flavor = 'woff2'
    destination = fonts / name
    font.save(destination)
    records.append({
        'file': name, 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
        'bytes': destination.stat().st_size,
        'missing_source_codepoints': [f'U+{n:04X}' for n in missing],
    })
manifest = {
    'scope': 'HG-V1 specimen text only; not a general-purpose Japanese font package',
    'serif_source': 'https://github.com/google/fonts/blob/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf',
    'character_count': len(characters), 'files': records,
}
(fonts / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(manifest, ensure_ascii=False))
