import { useCurrency } from "../hooks/useCurrency";

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
    { code: "ZAR", name: "South African Rand", symbol: "R" },
    { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
    { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  ];

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
    >
      {currencies.map((curr) => (
        <option key={curr.code} value={curr.code}>
          {curr.symbol} {curr.code}
        </option>
      ))}
    </select>
  );
}
