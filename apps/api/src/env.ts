import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Cargar apps/api/.env SIEMPRE (tsx no lo hace solo): sin esto el server
// arranca sin la key de Google Books y la cascada pierde la mitad de fuentes.
const envFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    /* variables ya definidas en el entorno ganan */
  }
}

const EnvSchema = z.object({
  DATABASE_URL: z.string().default("postgres://localhost:5432/spine_dev"),
  GOOGLE_BOOKS_API_KEY: z.string().default(""),
  PORT: z.coerce.number().default(3123),
  BETTER_AUTH_URL: z.string().default("http://localhost:3123"),
  // Solo para desarrollo local; en producción DEBE venir del entorno.
  BETTER_AUTH_SECRET: z.string().default("spine-dev-secret-cambiame-en-produccion"),
  // Origen del frontend web (CORS + orígenes de confianza de Better Auth).
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  // SMTP (Brevo). Si SMTP_HOST está vacío no se envían correos y la
  // verificación de email queda desactivada (modo desarrollo).
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  EMAIL_FROM: z.string().default("Spine <no-reply@spine.local>"),
});

export const env = EnvSchema.parse(process.env);
