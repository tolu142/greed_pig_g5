
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const COMPLETION_XP = 50;
const WIN_BONUS_XP = 100;
const XP_PER_LEVEL = 200;


function assertUnchangedGameState(previous, current) {
  if (JSON.stringify(previous) !== JSON.stringify(current)) {
    throw new Error(
      "Game state changed. Please retry your move."
    );
  }
}


async function awardGameRewards(ctx, gameId) {
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
}

export const awardGame = internalMutation({
  args: {
    gameId: v.id("games"),
  },

  handler: async (ctx, { gameId }) => {
    return await awardGameRewards(ctx, gameId);
  },
});


function validateMove(previous, next, action, roll) {
  if (!previous || previous.isGameOver) {
    throw new Error("Game has already finished.");
  }

  const expected = structuredClone(previous);
  const playerIndex = expected.currentPlayer;
  const player = expected.players[playerIndex];

  if (!player) {
    throw new Error("Invalid current player.");
  }

  if (action === "roll") {
    if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
      throw new Error("Invalid dice roll.");
    }

    expected.lastRoll = roll;

    if (roll === 1) {
      player.running_points = 0;
      expected.currentPlayer =
        (playerIndex + 1) % expected.players.length;
    } else {
      player.running_points += roll;

      if (
        player.running_points + player.total_points >=
        expected.maxPoints
      ) {
        expected.isGameOver = true;
        expected.winner = playerIndex;
      }
    }
  } else if (action === "pass") {
    player.total_points += player.running_points;
    player.running_points = 0;
    expected.currentPlayer =
      (playerIndex + 1) % expected.players.length;
  } else {
    throw new Error("Invalid game action.");
  }

  if (JSON.stringify(expected) !== JSON.stringify(next)) {
    throw new Error("Move does not match the game rules.");
  }
}



export const saveMoveAndAward = internalMutation({
  args: {
    gameId: v.id("games"),
    previousState: v.any(),
    nextState: v.any(),
    action: v.union(v.literal("roll"), v.literal("pass")),
    roll: v.optional(v.number()),
  },

  handler: async (
    ctx,
    { gameId, previousState, nextState, action, roll }
  ) => {
    const game = await ctx.db.get(gameId);

    if (!game) {
      throw new Error("Game not found.");
    }

    if (game.state.isGameOver) {
      throw new Error("Game has already finished.");
    }

    // Reject moves based on an outdated game state.
    assertUnchangedGameState(previousState, game.state);

    // Verify the move follows the original game rules.
    validateMove(game.state, nextState, action, roll);

    // Save the move within the same transaction.
    await ctx.db.patch(gameId, { state: nextState });

    // Award XP atomically if this move finishes the game.
    if (nextState.isGameOver) {
      const reward = await awardGameRewards(ctx, gameId);
      return { reward };
    }

    return { reward: null };
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
