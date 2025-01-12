import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/theme_provider";

export const NotFound = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();

    return (
        <div className={`flex flex-col items-center justify-center h-screen ${
            theme === "dark" ? "bg-neutral-900 text-neutral-100" : "bg-neutral-50 text-neutral-900"
        }`}>
            <h1 className="mb-4 font-bold text-9xl">404</h1>
            <p className="mb-8 text-2xl">Oops! Page not found</p>
            <button 
                onClick={() => navigate("/")}
                className={`px-6 py-3 transition-colors rounded-md ${
                    theme === "light"
                    ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                    : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                }`}
            >
                Back to home
            </button>
        </div>
    );
}