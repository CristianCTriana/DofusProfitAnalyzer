import { useEffect, useMemo, useState } from "react";
import { iconoDofusDb } from "../constants/dofusdb";
import { Paginacion } from "../components/Paginacion";
import { Selector } from "../components/Selector";
import { ThOrdenable } from "../components/ThOrdenable";
import { useAuth } from "../context/AuthContext";
import { useCatalogo } from "../context/CatalogoContext";
import { useServidorActivo } from "../context/ServidorContext";
import { useTablaOrdenada } from "../hooks/useTablaOrdenada";
import { esItemDeCatalogo } from "../services/catalogoDofusDb";
import { getInventario, setCantidadInventario } from "../services/inventario";
import { actualizarPrecioMercado, createItem, updateItem } from "../services/items";
import { sincronizarPrecioComoReceta } from "../services/preciosVinculados";
import { CATEGORIAS_MERCADILLO, type CategoriaMercadillo, type Item } from "../types";

export function Items() {
  const { user } = useAuth();
  const { servidorActivo } = useServidorActivo();
  const { items, recetas } = useCatalogo();
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaMercadillo>(CATEGORIAS_MERCADILLO[0]);
  const [inventario, setInventario] = useState<Record<string, number>>({});

  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCategoria, setNuevoCategoria] = useState<CategoriaMercadillo>(categoriaActiva);
  const [nuevoPrecioMercado, setNuevoPrecioMercado] = useState("");
  const [nuevoPrecioNPC, setNuevoPrecioNPC] = useState("");
  const [nuevoGratis, setNuevoGratis] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCategoria, setEditCategoria] = useState<CategoriaMercadillo>(CATEGORIAS_MERCADILLO[0]);
  const [editPrecioMercado, setEditPrecioMercado] = useState("");
  const [editPrecioNPC, setEditPrecioNPC] = useState("");
  const [inventarioStr, setInventarioStr] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    getInventario(user.uid).then(setInventario);
  }, [user]);

  const itemsCategoria = items.filter((i) => i.categoria === categoriaActiva);
  const filtrados = useMemo(
    () => itemsCategoria.filter((i) => i.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [itemsCategoria, busqueda],
  );

  const comparadores = useMemo(
    () => ({
      nombre: (a: Item, b: Item) => a.nombre.localeCompare(b.nombre),
      nivel: (a: Item, b: Item) => (a.nivel ?? -1) - (b.nivel ?? -1),
      precioMercado: (a: Item, b: Item) => (a.fuentesPrecio[servidorActivo] ?? 0) - (b.fuentesPrecio[servidorActivo] ?? 0),
      precioNPC: (a: Item, b: Item) => (a.precioNPC ?? -1) - (b.precioNPC ?? -1),
      inventario: (a: Item, b: Item) => (inventario[a.id] ?? 0) - (inventario[b.id] ?? 0),
    }),
    [servidorActivo, inventario],
  );

  const tabla = useTablaOrdenada(filtrados, comparadores, "nombre", "asc", 30);
  const { irAPagina } = tabla;
  useEffect(() => irAPagina(1), [busqueda, categoriaActiva, irAPagina]);

  const recetasPorId = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);

  function abrirCreacion() {
    setNuevoCategoria(categoriaActiva);
    setCreando(true);
  }

  function cancelarCreacion() {
    setCreando(false);
    setNuevoNombre("");
    setNuevoPrecioMercado("");
    setNuevoPrecioNPC("");
    setNuevoGratis(false);
  }

  async function guardarNuevoItem() {
    if (!nuevoNombre.trim()) return;
    setGuardando(true);
    const precioMercado = Number(nuevoPrecioMercado) || 0;
    const precioNPC = nuevoPrecioNPC ? Number(nuevoPrecioNPC) : undefined;
    await createItem({
      nombre: nuevoNombre.trim(),
      categoria: nuevoCategoria,
      gratis: nuevoGratis,
      ...(precioNPC !== undefined ? { precioNPC } : {}),
      fuentesPrecio: { [servidorActivo]: precioMercado },
    });
    setGuardando(false);
    cancelarCreacion();
  }

  function iniciarEdicion(item: Item) {
    setEditandoId(item.id);
    setEditNombre(item.nombre);
    setEditCategoria(item.categoria);
    setEditPrecioMercado(String(item.fuentesPrecio[servidorActivo] ?? ""));
    setEditPrecioNPC(item.precioNPC !== undefined ? String(item.precioNPC) : "");
  }

  function cancelarEdicion() {
    setEditandoId(null);
  }

  async function guardarEdicion(item: Item) {
    const precioMercado = Number(editPrecioMercado) || 0;
    if (precioMercado !== (item.fuentesPrecio[servidorActivo] ?? 0)) {
      await actualizarPrecioMercado(item.id, servidorActivo, precioMercado);
      await sincronizarPrecioComoReceta(item.id, servidorActivo, precioMercado, recetasPorId);
    }
    const cambios: Partial<Omit<Item, "id">> = {
      nombre: editNombre.trim() || item.nombre,
      categoria: editCategoria,
    };
    if (editPrecioNPC.trim()) {
      cambios.precioNPC = Number(editPrecioNPC);
    }
    await updateItem(item.id, cambios);
    setEditandoId(null);
  }

  async function toggleGratis(item: Item) {
    await updateItem(item.id, { gratis: !item.gratis });
  }

  async function guardarInventario(itemId: string) {
    if (!user) return;
    const texto = inventarioStr[itemId];
    if (texto === undefined) return;
    const cantidad = Number(texto) || 0;
    setInventario((prev) => ({ ...prev, [itemId]: cantidad }));
    await setCantidadInventario(user.uid, itemId, cantidad);
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-extrabold text-text-primary">Items</h1>
          <span className="text-sm text-text-muted">{itemsCategoria.length} items en {categoriaActiva}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            placeholder="Buscar item..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted sm:w-60"
          />
          <button
            type="button"
            onClick={abrirCreacion}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink"
          >
            + Nuevo item
          </button>
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

      {creando && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-3.5 text-sm font-bold text-text-primary">Nuevo item</h3>
          <div className="flex flex-wrap items-end gap-3.5">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Nombre</label>
              <input
                autoFocus
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none"
              />
            </div>
            <div className="w-40">
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Mercadillo</label>
              <Selector
                value={nuevoCategoria}
                options={CATEGORIAS_MERCADILLO}
                onChange={(v) => setNuevoCategoria(v as CategoriaMercadillo)}
                direction="down"
                triggerClassName="flex w-full items-center justify-between gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm font-bold text-text-primary"
              />
            </div>
            <div className="w-40">
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Precio mercado ({servidorActivo})
              </label>
              <input
                type="number"
                min={0}
                value={nuevoPrecioMercado}
                onChange={(e) => setNuevoPrecioMercado(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none"
              />
            </div>
            <div className="w-32">
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Precio NPC</label>
              <input
                type="number"
                min={0}
                value={nuevoPrecioNPC}
                onChange={(e) => setNuevoPrecioNPC(e.target.value)}
                placeholder="—"
                className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-xs font-semibold text-text-secondary">
              <button
                type="button"
                onClick={() => setNuevoGratis((g) => !g)}
                className={`h-[18px] w-8 rounded-full border transition-colors ${nuevoGratis ? "border-accent bg-accent" : "border-border-strong bg-surface-2"}`}
                aria-pressed={nuevoGratis}
              >
                <span
                  className={`block h-3 w-3 rounded-full bg-white transition-transform ${nuevoGratis ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
              Drop/Recolectable
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelarCreacion}
                className="rounded-lg border border-border-strong px-4 py-2.5 text-sm font-bold text-text-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarNuevoItem}
                disabled={guardando || !nuevoNombre.trim()}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink disabled:opacity-60"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex-1 overflow-auto rounded-xl border border-border bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2">
                <ThOrdenable label="Item" columnKey="nombre" align="left" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <ThOrdenable label="Nivel" columnKey="nivel" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <th className="border-b border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-text-muted">
                  Mercadillo
                </th>
                <ThOrdenable
                  label={`Precio mercado (${servidorActivo})`}
                  columnKey="precioMercado"
                  columnaActiva={tabla.columna}
                  direccion={tabla.direccion}
                  onClick={tabla.ordenarPor}
                />
                <ThOrdenable label="Precio NPC" columnKey="precioNPC" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <th className="border-b border-border px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-text-muted">
                  Drop/Recolectable
                </th>
                <ThOrdenable label="Mi inventario" columnKey="inventario" columnaActiva={tabla.columna} direccion={tabla.direccion} onClick={tabla.ordenarPor} />
                <th className="border-b border-border px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-text-muted">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {tabla.visibles.map((item) => {
                const editando = editandoId === item.id;
                const esCatalogo = esItemDeCatalogo(item.id);
                return (
                  <tr key={item.id} className={editando ? "bg-accent/5" : undefined}>
                    <td className="border-b border-border px-4 py-3 font-bold text-text-primary">
                      {editando && !esCatalogo ? (
                        <input
                          autoFocus
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="w-full rounded-md border border-accent bg-surface-2 px-2 py-1.5 text-sm font-bold text-text-primary outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-2.5">
                          {item.iconId ? (
                            <img src={iconoDofusDb(item.iconId)} alt="" className="h-7 w-7 flex-shrink-0 rounded bg-surface-2" />
                          ) : (
                            <div className="h-7 w-7 flex-shrink-0 rounded bg-surface-2" />
                          )}
                          {item.nombre}
                        </div>
                      )}
                    </td>
                    <td className="border-b border-border px-4 py-3 text-right tabular-nums text-text-secondary">{item.nivel ?? "—"}</td>
                    <td className="border-b border-border px-4 py-3 text-text-secondary">
                      {editando && !esCatalogo ? (
                        <Selector
                          value={editCategoria}
                          options={CATEGORIAS_MERCADILLO}
                          onChange={(v) => setEditCategoria(v as CategoriaMercadillo)}
                          direction="down"
                          triggerClassName="flex items-center gap-1.5 rounded-md border border-accent bg-surface-2 px-2 py-1.5 text-sm font-semibold text-text-primary"
                        />
                      ) : (
                        item.categoria
                      )}
                    </td>
                    <td className="border-b border-border px-4 py-3 text-right tabular-nums text-text-primary">
                      {editando ? (
                        <input
                          value={editPrecioMercado}
                          onChange={(e) => setEditPrecioMercado(e.target.value)}
                          className="w-24 rounded-md border border-accent bg-surface-2 px-2 py-1.5 text-right text-sm text-text-primary outline-none"
                        />
                      ) : (
                        (item.fuentesPrecio[servidorActivo] ?? 0).toLocaleString("es-CO")
                      )}
                    </td>
                    <td className="border-b border-border px-4 py-3 text-right tabular-nums text-text-muted">
                      {editando ? (
                        <input
                          value={editPrecioNPC}
                          onChange={(e) => setEditPrecioNPC(e.target.value)}
                          placeholder="—"
                          className="w-24 rounded-md border border-accent bg-surface-2 px-2 py-1.5 text-right text-sm text-text-primary outline-none placeholder:text-text-muted"
                        />
                      ) : (
                        (item.precioNPC ? item.precioNPC.toLocaleString("es-CO") : "—")
                      )}
                    </td>
                    <td className="border-b border-border px-4 py-3 text-center">
                      <button
                        onClick={() => toggleGratis(item)}
                        className={`h-[18px] w-8 rounded-full border transition-colors ${item.gratis ? "border-accent bg-accent" : "border-border-strong bg-surface-2"}`}
                        aria-pressed={item.gratis}
                        aria-label="Marcar como drop/recolectable"
                      >
                        <span
                          className={`block h-3 w-3 rounded-full bg-white transition-transform ${item.gratis ? "translate-x-4" : "translate-x-0.5"}`}
                        />
                      </button>
                    </td>
                    <td className="border-b border-border px-4 py-3 text-right">
                      <input
                        value={inventarioStr[item.id] ?? String(inventario[item.id] ?? "")}
                        onChange={(e) => setInventarioStr((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={() => guardarInventario(item.id)}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        placeholder="0"
                        className="w-16 rounded-md border border-border-strong bg-surface-2 px-2 py-1.5 text-right text-sm text-text-primary outline-none placeholder:text-text-muted"
                      />
                    </td>
                    <td className="border-b border-border px-4 py-3 text-right">
                      {editando ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => guardarEdicion(item)}
                            className="rounded-md bg-good/20 px-2 py-1 text-xs font-bold text-good"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={cancelarEdicion}
                            className="rounded-md bg-surface-2 px-2 py-1 text-xs font-bold text-text-secondary"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(item)}
                          className="text-text-muted hover:text-accent"
                          aria-label="Editar item"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Paginacion pagina={tabla.pagina} totalPaginas={tabla.totalPaginas} totalFilas={tabla.totalFilas} onCambiar={tabla.irAPagina} />
      </div>
    </div>
  );
}
