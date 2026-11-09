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

  // Achievements unlocked by players
  achievements: defineTable({
    playerId: v.id("players"),
    achievementKey: v.string(),
    unlockedAt: v.number(),
  }).index("by_player", ["playerId"]),
});
