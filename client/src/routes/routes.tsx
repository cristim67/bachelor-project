import React from 'react';
import AuthLayout from "../layouts/auth.layout";
import { Home } from "../views/home.view";
import { Login } from "../views/login.view";

export const routes = [
    {
        path: "/",
        element: <Home/>,
        layout: AuthLayout,
    },
    {
        path: "/auth/login",
        element: <Login/>,
    },

]