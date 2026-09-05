/** Kamas sin abreviar: la precisión importa más que la brevedad en esta app. */
export function formatExacto(n: number): string {
  return Math.round(n).toLocaleString("es-CO");
}
