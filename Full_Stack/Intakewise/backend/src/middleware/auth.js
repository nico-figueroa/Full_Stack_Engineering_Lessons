import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tokenType !== "access") return res.status(401).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Session expired or token is invalid" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action" });
    }
    next();
  };
}
