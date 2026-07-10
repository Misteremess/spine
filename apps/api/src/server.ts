import { buildApp } from "./app";
import { env } from "./env";
import { refreshStaleSeries } from "./services/series-info";

const app = await buildApp();

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// Radar de novedades: una pasada al arrancar (tras un respiro) y cada 6 h.
// Vive en server.ts y no en buildApp para que los tests nunca toquen la red.
setTimeout(() => {
  void refreshStaleSeries().then((n) => n && app.log.info(`radar: ${n} series refrescadas`));
}, 30_000);
setInterval(() => {
  void refreshStaleSeries().then((n) => n && app.log.info(`radar: ${n} series refrescadas`));
}, 6 * 60 * 60 * 1000).unref();
