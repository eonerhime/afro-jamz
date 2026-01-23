import apiClient from "./client";

export const purchasesAPI = {
  // Purchase a beat
  create: async (purchaseData) => {
    const response = await apiClient.post("/api/buyer/purchases", purchaseData);
    return response.data;
  },

  // Get purchase history
  getHistory: async () => {
    const response = await apiClient.get("/api/buyer/purchases");
    return response.data;
  },

  // Get single purchase
  getById: async (id) => {
    const response = await apiClient.get(`/api/buyer/purchases/${id}`);
    return response.data;
  },

  // Download purchased beat
  download: async (purchaseId) => {
    const response = await apiClient.get(
      `/api/buyer/purchases/${purchaseId}/download`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },
};
