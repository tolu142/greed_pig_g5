
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/internal/register-player",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
      return new Response("Server not configured", { status: 503 });
    }

    const suppliedSecret = request.headers.get("x-internal-api-secret");

    if (!suppliedSecret || suppliedSecret !== expectedSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (
      typeof body.username !== "string" ||
      typeof body.passwordHash !== "string"
    ) {
      return new Response("Invalid request", { status: 400 });
    }

    if (!/^[a-z0-9_]{3,20}$/.test(body.username)) {
      return new Response("Invalid username", { status: 400 });
    }

    try {
      const playerId = await ctx.runMutation(
        internal.players.createWithPassword,
        {
          username: body.username,
          passwordHash: body.passwordHash,
        }
      );

      return Response.json({ playerId }, { status: 201 });
    } catch (error) {
      console.error("Registration failed:", error);
      return new Response("Registration failed", { status: 400 });
    }
  }),
});


http.route({
  path: "/internal/player-credentials",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedSecret = process.env.INTERNAL_API_SECRET;
    const suppliedSecret = request.headers.get("x-internal-api-secret");

    if (
      !expectedSecret ||
      !suppliedSecret ||
      suppliedSecret !== expectedSecret
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (
      typeof body.username !== "string" ||
      !/^[a-z0-9_]{3,20}$/.test(body.username)
    ) {
      return new Response("Invalid username", { status: 400 });
    }

    const player = await ctx.runQuery(
      internal.players.findByUsername,
      { username: body.username }
    );

    if (!player) {
      return Response.json({ found: false });
    }

    const credentials = await ctx.runQuery(
      internal.players.getCredentials,
      { playerId: player._id }
    );

    if (!credentials) {
      return Response.json({ found: false });
    }

    return Response.json({
      found: true,
      playerId: player._id,
      username: player.username,
      passwordHash: credentials.passwordHash,
    });
  }),
});


const verifyInternalRequest = (request) => {
  const expected = process.env.INTERNAL_API_SECRET;
  const supplied = request.headers.get("x-internal-api-secret");

  return Boolean(
    expected &&
    supplied &&
    supplied === expected
  );
};

// Create a session after successful login
http.route({
  path: "/internal/create-session",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!verifyInternalRequest(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { playerId, tokenHash, expiresAt } =
        await request.json();

      if (
        typeof playerId !== "string" ||
        typeof tokenHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(tokenHash) ||
        typeof expiresAt !== "number" ||
        !Number.isFinite(expiresAt)
      ) {
        return new Response("Invalid request", { status: 400 });
      }

      const sessionId = await ctx.runMutation(
        internal.sessions.create,
        { playerId, tokenHash, expiresAt }
      );

      return Response.json({ sessionId }, { status: 201 });
    } catch (error) {
      console.error("Session creation failed:", error);
      return new Response("Session creation failed", { status: 400 });
    }
  }),
});

// Look up an existing session
http.route({
  path: "/internal/find-session",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!verifyInternalRequest(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { tokenHash } = await request.json();

      if (
        typeof tokenHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(tokenHash)
      ) {
        return new Response("Invalid request", { status: 400 });
      }

      const player = await ctx.runQuery(
        internal.sessions.findValid,
        { tokenHash }
      );

      return Response.json({ player });
    } catch (error) {
      console.error("Session lookup failed:", error);
      return new Response("Session lookup failed", { status: 400 });
    }
  }),
});

// Revoke a session during logout
http.route({
  path: "/internal/revoke-session",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!verifyInternalRequest(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { tokenHash } = await request.json();

      if (
        typeof tokenHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(tokenHash)
      ) {
        return new Response("Invalid request", { status: 400 });
      }

      const result = await ctx.runMutation(
        internal.sessions.revoke,
        { tokenHash }
      );

      return Response.json(result);
    } catch (error) {
      console.error("Session revocation failed:", error);
      return new Response("Session revocation failed", { status: 400 });
    }
  }),
});


 // Retrieve a player's XP, level, stats and achievements
