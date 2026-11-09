"""Rich text descriptions: an allowlist sanitizer and conversions to and from plain text.

The editor in the frontend produces a small set of tags. Everything else is removed
here, on the server, because a client can send any HTML it likes.
"""

import html
import re
from html.parser import HTMLParser

import nh3

# Matches the toolbar in the frontend editor. No attributes are allowed at all,
# so there is no href, src, style or on* handler to abuse.
ALLOWED_TAGS = {
    "p",
    "br",
    "strong",
    "em",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "blockquote",
}

BLOCK_TAGS = {"p", "h2", "h3", "ul", "ol", "li", "blockquote"}

MAX_DESCRIPTION_HTML_LENGTH = 50_000


def sanitize_html(value: str) -> str:
    """Keep only the allowed tags, without attributes.

    Disallowed tags are dropped but their text is kept; the contents of
    <script> and <style> are removed entirely.
    """
    return nh3.clean(value, tags=ALLOWED_TAGS, attributes={}, link_rel=None).strip()


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "br":
            self.parts.append("\n")
        elif tag in BLOCK_TAGS:
            self.parts.append("\n\n")

    def handle_endtag(self, tag):
        if tag in BLOCK_TAGS:
            self.parts.append("\n\n")

    def handle_data(self, data):
        self.parts.append(data)


def html_to_text(value: str) -> str:
    """Plain text for cards, excerpts and search: blocks become paragraphs."""
    parser = _TextExtractor()
    parser.feed(value)
    parser.close()

    lines = [" ".join(line.split()) for line in "".join(parser.parts).split("\n")]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def text_to_html(value: str) -> str:
    """HTML for descriptions written before rich text: blank lines separate paragraphs."""
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", value) if part.strip()]
    return "".join(
        "<p>" + "<br>".join(html.escape(line) for line in paragraph.split("\n")) + "</p>"
        for paragraph in paragraphs
    )
