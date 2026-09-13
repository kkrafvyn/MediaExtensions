import "dotenv/config";
import { db } from "./index.js";
import { cartItems, products, repairServices } from "./schema.js";

/** Removes catalog products and repair services. Order history keeps null refs. */
async function clearCatalog() {
  const cartRows = await db.select().from(cartItems);
  const productRows = await db.select().from(products);
  const serviceRows = await db.select().from(repairServices);

  await db.delete(cartItems);
  await db.delete(products);
  await db.delete(repairServices);

  console.log(`Removed ${cartRows.length} cart line(s).`);
  console.log(`Removed ${productRows.length} product(s).`);
  console.log(`Removed ${serviceRows.length} repair service(s):`);
  for (const service of serviceRows) console.log(` - ${service.name}`);
}

clearCatalog()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
