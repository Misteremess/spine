import { describe, expect, it } from "vitest";
import { mergeResults } from "../src/services/merge.js";

const ISBN = "9780441172719";

describe("mergeResults", () => {
  it("el primer resultado con valor gana por campo, y registra la procedencia", () => {
    const merged = mergeResults(ISBN, [
      { source: "openlibrary", partial: { title: "Dune", authors: [], pages: 688 } },
      { source: "googlebooks", partial: { title: "Dune (GB)", authors: ["Frank Herbert"], coverUrl: "https://x/c.jpg" } },
    ]);
    expect(merged).not.toBeNull();
    expect(merged!.metadata.title).toBe("Dune"); // OL primero
    expect(merged!.metadata.authors).toEqual(["Frank Herbert"]); // array vacío no cuenta
    expect(merged!.metadata.pages).toBe(688);
    expect(merged!.sources).toMatchObject({ title: "openlibrary", authors: "googlebooks", pages: "openlibrary" });
  });

  it("devuelve null sin título", () => {
    expect(mergeResults(ISBN, [{ source: "openlibrary", partial: { pages: 100 } }])).toBeNull();
    expect(mergeResults(ISBN, [null, null])).toBeNull();
  });

  it("tolera fuentes nulas", () => {
    const merged = mergeResults(ISBN, [null, { source: "googlebooks", partial: { title: "1984" } }]);
    expect(merged!.metadata.title).toBe("1984");
  });
});
