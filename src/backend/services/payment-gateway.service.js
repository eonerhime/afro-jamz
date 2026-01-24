/**
 * Payment Gateway Service
 * Handles integration with multiple payment providers (Stripe, Paystack, Flutterwave)
 * Supports multi-currency transactions
 */

/**
 * Exchange rates for currency conversion
 * In production, these should be fetched from a real-time API
 */
const EXCHANGE_RATES = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1580.0,
  ZAR: 18.5,
  KES: 129.0,
  GHS: 15.8,
  EGP: 49.0,
  CAD: 1.35,
  AUD: 1.52,
};

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} Converted amount
 */
export function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;

  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

/**
 * Convert any currency amount to USD
 * @param {number} amount - Amount to convert
 * @param {string} currency - Source currency code
 * @returns {number} Amount in USD
 */
export function toUSD(amount, currency) {
  if (currency === "USD") return amount;
  const rate = EXCHANGE_RATES[currency] || 1;
  return amount / rate;
}

/**
 * Convert USD to target currency
 * @param {number} usdAmount - Amount in USD
 * @param {string} targetCurrency - Target currency code
 * @returns {number} Converted amount
 */
export function fromUSD(usdAmount, targetCurrency) {
  if (targetCurrency === "USD") return usdAmount;
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return usdAmount * rate;
}

/**
 * Stripe Payment Gateway
 * Supports: USD, EUR, GBP, CAD, AUD
 */
export const StripeGateway = {
  name: "stripe",
  supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],

  /**
   * Process payment through Stripe
   * @param {Object} params - Payment parameters
   * @param {number} params.amount - Amount in currency
   * @param {string} params.currency - Currency code
   * @param {string} params.paymentMethodId - Stripe payment method ID
   * @param {string} params.description - Payment description
   * @returns {Promise<Object>} Payment result
   */
  async processPayment({ amount, currency, paymentMethodId, description }) {
    // In production, this would call the actual Stripe API
    // For now, we simulate a successful payment
    console.log(`[STRIPE] Processing ${currency} ${amount} - ${description}`);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock successful payment
    return {
      success: true,
      transactionId: `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      currency,
      gateway: "stripe",
      status: "completed",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Check if currency is supported
   * @param {string} currency - Currency code
   * @returns {boolean} True if supported
   */
  supports(currency) {
    return this.supportedCurrencies.includes(currency);
  },
};

/**
 * Paystack Payment Gateway
 * Supports: NGN, USD, GHS, ZAR, KES
 */
export const PaystackGateway = {
  name: "paystack",
  supportedCurrencies: ["NGN", "USD", "GHS", "ZAR", "KES"],

  /**
   * Process payment through Paystack
   * @param {Object} params - Payment parameters
   * @returns {Promise<Object>} Payment result
   */
  async processPayment({ amount, currency, paymentMethodId, description }) {
    console.log(`[PAYSTACK] Processing ${currency} ${amount} - ${description}`);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock successful payment
    return {
      success: true,
      transactionId: `paystack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      currency,
      gateway: "paystack",
      status: "completed",
      timestamp: new Date().toISOString(),
    };
  },

  supports(currency) {
    return this.supportedCurrencies.includes(currency);
  },
};

/**
 * Flutterwave Payment Gateway
 * Supports: NGN, USD, GHS, KES, ZAR, EGP
 */
export const FlutterwaveGateway = {
  name: "flutterwave",
  supportedCurrencies: ["NGN", "USD", "GHS", "KES", "ZAR", "EGP"],

  /**
   * Process payment through Flutterwave
   * @param {Object} params - Payment parameters
   * @returns {Promise<Object>} Payment result
   */
  async processPayment({ amount, currency, paymentMethodId, description }) {
    console.log(
      `[FLUTTERWAVE] Processing ${currency} ${amount} - ${description}`,
    );

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock successful payment
    return {
      success: true,
      transactionId: `flw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      currency,
      gateway: "flutterwave",
      status: "completed",
      timestamp: new Date().toISOString(),
    };
  },

  supports(currency) {
    return this.supportedCurrencies.includes(currency);
  },
};

/**
 * Get the best payment gateway for a currency
 * @param {string} currency - Currency code
 * @returns {Object} Payment gateway
 */
export function getGatewayForCurrency(currency) {
  // African currencies prefer Paystack/Flutterwave
  if (["NGN", "GHS", "KES", "ZAR"].includes(currency)) {
    return PaystackGateway.supports(currency)
      ? PaystackGateway
      : FlutterwaveGateway;
  }

  // EGP only supported by Flutterwave
  if (currency === "EGP") {
    return FlutterwaveGateway;
  }

  // Western currencies use Stripe
  return StripeGateway;
}

/**
 * Process payment with the appropriate gateway
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Amount to charge
 * @param {string} params.currency - Currency code
 * @param {string} params.paymentMethodId - Payment method ID
 * @param {string} params.description - Payment description
 * @param {string} params.preferredGateway - Preferred gateway (optional)
 * @returns {Promise<Object>} Payment result with USD conversion
 */
export async function processPayment({
  amount,
  currency,
  paymentMethodId,
  description,
  preferredGateway = null,
}) {
  // Select gateway
  let gateway;
  if (preferredGateway) {
    const gateways = {
      stripe: StripeGateway,
      paystack: PaystackGateway,
      flutterwave: FlutterwaveGateway,
    };
    gateway = gateways[preferredGateway];
    if (!gateway || !gateway.supports(currency)) {
      throw new Error(
        `Gateway ${preferredGateway} does not support ${currency}`,
      );
    }
  } else {
    gateway = getGatewayForCurrency(currency);
  }

  // Process payment
  const result = await gateway.processPayment({
    amount,
    currency,
    paymentMethodId,
    description,
  });

  // Add USD conversion
  const usdAmount = toUSD(amount, currency);

  return {
    ...result,
    usdAmount,
    originalAmount: amount,
    originalCurrency: currency,
  };
}

/**
 * Refund a payment
 * @param {Object} params - Refund parameters
 * @param {string} params.transactionId - Original transaction ID
 * @param {number} params.amount - Amount to refund
 * @param {string} params.currency - Currency code
 * @param {string} params.gateway - Gateway name
 * @returns {Promise<Object>} Refund result
 */
export async function refundPayment({
  transactionId,
  amount,
  currency,
  gateway,
}) {
  console.log(
    `[${gateway.toUpperCase()}] Refunding ${currency} ${amount} - Transaction: ${transactionId}`,
  );

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock successful refund
  return {
    success: true,
    refundId: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalTransactionId: transactionId,
    amount,
    currency,
    gateway,
    status: "refunded",
    timestamp: new Date().toISOString(),
  };
}
