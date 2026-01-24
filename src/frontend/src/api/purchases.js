import apiClient from "./client";

export const purchasesAPI = {
  // Purchase a beat
  create: async (purchaseData) => {
    // purchaseData should include: { beat_id, license_id, currency, display_amount }
    // - currency: The currency code the user is viewing prices in (e.g., 'EUR', 'NGN')
    // - display_amount: The price in the user's selected currency
    // Backend will store both the display amount and convert to USD for seller payouts
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
