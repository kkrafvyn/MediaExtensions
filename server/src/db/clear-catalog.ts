import "dotenv/config";
import { db } from "../db/index.js";
import { cartItems, products } from "../db/schema.js";

/** Removes catalog products (cart lines cascade). Order items keep null product refs. */
async function clearCatalog() {
  const removedCart = await db.delete(cartItems).returning({ id: cartItems.id });
  const removedProducts = await db.delete(products).returning({ id: products.id, name: products.name });
  console.log(`Removed ${removedCart.length} cart line(s).`);
  console.log(`Removed ${removedProducts.length} product(s):`);
  for (const p of removedProducts) console.log(` - ${p.name}`);
}

clearCatalog()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
