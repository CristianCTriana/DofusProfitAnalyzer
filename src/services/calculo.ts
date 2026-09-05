import type {
  CostoIngrediente,
  DetalleIngredienteCraft,
  FuenteCosto,
  Item,
  Receta,
  ResultadoCalculoReceta,
  Servidor,
} from "../types";

export const IMPUESTO_PORCENTAJE_DEFAULT = 0.02;

/**
 * El costo efectivo de un item es el mínimo disponible entre mercado y NPC,
 * salvo que el item esté marcado como "gratis" (drop/craft propio), en cuyo
 * caso el costo es 0 sin importar el resto de las fuentes.
 */
export function costoEfectivoItem(
  item: Item,
  servidorActivo: Servidor,
): { costoUnitario: number; fuente: FuenteCosto } {
  if (item.gratis) {
    return { costoUnitario: 0, fuente: "gratis" };
  }

  const precioMercado = item.fuentesPrecio[servidorActivo];
  const candidatos: { costoUnitario: number; fuente: FuenteCosto }[] = [];

  if (precioMercado !== undefined) {
    candidatos.push({ costoUnitario: precioMercado, fuente: "mercado" });
  }
  // Un precio NPC de 0 no es un precio real: significa que ese recurso no se
  // puede comprar a ningún NPC, así que no debe competir como candidato.
  if (item.precioNPC !== undefined && item.precioNPC > 0) {
    candidatos.push({ costoUnitario: item.precioNPC, fuente: "npc" });
  }

  if (candidatos.length === 0) {
    return { costoUnitario: 0, fuente: "gratis" };
  }

  return candidatos.reduce((min, c) => (c.costoUnitario < min.costoUnitario ? c : min));
}

/**
 * Costo de un ingrediente considerando también la opción de craftearlo.
 * Un ingrediente se craftea cuando:
 * - el usuario lo marcó explícitamente en `craftearIds` (opción manual desde
 *   el desplegable de la calculadora, sin necesidad de agregar la sub-receta
 *   como una entrada aparte en la lista) — en ese caso siempre se craftea; o
 * - su propia receta está en `recetasIdsEnLista` (ej. la calculadora tiene
 *   tanto "Cuerno grande de urikornio" como "Sangre de urikornio" en la
 *   lista, cada una como su propia entrada) — en ese caso se compara el
 *   precio de compra contra el costo de craftear y se usa el más barato.
 * En ambos casos el costo de craftear se calcula recursivamente con los
 * ingredientes de la sub-receta (con protección contra ciclos), devolviendo
 * también el desglose para poder mostrarlo en la UI.
 */
export function costoUnitarioConCraft(
  itemId: string,
  itemsPorId: Record<string, Item>,
  servidorActivo: Servidor,
  recetasIdsEnLista: Set<string>,
  recetasPorId: Map<string, Receta>,
  visitados: Set<string> = new Set(),
  craftearIds: Set<string> = new Set(),
): { costoUnitario: number; fuente: FuenteCosto; viaCraft: boolean; detalle?: DetalleIngredienteCraft[] } {
  const item = itemsPorId[itemId];
  if (!item) {
    throw new Error(`Item no encontrado: ${itemId}`);
  }
  const { costoUnitario: costoComprar, fuente } = costoEfectivoItem(item, servidorActivo);

  const forzadoManual = craftearIds.has(itemId);
  const elegibleAutomatico = recetasIdsEnLista.has(itemId);
  const subReceta = forzadoManual || elegibleAutomatico ? recetasPorId.get(itemId) : undefined;
  if (!subReceta || visitados.has(itemId)) {
    return { costoUnitario: costoComprar, fuente, viaCraft: false };
  }

  const visitadosConEste = new Set(visitados).add(itemId);
  const detalle: DetalleIngredienteCraft[] = subReceta.ingredientes.map((ing) => {
    const costo = costoUnitarioConCraft(
      ing.itemId,
      itemsPorId,
      servidorActivo,
      recetasIdsEnLista,
      recetasPorId,
      visitadosConEste,
      craftearIds,
    );
    return { itemId: ing.itemId, cantidad: ing.cantidad, ...costo };
  });
  const costoCraftear = detalle.reduce((suma, d) => suma + d.costoUnitario * d.cantidad, 0);

  if (forzadoManual || costoCraftear < costoComprar) {
    return { costoUnitario: costoCraftear, fuente, viaCraft: true, detalle };
  }
  return { costoUnitario: costoComprar, fuente, viaCraft: false };
}

export function calcularReceta(
  receta: Receta,
  itemsPorId: Record<string, Item>,
  servidorActivo: Servidor,
  precioVenta: number,
  impuestoPorcentaje: number = IMPUESTO_PORCENTAJE_DEFAULT,
): ResultadoCalculoReceta {
  const costos: CostoIngrediente[] = receta.ingredientes.map((ingrediente) => {
    const item = itemsPorId[ingrediente.itemId];
    if (!item) {
      throw new Error(`Item no encontrado: ${ingrediente.itemId}`);
    }
    const { costoUnitario, fuente } = costoEfectivoItem(item, servidorActivo);
    return {
      itemId: ingrediente.itemId,
      cantidad: ingrediente.cantidad,
      costoUnitario,
      fuente,
      subtotal: costoUnitario * ingrediente.cantidad,
    };
  });

  const costoTotal = costos.reduce((sum, c) => sum + c.subtotal, 0);
  const margenBruto = precioVenta - costoTotal;
  const impuesto = precioVenta * impuestoPorcentaje;
  const margenNeto = margenBruto - impuesto;
  const margenPorcentaje = precioVenta === 0 ? 0 : (margenNeto / precioVenta) * 100;
  const roiPorHora = receta.tiempoMinutos === 0 ? 0 : (margenNeto / receta.tiempoMinutos) * 60;

  return {
    costos,
    costoTotal,
    precioVenta,
    margenBruto,
    impuesto,
    margenNeto,
    margenPorcentaje,
    roiPorHora,
  };
}
