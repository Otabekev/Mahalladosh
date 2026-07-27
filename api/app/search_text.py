"""Text folding for in-mahalla search.

Uzbek makes naive SQL matching useless, in two ways that both matter here.

The same word is written several ways in Latin: `qo'shni`, `qoʻshni`, `qo‘shni`,
and — from anyone typing quickly on a phone — `qoshni`. The apostrophe is a real
letter (oʻ and gʻ are distinct from o and g), but nobody types it consistently, so
searching has to ignore it.

And the app ships in both scripts. A grandmother searching Cyrillic `қўшни` should
find a post written in Latin `qo'shni`, because it is the same word. Folding
Cyrillic into Latin is what makes one index serve both.

Neither is expressible in portable SQL. `ILIKE` compiles to `lower() LIKE lower()`,
and SQLite's `lower()` is ASCII-only — it does not case-fold Cyrillic at all, so
matching would behave differently in dev (SQLite) and production (Postgres). So the
comparison happens in Python, over the mahalla's rows.

Known asymmetry, on purpose: Cyrillic `е` folds to `e`, so a Cyrillic query "Ер"
matches Latin "Yer", but a Latin query "yer" does not match Cyrillic "Ер". Content
is overwhelmingly Latin and Cyrillic→Latin is the direction elders need, so this is
the useful half. Do not "fix" it with a reverse map — that would make every query
match far too much.

If a single mahalla ever outgrows a scan (thousands of posts), the move is a stored
`search_norm` column written with this same fold() at save time, and a LIKE against
it. Same API, same tests. Not needed for one district.
"""

# Uzbek Cyrillic → Latin. Multi-character values first is not required (dict order
# is irrelevant here) because substitution is per character.
_CYRILLIC = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "j", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh",
    "ъ": "", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    "ў": "o", "қ": "q", "ғ": "g", "ҳ": "h",
}

# Every apostrophe a phone keyboard, a designer, or a copy-paste can produce.
_APOSTROPHES = "'‘’ʻʼʽ`´′"


def fold(text: str | None) -> str:
    """Normalise text so that script and apostrophe style stop mattering."""
    if not text:
        return ""
    out = []
    for ch in text.casefold():
        if ch in _APOSTROPHES:
            continue
        out.append(_CYRILLIC.get(ch, ch))
    return " ".join("".join(out).split())


def matches(needle: str, *haystacks: str | None) -> bool:
    """True when the folded needle appears in any of the folded haystacks."""
    if not needle:
        return False
    return any(needle in fold(h) for h in haystacks)
