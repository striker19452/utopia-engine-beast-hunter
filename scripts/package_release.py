#!/usr/bin/env python3
"""Build the versioned offline game ZIP using only player-facing files."""
from datetime import datetime
from pathlib import Path
import argparse
import re
import zipfile


def package(output=None):
    root = Path(__file__).resolve().parent.parent
    metadata = (root / 'js/version.js').read_text(encoding='utf-8')
    version = re.search(r"number:\s*'(\d+\.\d+\.\d+)'", metadata).group(1)
    released = re.search(r"released:\s*'(\d{4}-\d{2}-\d{2})'", metadata).group(1)
    folder = f'UEBH-v{version}'
    destination = Path(output).resolve() if output else root / f'{folder}.zip'
    files = [root / name for name in ['index.html', 'README.md', 'CHANGELOG.md']]
    for directory in ['css', 'js', 'assets']:
        files.extend(path for path in (root / directory).rglob('*')
                     if path.is_file() and not any(part.startswith('.') for part in path.relative_to(root).parts))
    files = sorted(files)
    if any(path.is_symlink() or not path.resolve().is_relative_to(root) for path in files):
        raise ValueError('Release inputs must be regular files inside the project.')
    timestamp = datetime.strptime(released, '%Y-%m-%d').timetuple()[:6]
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            info = zipfile.ZipInfo(f'{folder}/{path.relative_to(root).as_posix()}', date_time=timestamp)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip():
            raise ValueError('Release archive failed its CRC check.')
        for path in files:
            name = f'{folder}/{path.relative_to(root).as_posix()}'
            if archive.read(name) != path.read_bytes():
                raise ValueError(f'Release archive content mismatch: {name}')
    print(f'{destination}\n{len(files)} files; {destination.stat().st_size:,} bytes; verified')
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Destination ZIP; defaults to UEBH-vVERSION.zip in the project.')
    package(parser.parse_args().output)
