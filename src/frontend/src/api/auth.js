import apiClient from "./client";

export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await apiClient.post("/auth/register", userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get("/auth/profile");
    return response.data;
  },

  // Logout (client-side only for now)
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};
