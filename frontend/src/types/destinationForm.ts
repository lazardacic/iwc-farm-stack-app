export interface DestinationFormValues {
  title: string;
  country: string;
  // Plain text from the editor, used for validation; the server derives its own.
  description: string;
  description_html: string;
  image: string;
  price: number;
  rating: number;
  // Only in the edit form; the create form leaves it to the server.
  slug?: string;
}
