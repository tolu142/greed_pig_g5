import { GameError } from "../logic/game.js";

export async function callInternalConvex(path, payload) {
  const convexUrl = process.env.CONVEX_URL;
  const secret = process.env.INTERNAL_API_SECRET;

  if (!convexUrl || !secret) {
    throw new Error("Internal Convex connection is not configured.");
  }

  const url = new URL(convexUrl);

  if (!url.hostname.endsWith(".convex.cloud")) {
    throw new Error("Invalid Convex deployment URL.");
  }

  url.hostname = url.hostname.replace(
    /\.convex\.cloud$/,
    ".convex.site"
  );

  const response = await fetch(new URL(path, url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-api-secret": secret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });



  if (!response.ok) {
    if (response.status === 409) {
      throw new GameError(
        "Game state changed. Please retry your move.",
        409
      );
    }

    throw new Error(
      `Convex request failed (${response.status}).`
    );
  }



  return await response.json();
}
