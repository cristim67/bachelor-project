import { createContext, useContext, useEffect, useState, useRef } from "react";
import { getUser } from "../network/api_axios";
import { AxiosError } from "axios";

interface User {
  username: string;
  email: string;
  profile_picture?: string;
  token_usage: number;
  subscription: {
    name: string;
    description: string;
    price: number;
    max_tokens: number;
  };
}

interface AuthContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  isLoading: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  isLoading: true,
  user: null,
  setUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const userDataFetched = useRef(false);

  useEffect(() => {
    const verifyAuth = async () => {
      if (userDataFetched.current) return;

      try {
        const response = await getUser();
        setIsLoggedIn(true);
        if (response.user) {
          // Update cache with new profile picture if it exists
          if (response.user.profile_picture) {
            localStorage.setItem(
              "profile_picture",
              response.user.profile_picture,
            );
          }
          setUser(response.user);
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        // Only handle 401 errors silently
        if (axiosError.response?.status !== 401) {
          console.error("Auth error:", error);
        }
        setIsLoggedIn(false);
        setUser(null);
      } finally {
        setIsLoading(false);
        userDataFetched.current = true;
      }
    };

    verifyAuth();
  }, []);

  useEffect(() => {
    if (user?.profile_picture) {
      localStorage.setItem("profile_picture", user.profile_picture);
    }
  }, [user?.profile_picture]);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, setIsLoggedIn, isLoading, user, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
