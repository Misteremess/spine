# SPINE — Plan estratégico de producto

> Plataforma SaaS multiplataforma (Android, iOS, web) para registrar, organizar y entender tu biblioteca personal: libros, mangas, cómics, sagas y colecciones.
>
> Versión 0.1 — Julio 2026. Documento de definición previo a cualquier desarrollo.

---

## 1. Visión general del producto

**Qué es.** Spine es el CRM personal del lector y del coleccionista: una plataforma donde cada usuario registra su biblioteca física y digital, controla su lectura, gestiona colecciones por tomos y entiende su relación con los libros a lo largo del tiempo. No es una red social de reseñas (Goodreads), ni un timer de lectura (Bookly), ni un catálogo académico (LibraryThing): es **tu biblioteca como sistema vivo**.

**Para quién.** Lectores que poseen libros y quieren control real sobre ellos: qué tienen, qué les falta, qué están leyendo, qué han prestado, cuánto han gastado, qué colecciones están incompletas. Especial foco en dos perfiles desatendidos: el **coleccionista de manga/cómic** y el **lector intensivo que quiere datos, no red social**.

**Problema que resuelve.** Hoy este usuario vive fragmentado:
- Goodreads para tracking (datos malos, UX de 2010, sin colecciones físicas).
- Una hoja de cálculo o Notion para la colección (manual, sin escáner, sin portadas, se abandona).
- MyAnimeList/AniList para manga (no cubre ediciones físicas ni tomos comprados vs. leídos).
- Nada para préstamos, ubicación física, precio pagado, tomos que faltan o duplicados accidentales en la librería.

**Por qué debería existir.** Ninguna app del mercado une biblioteca física + tracking de lectura + colecciones por tomos + estadísticas premium en una experiencia moderna. El hueco es real y es especialmente grande en español: el catálogo de ediciones españolas (Planeta Cómic, Ivrea, Norma, Milky Way, Panini…) está fatal cubierto en todas las apps existentes. Ser buenos ahí es una ventaja defendible.

**Tesis de producto en una frase:** *"Tu biblioteca, bajo control. Tu lectura, con memoria."*

---

## 2. Propuesta de valor

**Promesa al usuario:** en menos de un minuto por libro, tu biblioteca entera está digitalizada, organizada y viva. A partir de ahí, Spine te dice lo que ninguna estantería puede: qué te falta, qué has abandonado, qué prestaste, cómo lees y quién eres como lector.

**Pilares diferenciales:**

1. **La colección física es ciudadana de primera clase.** Ejemplar, edición, precio, estado, ubicación, duplicados, préstamos. Las demás apps tratan "el libro" como concepto abstracto; nosotros tratamos *tu ejemplar*.
2. **Tomos y series de verdad.** Comprado ≠ leído. Un manga de 42 tomos es una entidad con progreso doble (posesión y lectura), detección de huecos y alertas de próximos lanzamientos.
3. **Datos y privacidad primero, social opcional.** Tu biblioteca es tuya: exportable siempre, privada por defecto. El "feed" no existe; existen *tus* estadísticas.
4. **Experiencia premium.** La app debe producir el mismo placer que ordenar una estantería bonita. Coleccionar es estética; la app tiene que estar a la altura.
5. **Catálogo en español cuidado.** Corrección comunitaria + base propia progresiva donde Google Books y Open Library fallan.

**Por qué se usa cada semana:** actualizar progreso de lectura (hábito diario), registrar compras nuevas (hábito semanal del coleccionista), consultar la wishlist en la librería ("¿tengo ya el tomo 14?" — este momento es oro: es el caso de uso que convierte la app en imprescindible), y el ritual mensual/anual de estadísticas (el "Spotify Wrapped" lector).

---

## 3. Público objetivo

| Segmento | Necesidad principal | Dolor actual | Funciones clave |
|---|---|---|---|
| **Coleccionista manga/cómic** ⭐ | Controlar tomos: tengo/me falta/leído | Excel manual; MAL no gestiona ediciones físicas; comprar tomos duplicados | Modo serie, detector de huecos, escáner rápido en ráfaga, alertas de lanzamientos, valor de colección |
| **Lector intensivo (30+ libros/año)** ⭐ | Tracking rico y estadísticas | Goodreads es pobre; StoryGraph no gestiona lo físico | Progreso, rachas, objetivos, stats profundas, ranking personal, notas |
| **Lector casual (5–15/año)** | Recordar qué leyó y qué quiere leer | No usa nada o abandona Goodreads | Onboarding ultrasimple, wishlist, escáner, modo minimalista |
| **Coleccionista de libro general** | Catálogo de ediciones, primeras ediciones, valor | LibraryThing es potente pero anticuado y de pago histórico | Campos de edición/estado/precio, ubicación física, export, duplicados |
| **Estudiante / lector técnico** | Notas por libro, referencias, "dónde leí esto" | Notas dispersas | Notas con página, etiquetas, búsqueda en notas, export Markdown |
| **Clubes de lectura** (fase 2+) | Lectura compartida, progreso del grupo | WhatsApp + Goodreads a trozos | Estanterías compartidas, progreso del club (sin spoilers por posición) |
| **Librerías pequeñas** (explorar, no MVP) | Inventario ligero, recomendación a clientes | TPVs caros o nada | Posible B2B futuro; **no** condicionar el producto ahora |

**Decisión recomendada:** los segmentos cabeza de playa son **coleccionista de manga/cómic + lector intensivo**. Son los que hoy sufren con hojas de cálculo (máxima motivación de cambio), los más virales en comunidades (Reddit, X, TikTok booktok/manga-tok, Discord) y los que definen las funciones diferenciales. El lector casual llega después por gravedad: una app buena para el intensivo es usable por el casual si existe el modo minimalista; al revés nunca funciona.

---

## 4. Benchmark competitivo

| Competidor | Hace bien | Hace mal | Cómo lo superamos |
|---|---|---|---|
| **Goodreads** | Masa crítica, base de datos enorme, reto anual | UX anticuada, datos sucios, sin colecciones físicas ni tomos, sin export decente, abandonada por Amazon | Experiencia moderna, ejemplar físico, import directo desde Goodreads CSV (puente de entrada clave) |
| **The StoryGraph** | Estadísticas y moods, retos, buena reputación | Sin gestión física real, sin manga/tomos, catálogo flojo en español, web-first | Colección física + tomos + catálogo ES + apps nativas de verdad |
| **Bookly** | Timer de lectura, gamificación, hábito diario | Solo hábito: no es biblioteca ni colección; premium agresivo | Somos sistema completo; el timer es una pieza, no el producto |
| **LibraryThing** | Catalogación profunda, campos de edición | Parece de 2005, curva de aprendizaje, cero móvil moderno | Misma profundidad con UX 2026 y móvil first-class |
| **AniList / MyAnimeList** | Tracking de series/capítulos excelente, comunidad | Solo manga/anime; no ediciones físicas ni compra vs. lectura; no libros | Unificamos manga + libros + posesión física en una sola app |
| **Notion / Excel** | Flexibilidad total, gratis | Todo manual: sin escáner, sin portadas automáticas, sin stats; alta tasa de abandono | Escáner + datos automáticos + import CSV desde sus plantillas |
| **CLZ Books / Libib** | Escaneo e inventario físico sólido | Puro inventario: sin tracking de lectura, UX utilitaria, CLZ de pago | Inventario + vida lectora + estética; ellos son "almacén", nosotros "relación" |

