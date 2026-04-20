"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Currency } from "@/lib/types";

const FALLBACK: Currency[] = ["SDG", "USD", "EUR", "SAR"];

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<Currency[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase
      .from("exchange_rates")
      .select("currency")
      .order("currency")
      .then(({ data }) => {
        if (!alive) return;
        const list = (data ?? []).map((r) => r.currency as Currency);
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
