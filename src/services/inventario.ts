import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function getInventario(uid: string): Promise<Record<string, number>> {
  const snapshot = await getDoc(doc(db, "inventarios", uid));
  return snapshot.exists() ? ((snapshot.data().cantidades as Record<string, number>) ?? {}) : {};
}

export async function setCantidadInventario(uid: string, itemId: string, cantidad: number): Promise<void> {
  await setDoc(doc(db, "inventarios", uid), { cantidades: { [itemId]: cantidad } }, { merge: true });
}
