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
