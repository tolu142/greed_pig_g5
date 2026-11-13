
export function requireTrustedOrigin(req, res, next) {
  const allowedOrigins = (
    process.env.CLIENT_ORIGIN || "http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim());

  const origin = req.get("origin");

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      error: "Request origin not allowed.",
    });
  }

  next();
}
