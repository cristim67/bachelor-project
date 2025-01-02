import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { routes } from "./routes/routes";
import { ToastContainer } from "react-toastify";
import Preloader from "./components/Preloader.component";
import { PreloaderProvider } from "./contexts/preloader_provider";
import { ThemeProvider } from "./contexts/theme_provider";

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
                element={Layout ? <Layout element={route.element} /> : route.element} 
              />
            );
          })}
        </Routes>
    </Router>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PreloaderProvider>
      <ThemeProvider>
        <Preloader />
        <App/>
      </ThemeProvider>
    </PreloaderProvider>
    <ToastContainer />
  </React.StrictMode>
);
