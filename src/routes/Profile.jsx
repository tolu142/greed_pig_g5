
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getPlayerProgression,
  logoutPlayer,
  clearAuthToken,
} from "../utils/api";

export default function Profile() {
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const data = await getPlayerProgression();
        if (active) setPlayer(data.profile);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logoutPlayer();
    } catch (err) {
      // Clear the local session even if the server is unavailable.
      clearAuthToken();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  if (loading) {
    return <main style={styles.page}>Loading your profile...</main>;
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1>Player Profile</h1>

        {error ? (
          <>
            <p style={styles.error}>{error}</p>
            <Link to="/login">Go to Login</Link>
          </>
        ) : player ? (
          <>
            <h2>{player.username}</h2>

            <div style={styles.stat}>
              <span>Level</span>
              <strong>{player.level}</strong>
            </div>


            <div style={styles.stat}>
            <span>Games Played</span>
            <strong>{player.gamesPlayed ?? 0}</strong>
            </div>

            <div style={styles.stat}>
            <span>Wins</span>
            <strong>{player.wins ?? 0}</strong>
            </div>

            <div style={styles.stat}>
            <span>Losses</span>
            <strong>{player.losses ?? 0}</strong>
            </div>


            <div style={styles.stat}>
              <span>Total XP</span>
              <strong>{player.xp}</strong>
            </div>


            <h3>Achievements</h3>

            {player.achievements?.length > 0 ? (
            player.achievements.map((achievement) => (
                <div key={achievement.key} style={styles.stat}>
                <span>
                    🏆 {achievement.key
                    .split("_")
                    .map((word) =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    )
                    .join(" ")}
                </span>
                <strong>Unlocked</strong>
                </div>
            ))
            ) : (
            <p style={styles.muted}>
                No achievements unlocked yet. Play a game to earn your first!
            </p>
            )}


            <Link to="/live-game/setup" style={styles.link}>
              Back to Game
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={styles.button}
            >
              {loggingOut ? "Logging out..." : "Log Out"}
            </button>
          </>
        ) : (
          <p>No player profile found.</p>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#17121f",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#271b35",
    padding: "32px",
    borderRadius: "20px",
    textAlign: "center",
  },
  stat: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px",
    margin: "12px 0",
    background: "#382647",
    borderRadius: "12px",
  },
  muted: {
    color: "#c4b5d0",
  },
  error: {
    color: "#ff9aab",
  },
  link: {
    display: "block",
    color: "#ff83b3",
    margin: "20px 0",
  },
  button: {
    width: "100%",
    padding: "14px",
    background: "#f45a9b",
    border: "none",
    borderRadius: "10px",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "12px",
  },
};
