import { useTheme } from "../contexts/theme_provider";

export const Header = () => {
    const { theme, setTheme } = useTheme();

    const handleThemeChange = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };  

    return (
        <div>
            <button onClick={handleThemeChange}>
                {theme === "light" ? "Dark" : "Light"}
            </button>
        </div>
    );
};