import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./context/ThemeProvider";
import { SiteMetaProvider } from "./context/SiteMetaProvider";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <SiteMetaProvider>
        <App />
      </SiteMetaProvider>
    </ThemeProvider>
  </StrictMode>,
);
