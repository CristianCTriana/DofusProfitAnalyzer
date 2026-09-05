interface PaginacionProps {
  pagina: number;
  totalPaginas: number;
  totalFilas: number;
  onCambiar: (pagina: number) => void;
}

export function Paginacion({ pagina, totalPaginas, totalFilas, onCambiar }: PaginacionProps) {
  if (totalFilas === 0) return null;

  return (
    <div className="flex items-center justify-between px-1 py-1">
      <span className="text-xs text-text-muted">{totalFilas} resultados</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pagina <= 1}
          onClick={() => onCambiar(pagina - 1)}
          className="rounded-md border border-border-strong px-2.5 py-1.5 text-xs font-bold text-text-secondary disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="text-xs font-semibold text-text-secondary">
          Página {pagina} de {totalPaginas}
        </span>
        <button
          type="button"
          disabled={pagina >= totalPaginas}
          onClick={() => onCambiar(pagina + 1)}
          className="rounded-md border border-border-strong px-2.5 py-1.5 text-xs font-bold text-text-secondary disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
