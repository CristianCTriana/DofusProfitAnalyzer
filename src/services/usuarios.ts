import { arrayRemove, arrayUnion, doc, getDoc, setDoc } from "firebase/firestore";
import { SERVIDOR_DEFAULT } from "../constants/servidores";
import type { Servidor, UsuarioPerfil } from "../types";
import { db } from "./firebase";

export async function getPerfilUsuario(uid: string): Promise<UsuarioPerfil> {
  const snapshot = await getDoc(doc(db, "usuarios", uid));
  if (!snapshot.exists()) {
    return { uid, servidorActivo: SERVIDOR_DEFAULT };
  }
  const data = snapshot.data() as Omit<UsuarioPerfil, "uid">;
  return { uid, ...data };
}

export async function setServidorActivo(uid: string, servidor: Servidor): Promise<void> {
  await setDoc(doc(db, "usuarios", uid), { servidorActivo: servidor }, { merge: true });
}

export async function setFavorito(uid: string, recetaId: string, favorito: boolean): Promise<void> {
  await setDoc(
    doc(db, "usuarios", uid),
    { favoritos: favorito ? arrayUnion(recetaId) : arrayRemove(recetaId) },
    { merge: true },
  );
}
