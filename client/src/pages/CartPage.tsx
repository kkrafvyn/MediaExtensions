import { Link } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function CartPage() {
  const { cart, refreshCart } = useAuth();

  async function updateQty(id: string, quantity: number) {
    await api(`/api/cart/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    await refreshCart();
  }

  async function remove(id: string) {
    await api(`/api/cart/items/${id}`, { method: "DELETE" });
    await refreshCart();
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="page container">
        <h1>Bag</h1>
        <div className="empty">
          Your bag is empty. <Link to="/shop">Continue shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page container">
      <h1>Bag</h1>
      <div className="split split-2">
        <div className="panel stack">
          {cart.items.map((line) => (
            <div key={line.id} className="line-item">
              <div>
                <strong>{line.product.name}</strong>
                <div className="meta">
                  {line.product.fulfillment} · {formatGhs(line.product.pricePesewas)}
                </div>
                <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-light"
                    onClick={() => updateQty(line.id, Math.max(1, line.quantity - 1))}
                  >
                    −
                  </button>
                  <span style={{ alignSelf: "center" }}>{line.quantity}</span>
                  <button
                    className="btn btn-light"
                    onClick={() => updateQty(line.id, line.quantity + 1)}
                  >
                    +
                  </button>
                  <button className="btn btn-light" onClick={() => remove(line.id)}>
                    Remove
                  </button>
                </div>
              </div>
              <strong>{formatGhs(line.lineTotalPesewas)}</strong>
            </div>
          ))}
        </div>
        <div className="panel stack">
          <div className="line-item">
            <span>Subtotal</span>
            <strong>{formatGhs(cart.subtotalPesewas)}</strong>
          </div>
          {cart.needsShipping && (
            <p className="meta">Shipping calculated at checkout (Accra or rest of Ghana).</p>
          )}
          <Link to="/checkout" className="btn btn-primary" style={{ textAlign: "center" }}>
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