**Síntesis:** cada competidor cubre una franja: social (Goodreads), stats (StoryGraph), hábito (Bookly), catálogo (LibraryThing/CLZ), series (AniList). **Nadie une posesión + lectura + colecciones + estética.** Esa intersección es el producto. Y el import desde Goodreads/CSV es la palanca de adquisición número uno: nadie cambia de app si no puede traerse sus datos en dos toques.

---

## 5. Funcionalidades principales (por módulos)

### 5.1 Biblioteca personal
- Añadir por escáner, búsqueda online o manual; edición completa de fichas.
- Ficha de ejemplar: portada, título, autor(es), editorial, ISBN, idioma, formato (tapa dura/blanda/bolsillo/digital/audio), páginas, fecha y precio de compra, edición, volumen, estado físico, ubicación (estantería/caja/casa), notas, valoración, etiquetas.
- Vistas: cuadrícula de portadas, lista compacta, **vista estantería (lomos)**, agrupación por serie/autor/editorial/etiqueta/ubicación.
- Detección de duplicados al añadir ("ya tienes este ISBN").
- Múltiples ejemplares del mismo libro (reediciones, idiomas).

### 5.2 Escáner de código de barras
- Escaneo EAN-13/ISBN con cámara, **modo ráfaga** (escanear 20 libros seguidos sin salir de la cámara) — crítico para el onboarding del coleccionista.
- Resolución ISBN → metadatos con cascada de fuentes (ver §13) y cola offline: si no hay red, se guarda el ISBN y se resuelve después.
- Feedback inmediato: portada + título en <1s cuando hay caché.

### 5.3 Buscador
- Búsqueda por título, autor, ISBN, editorial, serie; filtros por idioma y formato.
- Primero contra catálogo propio (rápido, curado), después contra fuentes externas con resultados fusionados y deduplicados.

### 5.4 Gestión de lectura
- Estados: leyendo, leído, pendiente, abandonado, en pausa, relectura. (Prestado y wishlist NO son estados de lectura: préstamo es un atributo del ejemplar y wishlist es una lista aparte — mezclar estos tres planos es el error clásico de Goodreads.)
- Progreso por página o porcentaje; sesiones de lectura opcionales (fecha, páginas, minutos).
- Fechas inicio/fin, múltiples lecturas del mismo libro, valoración al terminar (con media si hay relecturas).

### 5.5 Manga, cómics y colecciones
- Entidad **Serie** con tomos numerados; progreso doble: **tomos que tengo / tomos leídos / tomos publicados** (tres barras).
- Detector de huecos ("te faltan los tomos 4, 9 y 12").
- Arcos argumentales opcionales, series abiertas vs. cerradas, ediciones alternativas (kanzenban, 3-en-1).
- Sagas de novelas con orden de lectura (publicación vs. cronológico).
- Alertas de próximos lanzamientos por serie seguida (v1.1+).

### 5.6 Wishlist
- Lista separada con prioridad, precio objetivo y notas; mover a biblioteca en un toque al comprar ("lo compré": pide precio y fecha, hereda todo lo demás).
- Modo tienda: wishlist accesible offline y ordenable por serie, para consultar en la librería.

### 5.7 Estadísticas
- Libros/páginas por mes y año, rachas, ritmo medio, distribución por género/autor/editorial/idioma/formato.
- Coleccionista: valor total de colección, gasto mensual, series completas vs. incompletas, ratio comprado/leído (el famoso **tsundoku ratio**).
- Resumen anual compartible como imagen (viralidad orgánica).

### 5.8 Notas y reseñas privadas
- Notas por libro con página opcional, citas favoritas, reseña privada al terminar; todo Markdown y exportable. Privado por defecto.

### 5.9 Sistema social (opcional, fase 2+)
- Perfil público opt-in, estantería compartible por enlace, clubes con progreso conjunto. **Nunca** feed algorítmico ni social obligatorio.

### 5.10 Recomendaciones
- Fase 1: "de tu propia biblioteca" (pendientes olvidados, siguiente tomo, "compraste hace 2 años y no lo abriste").
- Fase 2: por afinidad de catálogo (usuarios con bibliotecas parecidas, calculable en nuestra BD sin servicios externos).

### 5.11 Objetivos y recordatorios
- Reto anual (libros/páginas), objetivos por género o de "reducir pendientes"; recordatorios suaves configurables (nunca push agresivo).

### 5.12 Importación / exportación
- **Import**: CSV de Goodreads (prioridad máxima), StoryGraph, CSV genérico con mapeo de columnas.
- **Export**: CSV/JSON completo en cualquier momento, gratis, siempre. Es principio de producto y obligación RGPD.

### 5.13 Perfil, panel web y app móvil
- Perfil: avatar, bio lectora, idiomas, géneros; preferencias de modo (coleccionista/minimalista).
- Móvil = captura y consulta rápida (escáner, progreso, wishlist en tienda). Web = gestión masiva y análisis (edición en tabla, import/export, stats grandes). No son la misma UI adaptada: son énfasis distintos sobre los mismos datos.

### 5.14 Administración interna
- Panel para: curación del catálogo (fusionar duplicados, aprobar correcciones de comunidad), métricas de uso, gestión de usuarios y reportes.

### 5.15 Monetización (ver §14)
- Freemium con límites generosos; premium por valor añadido (stats avanzadas, alertas, multi-ubicación, temas), nunca rehén de los datos del usuario.

---

## 6. Funcionalidades diferenciales

Ordenadas por impacto/esfuerzo (las ⭐ definen la identidad del producto):

