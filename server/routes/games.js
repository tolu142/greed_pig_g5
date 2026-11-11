import { Router } from "express";
import {
  GameError,
  validateNewGame,
  createGame,
  rollDie,
  applyRoll,
  applyPass,
} from "../logic/game.js";
import { createGameRecord, loadGame, saveGame } from "../db.js";
import { hashSessionToken } from "../auth/sessions.js";
import { callInternalConvex } from "../auth/convexClient.js";

const router = Router();

// Express 4 does not catch errors thrown in async handlers, so wrap them.
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// What we send to the browser: the state plus the game's id.
const toPublic = (id, state) => ({ id, ...state });

async function getOr404(id) {
  const state = await loadGame(id);
  if (!state) throw new GameError("Game not found.", 404);
  return state;
}


async function getOptionalPlayer(req) {
  const authorization = req.get("authorization");

  // No login: continue as a guest.
  if (!authorization) return null;

  const match = /^Bearer ([a-f0-9]{64})$/i.exec(authorization);

  if (!match) {
    throw new GameError("Invalid authentication token.", 401);
  }

  const tokenHash = hashSessionToken(match[1].toLowerCase());

  const result = await callInternalConvex(
    "/internal/find-session",
    { tokenHash }
  );

  if (!result.player) {
    throw new GameError("Session expired or invalid.", 401);
  }

  return result.player;
}


// Create a game

 // Create a game
router.post(
  "/",
  handle(async (req, res) => {
    const input = validateNewGame(req.body);
    const state = createGame(input);

    const player = await getOptionalPlayer(req);

    let id;

    if (player) {
      // Logged-in player: create game and account link together.
      const result = await callInternalConvex(
        "/internal/create-linked-game",
        {
          playerId: player.playerId,
          state,
        }
      );

      id = result.gameId;
    } else {
      // Guest: preserve the original game creation behaviour.
      id = await createGameRecord(state);
    }

    res.status(201).json(toPublic(id, state));
  })
);


// Read a game
router.get(
  "/:id",
  handle(async (req, res) => {
    const state = await getOr404(req.params.id);
    res.json(toPublic(req.params.id, state));
  })
);

// Roll the dice. The server rolls, applies the rules and saves the result.
router.post(
  "/:id/roll",
  handle(async (req, res) => {
    const state = await getOr404(req.params.id);
    const roll = rollDie();
    const next = applyRoll(state, roll);
    await saveGame(req.params.id, next);
    res.json({ roll, game: toPublic(req.params.id, next) });
  })
);

// Pass: bank the points and end the turn
router.post(
  "/:id/pass",
  handle(async (req, res) => {
    const state = await getOr404(req.params.id);
    const next = applyPass(state);
    await saveGame(req.params.id, next);
    res.json({ game: toPublic(req.params.id, next) });
  })
);

export default router;
