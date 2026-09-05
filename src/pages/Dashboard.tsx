import { useEffect, useMemo, useState } from "react";
import { useCatalogo } from "../context/CatalogoContext";
import { useServidorActivo } from "../context/ServidorContext";
import { calcularReceta } from "../services/calculo";
import { getConfigGlobal } from "../services/config";
import { listenHistorialReciente } from "../services/historial";
import type { HistorialPrecio } from "../types";
import { formatExacto } from "../utils/formato";
import { formatHaceTiempo } from "../utils/tiempo";

export function Dashboard() {
  const { servidorActivo } = useServidorActivo();
  const { items, recetas } = useCatalogo();
  const [historial, setHistorial] = useState<HistorialPrecio[]>([]);
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(0.02);

  useEffect(() => listenHistorialReciente(5, setHistorial), []);
  useEffect(() => {
    getConfigGlobal().then((config) => setImpuestoPorcentaje(config.impuestoPorcentaje));
  }, []);

  const itemsPorId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const itemsPorNombre = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i.nombre])), [items]);

  const top10 = useMemo(() => {
    const calculadas = recetas.flatMap((receta) => {
      try {
        const precioVenta = receta.preciosVenta?.[servidorActivo] ?? 0;
        const calculo = calcularReceta(receta, itemsPorId, servidorActivo, precioVenta, impuestoPorcentaje);
        return [{ nombre: receta.nombre, roiPorHora: calculo.roiPorHora }];
      } catch {
        return [];
      }
    });
    return calculadas.sort((a, b) => b.roiPorHora - a.roiPorHora).slice(0, 10);
  }, [recetas, itemsPorId, servidorActivo, impuestoPorcentaje]);

  const maxRoi = top10[0]?.roiPorHora || 1;
  const roiPromedio = top10.length
    ? top10.reduce((sum, r) => sum + r.roiPorHora, 0) / top10.length
    : 0;
  const ultimaActualizacion = historial[0] ? formatHaceTiempo(historial[0].fecha) : "sin datos";

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">Resumen general del mercado — servidor {servidorActivo}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Recetas activas" value={String(recetas.length)} />
        <StatCard label="Items registrados" value={String(items.length)} />
        <StatCard label="ROI/h promedio (top 10)" value={formatExacto(roiPromedio)} accent />
        <StatCard label="Precios actualizados" value={ultimaActualizacion} />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
          <div>
            <h2 className="text-sm font-bold text-text-primary">Top 10 recetas por ROI/hora</h2>
            <p className="text-xs text-text-muted">Servidor {servidorActivo} · margen neto ya con impuesto descontado</p>
          </div>
          <div className="flex flex-col gap-2.5">
            {top10.map((r, i) => (
              <div key={r.nombre} className="flex items-center gap-3">
                <span className="w-4 text-xs font-bold text-text-muted">{i + 1}</span>
                <span className="w-20 flex-shrink-0 truncate text-[13px] font-semibold text-text-secondary sm:w-44">
                  {r.nombre}
                </span>
                <div className="h-3.5 flex-1 overflow-hidden rounded bg-surface-2">
                  <div
                    className="h-full rounded-r bg-accent"
                    style={{ width: `${Math.max((r.roiPorHora / maxRoi) * 100, 2)}%` }}
                  />
                </div>
                <span className="w-[72px] flex-shrink-0 text-right text-[13px] font-bold tabular-nums text-accent">
                  {formatExacto(r.roiPorHora)}
                </span>
              </div>
            ))}
            {top10.length === 0 && <p className="text-sm text-text-muted">Aún no hay recetas con datos suficientes.</p>}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-bold text-text-primary">Actividad reciente</h2>
          <div className="flex flex-col">
            {historial.map((h) => (
              <div key={h.id} className="flex gap-2.5 border-b border-border py-2.5 last:border-none">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                <div>
                  <p className="text-[13px] text-text-primary">
                    <b className="font-bold">{itemsPorNombre[h.itemId] ?? h.itemId}</b> actualizado a{" "}
                    <span className="font-bold tabular-nums text-accent">{formatExacto(h.precio)}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    {h.servidor} · {formatHaceTiempo(h.fecha)}
                  </p>
                </div>
              </div>
            ))}
            {historial.length === 0 && <p className="text-sm text-text-muted">Sin actividad todavía.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-5 py-5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{label}</span>
      <span className={`text-2xl font-extrabold ${accent ? "text-accent" : "text-text-primary"}`}>{value}</span>
    </div>
  );
}
