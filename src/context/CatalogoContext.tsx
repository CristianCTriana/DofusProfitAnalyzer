import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCatalogoDofusDb } from "../services/catalogoDofusDb";
import { listenItemsPersonalizados, listenPreciosItems, type OverlayItem } from "../services/items";
import { listenPreciosRecetas, listenRecetasPersonalizadas, type OverlayReceta } from "../services/recetas";
import type { Item, Receta } from "../types";

interface CatalogoContextValue {
  items: Item[];
  recetas: Receta[];
  cargando: boolean;
}

const CatalogoContext = createContext<CatalogoContextValue>({ items: [], recetas: [], cargando: true });

export function CatalogoProvider({ children }: { children: ReactNode }) {
  const [catalogoBase, setCatalogoBase] = useState<{ items: Item[]; recetas: Receta[] } | null>(null);
  const [overlaysItems, setOverlaysItems] = useState<Record<string, OverlayItem>>({});
  const [overlaysRecetas, setOverlaysRecetas] = useState<Record<string, OverlayReceta>>({});
  const [itemsPersonalizados, setItemsPersonalizados] = useState<Item[]>([]);
  const [recetasPersonalizadas, setRecetasPersonalizadas] = useState<Receta[]>([]);

  useEffect(() => {
    getCatalogoDofusDb()
      .then(setCatalogoBase)
      .catch(() => setCatalogoBase({ items: [], recetas: [] }));
  }, []);
  useEffect(() => listenPreciosItems(setOverlaysItems), []);
  useEffect(() => listenPreciosRecetas(setOverlaysRecetas), []);
  useEffect(() => listenItemsPersonalizados(setItemsPersonalizados), []);
  useEffect(() => listenRecetasPersonalizadas(setRecetasPersonalizadas), []);

  const items = useMemo<Item[]>(() => {
    const deCatalogo = (catalogoBase?.items ?? []).map((item) => {
      const overlay = overlaysItems[item.id];
      if (!overlay) return item;
      return {
        ...item,
        gratis: overlay.gratis ?? item.gratis,
        precioNPC: overlay.precioNPC ?? item.precioNPC,
        fuentesPrecio: overlay.fuentesPrecio ?? item.fuentesPrecio,
      };
    });
    return [...deCatalogo, ...itemsPersonalizados];
  }, [catalogoBase, overlaysItems, itemsPersonalizados]);

  const recetas = useMemo<Receta[]>(() => {
    const deCatalogo = (catalogoBase?.recetas ?? []).map((receta) => {
      const overlay = overlaysRecetas[receta.id];
      if (!overlay) return receta;
      return {
        ...receta,
        tiempoMinutos: overlay.tiempoMinutos ?? receta.tiempoMinutos,
        preciosVenta: overlay.preciosVenta ?? receta.preciosVenta,
      };
    });
    return [...deCatalogo, ...recetasPersonalizadas];
  }, [catalogoBase, overlaysRecetas, recetasPersonalizadas]);

  return (
    <CatalogoContext.Provider value={{ items, recetas, cargando: catalogoBase === null }}>
      {children}
    </CatalogoContext.Provider>
  );
}

export function useCatalogo(): CatalogoContextValue {
  return useContext(CatalogoContext);
}
