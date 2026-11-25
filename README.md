# Portfolio

Portfolio personal de RubenPG. La aplicación activa está en `portfolio-web/`; la versión anterior se conserva localmente en `_archive/Portfolio viejo/`, excluida de Git.

Ubicación: `D:\Dev\src\RPG\10_Projects\Portfolio`.

## Estructura

```text
Portfolio/
├── AGENTS.md          Normas compartidas para los asistentes
├── CLAUDE.md          Entrada para Claude; remite a AGENTS.md
├── README.md          Mapa, estado y punto de entrada
├── portfolio-web/     Nueva web
├── portfolio-vault/   Contexto, decisiones y planificación
├── _archive/
│   └── Portfolio viejo/   Web anterior y su repositorio Git
└── _temp/             Temporales y resultados auxiliares
```

La aplicación activa está en `portfolio-web/`; las decisiones del nuevo portfolio se conservan en `portfolio-vault/`.

## Abrir y trabajar

En Codex, crear el proyecto **Portfolio** con una única carpeta de origen:

```text
D:\Dev\src\RPG\10_Projects\Portfolio
```

Esa raíz contiene la web, el contexto y el archivo: no hace falta añadir por separado sus subcarpetas, todo RPG ni `D:\Dev`. Las carpetas adicionales tienen sentido cuando el trabajo necesita recursos que viven fuera del contenedor. [Documentación oficial sobre carpetas de proyectos](https://learn.chatgpt.com/docs/projects).

Después, abrir un chat dentro del proyecto para crear o editar la web. Las normas están en [AGENTS.md](AGENTS.md); las decisiones y el estado se conservan en los archivos del proyecto. El historial de otros chats no sustituye ese contexto escrito.

Para Claude, dar acceso a esta misma raíz y comenzar por [CLAUDE.md](CLAUDE.md). Si el cliente no carga los archivos automáticamente, pedirle que lea `AGENTS.md` y `README.md`. No asumir que Claude Desktop/Cowork y Claude Code procesan los archivos del mismo modo.

## Estado actual · 4 de noviembre de 2026

- **Ficha común de proyectos:** galería grande, descripción breve, rol y tecnologías conocidas; texto provisional identificado. Se amplía la ficha integrada conservando la identidad visual y el regreso al mapa. El resumen previo deja de usar «Qué resuelve» y «Mi aportación». Imágenes y vídeos se incorporan desde una carpeta por proyecto, con vídeos primero y orden natural por nombre. Uso y formatos en [Fichas de proyecto y medios](portfolio-vault/base-tecnica-y-visual.md#fichas-de-proyecto-y-medios--4-de-noviembre-de-2026).
- **Validación del 4 de noviembre:** 87 pruebas, TypeScript, ESLint, formato y compilación correctos; exportación estática con `/Portfolio-Web` y 52 recursos verificados. Galería revisada entre 320 y 1440 px y en horizontal: orden, imagen vertical, teclado, deslizamiento, pausa de vídeos, errores y actualización de carpetas. Apertura y cambio de orientación con movimiento reducido mantienen la cabecera visible. Revisión visual independiente sin correcciones materiales. No se han incorporado medios reales ni publicado esta actualización.

- **Legibilidad móvil:** tras la revisión de Rubén en su Oppo, lectura principal de 18 px, etiquetas de 16–17 px y acciones de 18 px hasta 899 px de ancho. Stack con dos columnas de iconos mayores; resumen de proyectos en una columna desplazable, separado del pie. Zoom con pellizco y desplazamiento ampliado sin abrir fichas ni cambiar escenas. Validación y límites en [Legibilidad móvil](portfolio-vault/rendimiento-y-navegacion.md#legibilidad-móvil--1-de-noviembre-de-2026).

- **Nueva dirección confirmada:** conservar la Hero y todo desde Mi stack hasta Contacto. El cubo, su carrusel 3D y las brasas quedan archivados y retirados de la aplicación activa.
- **Proyectos como mapa topográfico:** transición sencilla de 1,25 s con anime.js: textos y retrato desaparecen suavemente, el fondo original se funde con Topography y entran los SVG de Sophos y Loops n’ Grooves. Cámara estable y movimientos cortos. Las ondas del fondo siguen animadas durante todo el fundido, también al regresar al Hero; se pausan cuando ya no son visibles. El efecto experimental de puntos que formaban líneas queda descartado y eliminado por petición de Rubén. Detalles en [Coreografía del entorno](portfolio-vault/base-tecnica-y-visual.md#coreografía-del-entorno-con-animejs).
- Al elegir un SVG se conservan el logo viajando a la cabecera, la captura enmarcada por el degradado original, el resumen breve y «Ver proyecto». La primera imagen de la carpeta pasa automáticamente a ser la captura de selección. Se ha quitado el velo claro: la topografía permanece visible a su intensidad normal. La ficha integrada y su regreso permanecen. Los medios reales y las tecnologías de Sophos siguen pendientes; no se inventan.
- **Mi stack → Sobre mí → Contacto conservados:** 38 tecnologías, 34 SVG incluyendo anime.js; los iconos se reúnen en el radar y pulsan al pasar su barrido. Se mantienen textos, tipografías, scroll interior, formulario y vistas finales. La transición de 2,1 s comparte ahora un giro suave de 0° a 64° entre plano y radar; los SVG llegan frontales antes del cruce.
- **Fluidez del entorno:** Topography dibuja con objetivo de 60 fps, reutiliza alturas/cámara y evita trabajo redundante. Los SVG del radar se actualizan una sola vez junto al frame de cámara. Detalles y límites de medición en [Rendimiento actual](portfolio-vault/rendimiento-y-navegacion.md#fluidez-del-entorno--31-de-octubre-de-2026).
- Hero con League Gothic, firma Amazed, PNG original, DitherVeil y PatternWaves. El retrato sigue protegido contra arrastre nativo y menú contextual. Al volver desde proyectos reconoce el cursor quieto sobre la foto y revela el color gradualmente, también después de un periodo de reposo. La entrada inicial conserva anime.js.
- Menú con saltos directos a las cinco secciones, teclado y flujo natural con movimiento reducido. El controlador nuevo mantiene bloqueo de ráfagas y reversas. GSAP permanece únicamente en componentes internos heredados de menú/fichas; no se añade en el nuevo recorrido.
- **Archivo local:** [`_archive/2026-10-31-cubo-carrusel/`](_archive/2026-10-31-cubo-carrusel/ARCHIVO.md), con código, recursos, pruebas y documentación del estado anterior. Está excluido de Git. La propuesta pendiente de partículas reactivas del cubo se archiva con esa dirección.
- **Última publicación comprobada · 1 de noviembre** (`817c9ff`), con [despliegue correcto](https://github.com/RubyPG/Portfolio-Web/actions/runs/41315705665) en [GitHub Pages](https://rubypg.github.io/Portfolio-Web/). Formspree `myeeyrzo` y `noindex, follow` ya estaban publicados. Dominio `ruben.sepharim.eu` confirmado; DNS y dominio personalizado pendientes. Ver [Rendimiento y navegación](portfolio-vault/rendimiento-y-navegacion.md) y [Sobre mí y contacto](portfolio-vault/sobre-mi.md).
- **Validación del 1 de noviembre:** 81 pruebas correctas, incluidas las regresiones de zoom, lectura nativa del resumen, cadencia/caché del terreno, ángulos de transición, invalidación del radar y retrato interactivo. Compilación, TypeScript, ESLint y formato correctos; lectura revisada entre 320 y 1440 px, sin desbordamiento horizontal. Ondas activas durante el fundido de ida/vuelta y pausadas al ocultarse o abrir el menú, verificadas en escritorio y móvil. Revelado con cursor quieto y entrada progresiva tras reposo comprobados en Chromium; el modo reducido conserva el PNG. La selección mantiene el terreno visible sin velo blanco; las pruebas conservan las regresiones de Mi stack, radar, Contacto, menú y movimiento reducido.

## Desarrollo

Ejecutar desde `portfolio-web/`:

| Comando | Uso |
| --- | --- |
| `npm ci` | Instalar las versiones del lockfile. |
| `npm run dev` | Vista local en `http://localhost:3000`, con detección automática de medios. |
| `npm run build` | Regenera el catálogo de medios y compila para producción. |
| `npm run media:sync` | Regenerar el catálogo de medios manualmente. |
| `npm run verify:export` | Comprueba contenido y recursos de `out/` después de una exportación estática. |
| `npm start` | Servir la compilación de producción. |
| `npm run lint` | Revisar el código con ESLint. |
| `npm run typecheck` | Comprobar tipos. |
| `npm test` | Regresiones de navegación y ciclo de vida de efectos. |
| `npm run format:check` | Comprobar formato. |
| `npm run format` | Aplicar formato. |

Componente: [Hero.tsx](portfolio-web/src/components/sections/Hero.tsx). Composición responsive: [Hero.module.css](portfolio-web/src/components/sections/Hero.module.css). Fuentes y colores: [globals.css](portfolio-web/src/app/globals.css).

Carga inicial: [PortfolioIntro.tsx](portfolio-web/src/components/layout/PortfolioIntro.tsx). Indicador reutilizable: [CallChip.tsx](portfolio-web/src/components/ui/CallChip.tsx).

Retrato interactivo: [DitherVeil.tsx](portfolio-web/src/components/ui/DitherVeil.tsx) y [motor WebGL](portfolio-web/src/components/ui/dither-veil.ts).

Fondo de la Hero: [PatternWaves.tsx](portfolio-web/src/components/ui/PatternWaves.tsx), coordinado con la transición a proyectos.

Transición: [LandingStory.tsx](portfolio-web/src/components/layout/LandingStory.tsx), [terreno topográfico](portfolio-web/src/components/ui/topography-engine.js) y [coreografía del entorno](portfolio-web/src/components/animations/environment-transition.ts). Proyectos: [ProjectShowcase.tsx](portfolio-web/src/components/sections/ProjectShowcase.tsx), [ProjectPreview.tsx](portfolio-web/src/components/sections/ProjectPreview.tsx), [datos](portfolio-web/src/data/projects.ts) y [ProjectDetail.tsx](portfolio-web/src/components/sections/ProjectDetail.tsx).

Galería: [ProjectMediaGallery.tsx](portfolio-web/src/components/sections/ProjectMediaGallery.tsx), [catálogo automático](portfolio-web/scripts/project-media.mjs) y [guía de medios](portfolio-vault/base-tecnica-y-visual.md#fichas-de-proyecto-y-medios--4-de-noviembre-de-2026).

Navegación global: [StaggeredMenu.tsx](portfolio-web/src/components/ui/StaggeredMenu.tsx), coordinada por LandingStory. Pruebas reproducibles: [`portfolio-web/tests/`](portfolio-web/tests/).

Stack: [TechStack.tsx](portfolio-web/src/components/sections/TechStack.tsx), [estilos](portfolio-web/src/components/sections/TechStack.module.css), [tecnologías](portfolio-web/src/data/stack.ts) y [TechText](portfolio-web/src/components/ui/TechText.tsx).

Zona personal: [About.tsx](portfolio-web/src/components/sections/About.tsx), [Contact.tsx](portfolio-web/src/components/sections/Contact.tsx), [contactos confirmados](portfolio-web/src/config/contact.ts), [cámara y planos de texto](portfolio-web/src/lib/contact-transition.ts) y [Radar](portfolio-web/src/components/ui/Radar.tsx).

Auditoría inicial: `npm audit --omit=dev` informa de cero vulnerabilidades. La auditoría completa señala cinco avisos de alta severidad en la cadena de desarrollo de ESLint (`braces` → `micromatch` → `fast-glob`); no se ha aplicado la degradación de Next ESLint propuesta por npm. Revisar cuando exista una actualización compatible.

## Siguiente paso

Comprobar la nueva escala de lectura en el Oppo físico de Rubén y la sensación del gesto, incluido el revelado táctil del retrato. La emulación no reproduce sus ajustes personales de pantalla y tamaño de texto.

Incorporar imágenes y vídeos reales directamente en `portfolio-web/public/media/projects/sophos/` y `portfolio-web/public/media/projects/loops-grooves/`. La galería y la captura de selección se actualizan automáticamente; no hay que editar listas ni `preview`. Sustituir el texto provisional de las fichas, confirmar las tecnologías de Sophos y añadir LinkedIn cuando Rubén facilite la URL. Publicar los nuevos medios requiere compilar y desplegar de nuevo.

Probar un envío real desde Contacto y comprobar su recepción y el antispam de Formspree. No se ha enviado un correo de prueba. Configurar DNS y dominio personalizado de Pages para `ruben.sepharim.eu`, manteniendo el [criterio de visibilidad](portfolio-vault/sobre-mi.md#dominio-y-visibilidad).

El estado histórico anterior queda en el archivo local; las decisiones y explicaciones actuales se mantienen en `portfolio-vault/` y se enlazan desde aquí.
