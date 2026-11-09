import DOMPurify from "dompurify";

// The backend already sanitizes descriptions (backend/utils/rich_text.py).
// This second pass with the same allowlist protects the page if HTML ever
// reaches the database another way, for example through a manual import.
const ALLOWED_TAGS = ["p", "br", "strong", "em", "h2", "h3", "ul", "ol", "li", "blockquote"];

export const sanitizeDescription = (html: string) =>
  DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] });
