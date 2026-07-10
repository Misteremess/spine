/**
 * Asignación/corrección manual de saga (PATCH /v1/library/:id/series) y
 * validación del buscador. Resuelve sagas no detectadas y tomos en la
 * variante equivocada.
 */
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { db, schema } from "../src/db/index";
import { resetDb, seedEdition, signUp } from "./helpers";

const DUNE = "9780441172719";

let app: FastifyInstance;
let cookie: string;
let bookId: number;

const as = (method: "GET" | "POST" | "PATCH", url: string, payload?: unknown) =>
  app.inject({ method, url, payload: payload as never, headers: { cookie } });

beforeAll(async () => {
  await resetDb();
  app = await buildApp();
  await app.ready();
  await seedEdition({ isbn13: DUNE, title: "El ojo del mundo", authors: ["Robert Jordan"] });
  cookie = await signUp(app, "saga@spine.test");
  const res = await as("POST", "/v1/library", { isbn: DUNE });
  bookId = res.json().userBook.id;
});

afterAll(async () => {
  await app.close();
});

describe("asignación manual de saga", () => {
  it("asigna una saga a un libro que no tenía ninguna", async () => {
    // Antes: sin saga, no aparece en colecciones.
    let cols = await as("GET", "/v1/collections");
    expect(cols.json().collections).toHaveLength(0);

    const res = await as("PATCH", `/v1/library/${bookId}/series`, {
      series: "La Rueda del Tiempo",
      volume: 1,
    });
    expect(res.statusCode).toBe(200);

    cols = await as("GET", "/v1/collections");
    expect(cols.json().collections).toHaveLength(1);
    expect(cols.json().collections[0].series.name).toBe("La Rueda del Tiempo");

    // El detalle de saga coloca el tomo en la posición 1.
    const seriesId = res.json().seriesId;
    const detail = await as("GET", `/v1/series/${seriesId}`);
    expect(detail.json().volumes[0]).toMatchObject({ volume: 1, owned: true });
  });

  it("mueve el tomo a otra saga (corrige la variante equivocada)", async () => {
    const res = await as("PATCH", `/v1/library/${bookId}/series`, {
      series: "La Rueda del Tiempo (nueva edición)",
      volume: 2,
    });
    expect(res.statusCode).toBe(200);

    const cols = await as("GET", "/v1/collections");
    // Solo la saga nueva tiene tomos del usuario.
    const withBooks = cols.json().collections.filter((c: any) => c.ownedCount > 0);
    expect(withBooks).toHaveLength(1);
    expect(withBooks[0].series.name).toBe("La Rueda del Tiempo (nueva edición)");
  });

  it("quita la saga con series=null", async () => {
    const res = await as("PATCH", `/v1/library/${bookId}/series`, { series: null });
    expect(res.statusCode).toBe(200);
    const cols = await as("GET", "/v1/collections");
    expect(cols.json().collections.filter((c: any) => c.ownedCount > 0)).toHaveLength(0);
  });
});

describe("buscador", () => {
  it("rechaza consultas demasiado cortas", async () => {
    const res = await as("GET", "/v1/search?q=a");
    expect(res.statusCode).toBe(400);
  });

  it("sin key de Google Books devuelve lista vacía (no rompe)", async () => {
    const res = await as("GET", "/v1/search?q=dune");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().candidates)).toBe(true);
  });
});
