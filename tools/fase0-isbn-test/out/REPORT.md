# Fase 0 — Resultado de la prueba de cascada ISBN

Fecha: 2026-07-09 · Cascada probada: **Open Library → Google Books**.
Google Books: con API key.

"Resuelto" = título + autor (mínimo para ficha automática). "Completo" = + páginas + portada.

## Muestra A — Wikidata (120 ISBNs 978-84, independiente → tasa de resolución real)

| Métrica | Valor | Umbral del plan |
|---|---|---|
| **Resueltos por la cascada** | **75.8%** | ≥60% viable · ≥80% objetivo |
| Ficha completa | 46.7% | — |
| Open Library conoce el ISBN | 63.3% | — |
| Google Books conoce el ISBN | 41.7% | — |
| Con portada | 54.2% | — |
| Con nº páginas | 70.0% | — |

## Muestra B — Manga/cómic vía OL (105 ISBNs; OL los conoce por construcción → mide calidad de campos y fallback)

| Métrica | Valor |
|---|---|
| Ficha OL con título+autor | 98.1% |
| Ficha completa (páginas+portada) | 85.7% |
| Con portada | 100.0% |
| Con nº páginas | 85.7% |
| Con autor | 98.1% |
| Google Books también lo tiene | 30.5% |

### Por editorial (muestra B)

| Editorial | N | Título+autor | Completa | Portada |
|---|---|---|---|---|
| Ivrea | 15 | 100.0% | 73.3% | 100.0% |
| Norma Editorial | 15 | 100.0% | 93.3% | 100.0% |
| Planeta Cómic | 15 | 100.0% | 93.3% | 100.0% |
| Planeta DeAgostini | 15 | 100.0% | 73.3% | 100.0% |
| Panini Comics | 15 | 93.3% | 80.0% | 100.0% |
| ECC Ediciones | 15 | 100.0% | 100.0% | 100.0% |
| Milky Way Ediciones | 15 | 93.3% | 86.7% | 100.0% |

## No resueltos (31 de 225)

- `9788493701314` [wikidata]
- `9788491565598` [wikidata]
- `9788496747548` [wikidata]
- `9788468840499` [wikidata]
- `9788409224470` [wikidata]
- `9788409177028` [wikidata]
- `9788447383047` [wikidata]
- `9788415329725` [wikidata]
- `9788492866809` [wikidata]
- `9788474767964` [wikidata]
- `9788461348220` [wikidata]
- `9788461622221` [wikidata]
- `9788494908798` [wikidata]
- `9788439812302` [wikidata]
- `9788439857532` [wikidata]
- `9788439887775` [wikidata]
- `9788440420657` [wikidata]
- `9788460423393` [wikidata]
- `9788460465928` [wikidata]
- `9788460707882` [wikidata]
- `9788478228881` [wikidata]
- `9788477225447` [wikidata]
- `9788477225461` [wikidata]
- `9788426133779` [wikidata]
- `9788496208001` [wikidata]
- `9788448030162` [wikidata]
- `9788416281763` [wikidata]
- `9788472837164` [wikidata]
- `9788483253977` [wikidata]
- `9788498857221` [openlibrary/Panini Comics] — «WORLD OF WARCRAFT»
- `9788417373658` [openlibrary/Milky Way Ediciones] — «YOU ARE IN THE BLUE SUMMER»

## Notas metodológicas

- La muestra A (Wikidata) sesga hacia libros "notables" (literatura, premios); un ISBN aleatorio de estantería real puede rendir peor. La muestra B cubre manga pero no puede medir la tasa de resolución de OL (circular). El contraste definitivo: escanear 20-30 libros físicos reales.
- Verificado: Google Books rechaza (429) el acceso anónimo desde esta red. Conclusión para el plan §13: **la API key gratuita de Google Books (1.000 req/día, sin facturación) es requisito desde el día 1**, no opcional.