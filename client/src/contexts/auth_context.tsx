import { createContext, useContext, useEffect, useState, useRef } from "react";
import { getUser } from "../network/api_axios";

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
          // Get cached profile picture or use the new one
          const cachedPicture = localStorage.getItem("profile_picture");
          const userWithCachedPicture = {
            ...response.user,
            profile_picture: cachedPicture || response.user.profile_picture,
          };
          setUser(userWithCachedPicture);

          // Update cache if we have a new picture
          if (response.user.profile_picture && !cachedPicture) {
            localStorage.setItem(
              "profile_picture",
              response.user.profile_picture,
            );
          }
        }
      } catch {
        setIsLoggedIn(false);
        setUser(null);
      } finally {
        setIsLoading(false);
        userDataFetched.current = true;
      }
    };

    verifyAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, setIsLoggedIn, isLoading, user, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
