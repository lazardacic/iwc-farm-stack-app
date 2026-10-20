const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const formatPrice = (price: number) => priceFormatter.format(price);

export const formatRating = (rating: number) => rating.toFixed(1);

// Plain-text descriptions keep their line breaks; blank lines separate paragraphs.
export const toParagraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
