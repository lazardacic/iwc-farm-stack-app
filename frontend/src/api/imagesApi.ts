import axiosClient from "./axiosClient";

export const uploadImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  // The client defaults to JSON; multipart lets the browser add the boundary.
  const response = await axiosClient.post("/images/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};
