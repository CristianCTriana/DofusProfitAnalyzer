import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Paginacion } from "../components/Paginacion";
import { ThOrdenable } from "../components/ThOrdenable";
import { iconoDofusDb } from "../constants/dofusdb";
import { useAuth } from "../context/AuthContext";
import { useCatalogo } from "../context/CatalogoContext";
import { useServidorActivo } from "../context/ServidorContext";
import { useTablaOrdenada } from "../hooks/useTablaOrdenada";
import { esItemDeCatalogo } from "../services/catalogoDofusDb";
import { calcularReceta } from "../services/calculo";
import { getConfigGlobal } from "../services/config";
import { deleteReceta } from "../services/recetas";
import { getPerfilUsuario, setFavorito } from "../services/usuarios";
import { CATEGORIAS_MERCADILLO, type CategoriaMercadillo, type Receta, type ResultadoCalculoReceta } from "../types";
import { formatExacto } from "../utils/formato";

interface Fila {
  receta: Receta;
  calculo: ResultadoCalculoReceta | null;
}

export function Recetas() {
  const { user } = useAuth();
  const { servidorActivo } = useServidorActivo();
  const { items, recetas } = useCatalogo();
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(0.02);
  const [busqueda, setBusqueda] = useState("");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const categoriaActiva =
    CATEGORIAS_MERCADILLO.find((c) => c === searchParams.get("categoria")) ?? CATEGORIAS_MERCADILLO[0];
  function setCategoriaActiva(categoria: CategoriaMercadillo) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("categoria", categoria);
      return next;
    });
  }
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [soloFavoritos, setSoloFavoritos] = useState(false);

  useEffect(() => {
    getConfigGlobal().then((config) => setImpuestoPorcentaje(config.impuestoPorcentaje));
  }, []);
  useEffect(() => {
    if (!user) return;
    getPerfilUsuario(user.uid).then((perfil) => setFavoritos(perfil.favoritos ?? []));
  }, [user]);

  async function alternarFavorito(recetaId: string) {
    if (!user) return;
    const esFavorito = favoritos.includes(recetaId);
    setFavoritos((prev) => (esFavorito ? prev.filter((id) => id !== recetaId) : [...prev, recetaId]));
    await setFavorito(user.uid, recetaId, !esFavorito);
  }

  const itemsPorId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  const recetasCategoria = useMemo(
    () => recetas.filter((r) => r.categoria === categoriaActiva && (!soloFavoritos || favoritos.includes(r.id))),
    [recetas, categoriaActiva, soloFavoritos, favoritos],
  );

  const filas = useMemo<Fila[]>(() => {
    const filtradas = recetasCategoria.filter((r) => r.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    return filtradas.map((receta) => {
      try {
        const precioVenta = receta.preciosVenta?.[servidorActivo] ?? 0;
        const calculo = calcularReceta(receta, itemsPorId, servidorActivo, precioVenta, impuestoPorcentaje);
        return { receta, calculo };
      } catch {
        return { receta, calculo: null };
      }
    });
  }, [recetasCategoria, itemsPorId, servidorActivo, impuestoPorcentaje, busqueda]);

  const comparadores = useMemo(
    () => ({
      nombre: (a: Fila, b: Fila) => a.receta.nombre.localeCompare(b.receta.nombre),
      nivel: (a: Fila, b: Fila) => (a.receta.nivel ?? -1) - (b.receta.nivel ?? -1),
      costo: (a: Fila, b: Fila) => (a.calculo?.costoTotal ?? -Infinity) - (b.calculo?.costoTotal ?? -Infinity),
      venta: (a: Fila, b: Fila) => (a.calculo?.precioVenta ?? -Infinity) - (b.calculo?.precioVenta ?? -Infinity),
      impuesto: (a: Fila, b: Fila) => (a.calculo?.impuesto ?? -Infinity) - (b.calculo?.impuesto ?? -Infinity),
      margen: (a: Fila, b: Fila) => (a.calculo?.margenNeto ?? -Infinity) - (b.calculo?.margenNeto ?? -Infinity),
      margenPct: (a: Fila, b: Fila) => (a.calculo?.margenPorcentaje ?? -Infinity) - (b.calculo?.margenPorcentaje ?? -Infinity),
      tiempo: (a: Fila, b: Fila) => a.receta.tiempoMinutos - b.receta.tiempoMinutos,
      roi: (a: Fila, b: Fila) => (a.calculo?.roiPorHora ?? -Infinity) - (b.calculo?.roiPorHora ?? -Infinity),
    }),
    [],
  );

  const tabla = useTablaOrdenada(filas, comparadores, "roi", "desc", 30);
  const { irAPagina } = tabla;
  useEffect(() => irAPagina(1), [busqueda, categoriaActiva, soloFavoritos, irAPagina]);

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-extrabold text-text-primary">Mercadillos</h1>
          <span className="text-sm text-text-muted">{recetasCategoria.length} recetas en {categoriaActiva}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSoloFavoritos((s) => !s)}
            className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-bold ${
              soloFavoritos ? "border-accent bg-accent/10 text-accent" : "border-border-strong text-text-secondary"
            }`}
          >
            <span>{soloFavoritos ? "★" : "☆"}</span>
            Favoritos
          </button>
          <input
            placeholder="Buscar receta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted sm:w-60"
          />
          <Link
            to={`/mercadillos/nueva?categoria=${categoriaActiva}`}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink"
          >
            + Nueva receta
          </Link>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-b border-border">
        {CATEGORIAS_MERCADILLO.map((categoria) => (
          <button
            key={categoria}
            type="button"
            onClick={() => setCategoriaActiva(categoria)}
            className={`flex-shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-bold ${
              categoria === categoriaActiva
                ? "border-accent text-accent"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {categoria}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex-1 overflow-auto rounded-xl border border-border bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2">
                <th className="w-10 border-b border-border px-2 py-3" />
                <ThOrdenable label="Nombre" columnKey="nombre" align="left" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <ThOrdenable label="Nivel" columnKey="nivel" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <ThOrdenable label="Costo" columnKey="costo" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <ThOrdenable label="Venta" columnKey="venta" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <ThOrdenable label="Impuesto" columnKey="impuesto" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <ThOrdenable label="Margen $" columnKey="margen" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <ThOrdenable label="Margen %" columnKey="margenPct" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <ThOrdenable label="Tiempo" columnKey="tiempo" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <ThOrdenable label="ROI/h" columnKey="roi" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <th className="border-b border-border px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tabla.visibles.map(({ receta, calculo }) => (
                <tr key={receta.id}>
                  <td className="border-b border-border px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => alternarFavorito(receta.id)}
                      className={favoritos.includes(receta.id) ? "text-accent" : "text-text-muted hover:text-accent"}
                      aria-label="Marcar como favorita"
                      aria-pressed={favoritos.includes(receta.id)}
                    >
                      {favoritos.includes(receta.id) ? "★" : "☆"}
                    </button>
                  </td>
                  <td className="border-b border-border px-4 py-3 font-bold text-text-primary">
                    <Link to={`/mercadillos/${receta.id}`} className="flex items-center gap-2.5">
                      {receta.iconId ? (
                        <img src={iconoDofusDb(receta.iconId)} alt="" className="h-7 w-7 flex-shrink-0 rounded bg-surface-2" />
                      ) : (
                        <div className="h-7 w-7 flex-shrink-0 rounded bg-surface-2" />
                      )}
                      {receta.nombre}
                    </Link>
                  </td>
                  <td className="border-b border-border px-4 py-3 text-right tabular-nums text-text-secondary">
                    {receta.nivel ?? "—"}
                  </td>
                  {calculo ? (
                    <>
                      <td className="border-b border-border px-4 py-3 text-right tabular-nums text-text-primary">
                        {formatExacto(calculo.costoTotal)}
                      </td>
                      <td className="border-b border-border px-4 py-3 text-right tabular-nums text-text-primary">
                        {formatExacto(calculo.precioVenta)}
                      </td>
                      <td className="border-b border-border px-4 py-3 text-right tabular-nums text-text-primary">
                        {formatExacto(calculo.impuesto)}
                      </td>
                      <td
                        className={`border-b border-border px-4 py-3 text-right font-bold tabular-nums ${calculo.margenNeto >= 0 ? "text-good" : "text-critical"}`}
                      >
                        {formatExacto(calculo.margenNeto)}
                      </td>
                      <td
                        className={`border-b border-border px-4 py-3 text-right font-bold tabular-nums ${calculo.margenPorcentaje >= 0 ? "text-good" : "text-critical"}`}
                      >
                        {calculo.margenPorcentaje.toFixed(1)}%
                      </td>
                      <td className="border-b border-border px-4 py-3 text-right tabular-nums text-text-primary">
                        {receta.tiempoMinutos} min
                      </td>
                      <td
                        className={`border-b border-border px-4 py-3 text-right font-extrabold tabular-nums ${calculo.roiPorHora >= 0 ? "text-good" : "text-critical"}`}
                      >
                        {formatExacto(calculo.roiPorHora)}
                      </td>
                    </>
                  ) : (
                    <td colSpan={8} className="border-b border-border px-4 py-3 text-text-muted">
                      Falta un ingrediente en el catálogo de items
                    </td>
                  )}
                  <td className="border-b border-border px-4 py-3 text-right">
                    {esItemDeCatalogo(receta.id) ? null : eliminandoId === receta.id ? (
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <span className="text-xs font-semibold text-text-secondary">¿Eliminar?</span>
                        <button
                          type="button"
                          onClick={() => deleteReceta(receta.id)}
                          className="text-xs font-bold text-critical"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setEliminandoId(null)}
                          className="text-xs font-bold text-text-secondary"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEliminandoId(receta.id)}
                        className="text-text-muted hover:text-critical"
                        aria-label="Eliminar receta"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginacion pagina={tabla.pagina} totalPaginas={tabla.totalPaginas} totalFilas={tabla.totalFilas} onCambiar={tabla.irAPagina} />
      </div>
    </div>
  );
}
