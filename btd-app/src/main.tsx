import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { AuthProvider } from "./context/AuthContext";
import { PracticeModeProvider } from "./context/PracticeModeContext";
import { MyVoiceProvider } from "./context/MyVoiceContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AccessibilityProvider>
          <PracticeModeProvider>
            <MyVoiceProvider>
              <App />
            </MyVoiceProvider>
          </PracticeModeProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
