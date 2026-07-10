"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth";

/** Puerta de entrada: con sesión a la biblioteca, sin ella al login. */
export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    router.replace(session ? "/biblioteca" : "/login");
  }, [session, isPending, router]);

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <p className="serif" style={{ color: "var(--mut)", fontSize: 18 }}>
        Spine
      </p>
    </main>
  );
}
