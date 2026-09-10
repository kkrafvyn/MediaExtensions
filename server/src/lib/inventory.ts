import type { Product } from "../db/schema.js";

/** Sellable quantity after unpaid holds. */
export function availableStock(product: Pick<Product, "stock" | "reserved" | "fulfillment">): number {
  if (product.fulfillment === "digital") return Number.POSITIVE_INFINITY;
  return Math.max(0, product.stock - (product.reserved ?? 0));
}

/** Shape products for the public storefront: `stock` = currently available units. */
export function toPublicProduct<T extends Product>(product: T) {
  const { reserved: _reserved, ...rest } = product;
  return {
    ...rest,
    stock:
      availableStock(product) === Number.POSITIVE_INFINITY
        ? product.stock
        : availableStock(product),
  };
}
