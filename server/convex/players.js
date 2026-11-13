
import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Look up a player by username.
// Internal functions cannot be called directly by public Convex clients.
export const findByUsername = internalQuery({
  args: { username: v.string() },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_username", (q) =>
        q.eq("username", args.username)
      )
      .unique();
  },
});

// Create a player profile and store its password hash.
// This function must only be called through trusted server-side code.
export const createWithPassword = internalMutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("players")
      .withIndex("by_username", (q) =>
        q.eq("username", args.username)
      )
      .unique();

    if (existing) {
      throw new Error("Username already exists.");
    }

    const playerId = await ctx.db.insert("players", {
      username: args.username,
      xp: 0,
      level: 1,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      createdAt: Date.now(),
    });

    await ctx.db.insert("playerCredentials", {
      playerId,
      passwordHash: args.passwordHash,
    });

    return playerId;
  },
});

// Retrieve a stored password hash for server-side verification.
export const getCredentials = internalQuery({
  args: { playerId: v.id("players") },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerCredentials")
      .withIndex("by_player", (q) =>
        q.eq("playerId", args.playerId)
      )
      .unique();
  },
});