1. ⭐ **Detector de tomos faltantes + progreso triple** (tengo/leído/publicado). Nadie lo hace bien. Es LA feature para manga.
2. ⭐ **Modo ráfaga de escaneo** con cola offline: digitalizar 200 libros en una tarde. El "momento wow" del onboarding.
3. ⭐ **Vista estantería (spine view)**: tu biblioteca como lomos de colores generados desde los metadatos (color dominante de portada + grosor proporcional a páginas). Belleza + utilidad + identidad visual = screenshot compartible. De aquí sale el nombre de la app.
4. ⭐ **Tsundoku ratio y CRM del pendiente**: "has comprado 34 libros este año y leído 12; estos 5 llevan más de un año esperando". Insight honesto que ninguna app da.
5. **Seguimiento de préstamos**: a quién, cuándo, recordatorio a los N días. Simple y sorprendentemente inexistente en el mercado.
6. **Timeline de vida lectora**: scroll cronológico de tu historia como lector, con hitos (primer manga, año récord, décima relectura).
7. **Wishlist modo tienda**: offline, agrupada por serie, con "¿lo tengo?" instantáneo por escáner (escaneas en la librería y te dice si ya lo tienes — mata el duplicado accidental).
8. **Ranking personal por duelos**: ordena tus favoritos con comparaciones A/B ("¿cuál te gustó más?"), genera tu top 10 real. Adictivo y compartible.
9. **Etiquetas inteligentes**: reglas automáticas ("editorial = Ivrea → etiqueta manga", "sin abrir + >1 año → etiqueta olvidados").
10. **Alertas de lanzamientos** por serie seguida (requiere datos de calendario editorial: fase 2, empezando por fuentes comunitarias).
11. **Modo coleccionista / modo minimalista**: dos presets de UI sobre el mismo dato; el casual ve 6 campos, el coleccionista ve 20.
12. **Estadísticas de hábitos**: cuándo lees, constancia, velocidad por género, "tu mes más lector".
13. **Import desde foto de estantería** (OCR de lomos): tecnológicamente posible con Tesseract/ML Kit local, pero precisión real mediocre (lomos verticales, tipografías, brillos). **Fase futura como experimento etiquetado beta; no prometerlo en marketing.** El escáner en ráfaga resuelve el 90% del mismo problema con 100% de fiabilidad.
14. **IA (resúmenes de notas, organización)**: solo viable gratis con modelos locales pequeños o límites muy cortos. **Fase 6+, no antes.** No condiciona la arquitectura: las notas ya estarán estructuradas.

**Crítica honesta:** el "sistema de vida lectora" completo y las stats emocionales son features de retención, no de adquisición: nadie descarga una app por ellas, pero se quedan por ellas. Van después del MVP. Lo que trae usuarios es: escáner ráfaga + tomos + import Goodreads + estética.

---

## 7. MVP realista

**Principio: el MVP debe ganar a la hoja de cálculo en la primera sesión.** Eso significa: escanear → ficha completa automática → biblioteca bonita → sincronizada. Todo lo demás es negociable.

### MVP obligatorio (lanzable)
- Cuentas: registro/login (email+contraseña, verificación), perfil básico.
- Biblioteca: añadir por escáner / búsqueda / manual; ficha completa de ejemplar; vistas cuadrícula y lista; búsqueda y filtros locales.
- Escáner con modo ráfaga y cola offline.
- Estados de lectura + progreso por páginas + fechas + valoración.
- Series/sagas con tomos numerados y progreso tengo/leído + detector de huecos. *(Sí, en el MVP: es el diferencial. Un MVP sin esto es "otra Goodreads peor".)*
- Wishlist básica con "lo compré".
- Estadísticas esenciales: libros/páginas por mes-año, estados, ratio comprado/leído.
- Import CSV Goodreads + export CSV/JSON.
- Sync multi-dispositivo (implícita en arquitectura API + móvil offline-first básico de lectura).
- Web app con paridad de consulta y edición (no necesita escáner).

### Versión 1.1 (semanas después, con feedback)
- Préstamos. Notas y citas por libro. Vista estantería (spine view). Objetivos anuales. Etiquetas manuales. Modo minimalista/coleccionista. Import StoryGraph/CSV genérico. Múltiples ubicaciones físicas.

### Versión 2
- Timeline de vida lectora. Ranking por duelos. Etiquetas inteligentes. Resumen anual compartible. Alertas de lanzamientos (fuentes comunitarias). Recomendaciones desde biblioteca propia. Sesiones de lectura con tiempo. Perfil público opt-in y estantería por enlace.

### Premium futuro (ver §14)
- Stats avanzadas e históricas, alertas de lanzamientos automáticas, temas visuales, valor de colección con histórico, export avanzado (PDF catálogo), clubes, backup extendido.

### NO construir al principio (y por qué)
- **Social/feed/comentarios**: coste enorme (moderación, RGPD, frío sin masa crítica). Fase 3+.
- **IA de cualquier tipo**: sin datos aún no aporta; coste y complejidad. Fase 6.
- **OCR de estanterías**: demo bonita, producto frustrante hoy.
- **B2B librerías**: otro producto distinto; distrae.
- **Audiolibros/ebooks con integración de lectura (Kindle etc.)**: APIs cerradas; se soporta como *formato* del ejemplar y punto.
- **Apps de escritorio nativas**: la web cubre ese caso.
- **Marketplace/compraventa de segunda mano**: legal y operativamente otra liga.

---

## 8. Flujos de usuario

Los flujos están descritos al nivel necesario para diseñar pantallas; los edge cases principales van inline.

**Registro/login.** Email + contraseña → verificación por email → onboarding de 3 pantallas: (1) "¿qué lees?" (libro/manga/cómic/mezcla → configura modo por defecto), (2) "trae tu biblioteca" (escanear ahora / importar Goodreads / empezar vacío), (3) objetivo anual opcional. El onboarding debe desembocar en el escáner: el momento mágico tiene que ocurrir en los primeros 2 minutos. OAuth Google/Apple: v1.1 (Apple lo exigirá al publicar en App Store si hay otros logins sociales — planificarlo junto).

**Añadir por escáner.** FAB "＋" → cámara → detecta EAN → tarjeta con portada+título aparece abajo (la cámara sigue activa: ráfaga) → cada tarjeta tiene "editar" para ajustar (formato, precio, ubicación) → "hecho" → resumen "añadidos 14 libros". Si el ISBN no resuelve: tarjeta "no encontrado" → opciones: buscar por título / crear manual con ISBN precargado / dejar en cola para resolver después. Si ya existe en biblioteca: tarjeta ámbar "ya lo tienes (¿otro ejemplar?)".

**Añadir manual.** Formulario con dos niveles: esencial (título, autor, formato, estado) visible, todo lo demás plegado. Guardable con solo título. La portada se puede fotografiar.

**Buscar online.** Barra de búsqueda → resultados fusionados (catálogo propio primero, badge de fuente) → ficha previa → "añadir a biblioteca" o "a wishlist" → selector de edición si hay varias ("¿cuál tienes tú?").

**Marcar leído.** Desde la ficha o long-press en cuadrícula → estado "leído" → sheet: fecha fin (hoy por defecto), valoración con medias estrellas, reseña opcional → confetti sutil → si el libro es parte de serie: "¿empezar tomo 8?".

**Actualizar progreso.** Widget "leyendo ahora" en Home → tap → slider/numérico de página → guardar. Dos toques máximo. (Aquí vive el hábito diario; esta interacción debe ser perfecta.)

**Crear colección/saga.** Al añadir un libro detectado como parte de serie (metadatos), se ofrece vincular. Manual: "nueva serie" → nombre, tipo (manga/cómic/saga/colección editorial), nº de tomos previstos o "abierta" → arrastrar libros existentes.

**Gestionar manga por tomos.** Ficha de serie: cabecera con progreso triple → parrilla de tomos numerados: poseído (lleno), leído (check), faltante (hueco punteado), no publicado (gris) → tap en tomo = acciones rápidas (tengo/leído/wishlist) → "añadir los que faltan a wishlist" en un toque.

