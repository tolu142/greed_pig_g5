import { useLiveGameContext } from "src/context/useLiveGameContext";

// Shows how close the player is to unlocking a steal, and the STEAL button once it is unlocked.
export default function StealControls({ disabled }) {
  const { steal, setSteal } = useLiveGameContext();
  const progress = Math.min(steal.streak, steal.at);
  const percent = (progress / steal.at) * 100;

  return (
    <div className="w-full text-white">
      <div className="mb-1 flex justify-between text-xs lg:text-sm">
        <span>Steal streak</span>
        <span>
          {progress}/{steal.at}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Rolls in a row without a 1"
        aria-valuemin={0}
        aria-valuemax={steal.at}
        aria-valuenow={progress}
        className="h-2 w-full overflow-hidden rounded-full bg-[#ffffff20]"
      >
        <div className="h-full bg-[#D30CBD] duration-300" style={{ width: `${percent}%` }} />
      </div>

      {steal.ready && (
        <button
          disabled={disabled}
          onClick={() => setSteal((prev) => ({ ...prev, open: true, intro: false }))}
          className="mt-2 w-full animate-pulse rounded-lg border bg-[#D30CBD] py-2 font-semibold text-white duration-300 hover:scale-105 active:scale-100 disabled:opacity-50"
        >
          STEAL
        </button>
      )}
    </div>
  );
}
