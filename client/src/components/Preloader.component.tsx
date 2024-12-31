import React, { useContext } from "react";
import { PreloaderContext } from "./PreloaderProvider.component";
import LogoWhite from "../assets/Logo fata.svg";

const Preloader: React.FC = () => {
  const context = useContext(PreloaderContext);

  // Handle case where context is undefined
  if (!context) {
    throw new Error("Preloader must be used within a PreloaderProvider");
  }

  const { isLoading } = context;

  if (!isLoading) {
    return null;
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center "
      style={{ zIndex: 1050, backgroundColor: "#fff3d1" }}
    >
      <div className="position-relative d-flex align-items-center justify-content-center ">
        {/* Spinner container */}
        <div
          className="spinner-border text-warning "
          style={{ width: "6rem", height: "6rem" }}
          role="status"
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        {/* Logo inside the spinner */}
        <img
          src={LogoWhite}
          alt="Logo"
          className="rounded-circle position-absolute bg-warning"
          style={{ width: "5rem", height: "5rem", border:"1px solid #fff" }}
        />
      </div>
    </div>
  );
};

export default Preloader;
