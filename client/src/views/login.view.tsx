import React, { useEffect, useState } from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { login, googleLogin } from "../network/api_axios";
import { useTheme } from "../contexts/theme_provider";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/auth_context";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, setIsLoggedIn } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoginLoading, setGoogleLoginLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { theme } = useTheme();

  useEffect(() => {
    if (isLoggedIn) { 
      navigate("/");
      toast.error("You are already logged in");
    }
  }, [isLoggedIn]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginLoading(true);
    try {
      await login(email, password);
      setIsLoggedIn(true);
      navigate("/");
    } catch (error) {
      toast.error(error as string);
    }
    setLoginLoading(false);
  };

  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    setGoogleLoginLoading(true);
    try {
      await googleLogin(credentialResponse.credential!);
      setIsLoggedIn(true);
      navigate("/");
    } catch (error) {
      toast.error(error as string);
    }
    setGoogleLoginLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-color">
      <div className="w-full max-w-md p-8 space-y-8 border rounded-lg shadow-md bg-surface-color border-border-color">
        <div className="mb-4 text-center">
          {googleLoginLoading ? (
            <div className="text-text-secondary">Loading...</div>
          ) : (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => {
                  toast.error("Login Failed");
                }}
                theme={theme === "light" ? "outline" : "filled_black"}
                shape="circle"
                text="signup_with"
              />
            </div>
          )}
        </div>

        <div className="relative flex items-center py-5">
          <div className="flex-grow border-t border-border-color"></div>
          <span className="flex-shrink mx-4 text-text-secondary">OR</span>
          <div className="flex-grow border-t border-border-color"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-primary"
            >
              Email:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 mt-1 text-black border rounded-md shadow-sm bg-background-color border-border-color focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-primary"
            >
              Password:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 mt-1 text-black border rounded-md shadow-sm bg-background-color border-border-color focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className={`w-full px-4 py-2 transition-colors rounded-md ${
              theme === "light"
                ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
            } focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2`}
          >
            {loginLoading ? "Loading..." : "Login"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/auth/signup")}
            className={`w-full px-4 py-2 transition-colors rounded-md ${
              theme === "light"
                ? "border-black border-[1px] bg-text-secondary text-surface-color hover:bg-text-primary"
                : "border-white border-[1px] bg-text-secondary text-surface-color hover:bg-text-primary"
            } focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2`}
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
