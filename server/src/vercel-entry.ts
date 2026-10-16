import app from "./app.js";
import { warmDb } from "./db/index.js";

await warmDb();
export default app;
