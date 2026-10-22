export interface DestinationFormValues {
  title: string;
  country: string;
  description: string;
  image: string;
  price: number;
  rating: number;
  // Only in the edit form; the create form leaves it to the server.
  slug?: string;
}
