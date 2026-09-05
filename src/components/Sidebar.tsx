import { NavLink } from "react-router-dom";
import { SERVIDORES } from "../constants/servidores";
import { useAuth } from "../context/AuthContext";
import { useServidorActivo } from "../context/ServidorContext";
import { useTema } from "../context/TemaContext";
import { Selector } from "./Selector";

const navItemClass =
  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-text-secondary";
const navItemActiveClass = "bg-surface-2 text-text-primary [&_svg]:stroke-accent";

interface SidebarProps {
  abierto: boolean;
  onCerrar: () => void;
}

export function Sidebar({ abierto, onCerrar }: SidebarProps) {
  const { user } = useAuth();
  const { servidorActivo, cambiarServidor } = useServidorActivo();
  const { tema, alternarTema } = useTema();
  const iniciales = (user?.email ?? "??").slice(0, 2).toUpperCase();

  return (
    <>
      {abierto && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onCerrar} aria-hidden="true" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[232px] flex-shrink-0 flex-col border-r border-border bg-surface p-4 transition-transform duration-200 lg:static lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-2 pb-6 pt-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#eda100" strokeWidth="1.6" />
            <path
              d="M11 8.4v7.2M8.5 14c0-1.4 1.3-2.2 3.2-2.2s3-.7 3-1.9-1.3-1.9-3-1.9c-1.5 0-2.7.6-3 1.7"
              stroke="#eda100"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-sm font-extrabold text-text-primary">Dofus Profit</span>
          <button type="button" onClick={onCerrar} className="ml-auto text-text-muted lg:hidden" aria-label="Cerrar menú">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          <NavLink
            to="/"
            end
            onClick={onCerrar}
            className={({ isActive }) => `${navItemClass} ${isActive ? navItemActiveClass : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="8" height="8" rx="1.5" />
              <rect x="13" y="3" width="8" height="5" rx="1.5" />
              <rect x="13" y="11" width="8" height="10" rx="1.5" />
              <rect x="3" y="14" width="8" height="7" rx="1.5" />
            </svg>
            Dashboard
          </NavLink>
          <NavLink
            to="/mercadillos"
            onClick={onCerrar}
            className={({ isActive }) => `${navItemClass} ${isActive ? navItemActiveClass : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 5h16M4 12h16M4 19h10" />
            </svg>
            Mercadillos
          </NavLink>
          <NavLink
            to="/items"
            onClick={onCerrar}
            className={({ isActive }) => `${navItemClass} ${isActive ? navItemActiveClass : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 8l9-5 9 5-9 5-9-5Z" />
              <path d="M3 8v8l9 5 9-5V8M12 13v8" />
            </svg>
            Items
          </NavLink>
          <NavLink
            to="/calculadora"
            onClick={onCerrar}
            className={({ isActive }) => `${navItemClass} ${isActive ? navItemActiveClass : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M8 6h8M7 10h2M11 10h2M15 10h2M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2" />
            </svg>
            Calculadora
          </NavLink>
        </nav>

        <div className="mt-auto flex flex-col gap-2.5 border-t border-border pt-4">
          <button
            type="button"
            onClick={alternarTema}
            className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2 text-xs font-semibold text-text-secondary"
          >
            {tema === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
              </svg>
            )}
            {tema === "dark" ? "Modo oscuro" : "Modo claro"}
          </button>
          <div className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-2 text-xs font-semibold text-text-secondary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
            </svg>
            <span className="flex-shrink-0">Servidor:</span>
            <Selector
              value={servidorActivo}
              options={SERVIDORES}
              onChange={cambiarServidor}
              triggerClassName="flex w-full items-center justify-between gap-1 text-sm font-bold text-text-primary"
            />
          </div>
          <div className="flex items-center gap-2 px-0.5">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-extrabold text-accent-ink">
              {iniciales}
            </div>
            <span className="flex-1 truncate text-[13px] font-semibold text-text-primary">{user?.email}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
