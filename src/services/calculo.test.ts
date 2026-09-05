import { describe, expect, it } from "vitest";
import type { Item, Receta } from "../types";
import { calcularReceta, costoEfectivoItem, costoUnitarioConCraft } from "./calculo";

const SERVIDOR = "Rosal";

const felpa: Item = {
  id: "felpa",
  nombre: "Felpa",
  categoria: "Recursos",
  gratis: false,
  fuentesPrecio: { [SERVIDOR]: 100_000 },
};

const hiloDePlata: Item = {
  id: "hilo-plata",
  nombre: "Hilo de Plata",
  categoria: "Recursos",
  gratis: false,
  precioNPC: 50_000,
  fuentesPrecio: { [SERVIDOR]: 55_000 },
};

const cristalDeFuego: Item = {
  id: "cristal-fuego",
  nombre: "Cristal de Fuego",
  categoria: "Recursos",
  gratis: true,
  fuentesPrecio: { [SERVIDOR]: 200_000 },
};

const perlaNegra: Item = {
  id: "perla-negra",
  nombre: "Perla Negra",
  categoria: "Recursos",
  gratis: false,
  precioNPC: 0,
  fuentesPrecio: { [SERVIDOR]: 30_000 },
};

const botasInvocadas: Receta = {
  id: "botas-invocadas",
  nombre: "Botas Invocadas",
  categoria: "Equipables",
  tiempoMinutos: 5,
  preciosVenta: { [SERVIDOR]: 1_500_000 },
  ingredientes: [
    { itemId: "felpa", cantidad: 5 },
    { itemId: "hilo-plata", cantidad: 3 },
    { itemId: "cristal-fuego", cantidad: 1 },
  ],
};

const itemsPorId = {
  [felpa.id]: felpa,
  [hiloDePlata.id]: hiloDePlata,
  [cristalDeFuego.id]: cristalDeFuego,
};

describe("costoEfectivoItem", () => {
  it("usa el precio de mercado cuando no hay NPC ni está marcado gratis", () => {
    expect(costoEfectivoItem(felpa, SERVIDOR)).toEqual({ costoUnitario: 100_000, fuente: "mercado" });
  });

  it("usa el precio NPC cuando es más barato que el de mercado", () => {
    expect(costoEfectivoItem(hiloDePlata, SERVIDOR)).toEqual({ costoUnitario: 50_000, fuente: "npc" });
  });

  it("el costo es 0 cuando el item está marcado como gratis, sin importar sus otros precios", () => {
    expect(costoEfectivoItem(cristalDeFuego, SERVIDOR)).toEqual({ costoUnitario: 0, fuente: "gratis" });
  });

  it("ignora el precio NPC cuando es 0 (no se puede comprar a ningún NPC) y usa el de mercado", () => {
    expect(costoEfectivoItem(perlaNegra, SERVIDOR)).toEqual({ costoUnitario: 30_000, fuente: "mercado" });
  });
});

