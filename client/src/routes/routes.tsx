import AuthLayout from "../layouts/auth.layout";
import { Home } from "../views/home.view";
import { Login } from "../views/login.view";
import { Register } from "../views/register";

export const routes = [
  {
    path: "/",
    element: <Home />,
    layout: AuthLayout,
  },
  {
    path: "/auth/login",
    element: <Login />,
  },
  {
    path: "/auth/signup",
    element: <Register />,
  },
];
