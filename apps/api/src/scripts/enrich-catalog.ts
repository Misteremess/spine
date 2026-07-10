/**
 * Enriquecimiento puntual de todo el catálogo: repasa las ediciones y
 * completa las que tengan huecos (portada, sinopsis, autores, páginas…).
 * Idempotente y respetuoso con las fuentes (pausa entre ediciones).
 *   pnpm tsx src/scripts/enrich-catalog.ts
 */
import { db, schema } from "../db/index";
import { enrichEdition } from "../services/enrich";

const editions = await db
  .select({ isbn13: schema.editions.isbn13, title: schema.editions.title })
  .from(schema.editions);

let touched = 0;
for (const ed of editions) {
  try {
    const changed = await enrichEdition(ed.isbn13);
    if (changed) {
      touched++;
      console.log(`✓ ${ed.title}`);
    }
  } catch (err) {
    console.log(`✗ ${ed.title}: ${err instanceof Error ? err.message : err}`);
  }
  await new Promise((r) => setTimeout(r, 600));
}

console.log(`\n${touched} de ${editions.length} ediciones enriquecidas`);
process.exit(0);
