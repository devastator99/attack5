// server/src/index.ts
import { Hono } from "hono";
import uploadRoute from "./routes/upload";

const app = new Hono();

// register routes
app.route("/api", uploadRoute);

export default app;