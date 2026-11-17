import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import BackendStatus from "./components/BackendStatus.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BackendStatus />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
