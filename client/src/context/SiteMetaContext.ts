import { createContext, useContext } from "react";
import type { SiteMeta } from "../types";

export type SiteMetaContextValue = {
  meta: SiteMeta | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export const SiteMetaContext = createContext<SiteMetaContextValue | null>(null);

export function useSiteMeta(): SiteMetaContextValue {
  const ctx = useContext(SiteMetaContext);
  if (!ctx) {
    throw new Error("useSiteMeta must be used within SiteMetaProvider");
  }
  return ctx;
}

export function useSiteMetaOptional(): SiteMetaContextValue | null {
  return useContext(SiteMetaContext);
}
