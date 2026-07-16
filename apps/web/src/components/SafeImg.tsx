"use client";

import { useState } from "react";

/**
 * Imagen que desaparece si falla o si el servidor devuelve un pixel en blanco
 * (covers.openlibrary.org responde 200 con un GIF de 1×1 cuando no tiene la
 * portada). Colócala encima de un fondo de respaldo: si se oculta, se ve él.
 */
export function SafeImg({ src, style }: { src: string; style?: React.CSSProperties }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth <= 1) setBroken(true);
      }}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }}
    />
  );
}
