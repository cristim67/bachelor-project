import React from "react";
import ReactDOM from "react-dom/client";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import "./index.css";
import Login from "./routes/login";
import {GoogleOAuthProvider} from "@react-oauth/google";
import "bootstrap/dist/css/bootstrap.min.css";
// @ts-ignore
import('bootstrap/dist/js/bootstrap.bundle.min.js');

import Account from "./routes/account.tsx";
import {PreloaderProvider} from "./components/PreloaderProvider.component.tsx";
import Preloader from "./components/Preloader.component.tsx";
import Register from "./routes/register.tsx";


const App = () => {
  const router = createBrowserRouter([
    {
      path: "*",
      element: <Account/>,
    },
    {
      path: "/login",
      element: <Login/>,
    },
    {
      path: "/signup",
      element: <Register/>,
    },
    {
      path: "/account",
      element: <Account/>,
    },
  ]);

  return (
    <PreloaderProvider>
      <Preloader/>
      <GoogleOAuthProvider clientId="1062295332779-684ijgeeas6721n2ekoe71nkcpcqcu7s.apps.googleusercontent.com">
        <RouterProvider router={router}/>
      </GoogleOAuthProvider>
    </PreloaderProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
