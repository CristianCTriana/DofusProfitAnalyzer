import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { TemaProvider } from "./context/TemaContext";

export function AppRoot() {
  return (
    <TemaProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </TemaProvider>
  );
}
