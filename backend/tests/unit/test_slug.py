import pytest

from utils.slug import MAX_SLUG_LENGTH, slugify


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        ("Belgrade at Sunset", "belgrade-at-sunset"),
        ("Tokyo Trip #1", "tokyo-trip-1"),
        ("Čačak, Šabac i Žabljak", "cacak-sabac-i-zabljak"),
        ("Đerdap i Ćuprija", "djerdap-i-cuprija"),
        ("Нови Сад и Петроварадин", "novi-sad-i-petrovaradin"),
        ("Љубљана, Њујорк, Џакарта", "ljubljana-njujork-dzakarta"),
        ("Café Crème", "cafe-creme"),
        ("  --Rome!!  2026--  ", "rome-2026"),
    ],
)
def test_slugify(title, expected):
    assert slugify(title) == expected


@pytest.mark.parametrize("title", ["", "!!!", "   ", "日本"])
def test_slugify_falls_back_when_nothing_is_left(title):
    assert slugify(title) == "destination"


def test_slugify_cuts_long_titles_at_a_word_boundary():
    slug = slugify("word " * 40)

    assert len(slug) <= MAX_SLUG_LENGTH
    assert not slug.endswith("-")
    assert set(slug.split("-")) == {"word"}
