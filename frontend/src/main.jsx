import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "./Styles/light.css";
import "./Styles/dark.css";
import { ThemeProvider } from "./Context/ThemeContext";
import { UserProvider } from "./Context/UserContext.jsx";
import { ServerProvider } from "./Context/ServerProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UserProvider>
      <ServerProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ServerProvider>
    </UserProvider>
  </StrictMode>
);
