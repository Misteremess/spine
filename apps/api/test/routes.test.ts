import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { resetDb, seedEdition, signUp } from "./helpers";

const DUNE = "9780441172719";
const BERSERK1 = "9788411506014";
const BERSERK3 = "9788411506038";

let app: FastifyInstance;
let cookie: string;

const inject = (opts: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  payload?: unknown;
  auth?: boolean;
}) =>
  app.inject({
    method: opts.method,
    url: opts.url,
    payload: opts.payload as never,
    headers: opts.auth === false ? {} : { cookie },
  });

beforeAll(async () => {
  await resetDb();
  app = await buildApp();
  await app.ready();
  await seedEdition({ isbn13: DUNE, title: "Dune", authors: ["Frank Herbert"], pages: 535 });
  await seedEdition({ isbn13: BERSERK1, title: "Berserk 1", seriesName: "Berserk", volumeNumber: 1 });
  await seedEdition({ isbn13: BERSERK3, title: "Berserk 3", seriesName: "Berserk", volumeNumber: 3 });
  cookie = await signUp(app, "rutas@spine.test");
});

afterAll(async () => {
  await app.close();
});

describe("auth", () => {
  it("las rutas de usuario exigen sesión", async () => {
    const res = await inject({ method: "GET", url: "/v1/library", auth: false });
    expect(res.statusCode).toBe(401);
  });
});

describe("biblioteca", () => {
  let bookId: number;

  it("alta por ISBN desde el catálogo (sin red)", async () => {
    const res = await inject({ method: "POST", url: "/v1/library", payload: { isbn: DUNE } });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.metadata.title).toBe("Dune");
    expect(body.source).toBe("catalog");
    bookId = body.userBook.id;
  });

  it("ISBN inválido → 400", async () => {
    const res = await inject({ method: "POST", url: "/v1/library", payload: { isbn: "123" } });
    expect(res.statusCode).toBe(400);
  });

  it("duplicado → 409 con metadatos; force → segundo ejemplar", async () => {
    const dup = await inject({ method: "POST", url: "/v1/library", payload: { isbn: DUNE } });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().metadata.title).toBe("Dune");

    const forced = await inject({
      method: "POST",
      url: "/v1/library",
      payload: { isbn: DUNE, force: true },
    });
    expect(forced.statusCode).toBe(201);
    await inject({ method: "DELETE", url: `/v1/library/${forced.json().userBook.id}` });
  });

  it("la lista incluye título, autores y última lectura", async () => {
    const res = await inject({ method: "GET", url: "/v1/library" });
    const item = res.json().items.find((i: { id: number }) => i.id === bookId);
    expect(item.title).toBe("Dune");
    expect(item.authors).toEqual(["Frank Herbert"]);
    expect(item.reading.status).toBe("pending");
  });

  it("detalle con edición y lectura; el de otro usuario → 404", async () => {
    const res = await inject({ method: "GET", url: `/v1/library/${bookId}` });
    expect(res.statusCode).toBe(200);
    const { edition, reading } = res.json();
    expect(edition.authors).toEqual(["Frank Herbert"]);
    expect(edition.pages).toBe(535);
    expect(reading.status).toBe("pending");

    const otra = await signUp(app, "otra@spine.test");
    const ajeno = await app.inject({
      method: "GET",
      url: `/v1/library/${bookId}`,
      headers: { cookie: otra },
    });
    expect(ajeno.statusCode).toBe(404);
  });

  it("cambiar estado a leyendo fija fecha de inicio", async () => {
    const res = await inject({
      method: "POST",
      url: `/v1/library/${bookId}/status`,
      payload: { status: "reading" },
    });
    expect(res.json().reading.status).toBe("reading");
    expect(res.json().reading.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("progreso → 201 y PATCH de valoración", async () => {
    const prog = await inject({
      method: "POST",
      url: `/v1/library/${bookId}/progress`,
      payload: { page: 120 },
    });
    expect(prog.statusCode).toBe(201);
    expect(prog.json().progress.page).toBe(120);

    const patch = await inject({
      method: "PATCH",
      url: `/v1/library/${bookId}`,
      payload: { rating: 9 },
    });
    expect(patch.json().userBook.rating).toBe(9);
  });

  it("terminar y volver a leer crea una relectura", async () => {
    await inject({
      method: "POST",
      url: `/v1/library/${bookId}/status`,
      payload: { status: "finished" },
    });
    const re = await inject({
      method: "POST",
      url: `/v1/library/${bookId}/status`,
      payload: { status: "reading" },
    });
    expect(re.json().reread).toBe(true);
  });

  it("alta manual conserva el ISBN no resuelto", async () => {
    const res = await inject({
      method: "POST",
      url: "/v1/library/manual",
      payload: { title: "Fanzine local", authors: "Autora X", isbn: "9789999999991" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().userBook.customIsbn13).toBe("9789999999991");
    await inject({ method: "DELETE", url: `/v1/library/${res.json().userBook.id}` });
  });
});

describe("wishlist", () => {
  it("alta por título, y 'lo compré' lo mueve a la biblioteca", async () => {
    const add = await inject({
      method: "POST",
      url: "/v1/wishlist",
      payload: { title: "Tomo que me falta", priority: 1 },
    });
    expect(add.statusCode).toBe(201);
    const itemId = add.json().item.id;

    const buy = await inject({ method: "POST", url: `/v1/wishlist/${itemId}/purchased`, payload: {} });
    expect(buy.statusCode).toBe(201);
    const newBookId = buy.json().userBook.id;

    const lib = await inject({ method: "GET", url: "/v1/library" });
    expect(lib.json().items.some((i: { id: number }) => i.id === newBookId)).toBe(true);

    const wl = await inject({ method: "GET", url: "/v1/wishlist" });
    expect(wl.json().items.some((i: { id: number }) => i.id === itemId)).toBe(false);

    await inject({ method: "DELETE", url: `/v1/library/${newBookId}` });
  });
});

describe("colecciones", () => {
  it("agrupa por serie con huecos, y el total es editable", async () => {
    for (const isbn of [BERSERK1, BERSERK3]) {
      const res = await inject({ method: "POST", url: "/v1/library", payload: { isbn } });
      expect(res.statusCode).toBe(201);
    }

    const res = await inject({ method: "GET", url: "/v1/collections" });
    const col = res.json().collections.find(
      (c: { series: { name: string } }) => c.series.name === "Berserk"
    );
    expect(col.ownedCount).toBe(2);
    expect(col.maxOwned).toBe(3);
    expect(col.missing).toEqual([2]);

    const patch = await inject({
      method: "PATCH",
      url: `/v1/collections/${col.series.id}`,
      payload: { totalVolumes: 5 },
    });
    expect(patch.json().series.totalVolumes).toBe(5);

    const after = await inject({ method: "GET", url: "/v1/collections" });
    const col2 = after.json().collections.find(
      (c: { series: { id: number } }) => c.series.id === col.series.id
    );
    expect(col2.missing).toEqual([2, 4, 5]);
  });

  it("no puedes tocar series de las que no tienes tomos", async () => {
    const res = await inject({
      method: "PATCH",
      url: "/v1/collections/99999",
      payload: { totalVolumes: 3 },
    });
    expect(res.statusCode).toBe(404);
  });
});
