import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/services/csv";
import { parseGoodreadsCsv } from "../src/services/goodreads";

describe("parseCsv", () => {
  it("comillas, comas y saltos dentro de campos", () => {
    expect(parseCsv('a,"b,c",d\n"x ""y""","l1\nl2",z')).toEqual([
      ["a", "b,c", "d"],
      ['x "y"', "l1\nl2", "z"],
    ]);
  });

  it("tolera CRLF y última línea sin salto", () => {
    expect(parseCsv("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

const HEADER =
  "Book Id,Title,Author,Additional Authors,ISBN,ISBN13,My Rating,Publisher,Number of Pages,Year Published,Exclusive Shelf,Date Read,My Review,Private Notes";

describe("parseGoodreadsCsv", () => {
  it("mapea el export oficial: estantes, rating, ISBN blindado, fecha", () => {
    const csv = [
      HEADER,
      `1,Dune,Frank Herbert,,"=""0441172717""","=""9780441172719""",4,Ace,535,1990,read,2026/03/15,Una maravilla,`,
      `2,"Berserk, tomo 1",Kentaro Miura,,"=""""","=""""",0,Panini,224,2001,currently-reading,,,`,
      `3,Proyecto pendiente,Autora X,Otra Autora,,,5,,0,,to-read,,,Nota privada`,
    ].join("\n");

    const rows = parseGoodreadsCsv(csv);
    expect(rows).toHaveLength(3);

    expect(rows[0]).toMatchObject({
      title: "Dune",
      authors: ["Frank Herbert"],
      isbn13: "9780441172719",
      rating: 8, // 4 estrellas → 8 medias
      status: "finished",
      finishedAt: "2026-03-15",
      pages: 535,
      publishedDate: "1990",
      notes: "Una maravilla",
    });

    expect(rows[1]).toMatchObject({
      title: "Berserk, tomo 1",
      isbn13: null, // ="" vacío
      rating: null, // 0 = sin puntuar
      status: "reading",
    });

    expect(rows[2]).toMatchObject({
      authors: ["Autora X", "Otra Autora"],
      status: "pending",
      pages: null,
      notes: "Nota privada",
    });
  });

  it("convierte ISBN-10 a 13 cuando falta el 13", () => {
    const csv = [HEADER, `1,Dune,Frank Herbert,,"=""0441172717""","=""""",0,,,,read,,,`].join("\n");
    expect(parseGoodreadsCsv(csv)[0]!.isbn13).toBe("9780441172719");
  });

  it("CSV sin cabecera Title devuelve vacío", () => {
    expect(parseGoodreadsCsv("a,b,c\n1,2,3")).toEqual([]);
  });
});
