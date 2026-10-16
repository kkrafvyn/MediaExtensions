import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { SiteMeta } from "../types";
import { SiteMetaContext, type SiteMetaContextValue } from "./SiteMetaContext";

export function SiteMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<SiteMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    api<SiteMeta>("/api/meta")
      .then((data) => {
        setMeta(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load store info");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value: SiteMetaContextValue = { meta, loading, error, reload };

  return <SiteMetaContext.Provider value={value}>{children}</SiteMetaContext.Provider>;
}
