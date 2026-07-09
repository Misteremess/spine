import { describe, expect, it } from "vitest";
import { extractFromTitle, extractSeries, parseOlSeries, seriesNameKey } from "../src/services/series";

describe("extractFromTitle", () => {
  it("marcadores explícitos de las editoriales españolas", () => {
    expect(extractFromTitle("Naruto, Vol. 5")).toEqual({ name: "Naruto", volume: 5 });
    expect(extractFromTitle("One Piece nº 05")).toEqual({ name: "One Piece", volume: 5 });
    expect(extractFromTitle("Dragon Ball, tomo 12")).toEqual({ name: "Dragon Ball", volume: 12 });
    expect(extractFromTitle("Blade of the Immortal Volume 3")).toEqual({
      name: "Blade of the Immortal",
      volume: 3,
    });
    expect(extractFromTitle("Akira núm. 7")).toEqual({ name: "Akira", volume: 7 });
  });

  it("almohadilla", () => {
    expect(extractFromTitle("Saga #9")).toEqual({ name: "Saga", volume: 9 });
  });

  it("número suelto al final (formato manga España)", () => {
    expect(extractFromTitle("Berserk 23")).toEqual({ name: "Berserk", volume: 23 });
    expect(extractFromTitle("One Piece 105")).toEqual({ name: "One Piece", volume: 105 });
    expect(extractFromTitle("Berserk. Maximum, 1")).toEqual({
      name: "Berserk. Maximum",
      volume: 1,
    });
    expect(extractFromTitle("20th Century Boys 5")).toEqual({
      name: "20th Century Boys",
      volume: 5,
    });
  });

  it("no confunde títulos normales con series", () => {
    expect(extractFromTitle("1984")).toBeNull(); // sin espacio antes del número
    expect(extractFromTitle("Fahrenheit 451")).toBeNull(); // número > tope de tomos
    expect(extractFromTitle("Dune")).toBeNull();
    expect(extractFromTitle("El nombre del viento")).toBeNull();
  });
});

describe("seriesNameKey", () => {
  it("agrupa grafías distintas de la misma serie", () => {
    expect(seriesNameKey("SPY×FAMILY")).toBe(seriesNameKey("Spy x Family"));
    expect(seriesNameKey("Berserk. Maximum")).toBe(seriesNameKey("berserk maximum"));
    expect(seriesNameKey("Náufragos")).toBe("naufragos");
  });
});

describe("parseOlSeries", () => {
  it("formatos de OL", () => {
    expect(parseOlSeries("Berserk #13")).toEqual({ name: "Berserk", volume: 13 });
    expect(parseOlSeries("Berserk (13)")).toEqual({ name: "Berserk", volume: 13 });
    expect(parseOlSeries("Berserk")).toEqual({ name: "Berserk", volume: null });
  });
});

describe("extractSeries", () => {
  it("OL manda sobre el título; el tomo se completa desde el título", () => {
    expect(extractSeries("Berserk Maximum 1", ["Berserk Maximum"])).toEqual({
      name: "Berserk Maximum",
      volume: 1,
    });
    expect(extractSeries("Cualquier cosa", ["Dune (2)"])).toEqual({ name: "Dune", volume: 2 });
  });

  it("sin OL cae a la heurística del título", () => {
    expect(extractSeries("Berserk 23")).toEqual({ name: "Berserk", volume: 23 });
    expect(extractSeries("Dune")).toBeNull();
  });
});
