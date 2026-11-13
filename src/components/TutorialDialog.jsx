import { useEffect, useRef, useState } from "react";

export const TUTORIAL_STEPS = [
  {
    title: "Welcome to Greedy Pig!",
    description:
      "Greedy Pig is a dice game where players take turns rolling a die to collect points. Be careful: rolling a 1 makes you lose all the points accumulated during that turn!",
  },
  {
    title: "Set up your game",
    description:
      "Choose your target score, enter the number of players, and provide their names. When everyone is ready, click Start Game.",
  },
  {
    title: "Roll the dice",
    description:
      "During your turn, click the dice or press the Space key to roll. Any result other than 1 adds points to your running turn total.",
  },
  {
    title: "Watch out for 1!",
    description:
      "If you roll a 1, you lose all the points accumulated during that turn, and your turn ends automatically.",
  },
  {
    title: "Know when to pass",
    description:
      "You can choose to pass before rolling a 1. Click PASS or press P to add your running turn points to your total score and end your turn.",
  },
  {
    title: "Unlock the Steal power-up",
    description:
      "Roll 8 times in a row without a 1 and the STEAL button appears. Pick another player and take all of their banked points. The stolen points are added to your turn, so rolling a 1 still loses them.",
  },
  {
    title: "Win the game!",
    description:
      "The first player to reach or exceed the target score wins the game. Good luck!",
  },
];

// The interactive tutorial pop-up. It is used on the How To Play page and on the game screen.
export default function TutorialDialog({ onClose }) {
  const [step, setStep] = useState(0);
  const dialogRef = useRef(null);
  const isLastStep = step === TUTORIAL_STEPS.length - 1;

  // Move focus into the dialog when it opens, and give it back to whatever opened it when it closes.
  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, []);

  function handleKeyDown(event) {
    // Keys pressed inside the tutorial must not reach the game's shortcuts (Space, P).
    event.stopPropagation();

    if (event.key === "Escape") {
      onClose();
      return;
    }

    // Keep Tab inside the dialog while it is open.
    if (event.key === "Tab") {
      const buttons = Array.from(
        dialogRef.current.querySelectorAll("button:not([disabled])")
      );
      if (buttons.length === 0) return;

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
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-description"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-[#252525] border border-white rounded-xl p-6 md:p-10 max-w-xl w-full text-white text-center space-y-6"
      >
        <p className="text-sm text-gray-300">
          Step {step + 1} of {TUTORIAL_STEPS.length}
        </p>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Step {step + 1} of {TUTORIAL_STEPS.length}: {TUTORIAL_STEPS[step].title}
        </div>

        <h2 id="tutorial-title" className="pri-font text-2xl md:text-3xl">
          {TUTORIAL_STEPS[step].title}
        </h2>

        <p id="tutorial-description" className="text-base md:text-lg">
          {TUTORIAL_STEPS[step].description}
        </p>

        <div className="flex justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-white rounded-lg hover:bg-white/10"
            aria-label="Skip tutorial and close"
          >
            Skip tutorial
          </button>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 border border-white rounded-lg hover:bg-white/10"
              >
                Back
              </button>
            )}

            {isLastStep ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#D30CBD] rounded-lg hover:bg-[#ad0a9b]"
              >
                Finish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="px-4 py-2 bg-[#D30CBD] rounded-lg hover:bg-[#ad0a9b]"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
