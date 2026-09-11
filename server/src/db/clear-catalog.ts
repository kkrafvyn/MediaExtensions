import "dotenv/config";
import { db } from "./index.js";
import { cartItems, products, repairServices } from "./schema.js";

/** Removes catalog products and repair services. Order history keeps null refs. */
async function clearCatalog() {
  const removedCart = await db.delete(cartItems).returning({ id: cartItems.id });
  const removedProducts = await db.delete(products).returning({ id: products.id, name: products.name });
  const removedServices = await db
    .delete(repairServices)
    .returning({ id: repairServices.id, name: repairServices.name });
  console.log(`Removed ${removedCart.length} cart line(s).`);
  console.log(`Removed ${removedProducts.length} product(s).`);
  console.log(`Removed ${removedServices.length} repair service(s):`);
  for (const s of removedServices) console.log(` - ${s.name}`);
}

clearCatalog()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
