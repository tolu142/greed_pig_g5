
import { Router } from "express";
import { validateUsername, validatePassword, hashPassword,} from "../auth/passwords.js";
import { verifyPassword } from "../auth/passwords.js";
import { createSessionToken, hashSessionToken, createSessionExpiry, SESSION_DURATION_MS, } from "../auth/sessions.js";
import { callInternalConvex } from "../auth/convexClient.js";
import { requireTrustedOrigin } from "../auth/originGuard.js";
import { loginLimiter, registerLimiter } from "../auth/rateLimit.js";
//import { parse } from "node:querystring";

const router = Router();

router.post("/register", requireTrustedOrigin, registerLimiter, async (req, res, next) => {
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
        if (response.status === 409) {
            return res.status(409).json({
            error: "Username is already taken.",
            });
        }

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


router.post("/login", requireTrustedOrigin, loginLimiter, async (req, res, next) => {
  try {
    let username;

    try {
      username = validateUsername(req.body?.username);
      validatePassword(req.body?.password);
    } catch {
      return res.status(401).json({
        error: "Invalid username or password.",
      });
    }

    const credentials = await callInternalConvex(
      "/internal/player-credentials",
      { username }
    );

    if (!credentials.found) {
      return res.status(401).json({
        error: "Invalid username or password.",
      });
    }

    const passwordMatches = await verifyPassword(
      credentials.passwordHash,
      req.body.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid username or password.",
      });
    }

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = createSessionExpiry();

    await callInternalConvex("/internal/create-session", {
      playerId: credentials.playerId,
      tokenHash,
      expiresAt,
    });


    return res.json({
        message: "Login successful.",
        token,
        expiresAt,
        playerId: credentials.playerId,
        username: credentials.username,
    });
  } catch (error) {
    next(error);
  }
});



function getSessionToken(req) {
  const authorization = req.get("authorization");

  if (!authorization) return null;

  const match = /^Bearer ([a-f0-9]{64})$/i.exec(authorization);

  return match ? match[1].toLowerCase() : null;
}


router.post("/logout", requireTrustedOrigin, async (req, res, next) => {
  try {
    const token = getSessionToken(req);

    if (token) {
      await callInternalConvex("/internal/revoke-session", {
        tokenHash: hashSessionToken(token),
      });
    }

    return res.json({ message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
});


router.get("/me", async (req, res, next) => {
  try {
    const token = getSessionToken(req);

    if (!token) {
      return res.status(401).json({
        error: "Not authenticated.",
      });
    }

    const result = await callInternalConvex(
      "/internal/find-session",
      {
        tokenHash: hashSessionToken(token),
      }
    );

    if (!result.player) {
      return res.status(401).json({
        error: "Session expired or invalid.",
      });
    }

    return res.json({
      player: result.player,
    });
  } catch (error) {
    next(error);
  }
});


export default router;
