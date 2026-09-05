import { describe, expect, it } from "vitest";
import { formatExacto } from "./formato";

describe("formatExacto", () => {
  it("muestra el valor exacto, sin abreviar", () => {
    expect(formatExacto(40)).toBe("40");
    expect(formatExacto(2200)).toBe("2.200");
    expect(formatExacto(1382)).toBe("1.382");
    expect(formatExacto(9_840_000)).toBe("9.840.000");
  });

  it("conserva el signo en valores negativos", () => {
    expect(formatExacto(-67_000)).toBe("-67.000");
  });
});
