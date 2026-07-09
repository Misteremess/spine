import { describe, expect, it } from "vitest";
import { isbn10To13, isValidIsbn10, isValidIsbn13, toIsbn13 } from "../src/isbn.js";

describe("isbn", () => {
  it("valida ISBN-13 reales", () => {
    // Dune (Ace), El Hobbit (Mariner), JJK 1 (VIZ), edición española
    for (const ok of ["9780441172719", "9780547928227", "9781974710027", "9788418118036"]) {
      expect(isValidIsbn13(ok)).toBe(true);
    }
    expect(isValidIsbn13("9780441172718")).toBe(false); // checksum roto
    expect(isValidIsbn13("978044117271")).toBe(false); // corto
  });

  it("valida ISBN-10 incluida la X final", () => {
    expect(isValidIsbn10("0441172717")).toBe(true); // Dune
    expect(isValidIsbn10("080442957X")).toBe(true); // X como dígito de control
    expect(isValidIsbn10("0441172718")).toBe(false);
  });

  it("convierte ISBN-10 a ISBN-13", () => {
    expect(isbn10To13("0441172717")).toBe("9780441172719");
  });

  it("toIsbn13 normaliza guiones, espacios y ambos formatos", () => {
    expect(toIsbn13("978-0-441-17271-9")).toBe("9780441172719");
    expect(toIsbn13("0 441 17271 7")).toBe("9780441172719");
    expect(toIsbn13("no-es-un-isbn")).toBeNull();
  });
});
