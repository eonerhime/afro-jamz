import { useContext, createContext } from "react";

// Export the context so CurrencyProvider can use it
export const CurrencyContext = createContext();

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
