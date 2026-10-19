export interface Destination {
  id: string;
  title: string;
  country: string;
  description: string;
  price: number;
  rating: number;
  image: string;
  tags: string[];
  featured: boolean;
}

export interface DestinationPage {
  items: Destination[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

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
