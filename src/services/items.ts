import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { esItemDeCatalogo } from "./catalogoDofusDb";
import type { Item, Servidor } from "../types";
import { db } from "./firebase";

export interface OverlayItem {
  gratis?: boolean;
  precioNPC?: number;
  fuentesPrecio?: Record<Servidor, number>;
}

const itemsPersonalizadosRef = collection(db, "itemsPersonalizados");
const preciosItemsRef = collection(db, "preciosItems");
const historialRef = collection(db, "historialPrecios");

function toItem(id: string, data: Omit<Item, "id">): Item {
  return { id, ...data };
}

/** Items creados a mano por el grupo (no vienen de DofusDB). */
export function listenItemsPersonalizados(onChange: (items: Item[]) => void): () => void {
  return onSnapshot(itemsPersonalizadosRef, (snapshot) => {
    onChange(snapshot.docs.map((d) => toItem(d.id, d.data() as Omit<Item, "id">)));
  });
}

/** Precios/gratis que el grupo le puso a items del catálogo de DofusDB. */
export function listenPreciosItems(onChange: (overlays: Record<string, OverlayItem>) => void): () => void {
  return onSnapshot(preciosItemsRef, (snapshot) => {
    const overlays: Record<string, OverlayItem> = {};
    snapshot.docs.forEach((d) => {
      overlays[d.id] = d.data() as OverlayItem;
    });
    onChange(overlays);
  });
}

export async function createItem(data: Omit<Item, "id">): Promise<string> {
  const created = await addDoc(itemsPersonalizadosRef, data);
  return created.id;
}

export async function updateItem(id: string, data: Partial<Omit<Item, "id">>): Promise<void> {
  if (esItemDeCatalogo(id)) {
    // Los items de catálogo son de solo lectura salvo precio/gratis, que viven en el overlay.
    const { gratis, precioNPC } = data;
    await setDoc(doc(preciosItemsRef, id), { ...(gratis !== undefined ? { gratis } : {}), ...(precioNPC !== undefined ? { precioNPC } : {}) }, { merge: true });
    return;
  }
  await updateDoc(doc(itemsPersonalizadosRef, id), data);
}

export async function deleteItem(id: string): Promise<void> {
  if (esItemDeCatalogo(id)) return; // no se pueden borrar items del catálogo
  await deleteDoc(doc(itemsPersonalizadosRef, id));
}

/**
 * Actualiza el precio de mercado de un item en un servidor y guarda un
 * snapshot en el historial de precios.
 */
export async function actualizarPrecioMercado(itemId: string, servidor: Servidor, precio: number): Promise<void> {
  if (esItemDeCatalogo(itemId)) {
    await setDoc(doc(preciosItemsRef, itemId), { fuentesPrecio: { [servidor]: precio } }, { merge: true });
  } else {
    await updateDoc(doc(itemsPersonalizadosRef, itemId), { [`fuentesPrecio.${servidor}`]: precio });
  }
  await addDoc(historialRef, {
    itemId,
    servidor,
    precio,
    fecha: serverTimestamp(),
  });
}
