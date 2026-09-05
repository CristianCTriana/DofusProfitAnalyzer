export function formatHaceTiempo(fechaIso: string): string {
  if (!fechaIso) return "";
  const diffMs = Date.now() - new Date(fechaIso).getTime();
  const minutos = Math.floor(diffMs / 60_000);
  if (minutos < 60) return `hace ${Math.max(minutos, 1)}min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias}d`;
}
