/**
 * Detalle de saga y notificaciones: rejilla de tomos con huecos, próximos
 * lanzamientos del radar y ciclo de leído/no leído de los avisos.
 * Sin red: los releases se siembran directamente en series_releases.
 */
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { db, schema } from "../src/db/index";
import { resetDb, seedEdition, signUp } from "./helpers";

const BERSERK1 = "9788411506014";
const BERSERK3 = "9788411506038";

let app: FastifyInstance;
let cookie: string;
let seriesId: number;

const inject = (opts: { method: "GET" | "POST"; url: string; payload?: unknown }) =>
  app.inject({
    method: opts.method,
    url: opts.url,
    payload: opts.payload as never,
    headers: { cookie },
  });

beforeAll(async () => {
  await resetDb();
  app = await buildApp();
  await app.ready();
  await seedEdition({ isbn13: BERSERK1, title: "Berserk 1", seriesName: "Berserk", volumeNumber: 1 });
  await seedEdition({ isbn13: BERSERK3, title: "Berserk 3", seriesName: "Berserk", volumeNumber: 3 });
  cookie = await signUp(app, "sagas@spine.test");

  // El usuario tiene los tomos 1 y 3.
  for (const isbn of [BERSERK1, BERSERK3]) {
    const res = await inject({ method: "POST", url: "/v1/library", payload: { isbn } });
    expect(res.statusCode).toBe(201);
  }

  const [ser] = await db
    .select()
    .from(schema.series)
    .where(eq(schema.series.nameKey, "berserk"));
  seriesId = ser!.id;

  // El radar "conoce" el tomo 4 (publicado) y el 5 (fecha futura).
  await db.insert(schema.seriesReleases).values([
    {
      seriesId,
      volumeNumber: 4,
      title: "Berserk 4",
      isbn13: "9788411506045",
      publishedDate: "2024-05-10",
    },
    {
      seriesId,
      volumeNumber: 5,
      title: "Berserk 5",
      publishedDate: "2999-01-15",
    },
  ]);
});

afterAll(async () => {
  await app.close();
});

describe("detalle de saga", () => {
  it("monta la rejilla completa con tenidos, huecos y próximos", async () => {
    const res = await inject({ method: "GET", url: `/v1/series/${seriesId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.series.name).toBe("Berserk");
    // Horizonte = máximo conocido entre tenidos (3) y releases (5).
    expect(body.volumes).toHaveLength(5);
    expect(body.volumes[0]).toMatchObject({ volume: 1, owned: true });
    expect(body.volumes[1]).toMatchObject({ volume: 2, owned: false });
    expect(body.volumes[2]).toMatchObject({ volume: 3, owned: true });
    // El tomo 4 trae el ISBN del radar para poder desearlo con un toque.
    expect(body.volumes[3]).toMatchObject({
      volume: 4,
      owned: false,
      isbn13: "9788411506045",
    });
    expect(body.volumes[4]).toMatchObject({ volume: 5, upcoming: true });

    expect(body.ownedCount).toBe(2);
    // El 5 aún no salió: no cuenta como hueco.
    expect(body.missing).toEqual([2, 4]);
    expect(body.upcoming).toHaveLength(1);
    expect(body.upcoming[0].volume).toBe(5);
  });

  it("404 para una serie inexistente", async () => {
    const res = await inject({ method: "GET", url: "/v1/series/99999" });
    expect(res.statusCode).toBe(404);
  });
});

describe("notificaciones", () => {
  it("lista, marca una como leída y luego todas", async () => {
    const [me] = await db.select().from(schema.user).where(eq(schema.user.email, "sagas@spine.test"));
    await db.insert(schema.notifications).values([
      {
        userId: me!.id,
        type: "new_volume",
        title: "Nuevo tomo de Berserk",
        body: "Berserk 4 · 2024-05-10",
        data: { seriesId, volume: 4 },
      },
      {
        userId: me!.id,
        type: "upcoming_volume",
        title: "Próximo tomo de Berserk",
        body: "Berserk 5 · 2999-01-15",
        data: { seriesId, volume: 5 },
      },
    ]);

    let res = await inject({ method: "GET", url: "/v1/notifications" });
    expect(res.statusCode).toBe(200);
    expect(res.json().unreadCount).toBe(2);
    const first = res.json().notifications[0];

    res = await inject({ method: "POST", url: `/v1/notifications/${first.id}/read` });
    expect(res.statusCode).toBe(200);

    res = await inject({ method: "GET", url: "/v1/notifications" });
    expect(res.json().unreadCount).toBe(1);

    res = await inject({ method: "POST", url: "/v1/notifications/read-all" });
    expect(res.statusCode).toBe(200);
    res = await inject({ method: "GET", url: "/v1/notifications" });
    expect(res.json().unreadCount).toBe(0);
  });

  it("no deja leer avisos de otro usuario", async () => {
    const otherCookie = await signUp(app, "otra@spine.test");
    const [me] = await db.select().from(schema.user).where(eq(schema.user.email, "sagas@spine.test"));
    const [n] = await db
      .insert(schema.notifications)
      .values({ userId: me!.id, type: "new_volume", title: "x" })
      .returning();

    const res = await app.inject({
      method: "POST",
      url: `/v1/notifications/${n!.id}/read`,
      headers: { cookie: otherCookie },
    });
    expect(res.statusCode).toBe(404);
  });
});
