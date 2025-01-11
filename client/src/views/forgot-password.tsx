import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../network/api_axios";
import { useTheme } from "../contexts/theme_provider";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/auth_context";

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [email, setEmail] = useState("");

  const { theme } = useTheme();

  useEffect(() => {
    if (isLoggedIn && !forgotPasswordLoading) {
      navigate("/");
    }
  }, [isLoggedIn, forgotPasswordLoading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setForgotPasswordLoading(true);
    try {
      await forgotPassword(email);
      toast.success("Check your email for the reset password link");
      navigate("/auth/login");
    } catch (error) {
      console.log(error);
    }
    setForgotPasswordLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-color">
      <div className="w-full max-w-md p-8 space-y-8 border rounded-lg shadow-md bg-surface-color border-border-color">
        <div className="mb-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-primary"
              >
                Email:
              </label>
              <input
                type="text"
                id="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-2 mt-1 text-black border rounded-md shadow-sm bg-background-color border-border-color focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none"
                required
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
              {forgotPasswordLoading ? "Loading..." : "Forgot Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
