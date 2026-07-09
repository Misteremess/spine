/**
 * Backfill puntual: detecta serie/tomo en las ediciones ya catalogadas
 * (las anteriores a la detección automática). Idempotente.
 *   pnpm tsx src/scripts/backfill-series.ts
 */
import { eq, isNull } from "drizzle-orm";
import { db, schema } from "../db/index";
import { extractFromTitle, seriesNameKey } from "../services/series";

const editions = await db
  .select({ id: schema.editions.id, title: schema.editions.title, workId: schema.editions.workId })
  .from(schema.editions)
  .where(isNull(schema.editions.volumeNumber));

let hits = 0;
for (const ed of editions) {
  const hit = extractFromTitle(ed.title);
  if (!hit) continue;

  const key = seriesNameKey(hit.name);
  const [ser] = await db
    .insert(schema.series)
    .values({ name: hit.name, nameKey: key })
    .onConflictDoUpdate({ target: schema.series.nameKey, set: { nameKey: key } })
    .returning({ id: schema.series.id });
  if (!ser) continue;

  await db
    .update(schema.works)
    .set({ seriesId: ser.id, seriesPosition: hit.volume })
    .where(eq(schema.works.id, ed.workId));
  await db
    .update(schema.editions)
    .set({ volumeNumber: hit.volume })
    .where(eq(schema.editions.id, ed.id));

  hits++;
  console.log(`✓ ${ed.title} → ${hit.name} #${hit.volume ?? "?"}`);
}

console.log(`\n${hits} de ${editions.length} ediciones vinculadas a serie`);
process.exit(0);
