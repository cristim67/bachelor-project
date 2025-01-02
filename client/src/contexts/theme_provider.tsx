import { createContext, useState, FC, ReactNode, useContext } from "react";

interface ThemeContextType {
    theme: "light" | "dark";
    setTheme: (theme: "light" | "dark") => void;
}

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        const savedTheme = localStorage.getItem('theme');
        return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
    });

    const handleThemeChange = (newTheme: "light" | "dark") => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.body.classList.toggle("light", newTheme === "light");
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme: handleThemeChange }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};