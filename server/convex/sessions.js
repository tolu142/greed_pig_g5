
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    playerId: v.id("players"),
    tokenHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.expiresAt <= Date.now()) {
      throw new Error("Session expiry must be in the future.");
    }

    return await ctx.db.insert("playerSessions", {
      playerId: args.playerId,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
    });
  },
});

export const findValid = internalQuery({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("playerSessions")
      .withIndex("by_token_hash", (q) =>
        q.eq("tokenHash", args.tokenHash)
      )
      .unique();

    if (!session || session.expiresAt <= Date.now()) {
      return null;
    }

    const player = await ctx.db.get(session.playerId);

    if (!player) {
      return null;
    }

    return {
      playerId: session.playerId,
      username: player.username,
      level: player.level,
      xp: player.xp,
    };
  },
});

export const revoke = internalMutation({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("playerSessions")
      .withIndex("by_token_hash", (q) =>
        q.eq("tokenHash", args.tokenHash)
      )
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});