**Wishlist.** Corazón en cualquier ficha → prioridad opcional → en la lista: ordenar por prioridad/serie/precio → "lo compré" → sheet de precio+fecha → pasa a biblioteca.

**Estadísticas.** Tab propio → tarjetas: este año (libros, páginas, racha), este mes, por género (dónut), tsundoku ratio, series incompletas → tap en tarjeta = detalle → compartir como imagen.

**Notas.** Ficha → "notas" → nueva nota con página opcional y toggle "es cita" → lista cronológica → buscador global de notas en web.

**Préstamo (v1.1).** Ficha → "prestar" → nombre (contacto local o texto), fecha, recordatorio opcional → badge "prestado a Marta" en biblioteca → "me lo devolvió" limpia el estado y guarda historial.

**Completar perfil.** Post-onboarding, tarjetas sugeridas no bloqueantes en Home ("añade tu objetivo anual", "¿dónde guardas tus libros?").

---

## 9. UX/UI y experiencia de producto

**Concepto de identidad: "biblioteca personal de noche".** Ni la asepsia SaaS (blanco, azul, Inter y cards) ni el skeuomorfismo de madera. La referencia emocional: la calma de una librería bien iluminada por la tarde. Materia: papel, tinta, ámbar. Las portadas de los libros son el color de la app; el chrome se aparta.

**Estilo visual.**
- Dark mode como identidad principal (los coleccionistas viven de noche; las portadas brillan sobre fondo oscuro), light mode "papel" igual de cuidado.
- Fondos con textura sutil de grano de papel, esquinas generosas, sombras suaves y reales.
- Las portadas siempre con proporción real y borde físico sutil (los libros son objetos, no thumbnails).

**Paleta.**
- Tinta: `#14120F` (fondo oscuro) / Papel: `#F6F1E7` (fondo claro)
- Ámbar bibliófilo: `#D9A441` (acento primario: acciones, progreso, estrellas)
- Verde salvia `#7A8B6F` (leído/completado) · Arcilla `#C1553D` (huecos/faltantes/alertas)
- Neutros cálidos, jamás grises azulados.

**Tipografía.**
- Display/títulos: **Fraunces** (serif variable, carácter editorial, gratuita en Google Fonts).
- UI/cuerpo: **Inter** o **Söhne-like gratuita (p. ej. General Sans de Fontshare)**.
- Números de stats: tabulares, grandes, protagonistas.

**Componentes clave.** Tarjeta-libro (portada dominante, metadatos mínimos), parrilla de tomos de serie, barra de progreso triple, sheet de acción rápida (el 80% de interacciones son sheets, no pantallas), anillo de objetivo anual, tarjetas de stats compartibles, la vista estantería.

**Navegación móvil.** Tab bar de 4 + FAB central: **Inicio** (leyendo ahora, actividad, sugerencias de tu propia biblioteca) · **Biblioteca** · **[＋ escanear/añadir]** · **Wishlist** · **Perfil/Stats**. El escáner a un toque desde cualquier sitio: es el gesto-firma de la app.

**Web.** Sidebar, tabla editable estilo hoja de cálculo (edición masiva: la web debe ganar a Excel en lo que Excel hace bien), stats en dashboard amplio, import/export, gestión de series con drag & drop.

**Microinteracciones y animaciones.** Escaneo: pop háptico + tarjeta que se desliza a la pila. Completar libro: la portada "se archiva" en la estantería con física suave + confetti discreto (una vez, no circo). Progreso: el anillo anual crece con easing. Tomo conseguido: el hueco punteado se rellena con un settle satisfactorio. Regla: cada animación < 400 ms, siempre interrumpible, celebra al usuario sin infantilizarlo.

**Cómo debe sentirse.** Calmada, táctil, tuya. Cero dark patterns: sin badges rojos artificiales, sin streaks culpabilizadores (las rachas se celebran, nunca se lloran), sin notificaciones no pedidas. La "adicción" buena sale de: registrar es placentero + las stats son espejo + la colección progresa visiblemente.

**Herramientas de diseño (gratis):** Figma plan gratuito (3 archivos, suficiente para empezar) o **Penpot** (open source, self-host, sin límites) como alternativa libre. Recomendación: Figma free para velocidad; migrar a Penpot solo si el límite molesta.

---

## 10. Arquitectura funcional

```
┌─ Móvil (iOS/Android) ─┐   ┌── Web app ──┐
│ UI + escáner + caché  │   │ UI + tabla   │
│ local (offline-first  │   │ masiva       │
│ de lectura + cola de  │   │              │
│ escritura)            │   │              │
└──────────┬────────────┘   └──────┬───────┘
           │        HTTPS / JSON   │
           ▼                       ▼
┌────────────────── API (backend único) ──────────────────┐
│  Auth (sesiones/JWT) · Rate limiting · Validación        │
│  Dominio: biblioteca, series, lectura, wishlist, stats   │
│  Servicio de catálogo: caché ISBN + cascada de fuentes   │
│  Jobs en background (resolución ISBN, imports, stats)    │
└───────┬──────────────┬───────────────┬──────────────────┘
        ▼              ▼               ▼
   PostgreSQL     Almacén de       APIs externas
   (datos +       imágenes         (Open Library,
   full-text)     (portadas        Google Books,
                  subidas)         AniList…)
```

Decisiones estructurales:

- **Un solo backend con API JSON versionada (`/v1`)** que sirve a móvil y web por igual. Nada de lógica de negocio duplicada en clientes.
- **Catálogo separado de biblioteca**: los metadatos de libros (compartidos entre usuarios, cacheados de fuentes externas, corregibles) viven en tablas de catálogo; el ejemplar del usuario referencia una edición del catálogo + sus campos personales. Así el catálogo mejora para todos y las APIs externas se consultan una sola vez por ISBN.
- **Offline-first pragmático en móvil**: caché local completa de *tu* biblioteca (SQLite) para consulta sin red; cola de escrituras (añadidos, progreso, escaneos) que sincroniza al volver la conexión con resolución last-write-wins por campo + updated_at. No CRDT ni sync engine exótico: la colisión real (dos dispositivos editando el mismo libro a la vez) es rarísima para un solo usuario.
- **Portadas**: por defecto se usan las URLs de Open Library/Google (con caché CDN propia ligera); solo se almacenan las fotos que sube el usuario (portada propia, estado del ejemplar). Esto reduce el almacenamiento propio en ~95%.
- **Seguridad**: TLS en todo, hash Argon2id, tokens de sesión rotables, rate limiting por IP y por usuario, validación estricta de entrada, aislamiento total de datos por usuario a nivel de query (siempre `where user_id = ?` vía capa de repositorio).
- **Escalabilidad**: monolito modular (módulos de dominio limpios dentro de un solo deploy). Con este perfil de app (lecturas dominantes, poca concurrencia por usuario), un Postgres + un nodo API aguantan decenas de miles de usuarios. Los módulos limpios permiten extraer servicios después *si* hiciera falta. No microservicios: sería teatro de arquitectura a este tamaño.

---

