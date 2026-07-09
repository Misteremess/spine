import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().default("postgres://localhost:5432/spine_dev"),
  GOOGLE_BOOKS_API_KEY: z.string().default(""),
  PORT: z.coerce.number().default(3001),
});

export const env = EnvSchema.parse(process.env);
