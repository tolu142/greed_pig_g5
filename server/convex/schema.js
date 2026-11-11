import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// One table. Each document holds the whole game state built in logic/game.js.
export default defineSchema({
  games: defineTable({
    state: v.any(),
  }),

   // Player accounts and progression
  players: defineTable({
    username: v.string(),
    xp: v.number(),
    level: v.number(),
    gamesPlayed: v.number(),
    wins: v.number(),
    losses: v.number(),
    createdAt: v.number(),
  }).index("by_username", ["username"]),

  // Private password credentials
  playerCredentials: defineTable({
    playerId: v.id("players"),
    passwordHash: v.string(),
  }).index("by_player", ["playerId"]),

  // Login sessions
  playerSessions: defineTable({
    playerId: v.id("players"),
    tokenHash: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_player", ["playerId"]),

  // Achievements unlocked by players
  achievements: defineTable({
    playerId: v.id("players"),
    achievementKey: v.string(),
    unlockedAt: v.number(),
  }).index("by_player", ["playerId"]),

  // Tracks rewarded games to prevent duplicate XP
  gameRewards: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    xpAwarded: v.number(),
    won: v.boolean(),
    awardedAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"]),

  // Links an authenticated account to Player 1 in a game
  gameParticipants: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    playerIndex: v.number(),
    linkedAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"]),

});