## 11. Stack tecnológico recomendado

Criterio global: **TypeScript de punta a punta, monorepo, todo open source u hospedable en servidor propio.** Un solo lenguaje reduce a la mitad el coste cognitivo de un equipo pequeño y permite compartir tipos y validaciones entre API, web y móvil.

| Capa | Recomendación gratuita | Por qué | Limitaciones | Alternativa de pago y cuándo |
|---|---|---|---|---|
| **Móvil iOS/Android** | **React Native + Expo** | Un codebase, TS compartido con el resto, ecosistema enorme, EAS tiene free tier para builds; escáner y SQLite resueltos con librerías libres | Rendimiento algo menor que nativo puro (irrelevante para esta app); Expo empuja a su nube para builds (se puede compilar local) | Ninguna necesaria. (Flutter es la alternativa libre equivalente; se descarta solo por romper el monolenguaje TS) |
| **Web** | **Next.js** (o Remix) + React | Comparte componentes y tipos con RN vía monorepo; SSR para futuras páginas públicas/SEO (perfiles, fichas) | — | Ninguna |
| **Backend** | **Node.js + Fastify** (o NestJS si se prefiere estructura impuesta) | Ligero, rápido, TS nativo, corre en cualquier VPS | Menos "pilas incluidas" que un framework grande | Ninguna |
| **Base de datos** | **PostgreSQL** | El estándar; full-text + pg_trgm cubren la búsqueda del MVP; JSONB para campos flexibles de catálogo | — | Ninguna. (Gestionado tipo Neon/Supabase free tier vale para dev; en producción, Postgres en el VPS con backups propios) |
| **ORM** | **Drizzle** | TS-first, SQL transparente, migraciones serias, ligero | Más joven que Prisma | Ninguna |
| **Autenticación** | **Better Auth** (open source, self-host) | Email+password, verificación, sesiones, OAuth Google/Apple cuando toque, 2FA; datos en TU Postgres, cero lock-in | Lo operas tú (es el trato) | Clerk/Auth0 dan UI pulida y menos trabajo; free tiers con lock-in fuerte. Valorar: nunca, salvo que el mantenimiento de auth se vuelva una carga real. **Consultar antes** |
| **Imágenes** | **MinIO** self-host (S3-compatible) + Sharp para thumbnails | API S3 estándar = migrable a cualquier proveedor cambiando una URL | Operación propia | **Cloudflare R2** (10 GB gratis, sin coste de egreso, API S3): candidata natural cuando el tráfico de imágenes crezca. Fase 3-4. **Consultar antes** |
| **Escáner de códigos** | Móvil: `react-native-vision-camera` + ML Kit barcode (gratis, on-device) o `expo-camera` (incluye escáner). Web: **`BarcodeDetector` API nativa** con fallback **ZXing-js** | Todo on-device, sin coste por escaneo, funciona offline | ML Kit es binario cerrado de Google aunque gratuito; ZXing algo menos robusto con poca luz | Scandit y similares son carísimos y absurdos para este caso. Nunca |
| **Búsqueda** | Postgres FTS + pg_trgm (MVP) → **Meilisearch** self-host (open source) cuando el catálogo crezca | Cero infra extra en MVP; Meilisearch da typo-tolerance excelente y es un binario trivial de operar | FTS de Postgres es mediocre con erratas | Algolia: mejor DX, free tier pequeño, lock-in. No merece la pena existiendo Meilisearch |
| **Panel admin** | Interno en la propia web (rol admin) + **Metabase** self-host para métricas | Metabase da dashboards SQL sin desarrollar nada | — | Ninguna |
| **Deploy** | **Docker Compose en un VPS propio** (Hetzner/OVH ~4-6 €/mes — coste mínimo inevitable y aun así "infraestructura propia") + **Coolify** (open source, PaaS self-host) para deploys git-push | Control total, coste fijo minúsculo, sin sorpresas de facturación | Tú eres el sysadmin (Coolify lo reduce muchísimo). Alternativa 100% gratis: Oracle Cloud Always Free (4 ARM cores, 24 GB RAM) — potente pero con fama de recuperar instancias; no fiarse para producción seria | Vercel/Railway/Fly: DX excelente, coste variable y lock-in. Valorar Vercel solo para el front web si el SEO/edge importa. Fase 4+. **Consultar antes** |
| **Logs** | **Pino** (JSON logs) + rotación local; **Grafana Loki** self-host si se quiere agregación | Suficiente de sobra al inicio | — | Ninguna |
| **Monitorización** | **Uptime Kuma** (self-host) + **GlitchTip** (open source, compatible SDK Sentry) + Grafana/Prometheus si apetece | Errores + uptime cubiertos gratis | — | **Sentry** free tier (5k eventos/mes) es cómodo y su SDK es el mismo → empezar con SDK Sentry apuntando a GlitchTip = migrable en 1 línea. Fase 3+ si GlitchTip se queda corto. **Consultar antes** |
| **Analítica producto** | **Umami** o **Plausible CE** self-host (web) + eventos propios en Postgres (móvil) | Sin cookies, RGPD-friendly, tuyo | Menos potente que un product analytics real | **PostHog** (free tier 1M eventos/mes, y es open source self-hosteable): la mejor opción si se quieren funnels/retención en serio. Fase 3. **Consultar antes** |
| **Emails** | SMTP de **Brevo free** (300/día) o **Resend free** (3k/mes) solo para transaccionales (verificación, reset); plantillas con **react-email** | Volumen transaccional del MVP cabe de sobra; self-host SMTP puro = infierno de deliverability, no compensa | Límites diarios | Resend de pago cuando el volumen crezca. Fase 4-5. **Consultar antes** |
| **Push** | **Expo Push Notifications** (gratis, envuelve FCM/APNs) | Cero coste, integración trivial con Expo | Dependencia del servicio de Expo (mitigable: FCM/APNs directos también son gratis) | Ninguna |
| **Testing** | **Vitest** (unit/integration) + **Playwright** (web e2e) + **Maestro** (móvil e2e, open source) + Testing Library | Estándar moderno, todo gratis | — | Ninguna |
| **CI/CD** | **GitHub Actions** (free tier generoso en repo privado: 2.000 min/mes) | Estándar de facto | Builds iOS consumen minutos macOS (10×) → compilar iOS con EAS free tier o local | EAS de pago si las builds se vuelven cuello de botella. Fase 3+. **Consultar antes** |
| **Documentación** | Markdown en el repo + **Docusaurus** si algún día hay docs públicas; OpenAPI generada desde el código (p. ej. con zod-openapi) | La spec OpenAPI sale gratis del mismo esquema de validación | — | Ninguna |

**Coste total del MVP: ~5 €/mes (VPS) + 25 $ únicos (Google Play) + 99 $/año (Apple Developer, inevitable para iOS).** Todo lo demás, cero.

---

## 12. Modelo de datos conceptual

Dos planos separados: **catálogo** (compartido, curado) y **usuario** (privado).

