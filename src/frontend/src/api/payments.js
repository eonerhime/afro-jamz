import apiClient from "./client";

export const paymentsAPI = {
  /**
   * Add funds to wallet via payment gateway
   * @param {Object} data - Payment data
   * @param {number} data.amount - Amount in selected currency
   * @param {string} data.currency - Currency code
   * @param {string} data.payment_method_id - Payment method ID
   * @param {string} data.gateway - Preferred gateway (optional)
   * @returns {Promise} Payment result
   */
  addFunds: async (data) => {
    const response = await apiClient.post("/api/payments/add-funds", data);
    return response.data;
  },

  /**
   * Process a one-time payment
   * @param {Object} data - Payment data
   * @returns {Promise} Payment result
   */
  processPayment: async (data) => {
    const response = await apiClient.post("/api/payments/process", data);
    return response.data;
  },

  /**
   * Request a refund
   * @param {Object} data - Refund data
   * @returns {Promise} Refund result
   */
  requestRefund: async (data) => {
    const response = await apiClient.post("/api/payments/refund", data);
    return response.data;
  },

  /**
   * Get wallet balance
   * @param {string} currency - Currency to display balance in (optional)
   * @returns {Promise} Wallet balance
   */
  getWalletBalance: async (currency = "USD") => {
    const response = await apiClient.get("/api/wallet/balance", {
      params: { currency },
    });
    return response.data;
  },

  /**
   * Get wallet transactions
   * @param {number} limit - Number of transactions to retrieve
   * @returns {Promise} Transaction history
   */
  getWalletTransactions: async (limit = 50) => {
    const response = await apiClient.get("/api/wallet/transactions", {
      params: { limit },
    });
    return response.data;
  },
};
