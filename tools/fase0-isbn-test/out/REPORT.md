# Fase 0 — Resultado de la prueba de cascada ISBN

Fecha: 2026-07-09 · Cascada probada: **Open Library → Google Books**.
Google Books: con API key.

"Resuelto" = título + autor (mínimo para ficha automática). "Completo" = + páginas + portada.

## Muestra A — Wikidata (120 ISBNs 978-84, independiente → tasa de resolución real)

| Métrica | Valor | Umbral del plan |
|---|---|---|
| **Resueltos por la cascada** | **68.3%** | ≥60% viable · ≥80% objetivo |
| Ficha completa | 40.8% | — |
| Open Library conoce el ISBN | 63.3% | — |
| Google Books conoce el ISBN | 37.5% | — |
| Con portada | 50.0% | — |
| Con nº páginas | 65.8% | — |

## Muestra B — Manga/cómic vía OL (105 ISBNs; OL los conoce por construcción → mide calidad de campos y fallback)

| Métrica | Valor |
|---|---|
| Ficha OL con título+autor | 78.1% |
| Ficha completa (páginas+portada) | 70.5% |
| Con portada | 94.3% |
| Con nº páginas | 83.8% |
| Con autor | 78.1% |
| Google Books también lo tiene | 31.4% |

### Por editorial (muestra B)

| Editorial | N | Título+autor | Completa | Portada |
|---|---|---|---|---|
| Ivrea | 15 | 53.3% | 53.3% | 100.0% |
| Norma Editorial | 15 | 93.3% | 86.7% | 100.0% |
| Planeta Cómic | 15 | 86.7% | 86.7% | 100.0% |
| Planeta DeAgostini | 15 | 53.3% | 33.3% | 73.3% |
| Panini Comics | 15 | 73.3% | 66.7% | 100.0% |
| ECC Ediciones | 15 | 100.0% | 86.7% | 86.7% |
| Milky Way Ediciones | 15 | 86.7% | 80.0% | 100.0% |

## No resueltos (61 de 225)

- `9788493701314` [wikidata]
- `9788496747548` [wikidata]
- `9788481085426` [wikidata]
- `9788433963963` [wikidata]
- `9788470023576` [wikidata]
- `9788468840499` [wikidata]
- `9788432233678` [wikidata]
- `9788409224470` [wikidata]
- `9788483020807` [wikidata]
- `9788409177028` [wikidata]
- `9788447383047` [wikidata]
- `9788415564690` [wikidata]
- `9788480536844` [wikidata]
- `9788432206405` [wikidata]
- `9788415329725` [wikidata]
- `9788447354092` [wikidata]
- `9788416208326` [wikidata]
- `9788474767964` [wikidata]
- `9788461348220` [wikidata]
- `9788491921882` [wikidata]
- `9788430619283` [wikidata]
- `9788461622221` [wikidata]
- `9788494908798` [wikidata]
- `9788439812302` [wikidata]
- `9788439857532` [wikidata]
- `9788439887775` [wikidata]
- `9788460423393` [wikidata]
- `9788460707882` [wikidata]
- `9788478228881` [wikidata]
- `9788477225447` [wikidata]
- `9788477225454` [wikidata]
- `9788477225461` [wikidata]
- `9788496208001` [wikidata]
- `9788445073049` [wikidata]
- `9788448030162` [wikidata]
- `9788416281763` [wikidata]
- `9788472837164` [wikidata]
- `9788483253977` [wikidata]
- `9788417490270` [openlibrary/Ivrea] — «Uzumaki»
- `9788419306593` [openlibrary/Ivrea] — «スパイファミリー»
- `9788418271434` [openlibrary/Ivrea] — «Spy x Family, Vol. 1»
- `9788418645853` [openlibrary/Ivrea] — «Sensor»
- `9788418751684` [openlibrary/Ivrea] — «Mob Psycho 100»
- `9788418562235` [openlibrary/Ivrea] — «Spy x Family, Vol. 3»
- `9788418562884` [openlibrary/Ivrea] — «Spy x Family, Vol. 4»
- `9788498478181` [openlibrary/Norma Editorial] — «Fairy Tail 1 (Fairy Tail)»
- `9788416244041` [openlibrary/Planeta Cómic] — «Doraemon»
- `9788491465843` [openlibrary/Planeta Cómic] — «Espiral»
- `9788415480129` [openlibrary/Planeta DeAgostini] — «Juego de tronos»
- `9788484312321` [openlibrary/Planeta DeAgostini] — «The Doll's House»
- … y 11 más (ver results.json)

## Notas metodológicas

- La muestra A (Wikidata) sesga hacia libros "notables" (literatura, premios); un ISBN aleatorio de estantería real puede rendir peor. La muestra B cubre manga pero no puede medir la tasa de resolución de OL (circular). El contraste definitivo: escanear 20-30 libros físicos reales.
- Verificado: Google Books rechaza (429) el acceso anónimo desde esta red. Conclusión para el plan §13: **la API key gratuita de Google Books (1.000 req/día, sin facturación) es requisito desde el día 1**, no opcional.