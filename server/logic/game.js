import { randomInt } from "node:crypto";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const MIN_POINTS = 25;
export const MAX_POINTS = 1000;

// How many successful rolls in a row (in one turn) unlock a steal.
// STEAL_STREAK can be lowered in server/.env while testing. Leave it unset for the real game.
const streakFromEnv = Number.parseInt(process.env.STEAL_STREAK, 10);
export const STEAL_STREAK = streakFromEnv > 0 ? streakFromEnv : 8;

// An error that carries an HTTP status, so routes can answer with the right code.
export class GameError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// The dice. This is the ONLY place a roll is produced, and it runs on the server.
export function rollDie() {
  return randomInt(1, 7); // 1 to 6
}

// Checks the body of POST /games and returns clean values, or throws a 400.
export function validateNewGame(body) {
  const { players, maxPoints } = body ?? {};

  if (!Array.isArray(players) || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new GameError(`A game needs between ${MIN_PLAYERS} and ${MAX_PLAYERS} players.`);
  }
  if (!Number.isInteger(maxPoints) || maxPoints < MIN_POINTS || maxPoints > MAX_POINTS) {
    throw new GameError(`Max score must be a whole number between ${MIN_POINTS} and ${MAX_POINTS}.`);
  }

  const cleanPlayers = players.map((p, i) => {
    const raw = typeof p?.name === "string" ? p.name.trim() : "";
    return { name: raw.slice(0, 30) || `Player ${i + 1}` };
  });

  return { players: cleanPlayers, maxPoints };
}

export function createGame({ players, maxPoints }) {
  return {
    maxPoints,
    currentPlayer: 0,
    isGameOver: false,
    winner: null,
    lastRoll: 0,
    rollStreak: 0, // successful rolls in a row this turn
    stealAt: STEAL_STREAK,
    stealReady: false, // true once the streak is reached and someone has points to steal
    lastSteal: null, // { from, to, amount } for the most recent steal
    players: players.map((p) => ({
      name: p.name,
      running_points: 0,
      total_points: 0,
    })),
  };
}

function assertPlayable(state) {
  if (state.isGameOver) {
    throw new GameError("This game is already over. Start a new one.", 409);
  }
}

// Is there anyone (other than the player whose turn it is) with banked points to steal?
function hasStealTargets(state) {
  return state.players.some((p, i) => i !== state.currentPlayer && p.total_points > 0);
}

// Rules: roll a 1 and you lose this turn's points and the turn passes.
// Any other number is added to your running points. Reach the max score and you win.
// Roll STEAL_STREAK good rolls in a row and you unlock a steal.
// Pure function: returns a NEW state, never edits the one it was given.
export function applyRoll(state, roll) {
  assertPlayable(state);
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new GameError("Invalid dice value.", 500);
  }

  const next = structuredClone(state);
  const player = next.players[next.currentPlayer];
  next.lastRoll = roll;
  next.lastSteal = null;

  if (roll === 1) {
    player.running_points = 0;
    next.rollStreak = 0;
    next.stealReady = false;
    next.currentPlayer = (next.currentPlayer + 1) % next.players.length;
  } else {
    player.running_points += roll;
    next.rollStreak = (state.rollStreak ?? 0) + 1;

    if (player.running_points + player.total_points >= next.maxPoints) {
      next.isGameOver = true;
      next.winner = next.currentPlayer;
      next.stealReady = false;
    } else {
      next.stealReady = next.rollStreak >= (next.stealAt ?? STEAL_STREAK) && hasStealTargets(next);
    }
  }
  return next;
}

// Pass: bank the running points and hand the turn to the next player.
export function applyPass(state) {
  assertPlayable(state);

  const next = structuredClone(state);
  const player = next.players[next.currentPlayer];
  player.total_points += player.running_points;
  player.running_points = 0;
  next.rollStreak = 0;
  next.stealReady = false;
  next.lastSteal = null;
  next.currentPlayer = (next.currentPlayer + 1) % next.players.length;
  return next;
}

// Steal: the player whose turn it is takes ALL of another player's banked points.
// The stolen points are added to the thief's running points for this turn, so a
// later roll of 1 would lose them. The thief keeps their turn, and the streak restarts.
export function applySteal(state, targetIndex) {
  assertPlayable(state);

  if (!state.stealReady) {
    throw new GameError("Steal isn't available right now.", 409);
  }
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= state.players.length) {
    throw new GameError("Choose a valid player to steal from.");
  }
  if (targetIndex === state.currentPlayer) {
    throw new GameError("You can't steal from yourself.");
  }
  if (state.players[targetIndex].total_points <= 0) {
    throw new GameError("That player has no points to steal.");
  }

  const next = structuredClone(state);
  const thief = next.players[next.currentPlayer];
  const victim = next.players[targetIndex];

  const amount = victim.total_points;
  victim.total_points = 0;
  thief.running_points += amount;

  next.lastSteal = { from: targetIndex, to: next.currentPlayer, amount };
  next.rollStreak = 0;
  next.stealReady = false;

  if (thief.running_points + thief.total_points >= next.maxPoints) {
    next.isGameOver = true;
    next.winner = next.currentPlayer;
  }
  return next;
}
