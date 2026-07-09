import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "../auth.js";

export type SessionUser = { id: string; email: string; name: string };

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser;
  }
}

/** preHandler: exige sesión válida y cuelga el usuario de la request. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.raw.headers) });
  if (!session) {
    return reply.code(401).send({ error: "unauthorized", message: "Inicia sesión" });
  }
  req.user = { id: session.user.id, email: session.user.email, name: session.user.name };
}
