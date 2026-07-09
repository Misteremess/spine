import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().default("postgres://localhost:5432/spine_dev"),
  GOOGLE_BOOKS_API_KEY: z.string().default(""),
  PORT: z.coerce.number().default(3123),
  BETTER_AUTH_URL: z.string().default("http://localhost:3123"),
  // Solo para desarrollo local; en producción DEBE venir del entorno.
  BETTER_AUTH_SECRET: z.string().default("spine-dev-secret-cambiame-en-produccion"),
});

export const env = EnvSchema.parse(process.env);
