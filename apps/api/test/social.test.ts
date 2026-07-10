/**
 * Reseñas por obra y clubs de lectura: el plano social de Spine.
 */
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { db, schema } from "../src/db/index";
import { resetDb, seedEdition, signUp } from "./helpers";

const DUNE = "9780441172719";

let app: FastifyInstance;
let ana: string;
let bruno: string;
let workId: number;
let editionId: number;

const as = (cookie: string) => ({
  get: (url: string) => app.inject({ method: "GET", url, headers: { cookie } }),
  post: (url: string, payload?: unknown) =>
    app.inject({ method: "POST", url, payload: payload as never, headers: { cookie } }),
  put: (url: string, payload?: unknown) =>
    app.inject({ method: "PUT", url, payload: payload as never, headers: { cookie } }),
  patch: (url: string, payload?: unknown) =>
    app.inject({ method: "PATCH", url, payload: payload as never, headers: { cookie } }),
  del: (url: string) => app.inject({ method: "DELETE", url, headers: { cookie } }),
});

beforeAll(async () => {
  await resetDb();
  app = await buildApp();
  await app.ready();
  await seedEdition({ isbn13: DUNE, title: "Dune", authors: ["Frank Herbert"], pages: 535 });
  const [ed] = await db.select().from(schema.editions).where(eq(schema.editions.isbn13, DUNE));
  workId = ed!.workId;
  editionId = ed!.id;
  ana = await signUp(app, "ana@spine.test");
  bruno = await signUp(app, "bruno@spine.test");
});

afterAll(async () => {
  await app.close();
});

describe("reseñas", () => {
  it("upsert de la reseña propia y media comunitaria", async () => {
    let res = await as(ana).put(`/v1/works/${workId}/review`, {
      rating: 9,
      text: "Obra maestra de la ciencia ficción.",
    });
    expect(res.statusCode).toBe(200);

    res = await as(bruno).put(`/v1/works/${workId}/review`, { rating: 6 });
    expect(res.statusCode).toBe(200);

    res = await as(ana).get(`/v1/works/${workId}/reviews`);
    const body = res.json();
    expect(body.count).toBe(2);
    expect(body.average).toBe(7.5);
    expect(body.mine.rating).toBe(9);

    // Reeditar no duplica.
    await as(ana).put(`/v1/works/${workId}/review`, { rating: 10 });
    res = await as(ana).get(`/v1/works/${workId}/reviews`);
    expect(res.json().count).toBe(2);
    expect(res.json().mine.rating).toBe(10);
  });

  it("valida el rango de estrellas y la obra", async () => {
    let res = await as(ana).put(`/v1/works/${workId}/review`, { rating: 11 });
    expect(res.statusCode).toBe(400);
    res = await as(ana).put(`/v1/works/99999/review`, { rating: 5 });
    expect(res.statusCode).toBe(404);
  });

  it("borrar la reseña propia", async () => {
    const res = await as(bruno).del(`/v1/works/${workId}/review`);
    expect(res.statusCode).toBe(204);
    const list = await as(ana).get(`/v1/works/${workId}/reviews`);
    expect(list.json().count).toBe(1);
  });
});

describe("clubs de lectura", () => {
  let clubId: number;
  let code: string;

  it("crear un club genera código y te hace owner", async () => {
    const res = await as(ana).post("/v1/clubs", {
      name: "Lectores de Arrakis",
      description: "Un club sobre Dune",
    });
    expect(res.statusCode).toBe(201);
    clubId = res.json().club.id;
    code = res.json().club.inviteCode;
    expect(code).toHaveLength(6);

    const mine = await as(ana).get("/v1/clubs");
    expect(mine.json().clubs[0]).toMatchObject({ name: "Lectores de Arrakis", role: "owner" });
  });

  it("unirse con el código y ver el detalle", async () => {
    let res = await as(bruno).post("/v1/clubs/join", { code: code.toLowerCase() });
    expect(res.statusCode).toBe(200);

    res = await as(bruno).get(`/v1/clubs/${clubId}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().members).toHaveLength(2);

    res = await as(bruno).post("/v1/clubs/join", { code: "XXXXXX" });
    expect(res.statusCode).toBe(404);
  });

  it("el owner fija el libro actual por editionId", async () => {
    const res = await as(ana).patch(`/v1/clubs/${clubId}`, { editionId });
    expect(res.statusCode).toBe(200);
    expect(res.json().club.currentWork.title).toBe("Dune");

    const forbidden = await as(bruno).patch(`/v1/clubs/${clubId}`, { editionId });
    expect(forbidden.statusCode).toBe(403);
  });

  it("publicar en el hilo avisa a los demás miembros (sin duplicar)", async () => {
    let res = await as(ana).post(`/v1/clubs/${clubId}/posts`, { text: "¿Por dónde vais?" });
    expect(res.statusCode).toBe(201);
    await as(ana).post(`/v1/clubs/${clubId}/posts`, { text: "Yo por el capítulo 12" });

    const detail = await as(bruno).get(`/v1/clubs/${clubId}`);
    expect(detail.json().posts).toHaveLength(2);
    expect(detail.json().posts[0].own).toBe(false);

    // Bruno tiene UN aviso del club aunque hubo dos mensajes.
    const notif = await as(bruno).get("/v1/notifications");
    const clubNotifs = notif.json().notifications.filter((n: any) => n.type === "club_post");
    expect(clubNotifs).toHaveLength(1);
  });

  it("quien no es miembro no ve el club", async () => {
    const carla = await signUp(app, "carla@spine.test");
    const res = await as(carla).get(`/v1/clubs/${clubId}`);
    expect(res.statusCode).toBe(404);
  });

  it("si el owner se va, hereda el miembro más antiguo; el último cierra", async () => {
    let res = await as(ana).post(`/v1/clubs/${clubId}/leave`);
    expect(res.statusCode).toBe(204);

    const detail = await as(bruno).get(`/v1/clubs/${clubId}`);
    expect(detail.statusCode).toBe(200);
    expect(detail.json().club.role).toBe("owner");

    res = await as(bruno).post(`/v1/clubs/${clubId}/leave`);
    expect(res.statusCode).toBe(204);
    const gone = await db.select().from(schema.clubs).where(eq(schema.clubs.id, clubId));
    expect(gone).toHaveLength(0);
  });
});
