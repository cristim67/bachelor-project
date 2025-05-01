import { logout } from "../network/api_axios";
import { useTheme } from "../contexts/theme_provider";
import { useAuth } from "../contexts/auth_context";
import { useState, useEffect } from "react";

export const Header = () => {
  const { isLoggedIn, setIsLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    if (user?.profile_picture) {
      setProfilePicture(
        localStorage.getItem("profile_picture") || user.profile_picture,
      );
    }
  }, [user?.profile_picture, localStorage.getItem("profile_picture")]);

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
      className={`flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-50 h-16 ${
        theme === "light"
          ? "bg-surface-color border-b border-border-color"
          : "bg-background-color border-b border-border-color"
      }`}
    >
      <div className="flex items-center gap-8">
        <a
          href="/"
          className="text-base font-medium transition-colors text-text-primary hover:text-accent-primary"
        >
          Home
        </a>
        {isLoggedIn && (
          <a
            href="/projects"
            className="text-base font-medium transition-colors text-text-primary hover:text-accent-primary"
          >
            Projects
          </a>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!isLoggedIn ? (
          <div className="flex gap-4">
            <a
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium transition-colors text-text-primary hover:text-accent-primary"
            >
              Login
            </a>
            <a
              href="/auth/signup"
              className="px-4 py-2 text-sm font-medium transition-colors rounded-md text-surface-color bg-accent-primary hover:bg-accent-secondary"
            >
              Sign Up
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
                theme === "light"
                  ? "bg-surface-color border border-border-color"
                  : "bg-background-color border border-border-color"
              }`}
            >
              <span className="text-sm font-medium text-text-primary">
                {user?.subscription?.name || "Hobby"}
              </span>
              <span className="text-sm text-text-secondary px-2 border-l border-border-color">
                {user?.token_usage || 0}/
                {user?.subscription?.max_tokens || 2000}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="focus:outline-none"
              >
                <div className="relative">
                  <div
                    className={`w-8 h-8 rounded-full bg-accent-primary text-surface-color flex items-center justify-center font-medium ring-1 ring-offset-2 ${
                      theme === "light" ? "ring-black" : "ring-white"
                    }`}
                  >
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  {profilePicture && (
                    <img
                      src={profilePicture}
                      alt={user?.username?.charAt(0).toUpperCase() || "U"}
                      className={`absolute top-0 left-0 w-8 h-8 rounded-full ring-1 ring-offset-2 transition-all ${
                        theme === "light"
                          ? "ring-black hover:ring-accent-primary"
                          : "ring-white hover:ring-accent-primary"
                      }`}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  )}
                </div>
              </button>

              {showUserMenu && (
                <div
                  className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg py-1 ${
                    theme === "light"
                      ? "bg-white border border-border-color"
                      : "bg-black border border-border-color"
                  }`}
                  style={{ right: "-8px" }}
                >
                  <div className="px-4 py-2 border-b border-border-color">
                    <span className="block text-sm font-medium text-text-primary">
                      {user?.username}
                    </span>
                    <span className="block text-sm text-text-secondary">
                      {user?.email}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium transition-colors text-text-primary hover:text-accent-primary"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
