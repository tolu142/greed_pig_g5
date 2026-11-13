
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginPlayer, registerPlayer } from "../utils/api";
import logo from "../assets/pig-0.png";

export default function Auth() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setMessage("");

    if (!isLogin && password !== confirmPassword) {
    setError("Passwords do not match. Please try again.");
    return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await loginPlayer(username.trim(), password);
        navigate("/live-game/setup", { replace: true });
      } else {
        await registerPlayer(username.trim(), password);
        setMode("login");
        setPassword("");
        setMessage("Account created! Please log in.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-10 text-[#F9F7E8]">
      <div className="w-full max-w-md flex flex-col items-center">
        <Link to="/">
          <img
            src={logo}
            alt="Greedy Pig mascot"
            className="w-36 sm:w-44"
          />
        </Link>

        <h1 className="pri-font text-3xl sm:text-4xl text-center mb-3">
          Greedy Pig
        </h1>

        <p className="sec-font text-center text-lg mb-7">
          {isLogin
            ? "Welcome back! Log in to your account."
            : "Create an account to earn XP and achievements."}
        </p>

        <div className="w-full bg-[#1b1b1b] border border-[#d30cbc]/40 rounded-xl p-6 shadow-xl">
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-lg py-3 font-bold ${
                isLogin
                  ? "bg-[#d30cbc] text-white"
                  : "bg-[#303030] text-[#F9F7E8]"
              }`}
            >
              Log In
            </button>

            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-lg py-3 font-bold ${
                !isLogin
                  ? "bg-[#d30cbc] text-white"
                  : "bg-[#303030] text-[#F9F7E8]"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Username</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                maxLength={32}
                className="w-full rounded-lg bg-[#292929] border border-gray-600 px-4 py-3 text-white outline-none focus:border-[#d30cbc]"
                placeholder="Enter your username"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-semibold">Password</span>

            <div className="relative">
            <input
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-lg bg-[#292929] border border-gray-600 px-4 py-3 pr-20 text-white outline-none focus:border-[#d30cbc]"
                placeholder="Enter your password"
            />

            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#F9F7E8] hover:text-[#d30cbc]"
                aria-label={showPassword ? "Hide password" : "Show password"}
            >
                {showPassword ? "Hide" : "Show"}
            </button>
            </div>

            </label>


            {!isLogin && (
            <label className="flex flex-col gap-2">
                <span className="font-semibold">Confirm Password</span>

                <div className="relative">
                <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) =>
                    setConfirmPassword(event.target.value)
                    }
                    required
                    className="w-full rounded-lg bg-[#292929] border border-gray-600 px-4 py-3 pr-20 text-white outline-none focus:border-[#d30cbc]"
                    placeholder="Re-enter your password"
                />

                <button
                    type="button"
                    onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#F9F7E8] hover:text-[#d30cbc]"
                    aria-label={
                    showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                >
                    {showConfirmPassword ? "Hide" : "Show"}
                </button>
                </div>

                {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-sm">
                    Passwords do not match.
                </p>
                )}

                {confirmPassword && password === confirmPassword && (
                <p className="text-green-400 text-sm">
                    Passwords match!
                </p>
                )}
            </label>
            )}


            {error && (
              <p role="alert" className="text-red-400 text-sm">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="text-green-400 text-sm">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-[#d30cbc] px-6 py-3 text-white font-bold text-lg hover:bg-[#b80ca4] disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Log In"
                  : "Create Account"}
            </button>
          </form>
        </div>

        <Link
          to="/live-game/setup"
          className="mt-6 text-[#F9F7E8] underline hover:text-[#d30cbc]"
        >
          Continue as Guest
        </Link>

        <Link
          to="/"
          className="mt-4 text-gray-400 hover:text-white"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
