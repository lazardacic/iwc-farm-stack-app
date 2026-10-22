export interface Destination {
  id: string;
  title: string;
  // URL segment, e.g. "belgrade-at-sunset"; made from the title when created.
  slug: string;
  country: string;
  description: string;
  price: number;
  rating: number;
  image: string;
  tags: string[];
  featured: boolean;
  created_by?: string | null;
  // In the home page slider; independent of "featured".
  pinned?: boolean;
}

export interface DestinationPage {
  items: Destination[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export type DestinationSort =
  | "oldest"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating_desc"
  | "title_asc";

export type FeaturedFilter = "all" | "featured" | "regular";

export interface DestinationFilters {
  country: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  featured: FeaturedFilter;
}

export const EMPTY_DESTINATION_FILTERS: DestinationFilters = {
  country: "",
  minPrice: "",
  maxPrice: "",
  minRating: "",
  featured: "all",
};

// What the API accepts when creating or updating; the server sets id, owner and pinned.
// On update, leaving slug out keeps it, "" rebuilds it from the title.
export type DestinationPayload = Omit<
  Destination,
  "id" | "slug" | "created_by" | "pinned"
> & {
  slug?: string;
};
