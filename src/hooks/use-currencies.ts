"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/db/client";
import type { Currency } from "@/lib/types";

const FALLBACK: Currency[] = ["SDG", "USD", "EUR", "AED"];

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<Currency[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const db = createClient();
    db
      .from("exchange_rates")
      .select("currency")
      .order("currency")
      .then(({ data }) => {
        if (!alive) return;
        const list = ((data ?? []) as Array<{ currency: Currency }>).map(
          (r) => r.currency
        );
        if (list.length > 0) {
          // ensure SDG first
          list.sort((a, b) => (a === "SDG" ? -1 : b === "SDG" ? 1 : a.localeCompare(b)));
          setCurrencies(list);
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { currencies, loading };
}
