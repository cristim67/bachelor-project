import { useTheme } from "../contexts/theme_provider";
import moon_svg from "../assets/footer/moon.svg";
import sun_svg from "../assets/footer/sun.svg";
export const Footer = () => {
  const { theme, setTheme } = useTheme();

  return (
    <footer className="fixed bottom-0 w-full p-4 border-t shadow-sm bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border">
      <div className="container flex items-center justify-between px-4 mx-auto max-w-7xl">
        <div className="text-sm transition-colors text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">
          Copyright ©️ {new Date().getFullYear()} Cristi Miloiu. All rights
          reserved.
        </div>

        <div className="flex items-center">
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ease-in-out border-2
                            ${
                              theme === "dark"
                                ? "bg-dark-accent-primary border-dark-accent-secondary"
                                : "bg-light-accent-primary border-light-accent-secondary"
                            }`}
          >
            <div
              className={`absolute w-5 h-5 transition-all duration-300 ease-in-out transform rounded-full top-0.5 flex items-center justify-center border
                                ${
                                  theme === "dark"
                                    ? "translate-x-7 bg-dark-surface shadow-md border-dark-accent-secondary"
                                    : "translate-x-0.5 bg-light-surface shadow-md border-light-accent-secondary"
                                }`}
            >
              <span className="text-xs">
                {theme === "dark" ? (
                  <img src={moon_svg} className="w-4 h-4 invert"></img>
                ) : (
                  <img src={sun_svg} className="w-4 h-4"></img>
                )}
              </span>
            </div>
          </button>
        </div>
      </div>
    </footer>
  );
};
