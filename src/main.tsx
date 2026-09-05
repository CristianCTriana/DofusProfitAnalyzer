import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigMissingScreen } from "./ConfigMissingScreen.tsx";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

const firebaseConfigurado = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID,
);

if (!firebaseConfigurado) {
  // Se evita importar AppRoot (y con él, firebase.ts) para que la falta de
  // credenciales no tumbe toda la app con una pantalla en blanco: getAuth()
  // lanza una excepción síncrona al inicializar con una API key vacía.
  root.render(
    <StrictMode>
      <ConfigMissingScreen />
    </StrictMode>,
  );
} else {
  import("./AppRoot.tsx").then(({ AppRoot }) => {
    root.render(
      <StrictMode>
        <AppRoot />
      </StrictMode>,
    );
  });
}
