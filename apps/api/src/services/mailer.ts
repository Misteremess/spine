/**
 * Correo transaccional vía SMTP (Brevo en producción: 300/día gratis).
 * Sin SMTP_HOST configurado no hay envíos: la verificación de email queda
 * desactivada y el flujo de registro no cambia (modo desarrollo).
 */
import nodemailer from "nodemailer";
import { env } from "../env";

export const mailerEnabled = env.SMTP_HOST !== "";

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transport;
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  if (!mailerEnabled) throw new Error("SMTP no configurado");
  await getTransport().sendMail({ from: env.EMAIL_FROM, ...opts });
}

export function verificationEmailHtml(name: string, url: string): string {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#14120F;color:#F6F1E7;border-radius:14px">
    <h1 style="font-size:22px;color:#D9A441;margin:0 0 16px">Spine</h1>
    <p style="font-size:15px;line-height:1.6">Hola${name ? ` ${name}` : ""}:</p>
    <p style="font-size:15px;line-height:1.6">Confirma tu correo para estrenar tu biblioteca. El enlace caduca en una hora.</p>
    <p style="margin:28px 0">
      <a href="${url}" style="background:#D9A441;color:#1B1610;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block">Confirmar mi correo</a>
    </p>
    <p style="font-size:12px;color:#9A8F7A">Si no creaste una cuenta en Spine, ignora este mensaje.</p>
  </div>`;
}
