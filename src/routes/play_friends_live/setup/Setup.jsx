
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "src/components/Navbar";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import AddPlayerButton from "./components/AddPlayerButton";
import NameInput from "./components/NameInput";
import ImageSlider from "./components/ImageSlider";
import { getInitialPlayerData } from "src/utils/live_game/getInitialData";
import SoundSwitch from "src/components/SoundSwitch";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import ErrorBanner from "src/components/ErrorBanner";
import {
  createGame,
  getGame,
  getAuthToken,
} from "src/utils/api";

function LiveGameSetup() {
  const {
    playerData,
    maxPoints,
    setMaxPoints,
    setPlayerData,
    setDiceValue,
    setIsGameOver,
    setCurrentPlayer,
    isContinue,
    gameId,
    setGameId,
    setApiError,
  } = useLiveGameContext();

  const navigate = useNavigate();

  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);

  const isLoggedIn = Boolean(getAuthToken());

  const { preloadSrcList, pigPetNames } = useGreedyPigContext();

  const pigs = preloadSrcList.filter((pig) => pig.includes("pig"));

  async function setupPlayers(resume) {
    setApiError("");

    try {
      let canResume = false;

      if (resume && gameId) {
        try {
          const saved = await getGame(gameId);

          canResume =
            !saved.isGameOver &&
            saved.players.length === playerData.length;
        } catch {
          canResume = false;
        }
      }

      if (!canResume) {
        // This will be extended to send selectedPlayerIndex
        // once the backend accepts player selection.
        const game = await createGame(
          playerData,
          maxPoints,
          isLoggedIn ? selectedPlayerIndex : 0
        );

        setGameId(game.id);

        const newPlayerData = playerData.map((player) => ({
          ...player,
          running_points: 0,
          total_points: 0,
        }));

        setDiceValue(0);
        setIsGameOver(false);
        setCurrentPlayer(0);
        setPlayerData(newPlayerData);
      }

      navigate("/live-game/game");
    } catch (error) {
      setApiError(error.message);
    }
  }

  function clearsPlayers() {
    setPlayerData(getInitialPlayerData(pigs, pigPetNames));
    setSelectedPlayerIndex(0);
  }

  return (
    <>
      <main>
        <ErrorBanner />
        <Navbar />

        <div className="flex flex-col items-center gap-8 text-white px-[5%] md:px-[10%] py-4">
          <section className="flex flex-col">
            <label htmlFor="max-score">Max Score</label>

            <input
              id="max-score"
              type="number"
              min={25}
              value={maxPoints}
              onChange={(e) => {
                setMaxPoints(e.target.value);
              }}
              className="p-2 bg-[#ffffff20] border rounded-md min-w-[5%] w-[250px]"
              required
            />
          </section>

          <div className="w-full gap-2 flow-root">
            <section className="max-h-[350px] w-full overflow-y-auto border rounded-lg p-4 grid grid-cols-fluid justify-center gap-4 bg-[#ffffff10]">
              {[...playerData].map((player, index) => (
                <div
                  key={player.id}
                  className="flex flex-col w-full items-center gap-2 p-2 rounded-lg border border-[#FFFFFF40] hover:border-[#ffffff80] duration-300"
                >
                  <NameInput player={player} index={index} />
                  <ImageSlider player={player} index={index} />
                </div>
              ))}

              <AddPlayerButton />
            </section>

            <button
              className="text-right text-xs p-2 bg-[#D30C0C40] text-white w-fit border border-[#D30C0C80] duration-300 hover:bg-[#D30C0C80] rounded float-right mt-2"
              onClick={clearsPlayers}
            >
              Clear Players
            </button>

            <SoundSwitch />
          </div>

          {isLoggedIn && (
            <section className="w-full max-w-md bg-[#ffffff10] border border-[#ffffff40] rounded-xl p-5">
              <h2 className="text-xl font-bold mb-2">
                Which player are you?
              </h2>

              <p className="text-sm text-gray-300 mb-4">
                Select the player representing your account.
                Your XP, wins, and losses will be based on
                this player's results.
              </p>

              <label
                htmlFor="account-player"
                className="block mb-2 text-sm"
              >
                Your player
              </label>

              <select
                id="account-player"
                value={
                  selectedPlayerIndex < playerData.length
                    ? selectedPlayerIndex
                    : 0
                }
                onChange={(e) =>
                  setSelectedPlayerIndex(Number(e.target.value))
                }
                className="w-full p-3 rounded-lg bg-[#382647] text-white border border-[#ffffff40]"
              >
                {playerData.map((player, index) => (
                  <option key={player.id} value={index}>
                    {player.name?.trim() ||
                      player.tag ||
                      `Player ${index + 1}`}
                    {" — Player "}
                    {index + 1}
                  </option>
                ))}
              </select>
            </section>
          )}

          <section className="flex gap-4 flex-wrap justify-center">
            {isContinue ? (
              <>
                <button
                  onClick={() => setupPlayers(false)}
                  className="w-full md:w-fit sec-font text-xl rounded px-16 py-4 bg-[#D30CBD] font-bold duration-500 skew-x-6 hover:skew-x-0 hover:scale-95 hover:bg-[#d30cbc]"
                >
                  Start New Game
                </button>

                <button
                  onClick={() => setupPlayers(true)}
                  className="w-full md:w-fit sec-font text-xl rounded px-16 py-4 bg-[#D30CBD] font-bold duration-500 -skew-x-6 hover:skew-x-0 hover:scale-95 hover:bg-[#d30cbc]"
                >
                  Resume Game
                </button>
              </>
            ) : (
              <button
                onClick={() => setupPlayers(false)}
                className="sec-font text-xl rounded px-16 py-4 bg-[#D30CBD] font-bold duration-500 skew-x-6 hover:skew-x-0 hover:scale-95 hover:bg-[#d30cbc]"
              >
                Start Game
              </button>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export default LiveGameSetup;
