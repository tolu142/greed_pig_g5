import React, { useEffect, useState } from "react";
import Navbar from "src/components/Navbar";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import PlayerTable from "./components/PlayerTable";
import StatsSection from "./components/StatsSection";
import GameOver from "./GameOver";
import DiceSection from "./components/DiceSection";
import StatsSectionMobile from "./components/StatsSectionMobile";
import CurrentPlayerMobile from "./components/CurrentPlayerMobile";
import DiceSectionMobile from "./components/DiceSectionMobile";
import ErrorBanner from "src/components/ErrorBanner";
import StealModal from "src/components/StealModal";
import TutorialDialog from "src/components/TutorialDialog";

const TUTORIAL_SEEN_KEY = "greedyPigTutorialSeen";

export default function LiveGame() {
  const {
    playerData,
    currentPlayer,
    isGameOver,
    setIsContinue,
    liveAnnouncement,
  } = useLiveGameContext();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setIsContinue(true)
  }, [])

  // Show the tutorial the first time someone opens the game screen.
  useEffect(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) setShowTutorial(true);
    } catch {
      // storage blocked: the help button still works
    }
  }, []);

  function closeTutorial() {
    setShowTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        isGameOver ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }

      // Pop-ups (the tutorial, the steal picker) handle their own keys.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }

      const target = event.target;

      // Never interfere with typing.
      if (
        target?.isContentEditable ||
        target?.closest?.("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      // Buttons and links already react to Space on their own, so leave Space alone there.
      const onInteractive = Boolean(
        target?.closest?.("button, a, [role='button']")
      );

      if (event.code === "Space" && !onInteractive) {
        const rollButton = Array.from(
          document.querySelectorAll('[data-keyboard-action="roll"]')
        ).find(
          (button) =>
            button.getClientRects().length > 0 && !button.disabled
        );

        if (rollButton) {
          event.preventDefault();
          rollButton.click();
        }
      }

      // P is not a normal activation key, so it works even when a button has focus
      // (for example right after clicking the dice with the mouse).
      if (event.key.toLowerCase() === "p") {
        const passButton = Array.from(
          document.querySelectorAll('[data-keyboard-action="pass"]')
        ).find(
          (button) =>
            button.getClientRects().length > 0 && !button.disabled
        );

        if (passButton) {
          event.preventDefault();
          passButton.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGameOver]);

  
  return (
    <div className="md:grid md:grid-cols-[minmax(auto,_200px)_1fr_minmax(auto,_200px)] lg:grid-cols-[minmax(auto,_250px)_1fr_minmax(auto,_250px)] xl:grid-cols-[auto_1fr_minmax(auto,_300px)] relative">
      <ErrorBanner />
      <StealModal />
      {showTutorial && <TutorialDialog onClose={closeTutorial} />}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Keyboard shortcut hint (desktop only) */}
      <p className="pointer-events-none fixed bottom-3 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-4 rounded-full bg-[#000000b0] px-4 py-1 text-xs text-white md:flex">
        <span>
          <kbd className="rounded border border-white px-1">Space</kbd> roll
        </span>
        <span>
          <kbd className="rounded border border-white px-1">P</kbd> pass
        </span>
      </p>

      {/* Reopen the tutorial any time */}
      <button
        type="button"
        onClick={() => setShowTutorial(true)}
        aria-label="Open the tutorial"
        className="fixed bottom-3 right-3 z-30 h-10 w-10 rounded-full border bg-[#D30CBD] font-bold text-white duration-300 hover:scale-105"
      >
        ?
      </button>

      <DiceSection />
      <div className=" space-y-2 p-2">
        <Navbar />
        <PlayerTable playerData={playerData} currentPlayer={currentPlayer} />
      </div>
      <CurrentPlayerMobile playerData={playerData} currentPlayer={currentPlayer}/>
      <DiceSectionMobile />

      <StatsSection playerData={playerData} currentPlayer={currentPlayer} />
      <StatsSectionMobile playerData={playerData} currentPlayer={currentPlayer} />
      {isGameOver ? (
        <GameOver playerData={playerData} currentPlayer={currentPlayer} setIsContinue={setIsContinue} />
      ) : (
        <></>
      )}
    </div>
  );
}
