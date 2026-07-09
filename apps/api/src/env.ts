import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().default("postgres://localhost:5432/spine_dev"),
  GOOGLE_BOOKS_API_KEY: z.string().default(""),
  PORT: z.coerce.number().default(3123),
  BETTER_AUTH_URL: z.string().default("http://localhost:3123"),
  // Solo para desarrollo local; en producción DEBE venir del entorno.
  BETTER_AUTH_SECRET: z.string().default("spine-dev-secret-cambiame-en-produccion"),
  // SMTP (Brevo). Si SMTP_HOST está vacío no se envían correos y la
  // verificación de email queda desactivada (modo desarrollo).
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  EMAIL_FROM: z.string().default("Spine <no-reply@spine.local>"),
});

export const env = EnvSchema.parse(process.env);
