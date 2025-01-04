import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { routes } from "./routes/routes";
import { ToastContainer } from "react-toastify";
import Preloader from "./components/Preloader.component";
import { PreloaderProvider } from "./contexts/preloader_provider";
import { ThemeProvider } from "./contexts/theme_provider";
import { Footer } from "./components/footer.component";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID } from "./configs/env_handler";
import { Header } from "./components/header.component";

const App = () => {
  return (
    <Router>
      <Routes>
        {routes.map((route, index) => {
          const Layout = route.layout;
          return (
            <Route
              key={index}
              path={route.path}
              element={
                Layout ? <Layout element={route.element} /> : route.element
              }
            />
          );
        })}
      </Routes>
    </Router>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <PreloaderProvider>
        <ThemeProvider>
          <Preloader />
          <Header />
          <App />
          <Footer />
        </ThemeProvider>
      </PreloaderProvider>
    </GoogleOAuthProvider>
    <ToastContainer />
  </React.StrictMode>,
);
