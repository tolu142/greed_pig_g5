
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TOKEN_KEY = "greedy_pig_session_token";

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const saveAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// Centralized API request handler.
async function request(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;

  try {
    res = await fetch(`${API}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Can't reach the game server. Check your internet and try again."
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.error || "Something went wrong. Please try again."
    );
  }

  return data;
}

// Authentication

export const registerPlayer = (username, password) =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const loginPlayer = async (username, password) => {
  const result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  saveAuthToken(result.token);
  return result;
};

export const logoutPlayer = async () => {
  try {
    return await request("/auth/logout", {
      method: "POST",
    });
  } finally {
    clearAuthToken();
  }
};

export const getMyProfile = () => request("/auth/me");


export const getPlayerProgression = () =>
  request("/auth/profile");

// Existing game functionality

export const toPlayerList = (playerData) =>
  playerData.map((p) => ({
    name: p.name || p.tag || "",
  }));


export const createGame = (
  playerData,
  maxPoints,
  playerIndex = 0
) =>
  request("/games", {
    method: "POST",
    body: JSON.stringify({
      players: toPlayerList(playerData),
      maxPoints: Number(maxPoints),
      playerIndex,
    }),
  });


export const getGame = (id) => request(`/games/${id}`);

export const rollDice = (id) =>
  request(`/games/${id}/roll`, {
    method: "POST",
  });

export const passTurn = (id) =>
  request(`/games/${id}/pass`, {
    method: "POST",
  });

// Wake sleeping server.
export const wakeServer = () => {
  fetch(`${API}/health`).catch(() => {});
};
