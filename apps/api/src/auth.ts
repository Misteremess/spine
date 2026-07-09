import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index";
import { account, session, user, verification } from "./db/schema";
import { env } from "./env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  plugins: [expo()],
  // spine:// = app compilada · exp:// = desarrollo con Expo Go
  trustedOrigins: ["spine://", "exp://", "exp://*"],
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
