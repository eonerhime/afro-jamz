import { useState, useEffect } from "react";

export function useCurrency() {
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem("currency") || "USD";
  });

  useEffect(() => {
    localStorage.setItem("currency", currency);
  }, [currency]);

  return { currency, setCurrency };
}
