import apiClient from "./client";

export const licensesAPI = {
  // Get all licenses for a beat
  getByBeatId: async (beatId) => {
    const response = await apiClient.get(`/api/beats/${beatId}/licenses`);
    return response.data;
  },
};
