import type { CategoriaMercadillo, IngredienteReceta, Item, Receta } from "../types";

const API = "https://api.dofusdb.fr";
const CLAVE_CACHE = "dofus-catalogo-v2";
const TTL_MS = 24 * 60 * 60 * 1000;
const RUNA_TYPE_ID = 78; // "Runa de forjamagia" — no existe como mercadillo propio en DofusDB.

const SUPER_TIPO_A_CATEGORIA: Partial<Record<string, CategoriaMercadillo>> = {
  Consumibles: "Consumibles",
  "Consumibles de combate": "Consumibles",
  Comida: "Consumibles",
  Recurso: "Recursos",
  Mascota: "Mascotas",
  Seguidor: "Mascotas",
  Amuleto: "Equipables",
  Arma: "Equipables",
  Anillo: "Equipables",
  Cinturón: "Equipables",
  Botas: "Equipables",
  Escudo: "Equipables",
  Sombrero: "Equipables",
  Capa: "Equipables",
  Traje: "Equipables",
  "Dofus / Trofeo / Prismaradita": "Equipables",
};

interface CatalogoDofusDb {
  fetchedAt: number;
  items: Item[];
  recetas: Receta[];
}

interface ItemTypeRaw {
  id: number;
  superType?: { name?: { es?: string } };
}

async function fetchJson(url: string): Promise<{ total: number; data: unknown[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DofusDB ${res.status}: ${url}`);
  return res.json();
}

/** El servidor cae el $limit real a 50 sin importar lo que se pida. */
async function fetchTodo(path: string): Promise<Record<string, unknown>[]> {
  const acumulado: Record<string, unknown>[] = [];
  let skip = 0;
  while (true) {
    const json = await fetchJson(`${API}${path}?$limit=100&$skip=${skip}`);
    const data = json.data as Record<string, unknown>[];
    acumulado.push(...data);
    skip += data.length;
    if (data.length === 0 || skip >= json.total) break;
  }
  return acumulado;
}

function categoriaParaTipo(typeId: number | undefined, itemTypesById: Map<number, ItemTypeRaw>): CategoriaMercadillo {
  if (typeId === RUNA_TYPE_ID) return "Runas";
  const tipo = typeId !== undefined ? itemTypesById.get(typeId) : undefined;
  const superTipoNombre = tipo?.superType?.name?.es;
  const categoria = superTipoNombre ? SUPER_TIPO_A_CATEGORIA[superTipoNombre] : undefined;
  return categoria ?? "Recursos";
}

async function descargarCatalogo(): Promise<CatalogoDofusDb> {
  const itemTypesRaw = (await fetchTodo("/item-types")) as unknown as ItemTypeRaw[];
  const itemTypesById = new Map(itemTypesRaw.map((t) => [t.id, t]));

  const recipesRaw = await fetchTodo("/recipes");
  const recetasValidas = recipesRaw.filter(
    (r) =>
      (r.resultName as { es?: string } | undefined)?.es &&
      Array.isArray(r.ingredientIds) &&
      (r.ingredientIds as unknown[]).length > 0,
  );

  const idsUnicos = [...new Set(recetasValidas.flatMap((r) => r.ingredientIds as number[]))];
  const itemsPorId = new Map<number, Record<string, unknown>>();
  const LOTE = 50;
  for (let i = 0; i < idsUnicos.length; i += LOTE) {
    const lote = idsUnicos.slice(i, i + LOTE);
    const query = lote.map((id) => `id[$in][]=${id}`).join("&");
    const json = await fetchJson(`${API}/items?${query}&$limit=${LOTE}`);
    for (const item of json.data as Record<string, unknown>[]) {
      itemsPorId.set(item.id as number, item);
    }
  }

  const items: Item[] = [];
  for (const id of idsUnicos) {
    const raw = itemsPorId.get(id);
    const nombre = (raw?.name as { es?: string } | undefined)?.es;
    if (!raw || !nombre) continue;
    const precio = raw.price as number | undefined;
    const iconId = raw.iconId as number | undefined;
    const nivel = raw.level as number | undefined;
    items.push({
      id: `dofusdb-${id}`,
      nombre,
      categoria: categoriaParaTipo(raw.typeId as number | undefined, itemTypesById),
      gratis: false,
      fuentesPrecio: {},
      ...(typeof iconId === "number" ? { iconId } : {}),
      ...(typeof precio === "number" && precio > 0 ? { precioNPC: precio } : {}),
      ...(typeof nivel === "number" ? { nivel } : {}),
    });
  }

  const recetas: Receta[] = [];
  for (const r of recetasValidas) {
    const ingredientIds = r.ingredientIds as number[];
    const quantities = r.quantities as number[];
    const ingredientes: IngredienteReceta[] = ingredientIds
      .map((id, i) => ({ itemId: `dofusdb-${id}`, cantidad: quantities[i] }))
      .filter((ing) => itemsPorId.has(Number(ing.itemId.replace("dofusdb-", ""))));
    if (ingredientes.length === 0) continue;
    const resultIconId = (r.result as { iconId?: number } | undefined)?.iconId;
    const resultNivel = r.resultLevel as number | undefined;
    recetas.push({
      id: `dofusdb-${r.id}`,
      nombre: (r.resultName as { es: string }).es,
      categoria: categoriaParaTipo(r.resultTypeId as number | undefined, itemTypesById),
      // DofusDB no expone tiempo de crafteo real; se ajusta manualmente después.
      tiempoMinutos: 1,
      ingredientes,
      preciosVenta: {},
      ...(typeof resultIconId === "number" ? { iconId: resultIconId } : {}),
      ...(typeof resultNivel === "number" ? { nivel: resultNivel } : {}),
    });
  }

  return { fetchedAt: Date.now(), items, recetas };
}

export function esItemDeCatalogo(id: string): boolean {
  return id.startsWith("dofusdb-");
}

export async function getCatalogoDofusDb(): Promise<{ items: Item[]; recetas: Receta[] }> {
  try {
    const guardadoStr = localStorage.getItem(CLAVE_CACHE);
    if (guardadoStr) {
      const guardado = JSON.parse(guardadoStr) as CatalogoDofusDb;
      if (Date.now() - guardado.fetchedAt < TTL_MS) {
        return { items: guardado.items, recetas: guardado.recetas };
      }
    }
  } catch {
    // Cache corrupta o localStorage no disponible: se vuelve a descargar.
  }

  const catalogo = await descargarCatalogo();
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify(catalogo));
  } catch {
    // localStorage lleno o no disponible: se sigue sin cache persistente.
  }
  return { items: catalogo.items, recetas: catalogo.recetas };
}