### Plano catálogo
- **Work** (obra abstracta): id, título original, tipo (novela/ensayo/manga/cómic/técnico…), autores[], idioma original, descripción, géneros[], serie_id + posición.
- **Edition** (edición concreta): id, work_id, ISBN-13/ISBN-10, título de la edición, subtítulo, editorial_id, idioma, formato, páginas, fecha publicación, portada_url, precio de lista, volumen nº. *(La distinción Work/Edition es la decisión más importante del modelo: "El Quijote" es un Work con 500 Editions; tu progreso de lectura apunta al Work, tu ejemplar a la Edition.)*
- **Author**: id, nombre, variantes de nombre, bio, ids externos (OpenLibrary, Wikidata).
- **Publisher**: id, nombre, país, sellos.
- **Series**: id, nombre, tipo (saga novelas / manga / cómic / colección editorial), estado (abierta/cerrada), total_tomos_previsto, orden recomendado.
- **CatalogSource / CatalogCorrection**: trazabilidad de qué fuente aportó cada campo y correcciones de comunidad (campo, valor propuesto, usuario, estado de revisión). Base del catálogo curado.

### Plano usuario
- **User**: id, email, hash, nombre, avatar, locale, preferencias (modo, tema), fechas RGPD (consentimiento, borrado programado).
- **UserBook** (ejemplar, el corazón): id, user_id, edition_id (nullable si es manual puro), overrides de metadatos, fecha/precio compra, estado físico, ubicación_id, notas de ejemplar, favorito, valoración, etiquetas[], duplicado_de.
- **ReadingStatus/Reading** (lectura, N por libro): id, user_id, work_id, estado (pendiente/leyendo/pausado/leído/abandonado), fecha inicio/fin, valoración de esta lectura.
- **ProgressEntry**: reading_id, fecha, página/porcentaje, minutos (opcional), nota rápida.
- **Location**: user_id, nombre ("salón", "caja garaje"), orden.
- **WishlistItem**: user_id, edition_id/work_id o texto libre, prioridad, precio objetivo, notas, fecha añadido.
- **Note**: user_id, work_id, texto (MD), página, es_cita, spoiler_flag, fechas.
- **Review** (privada; publicable en fase social): user_id, work_id, texto, valoración, visibilidad.
- **Tag**: user_id, nombre, color, regla automática (JSON, para etiquetas inteligentes).
- **Loan**: user_book_id, prestado_a (texto/contacto), fecha préstamo, recordatorio, fecha devolución, historial.
- **ReadingGoal**: user_id, año, tipo (libros/páginas/custom), objetivo, filtro opcional.
- **UserSeriesFollow**: user_id, series_id, alertas on/off (para lanzamientos).
- **Recommendation** (v2): user_id, work_id, motivo, origen, fecha, feedback.
- **Subscription**: user_id, plan, estado, proveedor de pago, periodo, fechas.
- **Stats**: no es tabla propia — se calculan con queries/vistas materializadas sobre Reading/ProgressEntry/UserBook y se cachean. Guardar stats desnormalizadas desde el día 1 es un error clásico.

**Relaciones clave:** User 1-N UserBook N-1 Edition N-1 Work N-1 Series; Reading referencia Work (no Edition) para que el progreso sobreviva a cambios de ejemplar; Wishlist puede apuntar a Edition (quiero *esa* edición) o Work (me da igual cuál) — matiz importante para coleccionistas.

---

## 13. APIs y fuentes de datos

**Estrategia: cascada con caché propia permanente.** Cada ISBN se resuelve una vez, se guarda en el catálogo propio, y a partir de ahí se sirve de nuestra BD. Las fuentes externas son *semilla*, no dependencia en caliente.

Cascada de resolución ISBN:
1. **Catálogo propio** (Postgres) — hit inmediato, coste cero.
2. **Open Library** — gratuita, abierta (los datos son libres), API de ISBN + covers API sin límites duros (respetar rate cortés ~1 req/s y User-Agent identificado). La mejor base: sin ToS restrictivos, permite bulk dumps mensuales (importables para precalentar el catálogo). Debilidad: calidad irregular, ediciones españolas y manga flojos.
3. **Google Books API** — gratuita, 1.000 req/día sin key facturable (ampliable gratis con key). Buena cobertura de ISBNs comerciales y descripciones. Debilidad: ToS restrictivos sobre almacenamiento (cachear con mesura: guardar los campos factuales — título, autor, páginas, ISBN, que no son propiedad de Google — y enlazar portada, no rehostearla), resultados inconsistentes.
4. **Fuentes especializadas por tipo**:
   - Manga: **AniList API** (GraphQL, gratuita, excelente para series/nº de tomos/estado de publicación) y **MangaDex API** (metadatos de series). Ninguna mapea bien ISBN de ediciones españolas → nuestra tabla Series se enriquece de AniList y las Editions españolas las aporta la comunidad. **Jikan** (MyAnimeList no oficial) como respaldo.
   - Cómic: **Comic Vine API** (gratuita con key, 200 req/h) para series y volúmenes USA; **Grand Comics Database** (dumps abiertos).
   - Dominio público: **Gutendex** (Gutenberg) — nicho, fase posterior.
   - **Wikidata** (SPARQL): autores (fechas, foto, variantes de nombre) y enlaces entre obras. Gratis y libre.
   - España: la **API de la Agencia del ISBN español (base de datos del Ministerio de Cultura)** es consultable públicamente vía su buscador; no hay API formal — evaluar acuerdos o entrada manual asistida. **DILVE** es el estándar del sector editorial español pero requiere licencia de editor: explorar en fase B2B, no antes.
5. **Comunidad**: cualquier usuario puede corregir/completar una ficha (con moderación en el panel admin). Con el público objetivo (coleccionistas = perfeccionistas de datos) esto es un superpoder, y es exactamente cómo LibraryThing y MusicBrainz construyeron catálogos que valen millones. Gamificar suavemente (contador de contribuciones) en fase 2.

**Opciones de pago (futuro, consultar siempre antes):**
- **ISBNdb** (~15-50 $/mes): la mejor cobertura comercial de ISBN, incluidas ediciones en español. Merecería la pena en fase 3-4 si las métricas muestran >15-20% de escaneos sin resolver — cada escaneo fallido en onboarding es un usuario en riesgo. Es la opción de pago con mejor ratio coste/impacto de todo el proyecto.
- **WorldCat/OCLC**: caro, orientado a bibliotecas, ISBN español regular. Improbable que compense.
- **Nielsen BookData / DILVE**: canal editorial serio para mercado ES/UK; solo con volumen y quizá vía acuerdo. Fase 5+.

**Métrica guía desde el día 1:** % de escaneos resueltos automáticamente, por país/idioma. Esa cifra decide si el catálogo comunitario basta o si ISBNdb se paga solo.

---

## 14. Estrategia de producto SaaS

**Modelo: freemium honesto.** Regla de oro: **los datos del usuario nunca son rehenes** — registrar, editar y exportar la biblioteca completa es gratis para siempre. Se paga por inteligencia, comodidad y placer, no por acceder a lo tuyo. (Monetizar como Bookly — recortando lo básico — genera ingresos rápidos y odio duradero.)