describe("costoUnitarioConCraft", () => {
  const cereza: Item = { id: "cereza", nombre: "Cereza", categoria: "Recursos", gratis: false, fuentesPrecio: { [SERVIDOR]: 1 } };
  const sangre: Item = { id: "sangre", nombre: "Sangre de urikornio", categoria: "Consumibles", gratis: false, fuentesPrecio: { [SERVIDOR]: 878 } };
  const sangreCara: Item = { id: "sangre-cara", nombre: "Sangre cara", categoria: "Consumibles", gratis: false, fuentesPrecio: { [SERVIDOR]: 10 } };
  const itemsPorIdCraft = { [cereza.id]: cereza, [sangre.id]: sangre, [sangreCara.id]: sangreCara };

  const recetaSangre: Receta = {
    id: "sangre",
    nombre: "Sangre de urikornio",
    categoria: "Consumibles",
    tiempoMinutos: 1,
    preciosVenta: {},
    ingredientes: [{ itemId: "cereza", cantidad: 1 }],
  };

  const recetaSangreCara: Receta = {
    id: "sangre-cara",
    nombre: "Sangre cara",
    categoria: "Consumibles",
    tiempoMinutos: 1,
    preciosVenta: {},
    ingredientes: [{ itemId: "cereza", cantidad: 20 }],
  };

  it("prefiere craftear cuando su receta está en la lista y sale más barato que comprar", () => {
    const resultado = costoUnitarioConCraft(
      "sangre",
      itemsPorIdCraft,
      SERVIDOR,
      new Set(["sangre"]),
      new Map([[recetaSangre.id, recetaSangre]]),
    );
    expect(resultado).toEqual({
      costoUnitario: 1,
      fuente: "mercado",
      viaCraft: true,
      detalle: [{ itemId: "cereza", cantidad: 1, costoUnitario: 1, fuente: "mercado", viaCraft: false }],
    });
  });

  it("craftea aunque la receta no esté en la lista si el usuario la marcó manualmente en craftearIds", () => {
    const resultado = costoUnitarioConCraft(
      "sangre",
      itemsPorIdCraft,
      SERVIDOR,
      new Set(),
      new Map([[recetaSangre.id, recetaSangre]]),
      new Set(),
      new Set(["sangre"]),
    );
    expect(resultado).toEqual({
      costoUnitario: 1,
      fuente: "mercado",
      viaCraft: true,
      detalle: [{ itemId: "cereza", cantidad: 1, costoUnitario: 1, fuente: "mercado", viaCraft: false }],
    });
  });

  it("craftea manualmente aunque salga más caro que comprar (el usuario eligió craftear, no se compara)", () => {
    const resultado = costoUnitarioConCraft(
      "sangre-cara",
      itemsPorIdCraft,
      SERVIDOR,
      new Set(),
      new Map([[recetaSangreCara.id, recetaSangreCara]]),
      new Set(),
      new Set(["sangre-cara"]),
    );
    expect(resultado).toEqual({
      costoUnitario: 20,
      fuente: "mercado",
      viaCraft: true,
      detalle: [{ itemId: "cereza", cantidad: 20, costoUnitario: 1, fuente: "mercado", viaCraft: false }],
    });
  });

  it("un item marcado gratis cuesta 0 aunque el usuario haya marcado su sub-receta para craftear", () => {
    const sangreGratis: Item = { ...sangre, gratis: true };
    const resultado = costoUnitarioConCraft(
      "sangre",
      { ...itemsPorIdCraft, sangre: sangreGratis },
      SERVIDOR,
      new Set(),
      new Map([[recetaSangre.id, recetaSangre]]),
      new Set(),
      new Set(["sangre"]),
    );
    expect(resultado).toEqual({ costoUnitario: 0, fuente: "gratis", viaCraft: false });
  });

  it("prefiere comprar cuando craftear con sus ingredientes sale más caro", () => {
    const resultado = costoUnitarioConCraft(
      "sangre-cara",
      itemsPorIdCraft,
      SERVIDOR,
      new Set(["sangre-cara"]),
      new Map([[recetaSangreCara.id, recetaSangreCara]]),
    );
    expect(resultado).toEqual({ costoUnitario: 10, fuente: "mercado", viaCraft: false });
  });

  it("no compara contra craftear si la receta del ingrediente no está en la lista de la calculadora", () => {
    const resultado = costoUnitarioConCraft("sangre", itemsPorIdCraft, SERVIDOR, new Set(), new Map());
    expect(resultado).toEqual({ costoUnitario: 878, fuente: "mercado", viaCraft: false });
  });

  it("no entra en loop infinito si una receta termina referenciándose a sí misma", () => {
    const itemCiclico: Item = { id: "ciclica", nombre: "Ciclica", categoria: "Consumibles", gratis: false, fuentesPrecio: { [SERVIDOR]: 5 } };
    const recetaCiclica: Receta = {
      id: "ciclica",
      nombre: "Ciclica",
      categoria: "Consumibles",
      tiempoMinutos: 1,
      preciosVenta: {},
      ingredientes: [{ itemId: "ciclica", cantidad: 1 }],
    };
    const resultado = costoUnitarioConCraft(
      "ciclica",
      { ciclica: itemCiclico },
      SERVIDOR,
      new Set(["ciclica"]),
      new Map([[recetaCiclica.id, recetaCiclica]]),
    );
    expect(resultado).toEqual({ costoUnitario: 5, fuente: "mercado", viaCraft: false });
  });
});

describe("calcularReceta", () => {
  it("reproduce el ejemplo de Botas Invocadas del spec", () => {
    const resultado = calcularReceta(botasInvocadas, itemsPorId, SERVIDOR, 1_500_000);

    expect(resultado.costoTotal).toBe(650_000);
    expect(resultado.margenBruto).toBe(850_000);
    expect(resultado.impuesto).toBe(30_000);
    expect(resultado.margenNeto).toBe(820_000);
    expect(resultado.roiPorHora).toBe(9_840_000);
  });
});
