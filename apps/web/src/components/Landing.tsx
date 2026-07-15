"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VideoBackdrop from "./VideoBackdrop";

/** Diapositivas del carrusel de la landing: el argumentario de Spine. */
const SLIDES = [
  {
    glyph: "▣",
    title: "Escanea tu estantería",
    body: "Cataloga decenas de libros en una tarde con el escáner en ráfaga. Nada de teclear ISBNs uno a uno.",
  },
  {
    glyph: "▦",
    title: "Domina tus colecciones",
    body: "Spine sabe qué tomos te faltan de cada saga y cuáles ya se han publicado. Nunca compres dos veces el mismo.",
  },
  {
    glyph: "✦",
    title: "Tu año lector, medido",
    body: "Rachas, retos, páginas y estadísticas de verdad. Descubre cómo lees y cuánto llevas construido.",
  },
  {
    glyph: "❖",
    title: "Reseñas y comunidad",
    body: "Puntúa sagas enteras, comparte reseñas y compara tu biblioteca con la de otros coleccionistas.",
  },
];

export default function Landing() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[i]!;

  return (
    <main className="lp">
      <VideoBackdrop />

      {/* Contenido */}
      <div className="lp-inner">
        <header className="lp-top">
          <span className="serif lp-brand">Spine</span>
          <Link href="/login" className="lp-signin">
            Iniciar sesión
          </Link>
        </header>

        <div className="lp-hero">
          <h1 className="serif lp-title">
            Tu biblioteca y tus colecciones, por fin bajo control.
          </h1>
          <p className="lp-lead">
            El CRM de tu vida lectora: escanea, organiza, mide y no vuelvas a comprar un tomo repetido.
          </p>

          {/* Carrusel de valor */}
          <div className="lp-carousel card">
            <div className="lp-slide" key={i}>
              <span className="lp-slide-glyph">{slide.glyph}</span>
              <div>
                <strong className="lp-slide-title">{slide.title}</strong>
                <p className="lp-slide-body">{slide.body}</p>
              </div>
            </div>
            <div className="lp-dots">
              {SLIDES.map((_, n) => (
                <button
                  key={n}
                  aria-label={`Diapositiva ${n + 1}`}
                  onClick={() => setI(n)}
                  className={`lp-dot${n === i ? " lp-dot-on" : ""}`}
                />
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="lp-cta">
            <Link href="/login?nuevo=1" className="btn lp-btn-primary">
              Crear mi cuenta gratis
            </Link>
            <Link href="/login" className="lp-btn-ghost">
              Ya tengo cuenta
            </Link>
          </div>
          <p className="lp-fine">Tu biblioteca es tuya: privada y exportable siempre.</p>
        </div>
      </div>

      <style>{`
        .lp {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          overflow: hidden;
          display: flex;
        }
        .lp-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 28px 24px 40px;
          display: flex;
          flex-direction: column;
        }
        .lp-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .lp-brand {
          font-size: 30px;
          color: var(--ambar);
          letter-spacing: 0.5px;
        }
        .lp-signin {
          color: var(--marfil);
          font-size: 14px;
          padding: 9px 16px;
          border-radius: 10px;
          border: 1px solid rgba(246,241,231,0.22);
          background: rgba(20,18,15,0.35);
          backdrop-filter: blur(6px);
        }
        .lp-signin:hover { border-color: var(--ambar); color: var(--papel); }
        .lp-hero {
          margin-top: auto;
          max-width: 560px;
          padding-top: 80px;
        }
        .lp-title {
          font-size: clamp(34px, 6vw, 56px);
          line-height: 1.05;
          font-weight: 500;
          color: var(--papel);
          text-shadow: 0 2px 24px rgba(0,0,0,0.5);
        }
        .lp-lead {
          margin-top: 16px;
          font-size: clamp(15px, 2.2vw, 18px);
          color: var(--marfil);
          max-width: 480px;
        }
        .lp-carousel {
          margin-top: 28px;
          background: rgba(29,26,21,0.72);
          backdrop-filter: blur(10px);
          border-color: rgba(246,241,231,0.12);
        }
        .lp-slide {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          min-height: 92px;
          animation: lpfade 0.5s ease;
        }
        @keyframes lpfade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .lp-slide-glyph {
          font-size: 24px;
          color: var(--ambar);
          line-height: 1.2;
          flex-shrink: 0;
        }
        .lp-slide-title { font-size: 17px; color: var(--papel); }
        .lp-slide-body { margin-top: 5px; font-size: 14px; color: var(--mut); line-height: 1.5; }
        .lp-dots { display: flex; gap: 7px; margin-top: 16px; }
        .lp-dot {
          width: 22px; height: 4px; border-radius: 99px;
          background: rgba(246,241,231,0.22);
          transition: background 0.3s;
        }
        .lp-dot-on { background: var(--ambar); }
        .lp-cta {
          margin-top: 28px;
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
        }
        .lp-btn-primary { font-size: 15px; padding: 13px 22px; }
        .lp-btn-ghost {
          color: var(--marfil);
          font-size: 15px;
          font-weight: 600;
          padding: 13px 20px;
          border-radius: 10px;
          border: 1px solid rgba(246,241,231,0.22);
        }
        .lp-btn-ghost:hover { border-color: var(--ambar); color: var(--papel); }
        .lp-fine { margin-top: 16px; font-size: 12px; color: var(--mut); }
      `}</style>
    </main>
  );
}
