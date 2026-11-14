import { useEffect, useRef } from "react";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import useGameActions from "src/hooks/useGameActions";

const nameOf = (player) => player.name || player.tag;

// The steal pop-up. Three screens: unlock animation -> pick a player -> result.
export default function StealModal() {
  const { steal, setSteal, playerData, currentPlayer } = useLiveGameContext();
  const { handleSteal } = useGameActions();
  const dialogRef = useRef(null);

  // After the unlock animation plays for a moment, move on to choosing a player.
  useEffect(() => {
    if (!steal.open || !steal.intro) return;
    const timer = setTimeout(() => setSteal((prev) => ({ ...prev, intro: false })), 1800);
    return () => clearTimeout(timer);
  }, [steal.open, steal.intro]);

  // Move focus into the pop-up when it opens, and give it back when it closes.
  useEffect(() => {
    if (!steal.open) return;
    const opener = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (opener && typeof opener.focus === "function" && document.contains(opener)) {
        opener.focus();
      }
    };
  }, [steal.open]);

  // Once the player list is showing, focus the first player you can steal from.
  useEffect(() => {
    if (!steal.open || steal.intro || steal.done) return;
    dialogRef.current?.querySelector("button:not([disabled])")?.focus();
  }, [steal.open, steal.intro, steal.done]);

  if (!steal.open) return null;

  const targets = playerData
    .map((player, index) => ({ player, index }))
    .filter(({ index }) => index !== currentPlayer);

  const close = () => setSteal((prev) => ({ ...prev, open: false }));

  function handleKeyDown(event) {
    // Keys pressed in this pop-up must not reach the game's Space / P shortcuts.
    event.stopPropagation();

    if (event.key === "Escape") {
      close();
      return;
    }

    // Keep Tab inside the pop-up.
    if (event.key === "Tab") {
      const buttons = Array.from(
        dialogRef.current.querySelectorAll("button:not([disabled])")
      );
      if (buttons.length === 0) {
        event.preventDefault();
        return;
      }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="steal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#000000c0] p-4 text-white"
      onKeyDown={handleKeyDown}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md space-y-4 rounded-2xl border border-[#ffffff40] bg-[#111111] p-6 text-center focus:outline-none"
      >
        {steal.done ? (
          <div aria-live="polite" className="space-y-2">
            <p className="animate-bounce text-6xl">🐷💰</p>
            <h2 id="steal-title" className="pri-font text-3xl">
              Stolen!
            </h2>
            <p className="text-lg">
              You took {steal.done.amount} points from {nameOf(playerData[steal.done.from])}.
            </p>
          </div>
        ) : steal.intro ? (
          <div aria-live="assertive" className="space-y-2 py-6">
            <p className="animate-bounce text-6xl">🐷</p>
            <h2 id="steal-title" className="pri-font animate-pulse text-4xl text-[#D30CBD]">
              STEAL UNLOCKED!
            </h2>
            <p className="text-lg">{steal.at} rolls in a row without a 1.</p>
          </div>
        ) : (
          <>
            <h2 id="steal-title" className="pri-font text-3xl">
              Who do you steal from?
            </h2>
            <p className="text-sm text-[#ffffffb0]">
              You take all of their banked points and add them to your turn. Roll a 1 and you lose them.
            </p>
            <ul className="space-y-2">
              {targets.map(({ player, index }) => {
                const hasPoints = player.total_points > 0;
                return (
                  <li key={player.id ?? index}>
                    <button
                      disabled={!hasPoints}
                      onClick={() => handleSteal(index)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#ffffff40] bg-[#ffffff10] p-3 text-left duration-300 hover:scale-[1.02] hover:bg-[#ffffff20] active:scale-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                    >
                      <span className="flex items-center gap-3">
                        {player.avatar ? (
                          <img src={player.avatar} alt="" className="h-10 w-10 object-contain" />
                        ) : null}
                        <span className="capitalize">{nameOf(player)}</span>
                      </span>
                      <span className="font-semibold">
                        {hasPoints ? `${player.total_points} pts` : "No points"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button onClick={close} className="text-sm underline hover:text-[#D30CBD]">
              Not now, keep rolling
            </button>
          </>
        )}
      </section>
    </div>
  );
}
