
import { randomBytes, createHash } from "node:crypto";

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw new Error("Invalid session token.");
  }

  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiry() {
  return Date.now() + SESSION_DURATION_MS;
}
