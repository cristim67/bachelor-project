import { useEffect } from "react";
import { isAuthenticated } from "../network/api_axios";
import { useNavigate } from "react-router-dom";

export default function AuthLayout(props: { element: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    isAuthenticated().then((data) => {
      if (!data) {
        navigate("/auth/login");
      }
    });
  }, [navigate]);

  return <>{props.element}</>;
}
