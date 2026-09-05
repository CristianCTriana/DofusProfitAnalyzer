import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BotonCopiar } from "../components/BotonCopiar";
import { Selector } from "../components/Selector";
import { iconoDofusDb } from "../constants/dofusdb";
import { useAuth } from "../context/AuthContext";
import { useCatalogo } from "../context/CatalogoContext";
import { useServidorActivo } from "../context/ServidorContext";
import { esItemDeCatalogo } from "../services/catalogoDofusDb";
import { calcularReceta, costoEfectivoItem } from "../services/calculo";
import { agregarRecetaALista, guardarListaCalculadora, leerListaCalculadora } from "../services/calculadoraLista";
import { getConfigGlobal } from "../services/config";
import { actualizarPrecioMercado, updateItem } from "../services/items";
import { sincronizarPrecioComoItem, sincronizarPrecioComoReceta } from "../services/preciosVinculados";
import { createReceta, deleteReceta, updateReceta } from "../services/recetas";
import { getPerfilUsuario, setFavorito } from "../services/usuarios";
import { CATEGORIAS_MERCADILLO, type CategoriaMercadillo, type Item, type Servidor } from "../types";
import { formatExacto } from "../utils/formato";

interface IngredienteForm {
  itemId: string;
  cantidadStr: string;
}

