
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Link a registered account to Player 1 when a game is created.
// Kept for compatibility with existing functionality.
export const linkPlayer = internalMutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },

  handler: async (ctx, { gameId, playerId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found.");

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found.");

    const existing = await ctx.db
      .query("gameParticipants")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .first();

    if (existing) {
      if (existing.playerId !== playerId) {
        throw new Error("Game already belongs to another account.");
      }

      return existing._id;
    }

    if (game.state.isGameOver) {
      throw new Error("Cannot link a completed game.");
    }

    return await ctx.db.insert("gameParticipants", {
      gameId,
      playerId,
      playerIndex: 0,
      linkedAt: Date.now(),
    });
  },
});

// Look up the registered account associated with a game.
export const getByGame = internalQuery({
  args: {
    gameId: v.id("games"),
  },

  handler: async (ctx, { gameId }) => {
    return await ctx.db
      .query("gameParticipants")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .first();
  },
});

// Create a game and link the selected player to their account
// in one database transaction.
export const createLinkedGame = internalMutation({
  args: {
    state: v.any(),
    playerId: v.id("players"),
    playerIndex: v.number(),
  },

  handler: async (ctx, { state, playerId, playerIndex }) => {
    const player = await ctx.db.get(playerId);

    if (!player) {
      throw new Error("Player not found.");
    }

    // Validate the starting game state.
    if (
      !state ||
      state.isGameOver !== false ||
      state.currentPlayer !== 0 ||
      state.winner !== null ||
      !Array.isArray(state.players) ||
      state.players.length < 2 ||
      state.players.length > 8
    ) {
      throw new Error("Invalid starting game state.");
    }

    // Validate the selected player's position.
    if (
      !Number.isInteger(playerIndex) ||
      playerIndex < 0 ||
      playerIndex >= state.players.length
    ) {
      throw new Error("Invalid player selection.");
    }

    // Create the game.
    const gameId = await ctx.db.insert("games", {
      state,
    });

    // Link the logged-in account to the selected player.
    await ctx.db.insert("gameParticipants", {
      gameId,
      playerId,
      playerIndex,
      linkedAt: Date.now(),
    });

    return gameId;
  },
});
