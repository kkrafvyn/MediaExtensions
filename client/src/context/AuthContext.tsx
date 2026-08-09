import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import type { Cart, User } from "../types";

type AuthContextValue = {
  user: User | null;
  cart: Cart | null;
  loading: boolean;
  refresh: () => Promise<void>;
  refreshCart: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const emptyCart: Cart = {
  cartId: "",
  items: [],
  subtotalPesewas: 0,
  needsShipping: false,
  itemCount: 0,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCart = useCallback(async () => {
    const data = await api<Cart>("/api/cart");
    setCart(data);
  }, []);

  const refresh = useCallback(async () => {
    const me = await api<{ user: User | null }>("/api/auth/me");
    setUser(me.user);
    await refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    refresh()
      .catch(() => {
        setUser(null);
        setCart(emptyCart);
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo(
    () => ({ user, cart, loading, refresh, refreshCart, setUser }),
    [user, cart, loading, refresh, refreshCart],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
