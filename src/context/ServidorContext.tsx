import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SERVIDOR_DEFAULT } from "../constants/servidores";
import { getPerfilUsuario, setServidorActivo as guardarServidorActivo } from "../services/usuarios";
import type { Servidor } from "../types";
import { useAuth } from "./AuthContext";

interface ServidorContextValue {
  servidorActivo: Servidor;
  cambiarServidor: (servidor: Servidor) => Promise<void>;
  loading: boolean;
}

const ServidorContext = createContext<ServidorContextValue>({
  servidorActivo: SERVIDOR_DEFAULT,
  cambiarServidor: async () => {},
  loading: true,
});

export function ServidorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [servidorActivo, setServidorActivoState] = useState<Servidor>(SERVIDOR_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getPerfilUsuario(user.uid).then((perfil) => {
      setServidorActivoState(perfil.servidorActivo);
      setLoading(false);
    });
  }, [user]);

  async function cambiarServidor(servidor: Servidor) {
    if (!user) return;
    setServidorActivoState(servidor);
    await guardarServidorActivo(user.uid, servidor);
  }

  return (
    <ServidorContext.Provider value={{ servidorActivo, cambiarServidor, loading }}>
      {children}
    </ServidorContext.Provider>
  );
}

export function useServidorActivo(): ServidorContextValue {
  return useContext(ServidorContext);
}