export function RecetaDetalle() {
  const { id } = useParams<{ id: string }>();
  const esNueva = !id || id === "nueva";
  const esCatalogo = !esNueva && !!id && esItemDeCatalogo(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { servidorActivo } = useServidorActivo();
  const { items, recetas, cargando } = useCatalogo();

  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(0.02);
  const [nombre, setNombre] = useState("");
  const [iconId, setIconId] = useState<number | undefined>(undefined);
  const [nivel, setNivel] = useState<number | undefined>(undefined);
  const [esFavorito, setEsFavorito] = useState(false);
  const categoriaInicial = CATEGORIAS_MERCADILLO.find((c) => c === searchParams.get("categoria"));
  const [categoria, setCategoria] = useState<CategoriaMercadillo>(categoriaInicial ?? CATEGORIAS_MERCADILLO[0]);
  const [tiempoMinutosStr, setTiempoMinutosStr] = useState("5");
  const [preciosVenta, setPreciosVenta] = useState<Record<Servidor, number>>({});
  const [precioVentaStr, setPrecioVentaStr] = useState("");
  const [ingredientes, setIngredientes] = useState<IngredienteForm[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [editandoPrecioItemId, setEditandoPrecioItemId] = useState<string | null>(null);
  const [precioItemStr, setPrecioItemStr] = useState("");
  const [agregadoCalculadora, setAgregadoCalculadora] = useState(false);
  const servidorAnteriorRef = useRef(servidorActivo);
  const volverAMercadillos = `/mercadillos?categoria=${categoria}`;

  const tiempoMinutos = Number(tiempoMinutosStr) || 0;
  const precioVenta = Number(precioVentaStr) || 0;

  useEffect(() => {
    getConfigGlobal().then((c) => setImpuestoPorcentaje(c.impuestoPorcentaje));
  }, []);

  // Se carga una sola vez cuando el catálogo ya está listo (o cambia la receta
  // que se está viendo) — no en cada actualización en vivo, para no pisar lo
  // que la persona esté escribiendo.
  useEffect(() => {
    if (esNueva || !id || cargando) return;
    const receta = recetas.find((r) => r.id === id);
    if (!receta) return;
    setNombre(receta.nombre);
    setCategoria(receta.categoria);
    setTiempoMinutosStr(String(receta.tiempoMinutos));
    setPreciosVenta(receta.preciosVenta ?? {});
    setPrecioVentaStr(String((receta.preciosVenta ?? {})[servidorActivo] ?? ""));
    setIngredientes(receta.ingredientes.map((i) => ({ itemId: i.itemId, cantidadStr: String(i.cantidad) })));
    setIconId(receta.iconId);
    setNivel(receta.nivel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, esNueva, cargando]);

  useEffect(() => {
    if (esNueva || !id || !user) return;
    getPerfilUsuario(user.uid).then((perfil) => setEsFavorito((perfil.favoritos ?? []).includes(id)));
  }, [id, esNueva, user]);

  async function alternarFavorito() {
    if (!user || !id) return;
    setEsFavorito((prev) => !prev);
    await setFavorito(user.uid, id, !esFavorito);
  }

  // El precio de venta varía por servidor, igual que los precios de compra:
  // al cambiar de servidor se guarda el valor tipeado para el servidor
  // anterior y se muestra el que haya guardado (o vacío) para el nuevo.
  useEffect(() => {
    const anterior = servidorAnteriorRef.current;
    if (anterior === servidorActivo) return;
    setPreciosVenta((prev) => ({ ...prev, [anterior]: Number(precioVentaStr) || 0 }));
    setPrecioVentaStr(String(preciosVenta[servidorActivo] ?? ""));
    servidorAnteriorRef.current = servidorActivo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servidorActivo]);

  const itemsPorId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const idsDeItems = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const recetasPorId = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);

  const ingredientesNumericos = useMemo(
    () => ingredientes.map((i) => ({ itemId: i.itemId, cantidad: Number(i.cantidadStr) || 0 })),
    [ingredientes],
  );

  const calculo = useMemo(() => {
    try {
      return calcularReceta(
        {
          id: id ?? "",
          nombre,
          categoria,
          tiempoMinutos,
          ingredientes: ingredientesNumericos,
          preciosVenta: { [servidorActivo]: precioVenta },
        },
        itemsPorId,
        servidorActivo,
        precioVenta,
        impuestoPorcentaje,
      );
    } catch {
      return null;
    }
  }, [id, nombre, categoria, tiempoMinutos, ingredientesNumericos, precioVenta, itemsPorId, servidorActivo, impuestoPorcentaje]);

  function agregarIngrediente() {
    const primerItem = items[0];
    if (!primerItem) return;
    setIngredientes((prev) => [...prev, { itemId: primerItem.id, cantidadStr: "1" }]);
  }

  function actualizarIngrediente(index: number, cambios: Partial<IngredienteForm>) {
    setIngredientes((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...cambios } : ing)));
  }

  function quitarIngrediente(index: number) {
    setIngredientes((prev) => prev.filter((_, i) => i !== index));
  }

  async function toggleGratis(item: Item) {
    await updateItem(item.id, { gratis: !item.gratis });
  }

  function agregarACalculadora() {
    if (!user || esNueva || !id) return;
    const listaActual = leerListaCalculadora(user.uid);
    const { lista: nuevaLista } = agregarRecetaALista(listaActual, id, 1, crypto.randomUUID());
    guardarListaCalculadora(user.uid, nuevaLista);
    setAgregadoCalculadora(true);
    setTimeout(() => setAgregadoCalculadora(false), 1500);
  }

  function iniciarEdicionPrecioItem(item: Item) {
    setEditandoPrecioItemId(item.id);
    setPrecioItemStr(String(item.fuentesPrecio[servidorActivo] ?? ""));
  }

  async function guardarPrecioItem(item: Item) {
    const precio = Number(precioItemStr) || 0;
    setEditandoPrecioItemId(null);
    if (precio === (item.fuentesPrecio[servidorActivo] ?? 0)) return;
    await actualizarPrecioMercado(item.id, servidorActivo, precio);
    await sincronizarPrecioComoReceta(item.id, servidorActivo, precio, recetasPorId);
  }

  async function guardar() {
    setGuardando(true);
    if (esCatalogo && id) {
      // Solo tiempo de crafteo y precio de venta son editables en recetas del catálogo.
      const preciosVentaFinal = { ...preciosVenta, [servidorActivo]: precioVenta };
      await updateReceta(id, { tiempoMinutos, preciosVenta: preciosVentaFinal });
      await sincronizarPrecioComoItem(id, servidorActivo, precioVenta, idsDeItems);
      setGuardando(false);
      navigate(volverAMercadillos);
      return;
    }
    const preciosVentaFinal = { ...preciosVenta, [servidorActivo]: precioVenta };
    const data = { nombre, categoria, tiempoMinutos, ingredientes: ingredientesNumericos, preciosVenta: preciosVentaFinal };
    if (esNueva) {
      await createReceta(data);
      navigate(volverAMercadillos);
    } else if (id) {
      await updateReceta(id, data);
      await sincronizarPrecioComoItem(id, servidorActivo, precioVenta, idsDeItems);
      setGuardando(false);
      navigate(volverAMercadillos);
    }
  }

  async function eliminar() {
    if (!id) return;
    await deleteReceta(id);
    navigate(volverAMercadillos);
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          {iconId ? (
            <img src={iconoDofusDb(iconId)} alt="" className="h-7 w-7 rounded bg-surface-2" />
          ) : (
            <div className="h-7 w-7 rounded bg-surface-2" />
          )}
          <div className="text-sm font-semibold text-text-muted">
            Mercadillos <b className="ml-1.5 text-[15px] font-extrabold text-text-primary">/ {nombre || "Nueva receta"}</b>
            {nivel !== undefined && <span className="ml-1.5 text-xs font-semibold text-text-muted">Nv. {nivel}</span>}
          </div>
          {!esNueva && (
            <button
              type="button"
              onClick={agregarACalculadora}
              title="Agregar esta receta a la Calculadora"
              className="rounded-md bg-surface-2 px-2 py-1 text-xs font-bold text-text-secondary hover:text-accent"
            >
              {agregadoCalculadora ? "¡Agregada!" : "+ Calculadora"}
            </button>
          )}
          {!esNueva && (
            <button
              type="button"
              onClick={alternarFavorito}
              className={`ml-1 text-lg ${esFavorito ? "text-accent" : "text-text-muted hover:text-accent"}`}
              aria-label="Marcar como favorita"
              aria-pressed={esFavorito}
            >
              {esFavorito ? "★" : "☆"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {!esNueva &&
            !esCatalogo &&
            (confirmandoEliminar ? (
              <>
                <span className="self-center text-sm font-semibold text-text-secondary">¿Eliminar esta receta?</span>
                <button
                  type="button"
                  onClick={() => setConfirmandoEliminar(false)}
                  className="rounded-lg border border-border-strong px-4 py-2.5 text-sm font-bold text-text-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={eliminar}
                  className="rounded-lg bg-critical px-4 py-2.5 text-sm font-bold text-white"
                >
                  Sí, eliminar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmandoEliminar(true)}
                className="rounded-lg border border-border-strong px-[18px] py-2.5 text-sm font-bold text-critical"
              >
                Eliminar
              </button>
            ))}
          <button
            type="button"
            onClick={() => navigate(volverAMercadillos)}
            className="rounded-lg border border-border-strong px-[18px] py-2.5 text-sm font-bold text-text-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || !nombre}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar receta"}
          </button>
        </div>
      </div>

      {esCatalogo && (
        <p className="rounded-lg border border-border-strong bg-surface-2 px-4 py-2.5 text-xs font-semibold text-text-secondary">
          Esta receta viene del catálogo de Dofus — el nombre, el mercadillo y los ingredientes no se pueden
          editar. Solo el tiempo de crafteo y el precio de venta son tuyos para ajustar.
        </p>
      )}

      <div className="flex flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  Nombre de la receta
                </label>
                {esCatalogo ? (
                  <p className="rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm font-bold text-text-primary">
                    {nombre}
                  </p>
                ) : (
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none"
                  />
                )}
              </div>
              <div className="w-full sm:w-44">
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Mercadillo</label>
                {esCatalogo ? (
                  <p className="rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm font-bold text-text-primary">
                    {categoria}
                  </p>
                ) : (
                  <Selector
                    value={categoria}
                    options={CATEGORIAS_MERCADILLO}
                    onChange={(v) => setCategoria(v as CategoriaMercadillo)}
                    direction="down"
                    triggerClassName="flex w-full items-center justify-between gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm font-bold text-text-primary"
                  />
                )}
              </div>
              <div className="w-full sm:w-40">
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  Tiempo de crafteo
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={tiempoMinutosStr}
                    onChange={(e) => setTiempoMinutosStr(e.target.value)}
                    className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted">
                    min
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="mb-3.5 text-sm font-bold text-text-primary">Ingredientes</h3>
            <div className="overflow-x-auto">
            <div className="min-w-[640px]">
            <div className="flex gap-3.5 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wide text-text-muted">
              <div className="min-w-0 flex-1">Item</div>
              <div className="w-14 shrink-0 text-center">Cant.</div>
              <div className="w-24 shrink-0 text-right">Costo unit.</div>
              <div className="w-24 shrink-0 text-right">Subtotal</div>
              <div className="w-28 shrink-0 text-right">Drop/Recol.</div>
              {!esCatalogo && <div className="w-6 shrink-0" />}
            </div>
            {ingredientes.map((ing, index) => {
              const item = itemsPorId[ing.itemId];
              if (!item) return null;
              const cantidad = Number(ing.cantidadStr) || 0;
              const { costoUnitario, fuente } = costoEfectivoItem(item, servidorActivo);
              const precioMercado = item.fuentesPrecio[servidorActivo];
              return (
                <div key={index} className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-none">
                  {item.iconId ? (
                    <img src={iconoDofusDb(item.iconId)} alt="" className="h-8 w-8 shrink-0 rounded bg-surface-2" />
                  ) : (
                    <div className="h-8 w-8 shrink-0 rounded bg-surface-2" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {esCatalogo ? (
                        <div className="truncate text-sm font-bold text-text-primary">{item.nombre}</div>
                      ) : (
                        <select
                          value={ing.itemId}
                          onChange={(e) => actualizarIngrediente(index, { itemId: e.target.value })}
                          className="w-full rounded-md border border-border-strong bg-surface-2 px-2 py-1.5 text-sm font-bold text-text-primary"
                        >
                          {CATEGORIAS_MERCADILLO.map((cat) => {
                            const itemsDeCategoria = items.filter((i) => i.categoria === cat);
                            if (itemsDeCategoria.length === 0) return null;
                            return (
                              <optgroup key={cat} label={cat}>
                                {itemsDeCategoria.map((i) => (
                                  <option key={i.id} value={i.id}>
                                    {i.nombre}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      )}
                      <BotonCopiar texto={item.nombre} />
                    </div>
                    <div className="mt-1 text-[11px] text-text-muted">
                      {fuente === "gratis" ? "Lo consigo yo (drop/craft)" : fuente === "npc" ? "Precio NPC (fijo)" : `Mercado · ${servidorActivo}`}
                    </div>
                  </div>
                  {esCatalogo ? (
                    <div className="w-14 shrink-0 text-center text-sm text-text-primary">{cantidad}</div>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={ing.cantidadStr}
                      onChange={(e) => actualizarIngrediente(index, { cantidadStr: e.target.value })}
                      className="w-14 shrink-0 rounded-md border border-border-strong bg-surface-2 px-2 py-1.5 text-center text-sm text-text-primary"
                    />
                  )}
                  <div className="w-24 shrink-0 text-right">
                    {editandoPrecioItemId === item.id ? (
                      <input
                        autoFocus
                        value={precioItemStr}
                        onChange={(e) => setPrecioItemStr(e.target.value)}
                        onBlur={() => guardarPrecioItem(item)}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        className="w-full rounded-md border border-accent bg-surface-2 px-2 py-1 text-right text-sm text-text-primary outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => iniciarEdicionPrecioItem(item)}
                        title="Editar precio de mercado"
                        className={`w-full text-right text-sm tabular-nums hover:text-accent ${item.gratis ? "text-text-muted line-through" : "text-text-secondary"}`}
                      >
                        {formatExacto(item.gratis ? (precioMercado ?? item.precioNPC ?? 0) : (precioMercado ?? 0))}
                      </button>
                    )}
                  </div>
                  <div className="w-24 shrink-0 text-right text-sm font-bold tabular-nums text-text-primary">
                    {formatExacto(costoUnitario * cantidad)}
                  </div>
                  <div className="flex w-28 shrink-0 items-center justify-end gap-2">
                    <span className="text-xs font-semibold text-text-secondary">{item.gratis ? "Sí" : "No"}</span>
                    <button
                      onClick={() => toggleGratis(item)}
                      className={`h-[18px] w-8 shrink-0 rounded-full border ${item.gratis ? "border-accent bg-accent" : "border-border-strong bg-surface-2"}`}
                      aria-pressed={item.gratis}
                    >
                      <span className={`block h-3 w-3 rounded-full bg-white ${item.gratis ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  {!esCatalogo && (
                    <button onClick={() => quitarIngrediente(index)} className="w-6 shrink-0 text-text-muted hover:text-critical">
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            </div>
            </div>
            {!esCatalogo &&
              (items.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-border-strong py-3 text-center text-sm text-text-muted">
                  Primero crea items en{" "}
                  <Link to="/items" className="font-bold text-accent">
                    Items
                  </Link>{" "}
                  para poder agregarlos aquí.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={agregarIngrediente}
                  className="mt-2 w-full rounded-lg border border-dashed border-border-strong py-3 text-sm font-bold text-text-secondary"
                >
                  + Agregar ingrediente
                </button>
              ))}
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
              Precio de venta (mercado · {servidorActivo})
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                value={precioVentaStr}
                onChange={(e) => setPrecioVentaStr(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface-2 px-3.5 py-3.5 text-lg font-extrabold text-text-primary outline-none"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted">
                kamas
              </span>
            </div>
          </div>
        </div>

        <aside className="w-full flex-shrink-0 rounded-xl border border-border bg-surface p-6 lg:w-[340px]">
          <h3 className="mb-1 text-sm font-bold text-text-primary">Resumen de rentabilidad</h3>
          <p className="mb-4 text-xs text-text-muted">Cálculo en vivo · servidor {servidorActivo}</p>
          {calculo && (
            <>
              <Fila label="Costo total ingredientes" valor={formatExacto(calculo.costoTotal)} />
              <Fila label="Precio de venta" valor={formatExacto(calculo.precioVenta)} />
              <Fila label="Margen bruto" valor={formatExacto(calculo.margenBruto)} />
              <Fila label="Impuesto (2%)" valor={`-${formatExacto(calculo.impuesto)}`} destacado="critical" />
              <div className="my-1.5 border-t border-dashed border-border-strong" />
              <div className="flex justify-between pt-3">
                <span className="text-sm font-bold text-text-primary">Margen neto</span>
                <span className={`text-lg font-extrabold ${calculo.margenNeto >= 0 ? "text-good" : "text-critical"}`}>
                  {formatExacto(calculo.margenNeto)}
                </span>
              </div>
              <Fila label="Tiempo de crafteo" valor={`${tiempoMinutos} min`} />
              <div className="mt-[18px] rounded-[10px] border border-accent/35 bg-accent/10 p-[18px] text-center">
                <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">ROI por hora</div>
                <div className="mt-1 text-3xl font-extrabold text-accent">{formatExacto(calculo.roiPorHora)}</div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Fila({ label, valor, destacado }: { label: string; valor: string; destacado?: "critical" }) {
  return (
    <div className="flex justify-between py-2 text-sm text-text-secondary">
      <span>{label}</span>
      <span className={`font-semibold tabular-nums ${destacado === "critical" ? "text-critical" : "text-text-primary"}`}>
        {valor}
      </span>
    </div>
  );
}
