import React, { useContext } from "react";
import { PreloaderContext } from "../contexts/preloader_provider";
import { useTheme } from "../contexts/theme_provider";

const Preloader: React.FC = () => {
  const context = useContext(PreloaderContext);
  const { theme } = useTheme();

  if (!context) {
    throw new Error("Preloader must be used within a PreloaderProvider");
  }

  const { isLoading } = context;

  if (!isLoading) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 flex items-center justify-center w-full h-full"
      style={{ zIndex: 1050, backgroundColor: theme === "dark" ? "black" : "white" }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className="text-white animate-spin"
          role="status"
        >
          <svg className="w-8 h-8" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    </div>
  );
};

export default Preloader;