- **Gratis:** biblioteca ilimitada*, escáner, estados y progreso, series y detector de huecos, wishlist, stats esenciales del año en curso, import/export, 1 ubicación física, sync completa. (*Si hay que poner un límite por costes, que sea altísimo — p. ej. 5.000 ejemplares — y por coste real de infra, no por presión comercial.)
- **Premium (~3-4 €/mes o 30-35 €/año — precio por debajo del umbral de dolor, el volumen está en la conversión, no en el ARPU):** stats avanzadas e histórico completo, resumen anual enriquecido, alertas de lanzamientos, ubicaciones ilimitadas, temas visuales + iconos, ranking por duelos, etiquetas inteligentes, valor de colección con histórico, export PDF de catálogo, backups descargables programados.
- **Plan Coleccionista (anual, ~50 €/año):** premium + campos de tasación, historial de precios, informes de colección, prioridad en corrección de catálogo. Los coleccionistas pagan por herramientas serias (véase CLZ a 15 $/año por mucho menos).
- **Plan Familiar/Club (fase 5+):** 4-6 cuentas + estanterías compartidas + modo club.
- **B2B librerías/comunidades:** explorar en fase 6+ solo si hay tirón orgánico. No diseñar para ello ahora.
- **Nunca:** publicidad de terceros ni venta de datos. Sí eventualmente: enlaces de afiliado opt-in a librerías (transparentes), que además financian sin tocar la privacidad.

Pagos: **Stripe** (sin cuota fija, % por transacción — compatible con "empezar gratis") + facturación de las stores para IAP móvil (15% en el Small Business Programme). Ojo: Apple obliga a IAP para digital en iOS; la web puede vender con Stripe sin comisión de Apple.

---

## 15. Seguridad, privacidad y normativa

**Datos tratados:** identificación (email), datos de uso (biblioteca, lecturas, notas — datos personales a efectos RGPD: revelan gustos y hábitos), técnicos (logs, IP). No hay categorías especiales, pero los hábitos de lectura son sensibles culturalmente: tratarlos con máximo cuidado es también posicionamiento de marca.

Medidas (la mayoría son de serie con el stack elegido):
- **Base legal y consentimiento:** registro = ejecución de contrato; analítica self-host sin cookies (Umami) = sin banner de cookies necesario si no hay trackers de terceros (ventaja competitiva visible). Consentimiento explícito solo para comunicaciones comerciales.
- **Derechos RGPD:** borrado de cuenta self-service (soft-delete 30 días + purga real programada, incluidos backups en su ciclo), export completo (ya es feature), rectificación (edición libre). Documentar el registro de actividades de tratamiento (obligatorio y trivial siendo pequeños).
- **Autenticación:** Argon2id, verificación de email, rate limit agresivo en login/reset, sesiones revocables por dispositivo, 2FA TOTP en v1.1, política de contraseñas razonable (longitud sí, arcanos no).
- **Cifrado:** TLS 1.3 en tránsito; discos cifrados en el VPS; backups cifrados (age/GPG) con copia fuera del proveedor (regla 3-2-1: p. ej. VPS + objeto en R2/Backblaze B2 free + local). **Probar la restauración trimestralmente** — un backup no probado no existe.
- **Logs:** sin datos personales en logs de aplicación (ids, no emails), retención 30-90 días definida, acceso restringido.
- **Anti-abuso:** rate limiting por IP/usuario/endpoint (crítico en el proxy de catálogo, que es dinero y cuota), CAPTCHA de código abierto (ALTCHA) solo ante señales de abuso, API con auth obligatoria (nada de endpoints públicos scrapeables), CORS estricto.
- **Permisos internos:** roles user/moderador-catálogo/admin; el panel admin nunca expone bibliotecas privadas (las correcciones de catálogo son sobre el plano compartido).
- **Documentos:** política de privacidad y términos en lenguaje claro (plantillas AEPD como base + revisión legal antes del lanzamiento público — este es un gasto único razonable en fase 3-4).
- Hosting en la UE (Hetzner DE/FI u OVH FR) simplifica todo el capítulo de transferencias internacionales.

---

## 16. Roadmap

| Fase | Duración orientativa | Contenido | Criterio de salida |
|---|---|---|---|
| **0 — Definición y validación** | 2-3 semanas | Cerrar decisiones de §19; landing de captura de emails; 15-20 entrevistas en comunidades (r/mangacollectors, foros ES, Discord booktok); prueba técnica de la cascada ISBN con 200 libros reales españoles | ≥60% de resolución ISBN automática en la prueba; ≥100 emails; confirmación del dolor en entrevistas |
| **1 — Prototipo UX/UI** | 3-4 semanas | Sistema de diseño base; prototipo Figma de los 8 flujos core; test con 5-8 usuarios objetivo | El flujo escáner→biblioteca se entiende sin explicación |
| **2 — MVP** | 10-14 semanas | Todo §7-MVP; monorepo, API, apps, web; beta interna continua (TestFlight/APK) | Uso propio real: tu biblioteca entera vive ahí y no echas de menos el Excel |
| **3 — Beta cerrada** | 6-8 semanas | 100-300 usuarios de la lista; GlitchTip + métricas de activación (% que añade ≥10 libros día 1; % escaneos resueltos); iterar catálogo ES a saco; textos legales finales | Retención semana 4 ≥ 30% en beta; escaneo resuelto ≥ 80% ES |
| **4 — Lanzamiento público** | 4 semanas + continuo | Stores + web abierta; import Goodreads pulido como campaña ("múdate en 5 minutos"); Product Hunt, comunidades manga/booktok ES | 1.000 usuarios activos; NPS cualitativo |
| **5 — Premium** | 6-8 semanas | Stripe + IAP; features premium de §14; resumen anual compartible (lanzar en noviembre-diciembre: es la ventana natural) | Conversión ≥ 3-4% free→premium |
| **6 — Avanzado** | continuo | Alertas de lanzamientos, recomendaciones por afinidad, ranking duelos, timeline, IA local/limitada si aporta | Retención mes 3 mejora medible |
| **7 — Comunidad y crecimiento** | continuo | Perfiles públicos opt-in, clubes, corrección comunitaria gamificada, afiliación librerías, explorar B2B | El catálogo propio responde >95% de escaneos sin fuente externa |

---

## 17. Riesgos y mitigaciones

