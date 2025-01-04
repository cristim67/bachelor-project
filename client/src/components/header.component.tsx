import { useState } from "react";
import { useEffect } from "react";
import { isAuthenticated } from "../network/api_axios";
import { logout } from "../network/api_axios";
import { useTheme } from "../contexts/theme_provider";

export const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await isAuthenticated();
        setIsLoggedIn(authStatus);
      } catch (error) {
        console.error("Eroare la verificarea autentificării:", error);
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Eroare la deconectare:", error);
    }
  };

  return (
    <header
      className={`flex items-center justify-between px-6 py-4 fixed top-0 left-0 right-0 z-50 ${
        theme === "light"
          ? "bg-surface-color border-b border-border-color"
          : "bg-background-color border-b border-border-color"
      }`}
    >
      <div className="flex items-center gap-8">
        <a href="/" className="flex items-center">
          <img src="/logo.png" alt="Logo" className="w-auto h-8" />
        </a>
        <a
          href="/"
          className="transition-colors text-text-primary hover:text-accent-primary"
        >
          Home
        </a>
      </div>

      <div className="flex items-center gap-4">
        {!isLoggedIn ? (
          <div className="flex gap-4">
            <a
              href="/auth/login"
              className="px-4 py-2 transition-colors text-text-primary hover:text-accent-primary"
            >
              Login
            </a>
            <a
              href="/auth/signup"
              className="px-4 py-2 transition-colors rounded-md text-surface-color bg-accent-primary hover:bg-accent-secondary"
            >
              Sign Up
            </a>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="px-4 py-2 transition-colors text-text-primary hover:text-accent-primary"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
};
