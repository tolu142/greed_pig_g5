
import React, { useEffect, useState } from "react";
import logo from "../assets/pig-0.png";
import { Link, useLocation } from "react-router-dom";
import { getAuthToken } from "../utils/api";

export default function Navbar() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(getAuthToken()));
  }, [location.pathname]);

  return (
    <nav className="sticky top-0 w-full flex justify-between py-2 px-4 md:px-[2%] md:py-[2%] text-white border-b border-b-[#ffffff80] backdrop-blur items-center">
      <Link to="/" className="flex lg:gap-2 items-center">
        <h1 className="pri-font text-base sm:text-lg md:text-xl lg:text-2xl xl:text-4xl">
          Greedy Pig
        </h1>
        <img src={logo} alt="logo" width={75} />
      </Link>

      <div className="flex items-center gap-4 md:gap-8">
        {isLoggedIn && (
          <Link
            to="/profile"
            className="text-[#ff83b3] hover:underline duration-300 font-bold"
          >
            My Profile
          </Link>
        )}

        <Link
          to="/live-game/how-to-play"
          className="text-white hover:underline duration-300 font-bold hidden md:flex"
        >
          How To Play?
        </Link>

        <Link
          to="/live-game/how-to-play"
          className="text-white hover:underline duration-300 font-bold flex text-xl md:hidden"
        >
          ?
        </Link>
      </div>
    </nav>
  );
}
