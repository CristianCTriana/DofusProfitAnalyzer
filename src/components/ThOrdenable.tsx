import type { Direccion } from "../hooks/useTablaOrdenada";

interface ThOrdenableProps {
  label: string;
  columnKey: string;
  columnaActiva: string;
  direccion: Direccion;
  align?: "left" | "right";
  onClick: (key: string) => void;
}

export function ThOrdenable({ label, columnKey, columnaActiva, direccion, align = "right", onClick }: ThOrdenableProps) {
  const activa = columnKey === columnaActiva;
  return (
    <th
      className={`whitespace-nowrap border-b border-border px-4 py-3 text-[11px] font-bold uppercase tracking-wide ${
        align === "left" ? "text-left" : "text-right"
      } ${activa ? "text-accent" : "text-text-muted"}`}
    >
      <button type="button" onClick={() => onClick(columnKey)} className="inline-flex items-center gap-1">
        {label}
        {activa && <span>{direccion === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
