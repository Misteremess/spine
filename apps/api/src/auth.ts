import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";
import { account, session, user, verification } from "./db/schema.js";
import { env } from "./env.js";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    // TODO(beta): activar verificación por email cuando haya SMTP (Brevo).
    requireEmailVerification: false,
    minPasswordLength: 10,
  },
});
