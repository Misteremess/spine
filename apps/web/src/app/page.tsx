"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Landing from "@/components/Landing";
import { authClient } from "@/lib/auth";

/** Puerta de entrada: con sesión a la biblioteca, sin ella la landing. */
export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session) router.replace("/biblioteca");
  }, [session, isPending, router]);

  // Mientras comprobamos la sesión, o si ya hay sesión (redirigiendo), no
  // parpadeamos la landing.
  if (isPending || session) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <p className="serif" style={{ color: "var(--mut)", fontSize: 18 }}>
          Spine
        </p>
      </main>
    );
  }

  return <Landing />;
}
