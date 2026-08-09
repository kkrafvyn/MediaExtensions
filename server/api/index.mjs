import serverless from "serverless-http";
import app from "../dist/app.js";

export default serverless(app);
