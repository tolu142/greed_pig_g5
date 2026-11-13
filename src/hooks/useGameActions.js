import { useRef } from "react";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import { createGame, rollDice, passTurn, stealPoints } from "src/utils/api";
import useAudio from "src/hooks/useAudio";
import addPlayerSound from "src/sound_effect/add_player.mp3";
import loseSound from "src/sound_effect/lose_sound.mp3";
import celebrationSound from "src/sound_effect/celebration.mp3";

// All the game actions (roll, pass, steal) live here so the desktop and mobile
// dice sections share one copy. The rules themselves run on the server.
export default function useGameActions() {
  const {
    playerData,
    setPlayerData,
    maxPoints,
    gameId,
    setGameId,
    setCurrentPlayer,
    setIsGameOver,
    setDiceValue,
    setApiError,
    setSteal,
  } = useLiveGameContext();

  const addPlayerAudio = useAudio(addPlayerSound);
  const loseAudio = useAudio(loseSound);
  const celebrationAudio = useAudio(celebrationSound);
  const isPassing = useRef(false);
  const isStealing = useRef(false);

  // Copy the server's points, turn and steal status into the UI state
  // (avatars and names stay local).
  function applyServerState(game) {
    setPlayerData((prev) =>
      prev.map((player, i) => ({
        ...player,
        running_points: game.players[i]?.running_points ?? 0,
        total_points: game.players[i]?.total_points ?? 0,
      }))
    );
    setCurrentPlayer(game.currentPlayer);

    setSteal((prev) => {
      const ready = Boolean(game.stealReady);
      const justUnlocked = ready && !prev.ready;
      return {
        ...prev,
        streak: game.rollStreak ?? 0,
        at: game.stealAt ?? prev.at,
        ready,
        // pop up (with the intro animation) the moment a steal unlocks
        open: ready ? (justUnlocked ? true : prev.open) : false,
        intro: justUnlocked ? true : ready ? prev.intro : false,
      };
    });
  }

  function finishIfOver(game, delay) {
    if (!game.isGameOver) return;
    setTimeout(() => {
      celebrationAudio?.play();
      setIsGameOver(true);
    }, delay);
  }

  // If the page was refreshed, the game id is gone, so make a new game on the fly.
  async function ensureGameId() {
    if (gameId) return gameId;
    const game = await createGame(playerData, maxPoints);
    setGameId(game.id);
    return game.id;
  }

  function reportError(message) {
    setApiError(message);
  }

  // Called by <Dice /> when the player clicks. The server decides the number.
  async function requestRoll() {
    setApiError("");
    const id = await ensureGameId();
    return rollDice(id);
  }

  // Called by <Dice /> once the rolling animation ends.
  function handleFinalDiceValue({ roll, game }) {
    setDiceValue(roll);
    applyServerState(game);

    if (roll === 1) loseAudio?.play();
    finishIfOver(game, 1000);
  }

  async function handlePass(isRolling) {
    if (isRolling || isPassing.current) return;
    isPassing.current = true;
    setApiError("");
    try {
      const id = await ensureGameId();
      const { game } = await passTurn(id);
      addPlayerAudio?.play();
      applyServerState(game);
    } catch (e) {
      setApiError(e.message);
    } finally {
      isPassing.current = false;
    }
  }

  // Called by the steal pop-up when the player picks someone to steal from.
  async function handleSteal(targetIndex) {
    if (isStealing.current) return;
    isStealing.current = true;
    setApiError("");
    try {
      const id = await ensureGameId();
      const { game } = await stealPoints(id, targetIndex);
      addPlayerAudio?.play();
      applyServerState(game);

      // keep the pop-up open for a moment to show what was stolen
      setSteal((prev) => ({
        ...prev,
        open: true,
        intro: false,
        done: { from: game.lastSteal.from, amount: game.lastSteal.amount },
      }));
      setTimeout(() => setSteal((prev) => ({ ...prev, open: false, done: null })), 2200);

      finishIfOver(game, 2600);
    } catch (e) {
      setApiError(e.message);
    } finally {
      isStealing.current = false;
    }
  }

  return { requestRoll, handleFinalDiceValue, handlePass, handleSteal, reportError };
}
