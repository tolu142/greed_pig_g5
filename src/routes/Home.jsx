
import React from "react";
import logo from "../assets/pig-0.png";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section className="w-full min-h-screen flex flex-col justify-center items-center px-4">
      <figure>
        <img
          src={logo}
          alt="Greedy Pig mascot"
          width={400}
        />
      </figure>

      <div className="flex flex-col gap-8 text-[#F9F7E8] text-center">
        <h1 className="pri-font text-3xl sm:text-5xl lg:text-6xl">
          Greedy Pig
        </h1>

        <p className="sec-font text-lg">
          Choose how you want to play!
        </p>

        <div className="flex flex-col gap-4">
          <Link
            to="/live-game/setup"
            className="sec-font text-xl rounded px-8 py-4 bg-[#d30cbcc0] font-bold duration-500 skew-x-6 hover:bg-[#d30cbc] hover:skew-x-0 hover:scale-95"
          >
            Play as Guest
          </Link>

          <Link
            to="/login"
            className="sec-font text-xl rounded px-8 py-4 border-2 border-[#d30cbc] font-bold duration-500 -skew-x-6 hover:bg-[#d30cbc] hover:skew-x-0 hover:scale-95"
          >
            Log In / Sign Up
          </Link>
        </div>
      </div>
    </section>
  );
}
