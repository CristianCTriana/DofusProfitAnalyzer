export type Servidor = string;

/** Mercadillos del juego: agrupan tanto items como recetas por lo que son/producen. */
export const CATEGORIAS_MERCADILLO = [
  "Consumibles",
  "Runas",
  "Recursos",
  "Equipables",
  "Mascotas",
] as const;

export type CategoriaMercadillo = (typeof CATEGORIAS_MERCADILLO)[number];

export interface Item {
  id: string;
  nombre: string;
  /** Mercadillo al que pertenece el item en sí (independiente de en qué receta se use). */
  categoria: CategoriaMercadillo;
  /** Compartido para todo el grupo: si está en true, el costo efectivo es 0. */
  gratis: boolean;
  /** Precio fijo de NPC, si el item se puede comprar a un vendedor no jugador. */
  precioNPC?: number;
  /** Precio de mercado por servidor, ej. { Rosal: 100_000, Ombre: 95_000 }. */
  fuentesPrecio: Record<Servidor, number>;
  /** iconId de DofusDB, si el item vino de la importación masiva. */
  iconId?: number;
  /** Nivel del objeto en Dofus, si el item vino de la importación masiva. */
  nivel?: number;
}

export interface Inventario {
  uid: string;
  /** itemId -> cantidad que esa persona tiene en su bolsa/banco. */
  cantidades: Record<string, number>;
}

export interface IngredienteReceta {
  itemId: string;
  cantidad: number;
}

export interface Receta {
  id: string;
  nombre: string;
  categoria: CategoriaMercadillo;
  tiempoMinutos: number;
  ingredientes: IngredienteReceta[];
  /** Precio de venta manual por servidor: el mercado varía igual que el de los items. */
  preciosVenta: Record<Servidor, number>;
  /** iconId de DofusDB del item resultante, si la receta vino de la importación masiva. */
  iconId?: number;
  /** Nivel del objeto que produce esta receta, si vino de la importación masiva. */
  nivel?: number;
}

export interface HistorialPrecio {
  id: string;
  itemId: string;
  servidor: Servidor;
  precio: number;
  /** ISO 8601. En Firestore se guarda como Timestamp y se convierte al leer. */
  fecha: string;
}

export interface UsuarioPerfil {
  uid: string;
  servidorActivo: Servidor;
  /** IDs de recetas marcadas como favoritas por esta persona. */
  favoritos?: string[];
}

export interface ConfigGlobal {
  impuestoPorcentaje: number;
}

/** Fuente de la que salió el costo efectivo usado para un ingrediente. */
export type FuenteCosto = "mercado" | "npc" | "gratis";

export interface CostoIngrediente {
  itemId: string;
  cantidad: number;
  costoUnitario: number;
  fuente: FuenteCosto;
  subtotal: number;
}

export interface ResultadoCalculoReceta {
  costos: CostoIngrediente[];
  costoTotal: number;
  precioVenta: number;
  margenBruto: number;
  impuesto: number;
  margenNeto: number;
  margenPorcentaje: number;
  roiPorHora: number;
}
