import pytest
from pydantic import ValidationError

from models.destination import DestinationCreate
from utils.rich_text import html_to_text, sanitize_html, text_to_html


@pytest.mark.parametrize(
    "dirty, clean",
    [
        ("<p>Hello <strong>world</strong></p>", "<p>Hello <strong>world</strong></p>"),
        ("<p>Hi</p><script>alert(1)</script>", "<p>Hi</p>"),
        ('<p onclick="alert(1)" class="x">Hi</p>', "<p>Hi</p>"),
        ('<img src="x" onerror="alert(1)"><p>Hi</p>', "<p>Hi</p>"),
        ('<a href="javascript:alert(1)">click</a>', "click"),
        ("<h1>Big</h1><h2>Ok</h2>", "Big<h2>Ok</h2>"),
        ("<style>p{color:red}</style><p>Hi</p>", "<p>Hi</p>"),
        ("<iframe src='https://evil.example'></iframe><p>Hi</p>", "<p>Hi</p>"),
        ("<ul><li><p>One</p></li></ul>", "<ul><li><p>One</p></li></ul>"),
        ("<blockquote><p>Quote</p></blockquote>", "<blockquote><p>Quote</p></blockquote>"),
    ],
)
def test_sanitize_html_keeps_only_allowed_tags(dirty, clean):
    assert sanitize_html(dirty) == clean


def test_html_to_text_separates_blocks_and_decodes_entities():
    value = "<h2>Old town</h2><p>Fish &amp; chips<br>by the sea</p><ul><li><p>One</p></li><li><p>Two</p></li></ul>"

    assert html_to_text(value) == "Old town\n\nFish & chips\nby the sea\n\nOne\n\nTwo"


def test_text_to_html_escapes_and_keeps_paragraphs():
    value = "First <b>line</b>\nsecond line\n\nNew paragraph"

    assert text_to_html(value) == (
        "<p>First &lt;b&gt;line&lt;/b&gt;<br>second line</p><p>New paragraph</p>"
    )


def _destination(**overrides):
    values = {
        "title": "Paris",
        "country": "France",
        "price": 500,
        "rating": 4.8,
    }
    values.update(overrides)
    return DestinationCreate(**values)


def test_rich_text_is_sanitized_and_plain_text_derived():
    destination = _destination(
        description="ignored when html is sent",
        description_html="<h2>Paris</h2><p>Croissants <em>every</em> morning</p><script>x()</script>",
    )

    assert destination.description_html == "<h2>Paris</h2><p>Croissants <em>every</em> morning</p>"
    assert destination.description == "Paris\n\nCroissants every morning"


def test_plain_text_only_gets_html_paragraphs():
    destination = _destination(description="One\n\nTwo")

    assert destination.description_html == "<p>One</p><p>Two</p>"


@pytest.mark.parametrize(
    "fields",
    [
        {},
        {"description": "   "},
        {"description_html": "<p></p>"},
        {"description_html": "<script>alert(1)</script>"},
    ],
)
def test_description_is_required(fields):
    with pytest.raises(ValidationError):
        _destination(**fields)
