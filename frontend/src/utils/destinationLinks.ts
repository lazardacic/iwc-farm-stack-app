import type { Destination } from "../types/destination";

// MongoDB ids are 24 hex characters; anything else in /destination/:key is a slug.
export const isObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value);

// Older destinations without a slug still get a working link through their id.
export const destinationPath = (destination: Pick<Destination, "id" | "slug">) =>
  `/destination/${destination.slug || destination.id}`;
