from __future__ import annotations

import collections
import pathlib
import re


ROOT = pathlib.Path(__file__).resolve().parents[1]
FILES = [ROOT / "index.html", *sorted((ROOT / "js").glob("*.js"))]
FILES = [path for path in FILES if not path.name.startswith("i18n")]
HAN = re.compile(r"[\u3400-\u9fff]")
QUOTED = re.compile(r"(['\"`])((?:\\.|(?!\1).)*?)\1", re.DOTALL)


def main() -> None:
    occurrences: list[tuple[str, str]] = []
    for path in FILES:
        text = path.read_text(encoding="utf-8")
        for _, value in QUOTED.findall(text):
            value = value.strip()
            if HAN.search(value):
                occurrences.append((str(path.relative_to(ROOT)), value))

    counts = collections.Counter(path for path, _ in occurrences)
    unique = list(dict.fromkeys(value for _, value in occurrences))
    print(f"Chinese-bearing string literals: {len(occurrences)} occurrences, {len(unique)} unique")
    for path, count in counts.most_common():
        print(f"{path}: {count}")


if __name__ == "__main__":
    main()
