import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BotonCopiar } from "../components/BotonCopiar";
import { iconoDofusDb } from "../constants/dofusdb";
import { useAuth } from "../context/AuthContext";
import { useCatalogo } from "../context/CatalogoContext";
import { useServidorActivo } from "../context/ServidorContext";
import {
  agregarRecetaALista,
  alternarCraftearIngrediente,
  guardarListaCalculadora,
  leerListaCalculadora,
  type EntradaCalculadora,
} from "../services/calculadoraLista";
import { costoUnitarioConCraft } from "../services/calculo";
import { getConfigGlobal } from "../services/config";
import { getInventario } from "../services/inventario";
import { updateItem } from "../services/items";
import type { DetalleIngredienteCraft, FuenteCosto, Item, Receta, Servidor } from "../types";
import { formatExacto } from "../utils/formato";

interface FilaIngrediente {
  item: Item;
  cantidadBase: number;
  necesario: number;
  enInventario: number;
  faltante: number;
  costoUnitario: number;
  fuente: FuenteCosto;
  viaCraft: boolean;
  costoAComprar: number;
  costoSinInventario: number;
  /** Presente si este item también tiene su propia receta craftable en el catálogo. */
  subReceta: Receta | undefined;
  /** Desglose de costos de la sub-receta, solo cuando viaCraft es true. */
  detalle: DetalleIngredienteCraft[] | undefined;
}

interface ResultadoEntrada {
  filas: FilaIngrediente[];
  costoTotalSinInventario: number;
  costoTotalConInventario: number;
  ahorro: number;
  ventaTotal: number;
  impuestoTotal: number;
  margenNetoTotal: number;
  roiPorHora: number;
  maxConInventario: number;
  tiempoTotalMin: number;
}

function calcularResultado(
  receta: Receta,
  cantidadX: number,
  itemsPorId: Record<string, Item>,
  servidorActivo: Servidor,
  inventario: Record<string, number>,
  impuestoPorcentaje: number,
  recetasIdsEnLista: Set<string>,
  recetasPorId: Map<string, Receta>,
  craftearIds: Set<string>,
): ResultadoEntrada | null {
  try {
    const filas = receta.ingredientes.map((ing) => {
      const item = itemsPorId[ing.itemId];
      if (!item) throw new Error("falta-item");
      const { costoUnitario, fuente, viaCraft, detalle } = costoUnitarioConCraft(
        ing.itemId,
        itemsPorId,
        servidorActivo,
        recetasIdsEnLista,
        recetasPorId,
        new Set([receta.id]),
        craftearIds,
      );
      const necesario = ing.cantidad * cantidadX;
      const enInventario = inventario[ing.itemId] ?? 0;
      const usado = Math.min(enInventario, necesario);
      const faltante = necesario - usado;
      return {
        item,
        cantidadBase: ing.cantidad,
        necesario,
        enInventario,
        faltante,
        costoUnitario,
        fuente,
        viaCraft,
        costoAComprar: faltante * costoUnitario,
        costoSinInventario: necesario * costoUnitario,
        subReceta: recetasPorId.get(ing.itemId),
        detalle,
      };
    });

    const costoTotalSinInventario = filas.reduce((s, f) => s + f.costoSinInventario, 0);
    const costoTotalConInventario = filas.reduce((s, f) => s + f.costoAComprar, 0);
    const ahorro = costoTotalSinInventario - costoTotalConInventario;
    const precioVenta = receta.preciosVenta?.[servidorActivo] ?? 0;
    const ventaTotal = precioVenta * cantidadX;
    const impuestoTotal = ventaTotal * impuestoPorcentaje;
    const margenNetoTotal = ventaTotal - costoTotalConInventario - impuestoTotal;
    const tiempoTotalMin = receta.tiempoMinutos * cantidadX;
    const roiPorHora = tiempoTotalMin > 0 ? (margenNetoTotal / tiempoTotalMin) * 60 : 0;
    const maxConInventario = Math.min(
      ...receta.ingredientes.map((ing) => Math.floor((inventario[ing.itemId] ?? 0) / ing.cantidad)),
    );

    return {
      filas,
      costoTotalSinInventario,
      costoTotalConInventario,
      ahorro,
      ventaTotal,
      impuestoTotal,
      margenNetoTotal,
      roiPorHora,
      maxConInventario,
      tiempoTotalMin,
    };
  } catch {
    return null;
  }
}

