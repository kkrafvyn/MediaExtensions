import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { toast } from "../../components/Toast";

export function useStaffResource<T>(path: string, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    return api<T>(path)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Request failed");
        setLoading(false);
      });
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, loading, error, reload };
}

export function staffListPath(base: string, q: string, page: number, limit = 25) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  params.set("page", String(page));
  params.set("limit", String(limit));
  return `${base}?${params.toString()}`;
}

export async function staffMutate<T>(
  path: string,
  init: RequestInit,
  onSuccess?: (res: T) => void,
): Promise<T> {
  try {
    const res = await api<T>(path, init);
    onSuccess?.(res);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    toast(message);
    throw err;
  }
}
