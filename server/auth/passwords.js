
import argon2 from "argon2";

export function validateUsername(username) {
  if (typeof username !== "string") {
    throw new Error("Username must be a string.");
  }

  const normalized = username.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    throw new Error(
      "Username must be 3-20 characters and contain only letters, numbers, or underscores."
    );
  }

  return normalized;
}

export function validatePassword(password) {
  if (typeof password !== "string") {
    throw new Error("Password must be a string.");
  }

  if (password.length < 12 || password.length > 128) {
    throw new Error("Password must be between 12 and 128 characters.");
  }

  return password;
}

export async function hashPassword(password) {
  validatePassword(password);

  return await argon2.hash(password, {
    type: argon2.argon2id,
  });
}

export async function verifyPassword(hash, password) {
  if (typeof password !== "string") return false;

  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
