import React, { useEffect } from "react";
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

export default function LiveGame() {
  const {
    playerData,
    currentPlayer,
    isGameOver,
    setIsContinue,
    liveAnnouncement,
  } = useLiveGameContext();
  useEffect(() => {
    setIsContinue(true)
  }, [])

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

      const target = event.target;

      // Don't interfere with typing or normal keyboard navigation.
      if (
        target?.isContentEditable ||
        target?.closest?.(
          "input, textarea, select, button, a, [role='button'], [contenteditable='true']"
        )
      ) {
        return;
      }

      if (event.code === "Space") {
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
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>
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
