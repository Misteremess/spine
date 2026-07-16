"use client";

import { useState } from "react";
import { spineColor, spineInk } from "@/lib/spine";

/** Oscurece un hex por un factor 0..1 (0 = igual, 1 = negro). */
function darken(hex: string, f: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const d = (c: number) => Math.round(c * (1 - f));
  return `rgb(${d(r)}, ${d(g)}, ${d(b)})`;
}

/**
 * Portada de un libro. Si hay imagen la muestra; si no, genera una portada
 * de color (gradiente del hash del título + canto + título serif) en vez de
 * una caja gris. Coste cero y estable entre sesiones, como los lomos.
 *
 * Ojo: covers.openlibrary.org responde 200 con un GIF de 1×1 cuando NO tiene
 * portada — sin detectarlo, media biblioteca se ve como cajas vacías. Por eso
 * se comprueba naturalWidth al cargar y se cae a la portada generada.
 */
export function Cover({
  title,
  authors,
  coverUrl,
}: {
  title: string | null;
  authors?: string[];
  coverUrl?: string | null;
}) {
  const [broken, setBroken] = useState(false);

  if (coverUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth <= 1) setBroken(true);
        }}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }

  const seed = title ?? "?";
  const base = spineColor(seed);
  const ink = spineInk(base);
  const author = authors && authors.length > 0 ? authors[0] : null;

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        padding: "12% 12% 12% 16%",
        textAlign: "left",
        color: ink,
        background: `linear-gradient(150deg, ${base} 0%, ${darken(base, 0.28)} 100%)`,
        overflow: "hidden",
        containerType: "inline-size",
      }}
    >
      {/* Canto del libro */}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "6%",
          minWidth: 5,
          background: darken(base, 0.42),
          borderRight: `1px solid ${darken(base, 0.55)}`,
        }}
      />
      <span
        className="serif"
        style={{
          fontSize: "clamp(13px, 15cqw, 21px)",
          lineHeight: 1.15,
          fontWeight: 500,
          display: "-webkit-box",
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title ?? "Sin título"}
      </span>
      {author && (
        <span
          style={{
            fontSize: "clamp(9px, 8cqw, 12px)",
            opacity: 0.72,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {author}
        </span>
      )}
    </div>
  );
}
