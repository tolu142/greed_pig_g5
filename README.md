# Greedy Pig
Name- Matric Number 

Raymond Okolo - 23120112041 (feature-playerprogression)

Obiora-Okafo Chukwukamalu - 23120112036 (feature-kamaluaccessibility)

Toluwani Toluhi - 23120112053 (feature- steal-powerup, backend-setup)

**Live demo:** https://greed-pig-g5.vercel.app
**Repository:** https://github.com/tolu142/greed_pig_g5

## The three improvements
1. **Steal power-up.** After 8 successful rolls in a row in one turn (no 1), a player can steal all of another player's banked points. The stolen points are added to the thief's turn points, so a 1 still loses them.
2. **Accounts and progression.** Register and log in (passwords are hashed, sessions use tokens), earn XP for finishing and winning games, gain levels and unlock achievements. Guests can still play without an account.
3. **Accessibility and experience.** An interactive tutorial, keyboard controls (Space to roll, P to pass), and screen-reader support (labels and live announcements).

## Backend
- Express API (`server/`) with Convex as the database. All game rules (dice, scoring, streaks and steals) run on the server so players cannot cheat.
- Endpoints: `POST /games`, `GET /games/:id`, `POST /games/:id/roll`, `POST /games/:id/pass`, `POST /games/:id/steal`, and `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/profile`.
- Input validation on every request, and unit tests for the game rules (`npm test` in `server`).

## How to Run it locally
Requirements: Node 18 or newer, and a free Convex account.
1. `git clone https://github.com/tolu142/greed_pig_g5.git`, then `cd greed_pig_g5`
2. `npm install`, then `cd server` and `npm install`
3. Copy `.env.example` to `.env` in the project root, and `server/.env.example` to `server/.env`
4. In `server`, run `npx convex dev` and log in. Put the URL it gives you in `server/.env` as `CONVEX_URL`
5. Make a random secret, set it as `INTERNAL_API_SECRET` in `server/.env`, and also run `npx convex env set INTERNAL_API_SECRET <the same value>`
6. In `server`, run `npm run dev`. In the project root, in a second terminal, run `npm run dev`
7. Open the address Vite prints (usually http://localhost:5173)

## Deployment
Frontend on Vercel, API on Render, database on Convex.