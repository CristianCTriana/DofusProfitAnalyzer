import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { esItemDeCatalogo } from "./catalogoDofusDb";
import type { Receta, Servidor } from "../types";
import { db } from "./firebase";

export interface OverlayReceta {
  tiempoMinutos?: number;
  preciosVenta?: Record<Servidor, number>;
}

const recetasPersonalizadasRef = collection(db, "recetasPersonalizadas");
const preciosRecetasRef = collection(db, "preciosRecetas");

function toReceta(id: string, data: Omit<Receta, "id">): Receta {
  return { id, ...data };
}

/** Recetas creadas a mano por el grupo (no vienen de DofusDB). */
export function listenRecetasPersonalizadas(onChange: (recetas: Receta[]) => void): () => void {
  return onSnapshot(recetasPersonalizadasRef, (snapshot) => {
    onChange(snapshot.docs.map((d) => toReceta(d.id, d.data() as Omit<Receta, "id">)));
  });
}

/** Tiempo de crafteo / precio de venta que el grupo le puso a recetas del catálogo. */
export function listenPreciosRecetas(onChange: (overlays: Record<string, OverlayReceta>) => void): () => void {
  return onSnapshot(preciosRecetasRef, (snapshot) => {
    const overlays: Record<string, OverlayReceta> = {};
    snapshot.docs.forEach((d) => {
      overlays[d.id] = d.data() as OverlayReceta;
    });
    onChange(overlays);
  });
}

export async function createReceta(data: Omit<Receta, "id">): Promise<string> {
  const created = await addDoc(recetasPersonalizadasRef, data);
  return created.id;
}

export async function updateReceta(id: string, data: Partial<Omit<Receta, "id">>): Promise<void> {
  if (esItemDeCatalogo(id)) {
    // Las recetas de catálogo son de solo lectura salvo tiempo/venta, que viven en el overlay.
    const { tiempoMinutos, preciosVenta } = data;
    await setDoc(
      doc(preciosRecetasRef, id),
      { ...(tiempoMinutos !== undefined ? { tiempoMinutos } : {}), ...(preciosVenta !== undefined ? { preciosVenta } : {}) },
      { merge: true },
    );
    return;
  }
  await updateDoc(doc(recetasPersonalizadasRef, id), data);
}

export async function deleteReceta(id: string): Promise<void> {
  if (esItemDeCatalogo(id)) return; // no se pueden borrar recetas del catálogo
  await deleteDoc(doc(recetasPersonalizadasRef, id));
}
