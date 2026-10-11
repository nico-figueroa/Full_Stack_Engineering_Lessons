export default function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err?.name === "ZodError") {
    return res.status(400).json({ error: "Invalid request", details: err.issues });
  }
  if (err?.code === "23505") return res.status(409).json({ error: "An account with this email already exists" });
  if (err?.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "An unexpected server error occurred" });
}
