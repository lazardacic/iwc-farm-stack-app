import axiosClient from "./axiosClient";
import type { Destination } from "../types/destination";

export const getAllDestinations = async (): Promise<Destination[]> => {
  const response = await axiosClient.get("/destinations/");
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
