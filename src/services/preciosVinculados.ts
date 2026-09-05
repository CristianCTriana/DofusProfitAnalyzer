import { esItemDeCatalogo } from "./catalogoDofusDb";
import { actualizarPrecioMercado } from "./items";
import { updateReceta } from "./recetas";
import type { Receta, Servidor } from "../types";

/**
 * En el catálogo de DofusDB el id de una receta es el mismo id que el del item
 * que produce (ej. "Sangre de urikornio" es item base para otra receta y
 * también es una receta en sí). Cuando eso pasa, su precio de mercado (como
 * ingrediente) y su precio de venta (como receta) son el mismo valor real y
 * deben quedar sincronizados sin importar desde qué vista se edite.
 */
export async function sincronizarPrecioComoItem(
  recetaId: string,
  servidor: Servidor,
  precio: number,
  idsDeItems: Set<string>,
): Promise<void> {
  if (!esItemDeCatalogo(recetaId) || !idsDeItems.has(recetaId)) return;
  await actualizarPrecioMercado(recetaId, servidor, precio);
}

export async function sincronizarPrecioComoReceta(
  itemId: string,
  servidor: Servidor,
  precio: number,
  recetasPorId: Map<string, Receta>,
): Promise<void> {
  if (!esItemDeCatalogo(itemId)) return;
  const receta = recetasPorId.get(itemId);
  if (!receta) return;
  await updateReceta(itemId, { preciosVenta: { ...receta.preciosVenta, [servidor]: precio } });
}
