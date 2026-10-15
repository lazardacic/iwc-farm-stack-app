import axiosClient from "./axiosClient";
import type { Destination, DestinationPage } from "../types/destination";

interface DestinationPageParams {
  page: number;
  pageSize: number;
  search: string;
}

export const getAllDestinations = async ({
  page,
  pageSize,
  search,
}: DestinationPageParams): Promise<DestinationPage> => {
  const response = await axiosClient.get("/destinations/", {
    params: { page, page_size: pageSize, search },
  });
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
