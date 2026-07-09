import { defineConfig } from "vitest/config";

/**
 * Los tests de rutas corren contra una BD real pero separada (spine_test),
 * que el globalSetup crea y migra. Sin key de Google Books y con el catálogo
 * sembrado a mano, ninguna prueba toca la red.
 */
export default defineConfig({
  test: {
    globalSetup: "./test/global-setup.ts",
    env: {
      DATABASE_URL: "postgres://localhost:5432/spine_test",
      GOOGLE_BOOKS_API_KEY: "",
    },
    // Todos los ficheros comparten la BD de test: en serie.
    fileParallelism: false,
  },
});
