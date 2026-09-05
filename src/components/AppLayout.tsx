import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useCatalogo } from "../context/CatalogoContext";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { cargando } = useCatalogo();

  return (
    <div className="flex h-screen flex-col bg-bg lg:flex-row">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
        <button type="button" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú" className="text-text-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-extrabold text-text-primary">Dofus Profit</span>
      </header>

      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        {cargando ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
            <p className="text-sm font-semibold text-text-secondary">
              Cargando el catálogo de Dofus (recetas, items, imágenes)…
            </p>
            <p className="text-xs text-text-muted">La primera vez puede tardar uno o dos minutos.</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
