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

## Estado actual · 31 de octubre de 2026

- **Nueva dirección confirmada:** conservar la Hero y todo desde Mi stack hasta Contacto. Cubo, carrusel y brasas quedan archivados y retirados de la aplicación activa.
- **Proyectos como mapa topográfico:** transición sencilla de 1,25 s con anime.js: textos y retrato desaparecen suavemente, el fondo original se funde con Topography y entran los SVG de Sophos y Loops n’ Grooves. Cámara estable y movimientos cortos. Las ondas del fondo siguen animadas durante todo el fundido, también al regresar al Hero; se pausan cuando ya no son visibles. El efecto experimental de puntos que formaban líneas queda descartado y eliminado por petición de Rubén. Detalles en [Coreografía del entorno](portfolio-vault/base-tecnica-y-visual.md#coreografía-del-entorno-con-animejs).
- Al elegir un SVG se conservan el logo viajando a la cabecera, la captura enmarcada por el degradado original, «Qué resuelve», «Mi aportación» y «Ver proyecto». Se ha quitado el velo claro de la selección: la topografía permanece visible a su intensidad normal. La ficha integrada y su regreso permanecen. Las capturas reales y las tecnologías de Sophos siguen pendientes; no se inventan.
- **Mi stack → Sobre mí → Contacto conservados:** 38 tecnologías, 34 SVG incluyendo anime.js; los iconos se reúnen en el radar y pulsan al pasar su barrido. Se mantienen textos, tipografías, scroll interior, formulario y vistas finales. La transición de 2,1 s comparte ahora un giro suave de 0° a 64° entre plano y radar; los SVG llegan frontales antes del cruce.
- **Fluidez del entorno:** Topography dibuja con objetivo de 60 fps, reutiliza alturas/cámara y evita trabajo redundante. Los SVG del radar se actualizan una sola vez junto al frame de cámara. Detalles y límites de medición en [Rendimiento actual](portfolio-vault/rendimiento-y-navegacion.md#fluidez-del-entorno--31-de-octubre-de-2026).
- Hero con League Gothic, firma Amazed, PNG original, DitherVeil y PatternWaves. El retrato sigue protegido contra arrastre nativo y menú contextual. Al volver desde proyectos reconoce el cursor quieto sobre la foto y revela el color gradualmente, también después de un periodo de reposo. La entrada inicial conserva anime.js.
- Menú con saltos directos a las cinco secciones, teclado y flujo natural con movimiento reducido. El controlador nuevo mantiene bloqueo de ráfagas y reversas. GSAP permanece únicamente en componentes internos heredados de menú/fichas; no se añade en el nuevo recorrido.
- **Archivo local:** [`_archive/2026-10-31-cubo-carrusel/`](_archive/2026-10-31-cubo-carrusel/ARCHIVO.md), con código, recursos, pruebas y documentación del estado anterior. Está excluido de Git. La propuesta pendiente de partículas reactivas del cubo se archiva con esa dirección.
- **Publicado y comprobado el 31 de octubre** (`f9955fa`), con [despliegue correcto](https://github.com/RubyPG/Portfolio-Web/actions/runs/41249504488) en [GitHub Pages](https://rubypg.github.io/Portfolio-Web/). Formspree `myeeyrzo` y `noindex, follow` ya estaban publicados. Dominio `ruben.sepharim.eu` confirmado; DNS y dominio personalizado pendientes. Ver [Rendimiento y navegación](portfolio-vault/rendimiento-y-navegacion.md) y [Sobre mí y contacto](portfolio-vault/sobre-mi.md).
- **Validación:** 79 pruebas correctas, incluidas las regresiones de cadencia/caché del terreno, ángulos de transición, invalidación del radar y retrato interactivo. Compilación, TypeScript, ESLint y formato correctos; ida/vuelta y selección revisadas a 1440 × 900 y 390 × 844, sin errores ni desbordamiento. Ondas activas durante el fundido de ida/vuelta y pausadas al ocultarse o abrir el menú, verificadas en escritorio y móvil. Revelado con cursor quieto y entrada progresiva tras reposo comprobados en Chromium; el modo reducido conserva el PNG. La selección mantiene el terreno visible sin velo blanco; las pruebas conservan las regresiones de Mi stack, radar, Contacto, menú y movimiento reducido.

## Desarrollo

Ejecutar desde `portfolio-web/`:

| Comando | Uso |
| --- | --- |
| `npm ci` | Instalar las versiones del lockfile. |
| `npm run dev` | Vista local en `http://localhost:3000`. |
| `npm run build` | Compilación de producción. |
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

Navegación global: [StaggeredMenu.tsx](portfolio-web/src/components/ui/StaggeredMenu.tsx), coordinada por LandingStory. Pruebas reproducibles: [`portfolio-web/tests/`](portfolio-web/tests/).

Stack: [TechStack.tsx](portfolio-web/src/components/sections/TechStack.tsx), [estilos](portfolio-web/src/components/sections/TechStack.module.css), [tecnologías](portfolio-web/src/data/stack.ts) y [TechText](portfolio-web/src/components/ui/TechText.tsx).

Zona personal: [About.tsx](portfolio-web/src/components/sections/About.tsx), [Contact.tsx](portfolio-web/src/components/sections/Contact.tsx), [contactos confirmados](portfolio-web/src/config/contact.ts), [cámara y planos de texto](portfolio-web/src/lib/contact-transition.ts) y [Radar](portfolio-web/src/components/ui/Radar.tsx).

Auditoría inicial: `npm audit --omit=dev` informa de cero vulnerabilidades. La auditoría completa señala cinco avisos de alta severidad en la cadena de desarrollo de ESLint (`braces` → `micromatch` → `fast-glob`); no se ha aplicado la degradación de Next ESLint propuesta por npm. Revisar cuando exista una actualización compatible.

## Siguiente paso

Revisar la versión publicada del recorrido Hero → terreno → proyectos y el ajuste de ángulos de Mi stack → Sobre mí. Comprobar la sensación del gesto y el rendimiento en un teléfono físico, incluido el revelado táctil del retrato.

Incorporar capturas reales en `portfolio-web/public/images/projects/capturas/sophos/` y `portfolio-web/public/images/projects/capturas/loops-grooves/`, y actualizar `preview` en sus datos. Confirmar las tecnologías de Sophos y añadir LinkedIn cuando Rubén facilite la URL.

Probar un envío real desde Contacto y comprobar su recepción y el antispam de Formspree. No se ha enviado un correo de prueba. Configurar DNS y dominio personalizado de Pages para `ruben.sepharim.eu`, manteniendo el [criterio de visibilidad](portfolio-vault/sobre-mi.md#dominio-y-visibilidad).

El estado histórico anterior queda en el archivo local; las decisiones y explicaciones actuales se mantienen en `portfolio-vault/` y se enlazan desde aquí.
