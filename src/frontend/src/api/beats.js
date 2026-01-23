import apiClient from "./client";

export const beatsAPI = {
  // Get all beats (public)
  getAll: async (params = {}) => {
    const response = await apiClient.get("/api/beats", { params });
    return response.data;
  },

  // Get single beat by ID
  getById: async (id) => {
    const response = await apiClient.get(`/api/beats/${id}`);
    return response.data;
  },

  // Search beats
  search: async (query) => {
    const response = await apiClient.get("/api/beats/search", {
      params: { q: query },
    });
    return response.data;
  },

  // Upload beat (producer only)
  upload: async (formData) => {
    const response = await apiClient.post("/api/producer/beats", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Get producer's beats
  getMyBeats: async () => {
    const response = await apiClient.get("/api/producer/beats");
    return response.data;
  },

  // Update beat
  update: async (id, data) => {
    const response = await apiClient.put(`/api/producer/beats/${id}`, data);
    return response.data;
  },

  // Delete beat
  delete: async (id) => {
    const response = await apiClient.delete(`/api/producer/beats/${id}`);
    return response.data;
  },
};
