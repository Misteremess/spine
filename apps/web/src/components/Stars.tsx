"use client";

/**
 * Estrellas de valoración (escala interna 1..10 → 5 estrellas con medias).
 * El glifo Unicode de media estrella (⯨) no existe en la mayoría de fuentes,
 * así que la media se dibuja recortando una estrella llena al 50 %.
 */

function Star({ fill, size }: { fill: number; size: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "inline-block",
        fontSize: size,
        lineHeight: 1,
        color: "var(--tinta3)",
      }}
    >
      ★
      {fill > 0 && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            width: `${Math.min(1, fill) * 100}%`,
            overflow: "hidden",
            color: "var(--ambar)",
            whiteSpace: "nowrap",
          }}
        >
          ★
        </span>
      )}
    </span>
  );
}

/** Muestra una valoración 0..10 como 5 estrellas (solo lectura). */
export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, verticalAlign: "middle" }} title={`${(value / 2).toFixed(1)} de 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} fill={(value - (s - 1) * 2) / 2} />
      ))}
    </span>
  );
}

/**
 * Selector de estrellas: un toque = entera, otro = media, otro = quitar.
 * `value` va en 0..10; onChange recibe el nuevo valor (o null para quitar).
 */
export function StarPicker({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (next: number | null) => void;
  size?: number;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          title={`${star} estrellas (toca de nuevo para media / quitar)`}
          style={{ padding: 0, lineHeight: 1 }}
          onClick={() => {
            const next = value === star * 2 ? star * 2 - 1 : value === star * 2 - 1 ? null : star * 2;
            onChange(next);
          }}
        >
          <Star size={size} fill={(value - (star - 1) * 2) / 2} />
        </button>
      ))}
    </span>
  );
}
