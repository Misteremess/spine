"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo de fondo a pantalla completa con velo. Fuerza la reproducción en
 * cuanto monta: algunos navegadores ignoran `autoPlay` en el markup salvo que
 * el elemento esté silenciado y se llame a play() por código.
 */
export default function VideoBackdrop({
  src = "/landing/hero-book-water.mp4",
  poster = "/landing/hero-book-water.jpg",
  scrim = "linear-gradient(180deg, rgba(20,18,15,0.55) 0%, rgba(20,18,15,0.35) 40%, rgba(20,18,15,0.92) 100%), radial-gradient(120% 80% at 15% 20%, rgba(20,18,15,0.15), rgba(20,18,15,0.78))",
}: {
  src?: string;
  poster?: string;
  scrim?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    // Reintenta cuando hay datos suficientes, al volver a la pestaña/ventana
    // y si el navegador la pausa por su cuenta (throttling en segundo plano,
    // interrupciones de reproducción, etc.): así nunca se queda congelada.
    const resumeIfVisible = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    v.addEventListener("canplay", tryPlay);
    v.addEventListener("loadeddata", tryPlay);
    v.addEventListener("pause", resumeIfVisible);
    document.addEventListener("visibilitychange", resumeIfVisible);
    window.addEventListener("focus", resumeIfVisible);
    return () => {
      v.removeEventListener("canplay", tryPlay);
      v.removeEventListener("loadeddata", tryPlay);
      v.removeEventListener("pause", resumeIfVisible);
      document.removeEventListener("visibilitychange", resumeIfVisible);
      window.removeEventListener("focus", resumeIfVisible);
    };
  }, []);

  return (
    <>
      <video
        ref={ref}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: scrim }} />
    </>
  );
}
