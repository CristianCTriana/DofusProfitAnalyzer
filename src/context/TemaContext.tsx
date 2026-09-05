import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Tema = "light" | "dark";

const CLAVE_STORAGE = "dofus-profit-tema";

function temaInicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_STORAGE);
    if (guardado === "light" || guardado === "dark") return guardado;
  } catch {
    // localStorage puede fallar (modo privado, etc.) — se usa la preferencia del sistema.
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

interface TemaContextValue {
  tema: Tema;
  alternarTema: () => void;
}

const TemaContext = createContext<TemaContextValue>({ tema: "dark", alternarTema: () => {} });

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle("light", tema === "light");
    try {
      localStorage.setItem(CLAVE_STORAGE, tema);
    } catch {
      // Sin persistencia si el storage no está disponible; el tema sigue funcionando en la sesión.
    }
  }, [tema]);

  function alternarTema() {
    setTema((t) => (t === "light" ? "dark" : "light"));
  }

  return <TemaContext.Provider value={{ tema, alternarTema }}>{children}</TemaContext.Provider>;
}

export function useTema(): TemaContextValue {
  return useContext(TemaContext);
}
