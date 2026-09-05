import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, db } from "../services/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  errorAutorizacion: string | null;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, errorAutorizacion: null });

async function estaAutorizado(email: string | null): Promise<boolean> {
  if (!email) return false;
  const snapshot = await getDoc(doc(db, "config", "accesoPermitido"));
  const emails = (snapshot.data()?.emails ?? []) as string[];
  return emails.includes(email);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorAutorizacion, setErrorAutorizacion] = useState<string | null>(null);

  useEffect(() => {
    // No basta con que Firebase Auth acepte la sesión (Google crea cuenta para
    // cualquier correo): hay que confirmar contra config/accesoPermitido.emails
    // ANTES de exponer `user`, para que ProtectedRoute nunca llegue a mostrar
    // el dashboard a alguien no autorizado y luego tener que sacarlo.
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        if (!(await estaAutorizado(nextUser.email))) {
          await signOut(auth).catch(() => {});
          setErrorAutorizacion("Tu cuenta no está autorizada para este grupo. Pídele acceso a Cristian.");
          setUser(null);
          setLoading(false);
          return;
        }
        setErrorAutorizacion(null);
        setUser(nextUser);
        setLoading(false);
      } catch (err) {
        // Si la verificación falla por una razón que no es "no autorizado"
        // (ej. sin conexión), no cerramos la sesión de alguien que sí tiene
        // acceso solo por un error transitorio.
        if (err instanceof FirebaseError && err.code === "permission-denied") {
          await signOut(auth).catch(() => {});
          setErrorAutorizacion("Tu cuenta no está autorizada para este grupo. Pídele acceso a Cristian.");
          setUser(null);
        } else {
          setErrorAutorizacion("No se pudo verificar tu acceso. Intenta de nuevo.");
          setUser(null);
        }
        setLoading(false);
      }
    });
  }, []);

  return <AuthContext.Provider value={{ user, loading, errorAutorizacion }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
