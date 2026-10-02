# academia-ecommerce · plataforma de aprendizaje multi-curso

App web sin backend (HTML + CSS + JavaScript). Desde la Fase 14 es una **plataforma** que aloja varios cursos con un único motor pedagógico.
Curso actual: `analista-ecommerce`. Curso de prueba: `curso-demo` (no es contenido real).

## Arquitectura

```
PLATAFORMA
├── COURSE_REGISTRY ............ catálogo: registrar, listar, obtener, validar, activar
├── Motor de aprendizaje ....... script.js (intentos, pistas, feedback, evidencia, repaso, casos,
│                                dashboard, evaluación, persistencia, navegación)
└── Cursos (contenido)
    ├── analista-ecommerce ..... lecciones en index.html + datos en script.js
    └── curso-demo ............. content/courses/curso-demo.js  (solo datos)
```

- **`courseId`** identifica cada curso. Todo el estado (progreso, intentos, evidencia, repaso, evaluación, navegación) está guardado **por curso**.
- **Motor y contenido**: `applyCourseContext(course)` es el único punto donde el contenido de un curso se enlaza al motor. No existe un motor por curso.
- **Curso activo**: `activeCourseId`; se recuerda entre recargas. `setActiveCourse(id)` guarda el curso actual, enlaza el nuevo y carga su estado.
- **Mis cursos** (botón en la barra): lista de cursos con estado descriptivo y "Comenzar / Continuar". **Mi aprendizaje** es el dashboard de cada curso.

## Archivos

| Archivo | Para qué |
|---|---|
| `script.js` | Motor + registry + persistencia + renderizador declarativo + administrador de videos |
| `backoffice.js` | Editor de contenido (borradores, validación, vista previa, exportar/importar, respaldo) |
| `index.html`, `styles.css` | Curso Analista (HTML estático) y sistema de layout |
| `content/videos.js` | Videos **publicados** por curso y lección |
| `content/courses/*.js` | Cursos definidos como datos (`globalThis.COURSE_DEFINITIONS`) |
| `COMO-AGREGAR-UN-CURSO.md` | Guía para agregar un curso nuevo (por ejemplo SQL) sin tocar el motor |
| `FASE14-DOCUMENTACION.txt` | Documentación completa de la fase |

## Persistencia y migración

Una sola clave en `localStorage`: `plataforma.aprendizaje.v1` (esquema 3):

```
{ schemaVersion: 3, activeCourseId, courses: { <courseId>: { state, updatedAt } }, migrations: [], content: { <courseId>: { videos } } }
```

- `state` conserva el formato v2 de siempre, así que los respaldos exportados antes se siguen pudiendo importar.
- **Migración**: si existe `cursoAnalista.fase2.progress.v1` y todavía no hay almacén nuevo, se copia **una sola vez** a `analista-ecommerce` y se registra en `migrations`. La clave antigua **no se borra** (queda como respaldo; la migración es reversible).
- Datos dañados o de una versión futura no se sobrescriben.
- La configuración de videos vive en `content`, **fuera del progreso**: reiniciar o exportar el progreso no la toca.

## Videos sin editar HTML

1. Abre la app con `?editor=1` (por ejemplo `https://tu-sitio/index.html?editor=1`). Aparece **Contenido** en la barra (solo para ti; `?editor=0` lo oculta).
2. Por cada sección: título, URL, "Mostrar al alumno". Flujo: **Validar y previsualizar → Confirmar y guardar**.
3. Lo guardado es un **borrador local** de tu navegador (lo ves al instante). Para **publicarlo**: **Descargar videos.js** y reemplaza `content/videos.js` en el sitio.
4. Acepta YouTube (`watch`, `youtu.be`, `embed`, `shorts`, con `youtube-nocookie.com`), `.mp4` y `.webm`. Rechaza `javascript:`, `data:`, `vbscript:`, `blob:`, `file:` y URLs que no son un video.
5. Si un video falla, el alumno ve "Video no disponible… Puedes continuar con la lección normalmente". Sin configurar o desactivado: "Próximamente".

Los atributos `data-video-url` del HTML quedan solo como respaldo antiguo.

## Backoffice local (Fase 15)

Abre la app con `?editor=1` y entra a **Contenido**. Es una herramienta editorial **sin servidor ni login** (`?editor=1` solo la oculta, no la protege).

**Pestaña Cursos**: crear un curso desde cero, editar, duplicar, exportar, importar y descargar/restaurar un respaldo.
Dentro de un curso: **Datos** (título, estado, descripción…), **Módulos y lecciones** (agregar, ordenar, mover), **Conceptos** y el editor de **lecciones** (bloques: título, párrafo, lista, ejemplo, ejercicio) y de **ejercicios** (numérico u opción múltiple, pistas, solución, conceptos, dificultad).
La **vista previa** usa el mismo renderizador que verá el alumno (sin registrar intentos) y la **validación** corre en vivo: los errores bloquean exportar y abrir como alumno.

**Cómo se guarda y se publica**
1. Cada cambio se guarda solo como *borrador local* en este navegador (`root.content.courseDrafts`), separado del progreso.
2. **Abrir como alumno** prueba el curso con el motor real (el curso debe estar en estado *Activo*).
3. **Exportar .js** descarga `content/courses/<id>.js`; súbelo al sitio y cárgalo en `index.html` antes de `script.js`.
4. Mientras un curso no se exporte, el editor muestra **Cambios sin exportar** y el navegador avisa al cerrar. Como todo vive en tu navegador, limpiar los datos del sitio borra los borradores: descarga un **respaldo** de vez en cuando.
5. Un borrador con el mismo id que un curso publicado lo reemplaza en tu navegador; **Descartar cambios** vuelve a la versión publicada.

**Límites**: no edita el curso integrado `analista-ecommerce` (HTML estático), ni casos analíticos ni evaluación final; los ejercicios son `numeric` y `choice`.

## Layout responsive

Tres anchos de contenido (variables CSS en `styles.css`): `--w-reading` (texto, 46 rem), `--w-narrow` (formularios), `--w-wide` (dashboards, tablas, casos y evaluaciones, hasta 1200 px) y `--w-video` (video 16:9, hasta 62 rem).
En ≥1200 px aparece la **Ruta del curso** como navegación lateral (solo permite volver a lecciones anteriores; avanzar sigue pasando por "Siguiente" y sus avisos). En ≤620 px las herramientas pasan a un botón **Menú**. Las tablas de las lecciones hacen scroll dentro de su propio contenedor.

## Tests

```bash
for f in tests/test_fase*.js; do node "$f"; done          # lógica (sin navegador)
export NODE_PATH=$(npm root -g)                            # Playwright/Chromium
for t in test_ui test_videos_admin test_courses test_responsive test_backoffice; do node tests/ui/$t.js; done
```

### Si el video no carga

Si en la tarjeta aparece "No se pudo cargar el video" y tampoco se ve al abrirlo en otra pestaña, el problema está en el archivo, no en la app. Lo más común es el códec (por ejemplo H.265/HEVC de un teléfono o de algunos grabadores de pantalla). Conviértelo a un formato que todos los navegadores reconocen:

```bash
ffmpeg -i modulo-0.mp4 -c:v libx264 -profile:v high -pix_fmt yuv420p -c:a aac -movflags +faststart modulo-0-web.mp4
```

Sin terminal: en HandBrake usa el preset "Fast 1080p30", formato MP4 y marca "Web Optimized". Después sube el archivo nuevo al repositorio (por git; el navegador de GitHub limita a 25 MB) y espera a que GitHub Pages termine de publicar.
