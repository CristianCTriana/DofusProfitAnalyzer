import { doc, getDoc } from "firebase/firestore";
import type { ConfigGlobal } from "../types";
import { IMPUESTO_PORCENTAJE_DEFAULT } from "./calculo";
import { db } from "./firebase";

export async function getConfigGlobal(): Promise<ConfigGlobal> {
  const snapshot = await getDoc(doc(db, "config", "global"));
  if (!snapshot.exists()) {
    return { impuestoPorcentaje: IMPUESTO_PORCENTAJE_DEFAULT };
  }
  return snapshot.data() as ConfigGlobal;
}
