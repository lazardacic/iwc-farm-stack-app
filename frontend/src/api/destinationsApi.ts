import axiosClient from "./axiosClient";
import type {
  Destination,
  DestinationFilters,
  DestinationPage,
} from "../types/destination";

interface DestinationPageParams {
  page: number;
  pageSize: number;
  search: string;
  filters?: DestinationFilters;
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
}: DestinationPageParams): Promise<DestinationPage> => {
  const response = await axiosClient.get("/destinations/", {
    params: {
      page,
      page_size: pageSize,
      search,
      ...toFilterParams(filters),
    },
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
