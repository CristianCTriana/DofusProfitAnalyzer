import { collection, limit, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import type { HistorialPrecio } from "../types";
import { db } from "./firebase";

const historialRef = collection(db, "historialPrecios");

export function listenHistorialReciente(
  cantidad: number,
  onChange: (historial: HistorialPrecio[]) => void,
): () => void {
  const q = query(historialRef, orderBy("fecha", "desc"), limit(cantidad));
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs.map((d) => {
        const data = d.data();
        const fecha = data.fecha instanceof Timestamp ? data.fecha.toDate().toISOString() : "";
        return { id: d.id, itemId: data.itemId, servidor: data.servidor, precio: data.precio, fecha };
      }),
    );
  });
}