| Riesgo | Gravedad | Mitigación |
|---|---|---|
| **Calidad de datos (sobre todo ES/manga)** | 🔴 La app vive o muere aquí | Cascada multi-fuente + caché propia + corrección comunitaria + métrica de resolución desde el día 1 + presupuesto contingente para ISBNdb si <80% |
| **Escaneo falla en onboarding** | 🔴 Primer momento de la verdad | Modo ráfaga con cola ("no encontrado" no bloquea), creación manual con ISBN precargado, test con libros españoles reales en fase 0 |
| **Modelar mal series/tomos** | 🟠 Rediseñar el modelo con datos dentro es carísimo | Work/Edition/Series desde el día 1 (§12); validar el modelo con casos retorcidos (3-en-1, kanzenban, sagas con precuelas) antes de codificar |
| **Retención (app-cementerio de catálogos)** | 🔴 El riesgo de producto nº 1: mucha gente cataloga una vez y no vuelve | El hábito diario es el progreso de lectura → esa interacción debe ser perfecta; stats como espejo mensual; wishlist modo tienda crea uso fuera de casa; resumen anual como cita fija |
| **Diferenciación percibida ("otra Goodreads")** | 🟠 | Mensaje centrado en colección física + tomos + privacidad; captura de pantalla firma = vista estantería y parrilla de tomos, no otra lista de libros |
| **MVP se hincha** | 🟠 Clásico | §7 es contrato; todo lo nuevo entra en v1.1+ por defecto |
| **Monetizar demasiado pronto / mal** | 🟠 | Premium en fase 5, tras retención probada; datos nunca rehenes |
| **Dependencia de servicios externos** | 🟢 mitigado por diseño | Todo self-host o con API estándar (S3, SMTP, SDK Sentry→GlitchTip); catálogo cacheado en propiedad |
| **Límites de free tiers** | 🟢 | El diseño no depende de ningún free tier crítico: VPS propio como base |
| **Escalabilidad** | 🟢 a este horizonte | Monolito modular + Postgres llega lejísimos; el gasto crece linealmente con VPS mejores antes de necesitar arquitectura nueva |
| **Cumplimiento legal** | 🟠 | §15; hosting UE; revisión legal única antes del lanzamiento público |
| **Equipo de una persona / burnout** | 🟠 real aunque no estaba en la lista | Alcance del MVP despiadado, stack monolenguaje, Coolify para no ser sysadmin a jornada completa |

---

## 18. Naming y branding

El directorio del proyecto ya se llama **spine** — y es, honestamente, el mejor candidato:

1. **Spine** ⭐ — el lomo del libro: lo que ves cuando miras tu estantería, lo que identifica tu colección de un vistazo. Corto, internacional, pronunciable en español, con doble lectura anatómica ("la columna vertebral de tu biblioteca") y conecta directamente con la vista-estantería, la feature visual firma. Slogans: *"Every book has a spine. So does your library."* / *"Tu biblioteca, con columna."* Riesgo: nombre en uso parcial en otros ámbitos software — revisar marca y ASO antes de fijar.
2. **Tomo** — "tomo" es volumen en español y *tome* en inglés; perfecto para el ángulo manga/colección, cálido y muy registrable. Slogan: *"Tomo a tomo."*
3. **Kanso** — del concepto japonés de simplicidad; guiño manga + estética minimalista. Más abstracto.
4. **Shelfa / Stax** — línea moderna-app; funcionan pero son más genéricos y menos nuestros.
5. **Ledger of Books → "Liber"** — latín, elegante, quizá demasiado frío.

**Tono de marca:** calmado, culto sin pedantería, con humor fino de lector (el tsundoku ratio ya es tono de marca). Habla como un librero de confianza, no como una app de productividad. **Recomendación: Spine primero, Tomo como plan B**, decisión final tras comprobar marcas y dominios (spine.app, usetomo.app, etc.).

---

## 19. Preguntas estratégicas (decisiones que debes tomar tú)

1. **Foco inicial:** ¿arrancamos con el posicionamiento coleccionista manga/cómic + lector intensivo (mi recomendación) o generalista desde el día 1? Afecta a marketing, onboarding y prioridades de catálogo, no a la arquitectura.
2. **Plataforma de arranque:** ¿las tres a la vez, o móvil primero (Android+iOS con Expo) y web de consulta mínima 4-6 semanas después? Mi recomendación: móvil primero — el escáner es el corazón y está en el móvil; la web completa en v1.1.
3. **Social:** ¿confirmamos cero social en MVP y perfiles opt-in en fase 7? (Mi recomendación: sí.)
4. **Premium:** ¿confirmamos lanzar 100% gratis y activar premium en fase 5, o quieres premium desde el día 1? (Recomiendo fase 5: la retención se valida antes que la monetización.)
5. **Stack:** ¿apruebas TypeScript end-to-end (Expo + Next.js + Fastify + Postgres + VPS propio) o prefieres valorar Flutter?
6. **Dirección visual:** ¿te encaja "biblioteca de noche" (oscuro, ámbar, serif editorial) como identidad principal?
7. **Alcance MVP:** ¿aceptas dejar fuera préstamos, notas y vista estantería hasta v1.1 para no pasar de ~12 semanas de MVP?
8. **Nombre:** ¿Spine (verificando marca) o exploramos más?
9. **Idiomas de lanzamiento:** ¿ES+EN desde el MVP (recomendado: i18n cuesta poco al inicio y mucho después) o solo ES?
10. **Tu dedicación y equipo:** ¿esto lo desarrollas tú solo, conmigo como par? El roadmap de §16 asume aproximadamente eso; con más manos se comprime.

---

## 20. Recomendación final

**Construir:** Spine — el CRM personal del lector-coleccionista. Biblioteca física real (ejemplares, precio, ubicación, préstamos), tracking de lectura de calidad, y series/tomos como nadie los hace, con estética de biblioteca nocturna y privacidad como bandera. Posicionamiento de lanzamiento: **"la app para la gente que ama sus libros como objetos"**, con el coleccionista de manga/cómic español como cabeza de playa y el import de Goodreads como puente de adquisición.

**MVP:** escáner en ráfaga + biblioteca completa + estados/progreso + series con detector de huecos + wishlist + stats esenciales + import/export + sync. Móvil primero. 10-14 semanas. Todo lo demás espera.

**Lo hace especial:** progreso triple de series, tsundoku ratio, wishlist modo tienda, vista estantería, cero social impuesto, catálogo español curado por comunidad.

**Para después:** préstamos y notas (v1.1), timeline/ranking/alertas (v2), premium (fase 5), social opt-in y clubes (fase 7), IA y OCR de estanterías (fase 6+, solo si demuestran valor).

**Stack:** TypeScript end-to-end — Expo/React Native (móvil), Next.js (web), Fastify + Drizzle + PostgreSQL (backend), Better Auth, MinIO, ML Kit/ZXing (escáner on-device), Meilisearch cuando toque, Docker+Coolify en VPS propio (~5 €/mes). Sin ningún servicio de pago como dependencia; los únicos candidatos de pago futuros (ISBNdb, R2, PostHog, Sentry) están identificados con su fase y se consultarán antes.

**Pantallas a diseñar primero (en este orden):** 1) Escáner con modo ráfaga, 2) Biblioteca (cuadrícula), 3) Ficha de libro/ejemplar, 4) Ficha de serie con parrilla de tomos, 5) Home con "leyendo ahora" + actualización de progreso, 6) Onboarding de 3 pasos, 7) Stats, 8) Wishlist.

**Decisiones pendientes:** las 10 de §19 — las cuatro críticas para empezar son foco inicial, plataforma de arranque, alcance del MVP y stack.
