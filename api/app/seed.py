import json
import re
import unicodedata
from pathlib import Path

from sqlalchemy.orm import Session

from . import models

DATA_DIR = Path(__file__).resolve().parent / "data"

# Demo MFY list for the launch district (Pop tumani, Namangan). Placeholder names —
# hand-curate against the real government list before the pilot (plan §13).
POP_DISTRICT_ID = 87
POP_MFYS = [
    "Yoshlik",
    "Gulzor",
    "Do'stlik",
    "Navbahor",
    "Bog'iston",
    "Istiqlol",
    "Guliston",
    "Paxtakor",
]


def normalize_name(name: str) -> str:
    """Canonical form used to merge duplicate spellings (plan §13: the
    make-or-break rule). Lowercase, strip apostrophe variants and non-letters."""
    s = unicodedata.normalize("NFKD", name).lower()
    s = s.replace("‘", "").replace("'", "").replace("`", "").replace("ʻ", "")
    s = re.sub(r"\b(mfy|mahalla|mahallasi)\b", "", s)
    s = re.sub(r"[^a-zа-яё0-9]+", "", s)
    return s


def seed(db: Session) -> None:
    if db.query(models.Region).first() is None:
        regions = json.loads((DATA_DIR / "regions.json").read_text(encoding="utf-8"))
        for r in regions:
            db.add(
                models.Region(
                    id=r["id"], soato_id=r.get("soato_id"),
                    name_uz=r["name_uz"], name_oz=r.get("name_oz"), name_ru=r.get("name_ru"),
                )
            )
        districts = json.loads((DATA_DIR / "districts.json").read_text(encoding="utf-8"))
        for d in districts:
            db.add(
                models.District(
                    id=d["id"], region_id=d["region_id"], soato_id=d.get("soato_id"),
                    name_uz=d["name_uz"], name_oz=d.get("name_oz"), name_ru=d.get("name_ru"),
                )
            )
        db.commit()

    if db.query(models.Mahalla).first() is None:
        for name in POP_MFYS:
            db.add(
                models.Mahalla(
                    district_id=POP_DISTRICT_ID,
                    name=name,
                    name_normalized=normalize_name(name),
                    status="forming",
                )
            )
        db.commit()
