import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  FC,
} from "react";

interface PreloaderContextType {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PreloaderContext = createContext<PreloaderContextType | undefined>(
  undefined
);

interface PreloaderProviderProps {
  children: ReactNode;
}

export const PreloaderProvider: FC<PreloaderProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const delay = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(delay);
  }, []);

  return (
    <PreloaderContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </PreloaderContext.Provider>
  );
};