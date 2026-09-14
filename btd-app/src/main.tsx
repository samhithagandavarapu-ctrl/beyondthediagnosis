import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { AuthProvider } from "./context/AuthContext";
import { PracticeModeProvider } from "./context/PracticeModeContext";
import { MyVoiceProvider } from "./context/MyVoiceContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Outside every provider on purpose: a throw inside one of these effects
        is exactly what blanks the page, so the boundary has to sit above them. */}
    <ErrorBoundary>
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
    </ErrorBoundary>
  </React.StrictMode>
);
