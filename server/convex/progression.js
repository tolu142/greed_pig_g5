
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const COMPLETION_XP = 50;
const WIN_BONUS_XP = 100;
const XP_PER_LEVEL = 200;

export const awardGame = internalMutation({
  args: {
    gameId: v.id("games"),
  },

  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);

    if (!game || !game.state.isGameOver) {
      throw new Error("Game has not finished.");
    }

    const winner = game.state.winner;

    if (
      !Number.isInteger(winner) ||
      winner < 0 ||
      winner >= game.state.players.length
    ) {
      throw new Error("Invalid game winner.");
    }

    const participant = await ctx.db
      .query("gameParticipants")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .first();

    if (!participant) {
      return { rewarded: false, reason: "Guest game." };
    }

    const existingReward = await ctx.db
      .query("gameRewards")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .first();

    if (existingReward) {
      return { rewarded: false, reason: "Already rewarded." };
    }

    const player = await ctx.db.get(participant.playerId);
    if (!player) throw new Error("Player not found.");

    const won = winner === participant.playerIndex;
    const xpAwarded = COMPLETION_XP + (won ? WIN_BONUS_XP : 0);

    const xp = player.xp + xpAwarded;
    const level = 1 + Math.floor(xp / XP_PER_LEVEL);
    const gamesPlayed = player.gamesPlayed + 1;
    const wins = player.wins + (won ? 1 : 0);
    const losses = player.losses + (won ? 0 : 1);

    await ctx.db.patch(player._id, {
      xp,
      level,
      gamesPlayed,
      wins,
      losses,
    });

    await ctx.db.insert("gameRewards", {
      gameId,
      playerId: player._id,
      xpAwarded,
      won,
      awardedAt: Date.now(),
    });

    const existingAchievements = await ctx.db
      .query("achievements")
      .withIndex("by_player", (q) => q.eq("playerId", player._id))
      .collect();

    const unlocked = new Set(
      existingAchievements.map((a) => a.achievementKey)
    );

    const milestones = [
      ["first_game", gamesPlayed >= 1],
      ["first_win", wins >= 1],
      ["five_games", gamesPlayed >= 5],
      ["three_wins", wins >= 3],
    ];

    const newAchievements = [];

    for (const [key, earned] of milestones) {
      if (earned && !unlocked.has(key)) {
        await ctx.db.insert("achievements", {
          playerId: player._id,
          achievementKey: key,
          unlockedAt: Date.now(),
        });

        newAchievements.push(key);
      }
    }

    return {
      rewarded: true,
      xpAwarded,
      xp,
      level,
      gamesPlayed,
      wins,
      losses,
      newAchievements,
    };
  },
});

export const getProfile = internalQuery({
  args: {
    playerId: v.id("players"),
  },

  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) return null;

    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect();

    return {
      username: player.username,
      xp: player.xp,
      level: player.level,
      gamesPlayed: player.gamesPlayed,
      wins: player.wins,
      losses: player.losses,
      achievements: achievements.map((a) => ({
        key: a.achievementKey,
        unlockedAt: a.unlockedAt,
      })),
    };
  },
});
