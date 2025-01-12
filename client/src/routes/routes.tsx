import AuthLayout from "../layouts/auth.layout";
import { NotFound } from "../views/404";
import { ForgotPassword } from "../views/forgot-password";
import { Home } from "../views/home.view";
import { Login } from "../views/login.view";
import {Project} from "../views/project.view";
import { Register } from "../views/register.view";

export const routes = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/auth/login",
    element: <Login />,
  },
  {
    path: "/auth/signup",
    element: <Register />,
  },
  {
    path: "/auth/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/project/:id",
    element: <Project />,
    layout: AuthLayout,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];
