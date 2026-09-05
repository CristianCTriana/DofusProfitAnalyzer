import { useMemo, useState } from "react";

export type Direccion = "asc" | "desc";

export function useTablaOrdenada<T>(
  filas: T[],
  comparadores: Record<string, (a: T, b: T) => number>,
  columnaInicial: string,
  direccionInicial: Direccion = "desc",
  porPagina = 25,
) {
  const [columna, setColumna] = useState(columnaInicial);
  const [direccion, setDireccion] = useState<Direccion>(direccionInicial);
  const [pagina, setPagina] = useState(1);

  function ordenarPor(col: string) {
    if (col === columna) {
      setDireccion((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setColumna(col);
      setDireccion("desc");
    }
    setPagina(1);
  }

  const ordenadas = useMemo(() => {
    const comparador = comparadores[columna];
    if (!comparador) return filas;
    const signo = direccion === "asc" ? 1 : -1;
    return [...filas].sort((a, b) => signo * comparador(a, b));
  }, [filas, comparadores, columna, direccion]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = useMemo(
    () => ordenadas.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina),
    [ordenadas, paginaSegura, porPagina],
  );

  return {
    columna,
    direccion,
    ordenarPor,
    visibles,
    pagina: paginaSegura,
    totalPaginas,
    irAPagina: setPagina,
    totalFilas: ordenadas.length,
  };
}
