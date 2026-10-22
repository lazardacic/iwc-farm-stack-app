import re
import unicodedata


MAX_SLUG_LENGTH = 80
FALLBACK_SLUG = "destination"

# Serbian letters that Unicode decomposition does not reduce to ASCII on its own
# (č, ć, š and ž lose their marks automatically; đ and the Cyrillic alphabet do not).
TRANSLITERATION = {
    "đ": "dj", "Đ": "Dj",
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "ђ": "dj", "е": "e",
    "ж": "z", "з": "z", "и": "i", "ј": "j", "к": "k", "л": "l", "љ": "lj",
    "м": "m", "н": "n", "њ": "nj", "о": "o", "п": "p", "р": "r", "с": "s",
    "т": "t", "ћ": "c", "у": "u", "ф": "f", "х": "h", "ц": "c", "ч": "c",
    "џ": "dz", "ш": "s",
}


def slugify(text: str) -> str:
    """Turn a title into a lowercase ASCII URL segment, e.g. "Novi Sad i Đerdap" -> "novi-sad-i-djerdap"."""
    text = "".join(TRANSLITERATION.get(char.lower(), char) for char in text)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

    if len(slug) > MAX_SLUG_LENGTH:
        # Cut at a word boundary so a slug never ends in half a word.
        slug = slug[:MAX_SLUG_LENGTH].rsplit("-", 1)[0]

    return slug or FALLBACK_SLUG
