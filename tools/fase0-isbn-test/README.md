# Fase 0 — Prueba de la cascada de resolución ISBN

Valida la decisión del plan (§13 de `docs/PLAN-PRODUCTO.md`): ¿puede la cascada
**Open Library → Google Books** resolver automáticamente los ISBN de ediciones
españolas (978-84), incluido manga/cómic?

**Umbrales:** ≥60% de resolución = viable · ≥80% = objetivo · <60% = replantear
estrategia de catálogo antes de construir el MVP.

## Uso

```bash
node isbn-cascade-test.mjs all        # collect + test + report
node isbn-cascade-test.mjs collect    # solo recolectar ISBNs
node isbn-cascade-test.mjs test       # solo resolver (usa out/isbns.json)
node isbn-cascade-test.mjs report     # solo informe (usa out/results.json)

# Con API key gratuita de Google Books (1.000 req/día, sin facturación):
GOOGLE_BOOKS_API_KEY=xxx node isbn-cascade-test.mjs test
```

Salidas en `out/`: `isbns.json` (muestra), `results.json` (crudo), `REPORT.md` (informe).

## Metodología

- **Muestra A (Wikidata):** ISBNs 978-84 vía SPARQL. Independiente de las fuentes
  bajo prueba → mide la tasa de resolución real sin circularidad. Sesgo: libros
  "notables" (literatura); puede ser optimista para libro de estantería medio.
- **Muestra B (manga/cómic):** ISBNs de Ivrea, Norma, Planeta Cómic, Panini, ECC
  y Milky Way vía búsqueda de Open Library. OL los conoce por construcción →
  solo mide **calidad de campos** (título, autor, páginas, portada) y cobertura
  del fallback de Google Books, no la tasa de resolución.
- **Contraste pendiente:** escanear 20-30 libros físicos reales (ground truth
  definitivo, sin ningún sesgo de fuente).

## Hallazgos operativos

- **Google Books rechaza el acceso anónimo (429 persistente)** verificado en
  julio 2026. La API key gratuita es requisito desde el día 1 para el MVP.
- Open Library responde bien a ~1 req/s con User-Agent identificado.
- La consulta SPARQL de Wikidata falla (502) si incluye el servicio de
  etiquetas; sin etiquetas funciona.
