import React, { useEffect, useState } from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { register, googleLogin } from "../network/api_axios";
import { useTheme } from "../contexts/theme_provider";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/auth_context";

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [registerLoading, setRegisterLoading] = useState(false);
  const [googleRegisterLoading, setGoogleRegisterLoading] = useState(false);
  const [username, setUsername] = useState("");
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
    setRegisterLoading(true);
    try {
      await register(username, email, password);
      toast.success("Registration successful! Check your email for verification.");
      navigate("/auth/login");
    } catch (error) {
      console.log(error);
    }
    setRegisterLoading(false);
  };

  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    setGoogleRegisterLoading(true);
    try {
      await googleLogin(credentialResponse.credential!);
      toast.success("Google login successful!");
      navigate("/");
    } catch (error) {
      toast.error(error as string);
    }
    setGoogleRegisterLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-color">
      <div className="w-full max-w-md p-8 space-y-8 border rounded-lg shadow-md bg-surface-color border-border-color">
        <div className="mb-4 text-center">
          {googleRegisterLoading ? (
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
              htmlFor="username"
              className="block text-sm font-medium text-text-primary"
            >
              Username:
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full px-3 py-2 mt-1 text-black border rounded-md shadow-sm bg-background-color border-border-color focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none"
              required
            />
          </div>

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
            {registerLoading ? "Loading..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