http.route({
  path: "/internal/player-profile-by-id",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!verifyInternalRequest(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (typeof body.playerId !== "string") {
      return new Response("Invalid player ID", { status: 400 });
    }

    try {
      const profile = await ctx.runQuery(
        internal.progression.getProfile,
        { playerId: body.playerId }
      );

      if (!profile) {
        return new Response("Player not found", { status: 404 });
      }

      return Response.json({ profile });
    } catch (error) {
      console.error("Profile lookup failed:", error);
      return new Response("Profile lookup failed", { status: 400 });
    }
  }),
});


 // Create a game linked to a registered player.
http.route({
  path: "/internal/create-linked-game",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!verifyInternalRequest(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (
      typeof body.playerId !== "string" ||
      !body.state ||
      typeof body.state !== "object"
    ) {
      return new Response("Invalid request", { status: 400 });
    }

    try {
      const gameId = await ctx.runMutation(
        internal.gameParticipants.createLinkedGame,
        {
          playerId: body.playerId,
          state: body.state,
          playerIndex: body.playerIndex,
        }
      );

      return Response.json({ gameId }, { status: 201 });
    } catch (error) {
      console.error("Linked game creation failed:", error);
      return new Response("Game creation failed", { status: 400 });
    }
  }),
});


 // Award XP for a completed game
http.route({
  path: "/internal/award-game",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!verifyInternalRequest(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (typeof body.gameId !== "string") {
      return new Response("Invalid game ID", { status: 400 });
    }

    try {
      const result = await ctx.runMutation(
        internal.progression.awardGame,
        { gameId: body.gameId }
      );

      return Response.json({ result });
    } catch (error) {
      console.error("Game reward failed:", error);
      return new Response("Game reward failed", { status: 400 });
    }
  }),
});


http.route({
  path: "/internal/save-move",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!verifyInternalRequest(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (
      typeof body?.gameId !== "string" ||
      !body.previousState ||
      typeof body.previousState !== "object" ||
      Array.isArray(body.previousState) ||
      !body.nextState ||
      typeof body.nextState !== "object" ||
      Array.isArray(body.nextState) ||
      !["roll", "pass"].includes(body.action) ||
      (body.action === "roll" &&
        (!Number.isInteger(body.roll) ||
          body.roll < 1 ||
          body.roll > 6))
    ) {
      return new Response("Invalid request", { status: 400 });
    }

    try {
      const result = await ctx.runMutation(
        internal.progression.saveMoveAndAward,
        {
          gameId: body.gameId,
          previousState: body.previousState,
          nextState: body.nextState,
          action: body.action,
          ...(body.action === "roll" ? { roll: body.roll } : {}),
        }
      );

      return Response.json(result);
    } catch (error) {
      console.error("Game move failed:", error);

      if (
        error.message?.includes("Game state changed") ||
        error.message?.includes("already finished")
      ) {
        return new Response("Game state conflict", { status: 409 });
      }

      return new Response("Game move failed", { status: 400 });
    }
  }),
});


 // Retrieve progression details for a validated player session
http.route({
  path: "/internal/player-profile",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!verifyInternalRequest(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { tokenHash } = await request.json();

      if (
        typeof tokenHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(tokenHash)
      ) {
        return new Response("Invalid request", { status: 400 });
      }

      const sessionPlayer = await ctx.runQuery(
        internal.sessions.findValid,
        { tokenHash }
      );

      if (!sessionPlayer) {
        return new Response("Session expired or invalid", {
          status: 401,
        });
      }

      const profile = await ctx.runQuery(
        internal.progression.getProfile,
        { playerId: sessionPlayer.playerId }
      );

      if (!profile) {
        return new Response("Player not found", { status: 404 });
      }

      return Response.json({ profile });
    } catch (error) {
      console.error("Profile lookup failed:", error);
      return new Response("Profile lookup failed", { status: 500 });
    }
  }),
});


export default http;
