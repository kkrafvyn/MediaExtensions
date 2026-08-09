import serverless from "serverless-http";
import app from "../server/dist/app.js";

export default serverless(app);
