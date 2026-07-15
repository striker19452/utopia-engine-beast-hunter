"""Crop the monster sheet along its printed grid lines.

Run from the project root with:
    conda run -n agent python scripts/crop_monsters.py
"""

from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT_ROOT / "assets" / "utopia_bh_monsters.png"
OUTPUT_DIR = PROJECT_ROOT / "assets" / "monsters"

# The coordinates are the clean inner edges of the printed cut lines. Pillow's
# crop boxes use an exclusive right/bottom edge, so no grid ink is retained.
COLUMNS = ((26, 318), (321, 619), (622, 945))
ROWS = ((26, 353), (356, 683), (685, 988), (991, 1273), (1276, 1599))

MONSTERS = (
    ("frost-gremlin", 0, 0),
    ("ice-bear", 0, 1),
    ("blood-wolves", 0, 2),
    ("horse-eater-hawk", 1, 0),
    ("giant-of-the-peaks", 1, 1),
    ("hooktooth-goblins", 1, 2),
    ("shell-cracker-troll", 2, 0),
    ("land-shark", 2, 1),
    ("nightmare-crab", 2, 2),
    ("dweller-in-the-tides", 3, 0),
    ("hollow-birds", 3, 1),
    ("spark-hounds", 3, 2),
    ("coal-dragon", 4, 0),
    ("ash-troll", 4, 1),
    ("the-burning-man", 4, 2),
)


def main() -> None:
    with Image.open(SOURCE) as sheet:
        if sheet.size != (971, 1619):
            raise ValueError(
                f"Unexpected source size {sheet.size}; crop coordinates expect (971, 1619)."
            )

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        for slug, row, column in MONSTERS:
            left, right = COLUMNS[column]
            top, bottom = ROWS[row]
            crop = sheet.crop((left, top, right, bottom))
            target = OUTPUT_DIR / f"{slug}.png"
            crop.save(target, format="PNG", optimize=True)
            print(f"{target.relative_to(PROJECT_ROOT)}: {crop.width}x{crop.height}")


if __name__ == "__main__":
    main()
