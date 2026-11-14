import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  applyRoll,
  applyPass,
  applySteal,
  rollDie,
  validateNewGame,
  GameError,
  STEAL_STREAK,
} from "./game.js";

const newGame = (maxPoints = 50) =>
  createGame({ players: [{ name: "A" }, { name: "B" }], maxPoints });

test("rollDie always returns 1 to 6", () => {
  for (let i = 0; i < 1000; i++) {
    const r = rollDie();
    assert.ok(Number.isInteger(r) && r >= 1 && r <= 6);
  }
});

test("a non-1 roll adds to running points and keeps the turn", () => {
  const g = applyRoll(newGame(), 4);
  assert.equal(g.players[0].running_points, 4);
  assert.equal(g.currentPlayer, 0);
});

test("rolling a 1 wipes running points and passes the turn", () => {
  let g = applyRoll(newGame(), 5);
  g = applyRoll(g, 1);
  assert.equal(g.players[0].running_points, 0);
  assert.equal(g.players[0].total_points, 0);
  assert.equal(g.currentPlayer, 1);
});

test("passing banks points and passes the turn", () => {
  let g = applyRoll(newGame(), 6);
  g = applyPass(g);
  assert.equal(g.players[0].total_points, 6);
  assert.equal(g.players[0].running_points, 0);
  assert.equal(g.currentPlayer, 1);
});

test("turn order wraps around", () => {
  let g = applyPass(applyPass(newGame()));
  assert.equal(g.currentPlayer, 0);
});

test("reaching max score ends the game and sets the winner", () => {
  let g = newGame(25);
  for (let i = 0; i < 5; i++) g = applyRoll(g, 5);
  assert.equal(g.isGameOver, true);
  assert.equal(g.winner, 0);
});

test("no moves allowed after the game is over", () => {
  let g = newGame(25);
  for (let i = 0; i < 5; i++) g = applyRoll(g, 5);
  assert.throws(() => applyRoll(g, 3), GameError);
  assert.throws(() => applyPass(g), GameError);
});

test("applyRoll does not mutate the old state", () => {
  const before = newGame();
  applyRoll(before, 6);
  assert.equal(before.players[0].running_points, 0);
});

test("validation rejects bad input", () => {
  assert.throws(() => validateNewGame({}), GameError);
  assert.throws(() => validateNewGame({ players: [{ name: "A" }], maxPoints: 100 }), GameError);
  assert.throws(
    () => validateNewGame({ players: [{}, {}], maxPoints: "100" }),
    GameError
  );
  assert.throws(() => validateNewGame({ players: [{}, {}], maxPoints: 5 }), GameError);
});

test("validation cleans names and fills blanks", () => {
  const { players } = validateNewGame({
    players: [{ name: "  Ada  " }, { name: "" }],
    maxPoints: 100,
  });
  assert.equal(players[0].name, "Ada");
  assert.equal(players[1].name, "Player 2");
});

// ---------- Steal ----------

// Three players. Player 1 (index 1) has `victimPoints` banked. It is player 0's turn.
function stealGame(victimPoints = 30, maxPoints = 500) {
  const g = createGame({ players: [{ name: "A" }, { name: "B" }, { name: "C" }], maxPoints });
  g.players[1].total_points = victimPoints;
  return g;
}

function rollTimes(game, times, value = 2) {
  let g = game;
  for (let i = 0; i < times; i++) g = applyRoll(g, value);
  return g;
}

test("the roll streak counts successful rolls in a row", () => {
  const g = rollTimes(stealGame(), 3);
  assert.equal(g.rollStreak, 3);
});

test("rolling a 1 resets the streak", () => {
  let g = rollTimes(stealGame(), STEAL_STREAK - 1);
  g = applyRoll(g, 1);
  assert.equal(g.rollStreak, 0);
  assert.equal(g.stealReady, false);
});

test("passing resets the streak", () => {
  const g = applyPass(rollTimes(stealGame(), 3));
  assert.equal(g.rollStreak, 0);
});

test("steal unlocks on the last roll of the streak, not before", () => {
  const almost = rollTimes(stealGame(), STEAL_STREAK - 1);
  assert.equal(almost.stealReady, false);
  const ready = applyRoll(almost, 2);
  assert.equal(ready.stealReady, true);
});

test("steal does not unlock if nobody has points to steal", () => {
  const g = rollTimes(stealGame(0), STEAL_STREAK);
  assert.equal(g.rollStreak, STEAL_STREAK);
  assert.equal(g.stealReady, false);
});

test("steal takes ALL of the victim's points and adds them to the thief's running points", () => {
  const ready = rollTimes(stealGame(30), STEAL_STREAK);
  const runningBefore = ready.players[0].running_points;

  const g = applySteal(ready, 1);

  assert.equal(g.players[1].total_points, 0);
  assert.equal(g.players[0].running_points, runningBefore + 30);
  assert.deepEqual(g.lastSteal, { from: 1, to: 0, amount: 30 });
});

test("after a steal the thief keeps the turn and the streak restarts", () => {
  const g = applySteal(rollTimes(stealGame(), STEAL_STREAK), 1);
  assert.equal(g.currentPlayer, 0);
  assert.equal(g.rollStreak, 0);
  assert.equal(g.stealReady, false);
});

test("stolen points are lost again if the thief then rolls a 1", () => {
  let g = applySteal(rollTimes(stealGame(30), STEAL_STREAK), 1);
  g = applyRoll(g, 1);
  assert.equal(g.players[0].running_points, 0);
  assert.equal(g.players[1].total_points, 0);
});

test("steal is refused when it has not been unlocked", () => {
  assert.throws(() => applySteal(stealGame(), 1), GameError);
});

test("steal rejects yourself, bad indexes and players with no points", () => {
  const ready = rollTimes(stealGame(30), STEAL_STREAK);
  assert.throws(() => applySteal(ready, 0), GameError); // yourself
  assert.throws(() => applySteal(ready, 7), GameError); // out of range
  assert.throws(() => applySteal(ready, -1), GameError);
  assert.throws(() => applySteal(ready, "1"), GameError); // not a number
  assert.throws(() => applySteal(ready, 2), GameError); // player C has 0 points
});

test("stolen points count towards winning", () => {
  const ready = rollTimes(stealGame(99, 100), STEAL_STREAK);
  const g = applySteal(ready, 1);
  assert.equal(g.isGameOver, true);
  assert.equal(g.winner, 0);
});

test("no stealing after the game is over", () => {
  const over = applySteal(rollTimes(stealGame(99, 100), STEAL_STREAK), 1);
  assert.throws(() => applySteal(over, 1), GameError);
});

test("applySteal does not mutate the old state", () => {
  const ready = rollTimes(stealGame(30), STEAL_STREAK);
  applySteal(ready, 1);
  assert.equal(ready.players[1].total_points, 30);
});

test("games saved before steal existed still work", () => {
  const old = stealGame();
  delete old.rollStreak;
  delete old.stealAt;
  delete old.stealReady;
  delete old.lastSteal;
  const g = applyRoll(old, 4);
  assert.equal(g.rollStreak, 1);
});
