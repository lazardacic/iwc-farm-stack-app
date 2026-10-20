import axiosClient from "./axiosClient";
import type {
  Destination,
  DestinationFilters,
  DestinationPage,
  DestinationSort,
} from "../types/destination";

interface DestinationPageParams {
  page: number;
  pageSize: number;
  search: string;
  filters?: DestinationFilters;
  sort?: DestinationSort;
  // Only the signed-in user's own destinations.
  mine?: boolean;
}

export const toFilterParams = (filters?: DestinationFilters) => {
  if (!filters) {
    return {};
  }

  const params: Record<string, string | number | boolean> = {};
  const country = filters.country.trim();

  if (country) {
    params.country = country;
  }
  if (filters.minPrice !== "") {
    params.min_price = Number(filters.minPrice);
  }
  if (filters.maxPrice !== "") {
    params.max_price = Number(filters.maxPrice);
  }
  if (filters.minRating !== "") {
    params.min_rating = Number(filters.minRating);
  }
  if (filters.featured !== "all") {
    params.featured = filters.featured === "featured";
  }

  return params;
};

export const getAllDestinations = async ({
  page,
  pageSize,
  search,
  filters,
  sort = "oldest",
  mine = false,
}: DestinationPageParams): Promise<DestinationPage> => {
  const response = await axiosClient.get("/destinations/", {
    params: {
      page,
      page_size: pageSize,
      search,
      sort,
      ...(mine ? { mine: true } : {}),
      ...toFilterParams(filters),
    },
  });
  return response.data;
};

export const getPinnedDestinations = async (): Promise<Destination[]> => {
  const response = await axiosClient.get("/destinations/pinned");
  return response.data;
};

export const setDestinationPinned = async (
  id: string,
  pinned: boolean,
): Promise<Destination> => {
  const response = await axiosClient.patch(`/destinations/${id}/pinned`, {
    pinned,
  });
  return response.data;
};

export const setDestinationFeatured = async (
  id: string,
  featured: boolean,
): Promise<Destination> => {
  const response = await axiosClient.patch(`/destinations/${id}/featured`, {
    featured,
  });
  return response.data;
};

export const getDestinationCountries = async (): Promise<string[]> => {
  const response = await axiosClient.get("/destinations/countries");
  return response.data;
};

export const getDestination = async (id: string): Promise<Destination> => {
  const response = await axiosClient.get(`/destinations/${id}`);
  return response.data;
};

export const createDestination = async (
  destination: Omit<Destination, "id">,
) => {
  const response = await axiosClient.post("/destinations/", destination);

  return response.data;
};

export const updateDestination = async (
  id: string,
  destination: Omit<Destination, "id">,
) => {
  const response = await axiosClient.put(`/destinations/${id}`, destination);

  return response.data;
};

export const deleteDestination = async (id: string) => {
  const response = await axiosClient.delete(`/destinations/${id}`);

  return response.data;
};
