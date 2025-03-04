import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { isAuthenticated } from "../network/api_axios";

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  setIsLoggedIn: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  setIsLoggedIn: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedSession = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (hasCheckedSession.current) return;
      hasCheckedSession.current = true;

      try {
        const response = await isAuthenticated();
        setIsLoggedIn(response.isValid);
      } catch (error) {
        console.error("Error checking session:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, setIsLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
