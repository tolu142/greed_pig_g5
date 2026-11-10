
import { Router } from "express";
import {
  validateUsername,
  validatePassword,
  hashPassword,
} from "../auth/passwords.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const username = validateUsername(req.body?.username);
    const password = validatePassword(req.body?.password);

    const convexUrl = process.env.CONVEX_URL;
    const internalSecret = process.env.INTERNAL_API_SECRET;

    if (!convexUrl || !internalSecret) {
      return res.status(503).json({
        error: "Registration service is not configured.",
      });
    }

    const passwordHash = await hashPassword(password);

    const siteUrl = new URL(convexUrl);
    siteUrl.hostname = siteUrl.hostname.replace(
      /\.convex\.cloud$/,
      ".convex.site"
    );

    const response = await fetch(
      new URL("/internal/register-player", siteUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-secret": internalSecret,
        },
        body: JSON.stringify({ username, passwordHash }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        error: "Unable to complete registration.",
      });
    }

    const player = await response.json();

    return res.status(201).json({
      message: "Account created successfully.",
      playerId: player.playerId,
      username,
    });
  } catch (error) {
    if (
      error.message?.startsWith("Username must") ||
      error.message?.startsWith("Password must")
    ) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
});

export default router;
