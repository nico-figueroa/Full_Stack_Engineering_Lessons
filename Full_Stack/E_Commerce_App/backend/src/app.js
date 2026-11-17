import express from "express"; // Import the Express framework
import fs from "fs"; // File system module for reading files
import path from "path"; // Path module for handling and transforming file paths
import { fileURLToPath } from "url"; // Utility to convert file URL to path
import cookieParser from "cookie-parser"; // Middleware for parsing cookies
import cors from "cors"; // Middleware for cross-origin requests from the separately deployed frontend
import logger from "morgan"; // HTTP request logger middleware
import swaggerUi from "swagger-ui-express"; // Swagger UI for API documentation
import pool from "./db.js"; // Database connection pool

// ROUTES
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import productsRouter from "./routes/products.js";
import cartsRouter from "./routes/carts.js";
import ordersRouter from "./routes/orders.js";
import paymentsRouter from "./routes/payments.js";

import { errorHandler } from "./middleware/errorMiddleware.js";
import { handleStripeWebhook } from "./controllers/paymentsController.js";

const app = express();
const directory = path.dirname(fileURLToPath(import.meta.url));
const openApiDocument = JSON.parse(
  fs.readFileSync(
    path.join(directory, "..", "openapi.ecommerce.v1.json"),
    "utf8",
  ),
);

// Allow the frontend (local dev + deployed Render static site) to call this API
// with an Authorization header. CORS_ORIGIN accepts a comma-separated list.
const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(logger("dev"));
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header, e.g. curl/server-to-server) and allow-listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);

// The Stripe webhook must be mounted with the raw body BEFORE express.json()
// parses the request, because Stripe's signature verification needs the
// exact, unmodified request bytes.
app.post(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  const docs = `${req.protocol}://${req.get("host")}/api-docs`;
  if (req.accepts(["json", "html"]) === "html") {
    return res.type("html").send(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Nomadant Tech Store API</title>
<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;color:#0f172a}a{color:#4f46e5;font-weight:600}</style></head>
<body><h1>Nomadant Tech Store API is running</h1>
<p>Explore the interactive API documentation: <a href="/api-docs">/api-docs</a></p></body></html>`,
    );
  }
  res.json({ message: "Nomadant Tech Store API is running", docs });
});

app.get("/openapi.json", (req, res) => {
  res.json(openApiDocument);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: "Nomadant Tech Store API Documentation",
  }),
);

// API routes
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/products", productsRouter);
app.use("/carts", cartsRouter);
app.use("/orders", ordersRouter);
app.use("/payments", paymentsRouter);

// Error handling middleware
app.use(errorHandler);

// DB connection test (skipped during tests to avoid logging after the test run finishes)
if (process.env.NODE_ENV !== "test") {
  pool.connect().then(async (client) => {
    try {
      await client.query("SELECT NOW()");
      client.release();
      console.log("Database connection established");
    } catch (err) {
      client.release();
      console.error("Database connection error", err);
    }
  });
}

export default app;
