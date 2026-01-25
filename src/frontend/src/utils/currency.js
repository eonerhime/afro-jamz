// Currency conversion rates (relative to USD)
const RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1650,
  ZAR: 18.5,
  GHS: 15.8,
  KES: 129,
};

export function convertCurrency(amountUSD, targetCurrency) {
  if (!RATES[targetCurrency]) {
    return amountUSD;
  }
  return amountUSD * RATES[targetCurrency];
}

export function formatPrice(amount, currency) {
  const currencySymbols = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    NGN: "₦",
    ZAR: "R",
    GHS: "₵",
    KES: "KSh",
  };

  const symbol = currencySymbols[currency] || currency;
  
  // Format with appropriate decimals
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency === "NGN" || currency === "KES" ? 0 : 2,
    maximumFractionDigits: currency === "NGN" || currency === "KES" ? 0 : 2,
  }).format(amount);

  return `${symbol}${formatted}`;
}
