
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

export default http;
