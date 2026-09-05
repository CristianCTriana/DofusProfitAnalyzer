import { describe, expect, it } from "vitest";
import { agregarRecetaALista, alternarCraftearIngrediente } from "./calculadoraLista";

describe("agregarRecetaALista", () => {
  it("agrega una receta nueva con el id dado", () => {
    const { lista, id } = agregarRecetaALista([], "receta-1", 3, "id-1");
    expect(id).toBe("id-1");
    expect(lista).toEqual([{ id: "id-1", recetaId: "receta-1", cantidadStr: "3" }]);
  });

  it("si la receta ya está en la lista, suma la cantidad en vez de duplicarla", () => {
    const inicial = [{ id: "id-1", recetaId: "receta-1", cantidadStr: "3" }];
    const { lista, id } = agregarRecetaALista(inicial, "receta-1", 2, "id-2");
    expect(id).toBe("id-1");
    expect(lista).toEqual([{ id: "id-1", recetaId: "receta-1", cantidadStr: "5" }]);
  });

  it("no toca otras entradas de la lista al sumar una duplicada", () => {
    const inicial = [
      { id: "id-1", recetaId: "receta-1", cantidadStr: "3" },
      { id: "id-2", recetaId: "receta-2", cantidadStr: "10" },
    ];
    const { lista } = agregarRecetaALista(inicial, "receta-2", 5, "id-3");
    expect(lista).toEqual([
      { id: "id-1", recetaId: "receta-1", cantidadStr: "3" },
      { id: "id-2", recetaId: "receta-2", cantidadStr: "15" },
    ]);
  });
});

describe("alternarCraftearIngrediente", () => {
  it("marca un ingrediente para craftear si no estaba marcado", () => {
    const inicial = [{ id: "id-1", recetaId: "receta-1", cantidadStr: "3" }];
    const lista = alternarCraftearIngrediente(inicial, "id-1", "item-a");
    expect(lista).toEqual([{ id: "id-1", recetaId: "receta-1", cantidadStr: "3", craftearIds: ["item-a"] }]);
  });

  it("desmarca un ingrediente ya marcado", () => {
    const inicial = [{ id: "id-1", recetaId: "receta-1", cantidadStr: "3", craftearIds: ["item-a", "item-b"] }];
    const lista = alternarCraftearIngrediente(inicial, "id-1", "item-a");
    expect(lista).toEqual([{ id: "id-1", recetaId: "receta-1", cantidadStr: "3", craftearIds: ["item-b"] }]);
  });

  it("no toca otras entradas de la lista", () => {
    const inicial = [
      { id: "id-1", recetaId: "receta-1", cantidadStr: "3" },
      { id: "id-2", recetaId: "receta-2", cantidadStr: "10" },
    ];
    const lista = alternarCraftearIngrediente(inicial, "id-2", "item-a");
    expect(lista).toEqual([
      { id: "id-1", recetaId: "receta-1", cantidadStr: "3" },
      { id: "id-2", recetaId: "receta-2", cantidadStr: "10", craftearIds: ["item-a"] },
    ]);
  });
});
