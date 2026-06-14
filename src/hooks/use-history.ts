import { useCallback, useEffect, useState } from "react";
import type { InvestigationReport } from "@/lib/investigate.functions";

const KEY = "olho-do-mundo:history:v1";
const MAX = 30;

export type HistoryEntry = {
  id: string;
  query: string;
  categoria: string;
  timestamp: number;
  report: InvestigationReport;
};

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setEntries(JSON.parse(raw) as HistoryEntry[]);
    } catch {
      // ignore
    }
  }, []);

  const persist = (next: HistoryEntry[]) => {
    setEntries(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const add = useCallback(
    (entry: Omit<HistoryEntry, "id" | "timestamp">) => {
      const item: HistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };
      const next = [item, ...entries].slice(0, MAX);
      persist(next);
      return item;
    },
    [entries],
  );

  const remove = useCallback(
    (id: string) => {
      persist(entries.filter((e) => e.id !== id));
    },
    [entries],
  );

  const clear = useCallback(() => persist([]), []);

  return { entries, add, remove, clear };
}
