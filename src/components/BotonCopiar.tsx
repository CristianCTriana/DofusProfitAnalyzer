import { useState } from "react";

interface BotonCopiarProps {
  texto: string;
  className?: string;
}

export function BotonCopiar({ texto, className }: BotonCopiarProps) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(texto).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar nombre"
      className={`shrink-0 text-text-muted hover:text-accent ${className ?? ""}`}
    >
      {copiado ? (
        <span className="text-[11px] font-semibold text-good">¡Copiado!</span>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