export function Calculadora() {
  const { user } = useAuth();
  const { servidorActivo } = useServidorActivo();
  const { items, recetas } = useCatalogo();
  const [inventario, setInventario] = useState<Record<string, number>>({});
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(0.02);

  const [busquedaReceta, setBusquedaReceta] = useState("");
  const [recetaId, setRecetaId] = useState<string | null>(null);
  const [cantidadStr, setCantidadStr] = useState("1");

  // La lista vive en el navegador de cada persona (localStorage) para que no
  // se pierda al cambiar de pestaña o recargar la página.
  const [lista, setLista] = useState<EntradaCalculadora[]>(() => (user ? leerListaCalculadora(user.uid) : []));
  const [expandidosIds, setExpandidosIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    guardarListaCalculadora(user.uid, lista);
  }, [lista, user]);

  useEffect(() => {
    getConfigGlobal().then((c) => setImpuestoPorcentaje(c.impuestoPorcentaje));
  }, []);
  useEffect(() => {
    if (!user) return;
    getInventario(user.uid).then(setInventario);
  }, [user]);

  const itemsPorId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const recetasPorId = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);
  const recetasIdsEnLista = useMemo(() => new Set(lista.map((entrada) => entrada.recetaId)), [lista]);
  const receta = recetas.find((r) => r.id === recetaId) ?? null;
  const cantidadX = Math.max(0, Number(cantidadStr) || 0);

  const sugerencias = useMemo(() => {
    if (!busquedaReceta.trim() || recetaId) return [];
    const q = busquedaReceta.toLowerCase();
    return recetas.filter((r) => r.nombre.toLowerCase().includes(q)).slice(0, 15);
  }, [recetas, busquedaReceta, recetaId]);

  function elegirReceta(r: Receta) {
    setRecetaId(r.id);
    setBusquedaReceta(r.nombre);
  }

  function cambiarReceta() {
    setRecetaId(null);
    setBusquedaReceta("");
  }

  function agregarALista(e?: FormEvent) {
    e?.preventDefault();
    if (!recetaId || cantidadX <= 0) return;
    const { lista: nuevaLista, id } = agregarRecetaALista(lista, recetaId, cantidadX, crypto.randomUUID());
    setLista(nuevaLista);
    setExpandidosIds((prev) => new Set(prev).add(id));
    setRecetaId(null);
    setBusquedaReceta("");
    setCantidadStr("1");
  }

  function quitarDeLista(id: string) {
    setLista((prev) => prev.filter((entrada) => entrada.id !== id));
    setExpandidosIds((prev) => {
      if (!prev.has(id)) return prev;
      const siguiente = new Set(prev);
      siguiente.delete(id);
      return siguiente;
    });
  }

  function alternarExpandido(id: string) {
    setExpandidosIds((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) {
        siguiente.delete(id);
      } else {
        siguiente.add(id);
      }
      return siguiente;
    });
  }

  function actualizarCantidadEntrada(id: string, valor: string) {
    setLista((prev) => prev.map((entrada) => (entrada.id === id ? { ...entrada, cantidadStr: valor } : entrada)));
  }

  function alternarCraftear(entradaId: string, itemId: string) {
    setLista((prev) => alternarCraftearIngrediente(prev, entradaId, itemId));
  }

  async function toggleGratis(item: Item) {
    await updateItem(item.id, { gratis: !item.gratis });
  }

  const entradas = useMemo(
    () =>
      lista
        .map((entrada) => {
          const recetaEntrada = recetasPorId.get(entrada.recetaId);
          if (!recetaEntrada) return null;
          const cantidad = Math.max(0, Number(entrada.cantidadStr) || 0);
          const resultado = calcularResultado(
            recetaEntrada,
            cantidad,
            itemsPorId,
            servidorActivo,
            inventario,
            impuestoPorcentaje,
            recetasIdsEnLista,
            recetasPorId,
            new Set(entrada.craftearIds ?? []),
          );
          return { entrada, receta: recetaEntrada, cantidad, resultado };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null),
    [lista, recetasPorId, itemsPorId, servidorActivo, inventario, impuestoPorcentaje, recetasIdsEnLista],
  );

  const totalCombinado = useMemo(() => {
    const validas = entradas.filter((e) => e.resultado);
    if (validas.length === 0) return null;
    const suma = (fn: (r: ResultadoEntrada) => number) => validas.reduce((s, e) => s + (e.resultado ? fn(e.resultado) : 0), 0);
    const costoTotalSinInventario = suma((r) => r.costoTotalSinInventario);
    const costoTotalConInventario = suma((r) => r.costoTotalConInventario);
    const ventaTotal = suma((r) => r.ventaTotal);
    const impuestoTotal = suma((r) => r.impuestoTotal);
    const margenNetoTotal = suma((r) => r.margenNetoTotal);
    const tiempoTotalMin = suma((r) => r.tiempoTotalMin);
    const roiPorHora = tiempoTotalMin > 0 ? (margenNetoTotal / tiempoTotalMin) * 60 : 0;
    return {
      recetasCount: validas.length,
      costoTotalSinInventario,
      costoTotalConInventario,
      ahorro: costoTotalSinInventario - costoTotalConInventario,
      ventaTotal,
      impuestoTotal,
      margenNetoTotal,
      roiPorHora,
    };
  }, [entradas]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-text-primary">Calculadora</h1>
        <p className="mt-1 text-sm text-text-muted">
          Agrega varias recetas a la lista para revisarlas y sumar sus resultados — descuenta lo que ya tengas en tu inventario.
        </p>
      </div>

      <form onSubmit={agregarALista} className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Receta</label>
            {recetaId ? (
              <div className="flex items-center justify-between rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  {receta?.iconId ? (
                    <img src={iconoDofusDb(receta.iconId)} alt="" className="h-6 w-6 rounded bg-surface" />
                  ) : (
                    <div className="h-6 w-6 rounded bg-surface" />
                  )}
                  <span className="text-sm font-bold text-text-primary">{receta?.nombre}</span>
                </div>
                <button type="button" onClick={cambiarReceta} className="text-xs font-bold text-accent">
                  Cambiar
                </button>
              </div>
            ) : (
              <input
                autoFocus
                value={busquedaReceta}
                onChange={(e) => setBusquedaReceta(e.target.value)}
                placeholder="Buscar receta..."
                className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            )}
            {sugerencias.length > 0 && (
              <div className="absolute top-full z-10 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-border-strong bg-surface-2 py-1 shadow-lg">
                {sugerencias.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => elegirReceta(r)}
                    className="block w-full px-3 py-2 text-left text-sm font-semibold text-text-secondary hover:bg-surface hover:text-text-primary"
                  >
                    {r.nombre} <span className="text-xs text-text-muted">· {r.categoria}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-full sm:w-32">
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Cantidad</label>
            <input
              type="number"
              min={0}
              value={cantidadStr}
              onChange={(e) => setCantidadStr(e.target.value)}
              className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!recetaId || cantidadX <= 0}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink disabled:opacity-60"
          >
            + Agregar a la lista
          </button>
        </div>
      </form>

      {entradas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong p-8 text-center text-sm text-text-muted">
          Agrega una receta arriba para empezar a comparar cálculos — puedes ir sumando todas las que quieras. Si agregas
          también la receta de un ingrediente (ej. "Sangre de urikornio" para "Cuerno grande de urikornio"), la calculadora
          compara si sale más barato craftearlo o comprarlo.
        </p>
      ) : (
        <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:overflow-hidden">
          <div className="flex flex-1 flex-col gap-3.5 lg:overflow-y-auto lg:pr-1">
            {entradas.map(({ entrada, receta: recetaEntrada, resultado }) => {
              const expandido = expandidosIds.has(entrada.id);
              return (
                <div key={entrada.id} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-center gap-3.5">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => alternarExpandido(entrada.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          alternarExpandido(entrada.id);
                        }
                      }}
                      className="flex min-w-[180px] flex-1 cursor-pointer items-center gap-2.5 text-left"
                    >
                      <span className={`shrink-0 text-text-muted transition-transform ${expandido ? "rotate-90" : ""}`}>▶</span>
                      {recetaEntrada.iconId ? (
                        <img src={iconoDofusDb(recetaEntrada.iconId)} alt="" className="h-8 w-8 shrink-0 rounded bg-surface-2" />
                      ) : (
                        <div className="h-8 w-8 shrink-0 rounded bg-surface-2" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="truncate text-sm font-bold text-text-primary">{recetaEntrada.nombre}</div>
                          <span onClick={(e) => e.stopPropagation()}>
                            <BotonCopiar texto={recetaEntrada.nombre} />
                          </span>
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {recetaEntrada.categoria}
                          {recetaEntrada.nivel !== undefined && ` · Nv. ${recetaEntrada.nivel}`}
                        </div>
                      </div>
                    </div>
                    <div className="w-20 shrink-0">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={entrada.cantidadStr}
                        onChange={(e) => actualizarCantidadEntrada(entrada.id, e.target.value)}
                        className="w-full rounded-md border border-border-strong bg-surface-2 px-2 py-1.5 text-center text-sm text-text-primary"
                      />
                    </div>
                    {resultado ? (
                      <>
                        <MiniStat label="Costo" valor={formatExacto(resultado.costoTotalConInventario)} />
                        <MiniStat label="Venta" valor={formatExacto(resultado.ventaTotal)} />
                        <MiniStat
                          label="Margen"
                          valor={formatExacto(resultado.margenNetoTotal)}
                          destacado={resultado.margenNetoTotal >= 0 ? "good" : "critical"}
                        />
                        <MiniStat label="ROI/h" valor={formatExacto(resultado.roiPorHora)} destacado="accent" />
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-critical">Falta un ingrediente en el catálogo</span>
                    )}
                    <button
                      type="button"
                      onClick={() => quitarDeLista(entrada.id)}
                      className="shrink-0 text-text-muted hover:text-critical"
                      aria-label="Quitar de la lista"
                    >
                      ✕
                    </button>
                  </div>

                  {expandido && resultado && (
                    <div className="mt-4 border-t border-border pt-4">
                      <div className="overflow-x-auto">
                        <div className="min-w-[680px]">
                          <div className="flex gap-3.5 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wide text-text-muted">
                            <div className="min-w-0 flex-1">Item</div>
                            <div className="w-20 shrink-0 text-right">Necesario</div>
                            <div className="w-20 shrink-0 text-right">Tienes</div>
                            <div className="w-20 shrink-0 text-right">Falta</div>
                            <div className="w-24 shrink-0 text-right">Costo a comprar</div>
                            <div className="w-28 shrink-0 text-right">Drop/Recol.</div>
                          </div>
                          {resultado.filas.map((f) => {
                            const yaEsListaAparte = recetasIdsEnLista.has(f.item.id);
                            const marcado = (entrada.craftearIds ?? []).includes(f.item.id);
                            return (
                              <div key={f.item.id} className="border-b border-border py-2.5 last:border-none">
                                <div className="flex items-center gap-3.5">
                                  {f.item.iconId ? (
                                    <img src={iconoDofusDb(f.item.iconId)} alt="" className="h-6 w-6 shrink-0 rounded bg-surface-2" />
                                  ) : (
                                    <div className="h-6 w-6 shrink-0 rounded bg-surface-2" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <div className="truncate text-sm font-semibold text-text-primary">{f.item.nombre}</div>
                                      <BotonCopiar texto={f.item.nombre} />
                                    </div>
                                    <div className="text-[11px] text-text-muted">
                                      {f.viaCraft
                                        ? "Conviene craftear"
                                        : f.fuente === "gratis"
                                          ? "Lo consigo yo (drop/craft)"
                                          : f.fuente === "npc"
                                            ? "Precio NPC (fijo)"
                                            : `Mercado · ${servidorActivo}`}
                                    </div>
                                  </div>
                                  <div className="w-20 shrink-0 text-right text-sm tabular-nums text-text-secondary">
                                    {formatExacto(f.necesario)}
                                  </div>
                                  <div className="w-20 shrink-0 text-right text-sm tabular-nums text-text-secondary">
                                    {formatExacto(f.enInventario)}
                                  </div>
                                  <div
                                    className={`w-20 shrink-0 text-right text-sm font-bold tabular-nums ${f.faltante > 0 ? "text-critical" : "text-good"}`}
                                  >
                                    {formatExacto(f.faltante)}
                                  </div>
                                  <div className="w-24 shrink-0 text-right text-sm font-bold tabular-nums text-text-primary">
                                    {formatExacto(f.costoAComprar)}
                                  </div>
                                  <div className="flex w-28 shrink-0 items-center justify-end gap-2">
                                    <span className="text-xs font-semibold text-text-secondary">{f.item.gratis ? "Sí" : "No"}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleGratis(f.item)}
                                      className={`h-[18px] w-8 shrink-0 rounded-full border ${f.item.gratis ? "border-accent bg-accent" : "border-border-strong bg-surface-2"}`}
                                      aria-pressed={f.item.gratis}
                                    >
                                      <span className={`block h-3 w-3 rounded-full bg-white ${f.item.gratis ? "translate-x-4" : "translate-x-0.5"}`} />
                                    </button>
                                  </div>
                                </div>
                                {f.subReceta && !yaEsListaAparte && (
                                  <label className="mt-1.5 flex items-center gap-1.5 pl-9 text-[11px] font-semibold text-accent">
                                    <input
                                      type="checkbox"
                                      checked={marcado}
                                      onChange={() => alternarCraftear(entrada.id, f.item.id)}
                                    />
                                    Craftear esta sub-receta (sumar al cálculo)
                                  </label>
                                )}
                                {f.detalle && (
                                  <DetalleCraftLista
                                    detalle={f.detalle}
                                    multiplicador={f.necesario}
                                    itemsPorId={itemsPorId}
                                    recetasPorId={recetasPorId}
                                    recetasIdsEnLista={recetasIdsEnLista}
                                    craftearIds={entrada.craftearIds ?? []}
                                    onToggleCraftear={(itemId) => alternarCraftear(entrada.id, itemId)}
                                    onToggleGratis={toggleGratis}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {Number.isFinite(resultado.maxConInventario) && (
                        <div className="mt-3 rounded-lg border border-accent/35 bg-accent/10 px-4 py-2.5 text-xs font-semibold text-text-primary">
                          {resultado.maxConInventario > 0
                            ? `Con lo que ya tienes en tu inventario, puedes craftear ${resultado.maxConInventario}x sin comprar nada.`
                            : "Con tu inventario actual no te alcanza para craftear ninguna sin comprar."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <aside className="w-full flex-shrink-0 rounded-xl border border-border bg-surface p-6 lg:w-[340px]">
            <h3 className="mb-1 text-sm font-bold text-text-primary">Total combinado</h3>
            <p className="mb-4 text-xs text-text-muted">
              {totalCombinado?.recetasCount ?? 0} receta{(totalCombinado?.recetasCount ?? 0) === 1 ? "" : "s"} · servidor {servidorActivo}
            </p>
            {totalCombinado && (
              <>
                <Fila label="Costo comprando todo" valor={formatExacto(totalCombinado.costoTotalSinInventario)} />
                <Fila label="Ahorro por tu inventario" valor={`-${formatExacto(totalCombinado.ahorro)}`} destacado="good" />
                <div className="my-1.5 border-t border-dashed border-border-strong" />
                <Fila label="Costo real a comprar" valor={formatExacto(totalCombinado.costoTotalConInventario)} />
                <Fila label="Venta total" valor={formatExacto(totalCombinado.ventaTotal)} />
                <Fila label="Impuesto" valor={`-${formatExacto(totalCombinado.impuestoTotal)}`} destacado="critical" />
                <div className="my-1.5 border-t border-dashed border-border-strong" />
                <div className="flex justify-between pt-3">
                  <span className="text-sm font-bold text-text-primary">Ganancia neta total</span>
                  <span className={`text-lg font-extrabold ${totalCombinado.margenNetoTotal >= 0 ? "text-good" : "text-critical"}`}>
                    {formatExacto(totalCombinado.margenNetoTotal)}
                  </span>
                </div>
                <div className="mt-[18px] rounded-[10px] border border-accent/35 bg-accent/10 p-[18px] text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">ROI por hora combinado</div>
                  <div className="mt-1 text-3xl font-extrabold text-accent">{formatExacto(totalCombinado.roiPorHora)}</div>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Fila({ label, valor, destacado }: { label: string; valor: string; destacado?: "good" | "critical" }) {
  return (
    <div className="flex justify-between py-2 text-sm text-text-secondary">
      <span>{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          destacado === "good" ? "text-good" : destacado === "critical" ? "text-critical" : "text-text-primary"
        }`}
      >
        {valor}
      </span>
    </div>
  );
}

function DetalleCraftLista({
  detalle,
  multiplicador,
  itemsPorId,
  recetasPorId,
  recetasIdsEnLista,
  craftearIds,
  onToggleCraftear,
  onToggleGratis,
}: {
  detalle: DetalleIngredienteCraft[];
  multiplicador: number;
  itemsPorId: Record<string, Item>;
  recetasPorId: Map<string, Receta>;
  recetasIdsEnLista: Set<string>;
  craftearIds: string[];
  onToggleCraftear: (itemId: string) => void;
  onToggleGratis: (item: Item) => void;
}) {
  return (
    <div className="ml-9 mt-2 space-y-2 border-l-2 border-border pl-3.5">
      {detalle.map((d) => {
        const item = itemsPorId[d.itemId];
        if (!item) return null;
        const cantidadTotal = d.cantidad * multiplicador;
        const subReceta = recetasPorId.get(d.itemId);
        const yaEsListaAparte = recetasIdsEnLista.has(d.itemId);
        const marcado = craftearIds.includes(d.itemId);
        return (
          <div key={d.itemId}>
            <div className="flex items-center gap-2.5">
              {item.iconId ? (
                <img src={iconoDofusDb(item.iconId)} alt="" className="h-5 w-5 shrink-0 rounded bg-surface-2" />
              ) : (
                <div className="h-5 w-5 shrink-0 rounded bg-surface-2" />
              )}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-text-secondary">{item.nombre}</span>
                <BotonCopiar texto={item.nombre} />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-text-muted">{formatExacto(cantidadTotal)}x</span>
              <span className="w-20 shrink-0 text-right text-xs font-bold tabular-nums text-text-primary">
                {formatExacto(d.costoUnitario * cantidadTotal)}
              </span>
              <button
                type="button"
                onClick={() => onToggleGratis(item)}
                title="Drop/Recol. (lo consigo yo, sin costo)"
                className={`h-[14px] w-6 shrink-0 rounded-full border ${item.gratis ? "border-accent bg-accent" : "border-border-strong bg-surface-2"}`}
                aria-pressed={item.gratis}
              >
                <span className={`block h-2 w-2 rounded-full bg-white ${item.gratis ? "translate-x-3" : "translate-x-0.5"}`} />
              </button>
            </div>
            {subReceta && !yaEsListaAparte && (
              <label className="mt-1 flex items-center gap-1.5 pl-7 text-[10px] font-semibold text-accent">
                <input type="checkbox" checked={marcado} onChange={() => onToggleCraftear(d.itemId)} />
                Craftear esta sub-receta (sumar al cálculo)
              </label>
            )}
            {d.detalle && (
              <DetalleCraftLista
                detalle={d.detalle}
                multiplicador={cantidadTotal}
                itemsPorId={itemsPorId}
                recetasPorId={recetasPorId}
                recetasIdsEnLista={recetasIdsEnLista}
                craftearIds={craftearIds}
                onToggleCraftear={onToggleCraftear}
                onToggleGratis={onToggleGratis}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ label, valor, destacado }: { label: string; valor: string; destacado?: "good" | "critical" | "accent" }) {
  const color =
    destacado === "good" ? "text-good" : destacado === "critical" ? "text-critical" : destacado === "accent" ? "text-accent" : "text-text-primary";
  return (
    <div className="flex shrink-0 flex-col items-end">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{valor}</span>
    </div>
  );
}
