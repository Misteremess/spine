import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index";
import { account, session, user, verification } from "./db/schema";
import { env } from "./env";
import { mailerEnabled, sendMail, verificationEmailHtml } from "./services/mailer";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  plugins: [expo()],
  // spine:// = app compilada · exp:// = desarrollo con Expo Go · web
  trustedOrigins: ["spine://", "exp://", "exp://*", env.WEB_ORIGIN],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    // Con SMTP configurado (Brevo) la verificación es obligatoria;
    // sin él (desarrollo) el registro entra directo.
    requireEmailVerification: mailerEnabled,
    minPasswordLength: 10,
  },
  emailVerification: {
    sendOnSignUp: mailerEnabled,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    async sendVerificationEmail({ user: u, url }) {
      await sendMail({
        to: u.email,
        subject: "Confirma tu correo — Spine",
        html: verificationEmailHtml(u.name, url),
      });
    },
  },
});
