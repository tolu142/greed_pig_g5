
import bcrypt from "bcryptjs";

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

  if (password.length < 8 || password.length > 72) {
    throw new Error("Password must be between 8 and 72 characters.");
  }

  return password;
}

export async function hashPassword(password) {
  validatePassword(password);
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(hash, password) {
  if (typeof password !== "string") return false;

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
