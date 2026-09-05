import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../services/firebase";

export function Login() {
  const { user, loading, errorAutorizacion } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const mensajeError = error ?? errorAutorizacion;

  // La cuenta puede autenticarse con Firebase pero no estar en la lista del
  // grupo (config/accesoPermitido.emails) — AuthContext hace esa verificación
  // antes de exponer `user` y cierra la sesión sola si no está autorizada.
  // Cuando eso pasa reactivamente (no como resultado directo de un submit),
  // hay que apagar los botones que quedaron en estado "cargando".
  useEffect(() => {
    if (errorAutorizacion) {
      setSubmitting(false);
      setGoogleSubmitting(false);
    }
  }, [errorAutorizacion]);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Correo o contraseña incorrectos.");
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setError("No se pudo iniciar sesión con Google.");
      setGoogleSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-6 sm:p-9">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#eda100" strokeWidth="1.6" />
            <path
              d="M11 8.4v7.2M8.5 14c0-1.4 1.3-2.2 3.2-2.2s3-.7 3-1.9-1.3-1.9-3-1.9c-1.5 0-2.7.6-3 1.7"
              stroke="#eda100"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[15px] font-bold text-text-primary">Dofus Profit Analyzer</span>
        </div>
        <h1 className="mb-1.5 text-center text-xl font-extrabold text-text-primary">Bienvenido de vuelta</h1>
        <p className="mb-7 text-center text-sm text-text-muted">Acceso privado — solo para el grupo</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-3 text-sm text-text-primary outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-3 text-sm text-text-primary outline-none"
            />
          </div>

          {mensajeError && <p className="text-sm font-medium text-critical">{mensajeError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full rounded-lg bg-accent py-3.5 text-sm font-bold text-accent-ink disabled:opacity-60"
          >
            {submitting ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold text-text-muted">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleSubmitting}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border-strong bg-surface-2 py-3 text-sm font-bold text-text-primary disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.77c1.76 0 3.34.61 4.58 1.79l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
            />
          </svg>
          {googleSubmitting ? "Conectando…" : "Continuar con Google"}
        </button>

        <p className="mt-5 text-center text-xs text-text-muted">
          ¿No tienes acceso? Pídeselo a Cristian.
        </p>
      </div>
    </div>
  );
}
