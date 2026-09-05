export interface EntradaCalculadora {
  id: string;
  recetaId: string;
  cantidadStr: string;
}

function clave(uid: string): string {
  return `calculadora-lista-${uid}`;
}

/** La lista de la calculadora se guarda en el navegador de cada persona (no en Firestore). */
export function leerListaCalculadora(uid: string): EntradaCalculadora[] {
  try {
    const guardada = localStorage.getItem(clave(uid));
    return guardada ? (JSON.parse(guardada) as EntradaCalculadora[]) : [];
  } catch {
    return [];
  }
}

export function guardarListaCalculadora(uid: string, lista: EntradaCalculadora[]): void {
  try {
    localStorage.setItem(clave(uid), JSON.stringify(lista));
  } catch {
    // localStorage lleno o no disponible: se sigue sin persistir, sin romper la UI.
  }
}

/**
 * Agrega una receta a la lista. Cada receta aparece una sola vez: si ya
 * estaba, se suma la cantidad nueva a la que ya tenía en vez de duplicarla.
 * `nuevoId` lo genera quien llama (ej. crypto.randomUUID()) para poder saber
 * de una vez qué entrada expandir/resaltar sin depender de un id interno.
 */
export function agregarRecetaALista(
  lista: EntradaCalculadora[],
  recetaId: string,
  cantidad: number,
  nuevoId: string,
): { lista: EntradaCalculadora[]; id: string } {
  const existente = lista.find((entrada) => entrada.recetaId === recetaId);
  if (existente) {
    const nuevaCantidad = (Number(existente.cantidadStr) || 0) + cantidad;
    return {
      lista: lista.map((entrada) =>
        entrada.id === existente.id ? { ...entrada, cantidadStr: String(nuevaCantidad) } : entrada,
      ),
      id: existente.id,
    };
  }
  return { lista: [...lista, { id: nuevoId, recetaId, cantidadStr: String(cantidad) }], id: nuevoId };
}
