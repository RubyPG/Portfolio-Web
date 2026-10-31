# Base técnica y visual del portfolio

Base inicial del 18 de octubre de 2026: Next.js y paleta aportada por Rubén. La aplicación activa está en `portfolio-web/` y el alojamiento confirmado es GitHub Pages. La dirección vigente de Hero/proyectos es el mapa topográfico del 31 de octubre; cubo, carrusel y brasas se conservan únicamente en el archivo local.

## Stack

| Tecnología | Uso y alcance |
| --- | --- |
| Next.js con App Router y React | Framework y componentes. Server Components por defecto; componentes cliente donde haga falta interactividad. |
| TypeScript | Tipado del código y los datos. |
| Tailwind CSS | Estilos y tokens de diseño. |
| anime.js | Motor elegido por Rubén el 31 de octubre: entrada de Hero y todas las transiciones entre escenas. |
| GSAP y `@gsap/react` | Dependencias heredadas de componentes internos de menú y fichas; fuera de las escenas migradas. No usar en animaciones nuevas. |
| ScrollTrigger | Disponible dentro de `gsap` si se necesita vincular una animación al scroll; ya no interviene en `LandingStory`. |
| Lenis | Herramienta elegida si se incorpora smooth scrolling; activarla solo cuando mejore la experiencia. |
| Lucide React | Iconos. |
| Three.js y React Three Fiber | Solo si el diseño necesita 3D; instalación y carga diferidas hasta entonces. |
| ESLint y Prettier | Análisis y formato del código. |
| Node.js | Desarrollo y compilación; ejecución en producción solo si se necesitan funciones de servidor. |

No se prevé Express ni un backend independiente. Anime.js sustituye la decisión inicial de GSAP como motor principal; CSS sigue siendo adecuado para transiciones sencillas de interfaz.

## Organización

La estructura propuesta es la guía de organización dentro de `portfolio-web/`. Crear cada carpeta o abstracción cuando tenga contenido real:

| Ruta | Responsabilidad |
| --- | --- |
| `public/` | Recursos estáticos; subcarpetas `images/`, `videos/`, `models/` e `icons/` según se utilicen. |
| `src/app/` | Rutas, `layout.tsx`, `page.tsx` y `globals.css`. |
| `src/components/ui/` | Componentes reutilizables. |
| `src/components/layout/` | Estructura compartida. |
| `src/components/sections/` | Secciones de las páginas. |
| `src/components/animations/` | Comportamientos de animación reutilizables. |
| `src/hooks/` | Hooks compartidos cuando exista reutilización real. |
| `src/lib/` | Utilidades y módulo de registro de GSAP utilizado por componentes cliente. |
| `src/providers/` | Integraciones globales; `SmoothScrollProvider.tsx` cuando se incorpore Lenis. |
| `src/data/projects.ts` | Datos de los proyectos. |
| `src/data/stack.ts` | Tecnologías y grupos de «Mi stack». |
| `src/types/` | Tipos compartidos; mantener los tipos locales cerca de su uso. |
| `src/config/site.ts` | Configuración general del sitio. |

Las configuraciones de Next.js, TypeScript, ESLint y Prettier, `package.json` y el lockfile de npm pertenecerán a `portfolio-web/`.

## Criterios de implementación

- Mantener pequeñas las fronteras de `"use client"`; no convertir toda la página en componente cliente por sus animaciones.
- Usar anime.js con limpieza de animaciones, estilos y listeners al desmontar o activar movimiento reducido. Mantener un único reloj por transición.
- Respetar `prefers-reduced-motion`, mantener el contenido accesible sin efectos y comprobar teclado, foco y contraste.
- Partir del scroll nativo. Si se incorpora Lenis, sincronizarlo con ScrollTrigger mediante un único bucle de actualización y limpiar sus suscripciones al desmontar. [Integración oficial de Lenis](https://github.com/darkroomengineering/lenis#gsap-scrolltrigger).
- Comprobar móvil y escritorio, optimizar imágenes y fuentes y vigilar Core Web Vitals. Cargar bajo demanda los recursos pesados que no sean críticos para la primera vista.
- No crear utilidades, providers o dependencias por previsión.

## Base de desarrollo

La aplicación está inicializada en `portfolio-web/` con Next.js 16.4, React 19.3, TypeScript y Tailwind CSS 4.3. Se ha preparado una base mínima manual con App Router y `src/`, sin contenido de plantilla. Las versiones exactas están en el lockfile de npm; los comandos están en el [README](../README.md#desarrollo).

ESLint y Prettier están configurados. No se ha inicializado Git; la raíz común y sus exclusiones se gestionarán según `AGENTS.md`. `agentRules: false` en Next.js evita que se genere otra copia de las normas dentro de la aplicación.

Anime.js gestiona la entrada de la Hero y las transiciones completas entre etapas mediante `scene-clock.ts`. `LandingStory` no usa GSAP ni ScrollTrigger; `scene-input.ts` interpreta los gestos y las timelines sincronizan la posición del documento. OGL se reutiliza en DitherVeil y PatternWaves; Topography emplea WebGL2 directamente. Quedan componentes internos anteriores que usan GSAP; no se ha eliminado la dependencia del repositorio.

## Hero principal

La petición del 18 de octubre de 2026 fija una portada editorial de `100svh` con cuatro elementos principales separados y este orden de capas: FULLSTACK → fotografía → DEVELOPER → firma RubenPG. La petición posterior del 22 de octubre añade PatternWaves detrás de los cuatro elementos; se mantienen sin botones ni subtítulos adicionales.

- Fondo Pebble Mist `#E4EAE8`, títulos Sangria Deep `#7A1229` y firma RubenPG Jade Botanical `#479C73`, de la paleta confirmada. Sin `mix-blend-mode: difference` ni inversión del texto. La firma verde es la última decisión explícita del usuario.
- League Gothic real para ambos títulos y Amazed real para la firma, declaradas mediante `@font-face` y servidas desde `public/fonts/`.
- La fotografía está en `portfolio-web/public/images/ruben-hero.png`; ya no hay una copia suelta en la raíz. SHA-256 observado el 19 de octubre de 2026: `ED3E58EAB9572AFA1560608EA9BA9EC2A4D1A581149CE930ADBBABE4D4906CC7`, tamaño de 1.385.044 bytes y última modificación registrada el 19 de octubre de 2026 a las 01:01:16. Registro histórico anterior a la optimización del 22 de octubre: una recompresión PNG sin pérdida lo reduce a 1.202.878 bytes, con SHA-256 `365470D2CC20E652D81DA6BF9BF8A84AB92B762E5E24FDAD761DF240993A184A`. La comparación completa de RGBA y dimensiones confirma píxeles y transparencia idénticos; la copia original se conserva solo en `_temp/`, fuera de la publicación. Conserva la transparencia y se muestra sin deformación mediante `object-fit: contain`. Una máscara CSS inferior y lateral atenúa los cortes; un filtro SVG aplicado solo a `SourceAlpha` suaviza el contorno real sin difuminar la cara ni la textura de la foto. El borde superior usa una atenuación leve: 70 % de opacidad en el límite del PNG, recuperando el 100 % al 4 % de altura. Se integra con el fondo real, sin pintar blanco ni añadir otra imagen.
- Capas absolutas con `z-index`, tamaño de letra adaptable y composición específica para pantallas verticales. FULLSTACK y DEVELOPER son dos elementos `h1` independientes y la foto se intercala entre ambos.
- La sección dispone de `data-hero` y sus cuatro elementos de `data-hero-layer="fullstack|portrait|developer|signature"` (un valor distinto por elemento). Son texto HTML y una fotografía independiente, no una composición aplanada. Su salida hacia proyectos se coordina desde `LandingStory`, según la petición posterior del usuario.
- Entrada inicial con GSAP: la fotografía aparece mediante un fade-in de 1 s al retirarse la carga, FULLSTACK llega desde la izquierda, DEVELOPER desde la derecha y RubenPG desde abajo. El fade solo modifica opacidad y visibilidad, conservando posición, filtro y máscara del PNG. `useGSAP()` limita y limpia las animaciones del componente; con `prefers-reduced-motion` se muestra directamente la composición final. La firma conserva su inclinación y proximidad al extremo inferior derecho del título.
- Refinamiento con Taste, UI UX Pro Max e Impeccable: títulos a `30cqw` dentro de límites, composición más compacta y foto entre el 90 % y el 100 % del alto disponible. La firma reduce su peso en móvil y se posiciona a partir del borde inferior de DEVELOPER, con un límite que evita recortes en pantallas bajas. La altura y las posiciones son fluidas; se ha retirado el breakpoint de relación de aspecto que reducía la fotografía bruscamente al pasar de 800 a 801 px en tablet. El degradado inferior termina al 96 % del PNG para evitar una línea residual. League Gothic y Amazed se precargan desde el layout, conservando `@font-face`.
- League Gothic tiene licencia OFL. Amazed se ha descargado de [DaFont](https://www.dafont.com/amazed.font) para la maqueta local; el archivo incluido limita el uso a fines personales no lucrativos. La [FAQ del autor](https://jadatype.com/faq/) exige una licencia Webfont para incrustar la fuente en una web; sus [licencias](https://jadatype.com/license/) contemplan sitios personales y comerciales. Resolver ese permiso antes de publicar, sin asumir que todo portfolio sea lucrativo. Las licencias originales acompañan a las fuentes.

## Fondo PatternWaves

La Hero conserva su fondo original de React Bits: preset `silk`, marcas cuadradas Jade `#479C73` sobre Pebble Mist `#E4EAE8`, detrás de foto, títulos y firma. Se mantiene su interacción y apariencia en reposo.

La dirección final del 31 de octubre usa **Topography**, componente aportado por Rubén, como fondo de proyectos. Tras probar la transformación de puntos del fondo y retrato en curvas, Rubén pide deshacerla y simplificar. Se eliminan las partículas, capturas de canvas y congelación temporal de los motores.

`PatternWaves.setTerrainProgress(0..1)` ahora sólo controla un fundido entre el patrón original y el terreno. No estira los cuadrados ni aplica un zoom grande. Topography entra con su cámara final estable, sin giro ni construcción segmentada de curvas. Conserva líneas Jade sobre Pebble, movimiento ambiental lento, puntero y fallback SVG. `setActive` pausa los efectos al ocultarlos. La Hero en reposo no cambia. La revisión de fluidez posterior permite 60 fps con caché del campo de alturas y de cámara; mantiene líneas y resolución. [Implementación y medición](rendimiento-y-navegacion.md#fluidez-del-entorno--31-de-octubre-de-2026).

Corrección del 31 de octubre: el fondo no se congela al empezar el fundido. `observeEffectVisibility` puede exceptuar `inert` en un único nodo; PatternWaves exceptúa la Hero, cuyo bloqueo de interacción no implica que el fondo haya desaparecido. Conserva las comprobaciones de ocultación real, pestaña, viewport y otros ancestros bloqueados (menú/cargador). La actividad termina cuando la opacidad del patrón llega a cero (progreso 0,92), se recupera al invertir y respeta movimiento reducido. No se reintroduce deformación: el shader del patrón conserva progreso de terreno 0. Verificado en Chromium a 1440 × 900 y 390 × 844: 28–29 frames con tiempo creciente durante el fundido, también en reversa; ningún frame adicional al quedar oculto ni con el menú abierto. Regresión automatizada ampliada en `pattern-lifecycle.test.cjs` para comprobar estas reglas y movimiento reducido.


Implementación: [PatternWaves](../portfolio-web/src/components/ui/PatternWaves.tsx), [Topography](../portfolio-web/src/components/ui/topography-engine.js), [Hero](../portfolio-web/src/components/sections/Hero.tsx) y [LandingStory](../portfolio-web/src/components/layout/LandingStory.tsx).

## Tramado interactivo del retrato

Petición del 19 de octubre de 2026: aplicar DitherVeil de React Bits al PNG propio sin añadir el fondo rectangular del ejemplo.

- Adaptación específica del código adjunto a TypeScript, con difusión Floyd-Steinberg y revelado mediante cursor. Ajuste posterior solicitado: más contraste de silueta y cara y más puntos en el traje. La tinta pasa a verde oscuro `#27563F`, derivado de Jade, y el papel a Pebble Mist `#E4EAE8`. La asignación inicial clara en las sombras ocultaba casi todo el traje contra el fondo; queda sustituida por esta configuración. En el modo duotono estos nombres son los extremos tonales de la foto, no el fondo de la página.
- Trama de 1 px CSS, frente a los 2 px anteriores: cuatro veces más celdas a la misma escala. Curva tonal `0.28 + 0.66 * luminancia^0.65` antes de difundir el error: separa tonos del tejido y conserva puntos claros incluso en el negro, evitando un bloque verde completamente sólido. No cambia la transparencia ni los colores de la foto original revelada al pasar el ratón.
- Ajuste de contraste y densidad revisado en escritorio a 1058 × 884 y móvil a 390 × 844; el traje y la cara se distinguen en reposo y se conserva el revelado. TypeScript, ESLint y formato correctos tras el ajuste.
- OGL se carga bajo demanda para renderizar el efecto 2D. No se ha instalado Three.js. El contexto es transparente y el shader utiliza el canal alfa del PNG en cada píxel, sin pintar un rectángulo detrás ni modificar el archivo original.
- La capa `portrait` pasa a ser un contenedor con el PNG accesible de respaldo y un canvas decorativo. Sigue siendo una de las cuatro capas; anime.js aplica a ese contenedor el fade-in de 1 s. Las máscaras y el filtro de contorno se conservan. El cargador espera la imagen dentro del contenedor.
- El cursor revela el color original con borde tramado; al pulsar se expande una onda de revelado. En táctil se puede tocar y arrastrar; al levantar el dedo la zona vuelve al tramado. Se mantiene el scroll vertical nativo. El radio se reduce proporcionalmente en pantallas estrechas.
- Corrección del 31 de octubre: el motor conserva la última posición del puntero en la ventana incluso cuando la Hero está `inert`. Al recuperar visibilidad/interacción, hacer scroll o redimensionar, recalcula su posición sobre el retrato sin exigir otro movimiento. La comprobación del elemento bajo el cursor permite los títulos superpuestos y excluye el menú. El efecto solo dibuja donde el PNG tiene alfa.
- El revelado interpola con tiempo de frame limitado y constante de 220 ms; el reloj se reinicia al detenerse. Así el tiempo pasado en reposo no provoca un salto de 0 a 100. Se limpia el rastro al salir de la escena y se respetan la salida de ventana, cancelación táctil, pestaña oculta y destrucción de observadores/listeners.
- Verificación de esta corrección: cinco regresiones específicas del motor (68 pruebas totales), TypeScript, lint, formato y build correctos. En Chromium el cursor quieto se reactiva al volver; después de reposo la intensidad avanza aproximadamente 2 %, 4 %, 6 %… hasta revelarse. Fuera del retrato se mantiene en cero. Movimiento reducido a 390 × 844: PNG visible, sin canvas ni desbordamiento. Capturas `_temp/portrait-after-*.png`.
- Se conserva el PNG normal con movimiento reducido, sin JavaScript, si WebGL2 no está disponible o si se pierde el contexto. El canvas no sustituye el texto alternativo de la imagen. Se limpian los recursos GPU, observadores, eventos y frames; el bucle se detiene en reposo, fuera de pantalla y con la pestaña oculta.
- Verificado visualmente a 1058 × 884 y 390 × 844, incluyendo el revelado al interactuar: cuatro capas, sin desbordamiento horizontal y con fondo transparente. El contenedor recorta el canvas para evitar una línea residual inferior. TypeScript, ESLint, formato y build correctos; detector Impeccable sin hallazgos. El modo táctil nativo y los fallos de contexto se han revisado por código, sin emularlos en navegador.

## Carga inicial

Petición del 19 de octubre de 2026: mostrar el componente CallChip de React Bits aportado por el usuario antes de la página.

- `PortfolioIntro` coordina la carga; `CallChip` conserva su API reutilizable, tipada en TypeScript. Se han instalado `@hugeicons/react` y `@hugeicons/core-free-icons` para los iconos del componente original.
- Pantalla del mismo color Pebble Mist que la Hero, con un indicador Sangria Deep centrado, texto claro y check Jade Botanical. Muestra `portfolio RubenPG` y el tiempo transcurrido; no simula ejecutar comandos ni pruebas.
- Espera a League Gothic, Amazed y la decodificación del PNG real. Con movimiento normal se mantiene al menos 900 ms y muestra el estado completado durante 650 ms antes de retirar la pantalla e iniciar la entrada con anime.js. El barrido es un indicador estimado, no un porcentaje de bytes descargados.
- Los recursos tienen un límite de espera de 5 s. Un error o timeout abre la página sin mostrar un éxito falso. Los temporizadores y animaciones se limpian al desmontar y soportan React StrictMode.
- Con movimiento reducido se omiten la espera mínima, el check animado y las entradas laterales. Sin JavaScript se muestra directamente la Hero estática. Si la hidratación nunca llega, CSS retira la cobertura tras 8 s; una vez hidratado, manda el límite de JavaScript. Una hidratación posterior a esa salida no vuelve a ocultar ni animar los títulos ya visibles.
- La Hero mantiene sus cuatro capas independientes y no cambia su composición. La carga se repite al abrir o recargar la página; no se guarda un bloqueo por sesión.

## Coreografía del entorno con anime.js

**Dirección confirmada el 31 de octubre de 2026, posterior al rechazo del cubo/carrusel/brasas.** Conservar la Hero y todo desde Mi stack hasta el final; sustituir el acceso a proyectos por un mapa topográfico. El código, recursos, pruebas y documentación de la versión descartada están en [`_archive/2026-10-31-cubo-carrusel/`](../_archive/2026-10-31-cubo-carrusel/ARCHIVO.md), fuera de Git y de la aplicación activa. La idea pendiente de múltiples gestos y partículas reactivas del cubo queda archivada también.

- **Hero ↔ proyectos:** un gesto inicia 1,25 s reversibles. FULLSTACK y DEVELOPER se desplazan 24 px en sentidos opuestos; la firma, 16 px. Textos y retrato desaparecen con fade, con una ampliación del retrato limitada al 2 %. El patrón se funde con Topography y los SVG entran con fade y 16 px de desplazamiento. La cámara permanece estable. La Hero y su entrada inicial se conservan.
- **Proyectos ↔ Mi stack:** 1 s reversible. Los proyectos desaparecen, el plano Sangria cubre gradualmente el terreno y entra el grupo del Stack. Sin brasas ni paradas intermedias.
- **Mi stack ↔ Sobre mí:** 2,1 s con anime.js. Revisión de fluidez del 31 de octubre: plano y cámara comparten una curva suave de 0° a 64°; la perspectiva compensa el ancho del plano. Los SVG permanecen frontales y llegan a sus posiciones antes del cruce visual con los ecos del radar. Títulos y texto reducen desplazamiento y rotación; las escrituras se cachean y los iconos invisibles dejan de recalcularse. Se conservan el horizonte final, los 34 SVG con barrido y la reversa con scroll interior.
- **Sobre mí ↔ Contacto:** conserva los 1,25 s, cámara horizonte→cenital, textos y formulario. Los SVG permanecen en el radar.
- Anime.js controla cuatro relojes de transición y los saltos del menú. Cada gesto se consume una vez; no hay cola de acciones por inercia. Menú, hashes, resize, foco y scroll interior comparten los mismos estados. El antiguo `#cubo` se interpreta como Proyectos por compatibilidad, sin montar un cubo.
- Movimiento reducido devuelve el documento natural. Los SVG son botones accesibles; los efectos decorativos no bloquean el contenido. La Hero deja de recibir interacción al salir y la recupera al regresar o cambiar la preferencia.

**Experimento descartado expresamente:** la transformación de puntos en líneas no forma parte de la dirección vigente. Su implementación y APIs de captura se han retirado; no reintroducir ese efecto por iniciativa propia.

## Transición de scroll y sección de proyectos

`ProjectShowcase` presenta los dos proyectos como puntos del terreno: Sophos primero, Loops n’ Grooves después. Escritorio usa posiciones escalonadas, móvil las distribuye verticalmente. Los logos son los archivos originales, sin recolorear ni inventar proyectos.

Al pulsar un SVG, este viaja a la cabecera de la captura. Se mantienen el marco con el degradado propio, «Qué resuelve», «Mi aportación», tecnologías disponibles y «Ver proyecto». El terreno conserva su intensidad al seleccionar: se elimina el velo Pebble de pantalla, manteniendo el blanco únicamente dentro del marco/captura. «Cerrar» o Escape invierten la selección y devuelven el foco al proyecto elegido.

La ficha `ProjectDetail` conserva el comportamiento aprobado: expansión del marco y logo persistente junto al título, texto con scroll interior y regreso a la misma selección. Se abre por botón o un gesto nuevo desde la preselección estable; al cerrar no se reabre por inercia. La implementación heredada de la ficha y el menú sigue usando GSAP; todas las animaciones nuevas usan anime.js. ProjectPreview recibe el mismo progreso de selección sin un motor adicional.

Las capturas reales siguen pendientes; se conserva `capturas/sin-captura.svg` con un texto explícito. No se atribuyen tecnologías sin confirmar a Sophos. «Diseño y desarrollo completos.» está confirmado para ambos proyectos.

Implementación: [ProjectShowcase](../portfolio-web/src/components/sections/ProjectShowcase.tsx), [ProjectPreview](../portfolio-web/src/components/sections/ProjectPreview.tsx), [ProjectDetail](../portfolio-web/src/components/sections/ProjectDetail.tsx), [datos](../portfolio-web/src/data/projects.ts) y [geometría compartida](../portfolio-web/src/lib/project-preview.ts).

**Verificación tras simplificar:** 63 pruebas correctas, incluyendo cuatro de lifecycle Topography y 23 del controlador de cinco escenas. Las pruebas exclusivas del experimento eliminado también se retiran. Build/TypeScript, ESLint y formato correctos. Chromium a 1440 × 900 y 390 × 844: fundido, ida/vuelta, selección, foco y ausencia de partículas/velo comprobados; sin errores de consola ni desbordamiento (sólo avisos existentes de precarga). Capturas `_temp/calm-*.png`. El recorrido conservado desde Mi stack hasta Contacto mantiene sus regresiones.

## Sección Mi stack

Petición del 20 de octubre de 2026: añadir la siguiente sección superpuesta y recuperar las tecnologías del portfolio archivado.

Texto introductorio actualizado el 21 de octubre por petición del usuario: «Tecnologías usadas en proyectos en producción.». Sustituye a «De la interfaz al servidor.». La nueva afirmación procede de su petición explícita, sin recuperar afirmaciones profesionales del archivo.

TechText integrado el 21 de octubre a partir del código completo de React Bits aportado por el usuario. Se conserva el `h2` con texto DOM y League Gothic; un canvas decorativo por palabra añade contornos discontinuos a la letra señalada, un marco Jade `#479C73`, seis partículas pequeñas y una elevación suave con onda hacia las letras vecinas al pulsar. La variante omite arrastre, barrido automático, etiquetas métricas y otra entrada: la animación de llegada pertenece al controlador de anime.js. En táctil solo responde a una pulsación breve sin desplazamiento; nunca captura ni cancela el scroll. Mide el texto y su línea base reales después de cargar las fuentes, sin cambiar el tamaño ni la composición. El canvas solo sustituye visualmente al texto durante la interacción; al terminar vuelve al texto DOM. El motor detiene y limpia la animación al ocultarse la sección o pestaña, y responde a cambios de movimiento reducido. Sin JavaScript, sin canvas o con movimiento reducido queda el título normal.

Verificación histórica de TechText: build, tipos y comprobaciones del motor correctos. Las antiguas limitaciones de acceso al navegador descritas en el archivo no representan la sesión actual. La validación vigente de navegación y escenas aparece en el apartado anterior.


- `src/data/stack.ts` reúne las 34 entradas de `_archive/Portfolio viejo/src/data/skills.ts` y añade Next.js y Codex por su uso actual, Hermes Agent y anime.js a petición del usuario: 38 tecnologías, agrupadas en Frontend, Backend y datos, Inteligencia artificial, Automatización y Desktop. Usan 34 SVG locales en `public/icons/stack/`; Agent Skills, Subagentes & Workflows, Context Engineering y RAG permanecen como texto, sin inventar marcas. Anime.js conserva la marca oficial horizontal y su procedencia en `SOURCES.txt`; se incorpora también al radar desde los mismos datos. El archivo original permanece intacto. No se reutilizan niveles, porcentajes ni afirmaciones antiguas de experiencia o producción.
- `TechStack` usa fondo Sangria `#7A1229`, texto Pebble `#E4EAE8` y títulos de grupo en Jade `#479C73`. La galería queda abierta, sin tarjetas ni bordes. Compactada el 22 de octubre: las 20 tecnologías principales muestran SVG de 48 px y etiquetas de 15 px; en móvil, los iconos miden 40 px. Las secundarias combinan iconos de 20 px con texto de 14 px; Woo y AWS usan 36 y 28 px de ancho para conservar sus marcas horizontales. Los SVG son máscaras decorativas; los nombres permanecen como texto accesible.
- Desde 1200 px, «MI STACK» permanece a la izquierda y los cinco grupos ocupan dos columnas a la derecha; entre 768 y 1199 px, la cabecera se coloca arriba en horizontal y los grupos conservan dos columnas. Por debajo de 768 px, cabecera y grupos pasan a una columna. Dentro de cada grupo, las tecnologías principales usan tres columnas, o dos por debajo de 360 px. Se reducen padding y separaciones, sin ocultar contenido. El wrapper interior `data-stack-heading` recibe la animación del entorno y mantiene separado el sticky; en pantallas de hasta 760 px de altura la cabecera deja de ser sticky. Conserva scroll interior, controles de 44 px y navegación.
- El hover solo responde a puntero fino: el icono adopta Jade; con movimiento permitido, los principales suben 4 px y escalan a `1.08` durante 240 ms, y los secundarios suben 2 px. Los nombres permanecen quietos. Con movimiento reducido se suprimen transformaciones y transiciones; el cambio de color es inmediato.
- La procedencia y licencias se conservan en [SOURCES.txt](../portfolio-web/public/icons/stack/SOURCES.txt): recursos recuperados como datos de `tech-icons.ts`, más Next.js, Claude y Woo de Simple Icons, y Codex, Claude Code y MCP de Lobe Icons. Se incluyen los avisos MIT de Devicon y Lobe Icons. Los símbolos funcionales, las marcas representativas de etiquetas combinadas y los ajustes de máscara de Woo y AWS quedan identificados en esa fuente.
- El acceso actual desde proyectos usa el fundido de entorno de 1 s descrito arriba. Sustituye las animaciones históricas de panel, carrusel y brasas.
- Bajar desde el mapa sin selección o pulsar «Mi stack» entra en la sección. Si hay captura seleccionada, bajar abre su ficha; no abre el stack. Subir desde el inicio del scroll interior o pulsar «Volver a proyectos» recupera el mapa. Las ráfagas se consumen y los hashes se sincronizan al terminar.
- Con el stack abierto, `nativeScroll` restaura la posición del documento y descarta sus reajustes por foco o redimensionado como solicitudes de salida. El desplazamiento pertenece al contenedor interior; el regreso depende del gesto explícito o de «Volver a proyectos». Comprobado en el build final: cargar `#stack`, pasar de escritorio a 768 × 1024, volver a escritorio y pulsar «MI STACK» mantiene el panel abierto, sin desbordamiento ni mensajes de error o advertencia. Build y TypeScript correctos; ESLint y formato del archivo corregido correctos.
- La capa oculta queda fuera del foco y del árbol accesible mediante `inert` y `aria-hidden`. Sin JavaScript o con movimiento reducido, Hero, proyectos y stack permanecen en el flujo del documento y los enlaces funcionan como anclas.
- **Compactación · 22 de octubre de 2026:** CSS, formato y detector revisados; la estimación con fuentes reales reduce la altura aproximadamente un 25 % a 390 px y un 44–52 % en tablet/escritorio. Son cálculos, no medidas del navegador. La transición posterior de esa revisión era un paso de página lateral de 1,08 s, hoy sustituido por la convergencia al radar de 2,1 s. Su reversa, solapamiento y resize están comprobados con el controlador real y GSAP sobre objetos. Detalles en [Sobre mí y contacto](sobre-mi.md). La revisión visual de esta versión sigue pendiente; las capturas siguientes documentan la anterior.
- **Verificación de la galería SVG · 20 de octubre de 2026:** composición e iconos revisados a 1036 × 884, 390 × 844 y 320 × 568, sin desbordamiento horizontal en documento ni contenedor interior; a 320 px se usan dos columnas. Etiquetas legibles y hover de React comprobado con escala `1.08`, elevación de 4 px y color Jade, manteniendo quieto el nombre. Consola sin errores ni advertencias; revisión independiente favorable. Build final y TypeScript correctos; ESLint global y formato pasaron antes de separar el wrapper de la cabecera. Después, ESLint del componente correcto y Prettier aplicado a ese último cambio. Movimiento reducido revisado por código, sin emularlo. Las máscaras finales de Woo y AWS están comprobadas visualmente. Al final del scroll de escritorio (`scrollTop: 815`), «MI STACK», texto y enlace permanecen a la izquierda, con cabecera a 53 px, mientras se muestran Automatización y Desktop. Capturas: [escritorio](../_temp/stack-visual-desktop.png), [final en escritorio](../_temp/stack-visual-desktop-bottom.png), [móvil](../_temp/stack-visual-mobile.png) y [final en móvil](../_temp/stack-visual-mobile-bottom.png).
- Navegación verificada antes de la galería SVG: apertura, scroll interior y regreso en escritorio y móvil; subir desde el inicio exige un gesto nuevo, y una captura seleccionada conserva prioridad para abrir su ficha. Carga directa con `#stack`, regreso a `#proyectos` y protección frente a reajustes del documento correctos. Movimiento reducido y alternativa sin JavaScript revisados por código; táctil nativo sin probar. Esa revisión no valida la nueva composición de iconos.

Implementación: [TechStack](../portfolio-web/src/components/sections/TechStack.tsx), [estilos](../portfolio-web/src/components/sections/TechStack.module.css), [datos](../portfolio-web/src/data/stack.ts), [TechText](../portfolio-web/src/components/ui/TechText.tsx), [motor de texto](../portfolio-web/src/components/ui/tech-text-engine.ts) y [transición](../portfolio-web/src/components/layout/LandingStory.tsx).

## Tipografía responsive

Revisión del 21 de octubre de 2026 con `ui-ux-pro-max` e `impeccable`, preservando la identidad y las animaciones confirmadas:

- Cuatro roles de lectura en `globals.css`: metadatos 12 px, texto pequeño 14 px, acciones 15 px y cuerpo fluido 16–18 px. League Gothic y Amazed conservan sus funciones; Arial se mantiene como fuente de lectura ya existente.
- Proyectos: se eliminan las variantes de 9–11.5 px; el contexto usa 14–18 px según el espacio. El título del pie reserva el ancho real de los controles, con blancos táctiles mínimos de 44 px. El índice dispone de dos columnas en móvil y el mensaje de arrastre se centra sin depender de su interlineado.
- La captura seleccionada se reduce únicamente en pantallas cortas desde `getProjectPreviewRect`, compartido por shader, alternativa HTML y apertura de ficha. A 320 × 480 queda aproximadamente en 95 × 101 px. Es un compromiso para conservar contexto y acciones legibles, pendiente de evaluar visualmente. En horizontal, las columnas de contexto se elevan 18 px para separarse del pie.
- La ficha recalcula la posición del logo al cambiar las fuentes, su cabecera o el viewport. El contenido conserva su scroll interior y el mismo recorrido de apertura y regreso.
- «MI STACK» se limita al ancho real de su columna y permite salto entre palabras en móvil. Cabecera sin `sticky` cuando la ventana mide 760 px de alto o menos; nombres largos se adaptan y se usan dos columnas por debajo de 380 px.
- La composición del hero y sus cuatro capas se conservan: no se sustituyen sus medidas editoriales por la escala de lectura.
- Hermes Agent de Nous Research se incorpora como herramienta de IA, con SVG oficial y licencia/procedencia en `public/icons/stack/`. Con la incorporación posterior de anime.js son 38 tecnologías. Esto no atribuye Hermes a Sophos ni confirma las tecnologías de ese proyecto.

Verificación: build, TypeScript, ESLint y Prettier correctos. Detector Impeccable sin hallazgos en las superficies modificadas; su escaneo tipográfico global advierte sobre Arial, conservada intencionadamente para mantener el diseño. Auditoría independiente con métricas de las fuentes reales en 320 × 480, 320 × 568, 390 × 844, 768 × 1024, 1024 × 768 y 640 × 320. En el contenido más largo se calculan separaciones positivas frente al pie, de unos 14 px en los casos más ajustados. Esos cálculos no verifican el render final, el antialiasing ni los gestos táctiles reales.

La revisión visual sigue pendiente: el navegador deniega el origen local pese a la autorización del usuario. No se ha usado un navegador alternativo ni otra ruta para eludir esa restricción.

La nueva sección posterior está documentada en [Sobre mí](sobre-mi.md).

## Despliegue pendiente

Decidir el alojamiento al concretar las funciones de la web y comprobar el plan contratado:

- **Exportación estática:** `output: 'export'` genera `out/`, publicable en un servidor de archivos estáticos. No necesita Node.js en producción; los Server Components se ejecutan durante la compilación. No admite Server Actions, ISR ni el optimizador de imágenes predeterminado. [Exportación estática de Next.js](https://nextjs.org/docs/app/guides/static-exports).
- **Ejecución con Node.js:** si se necesitan funciones de servidor, contratar o verificar un entorno compatible. Hostinger documenta despliegues Node.js y Next.js en Business Web Hosting y planes Cloud; falta conocer el plan del usuario. [Despliegue Node.js en Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).

Favorecer páginas pregeneradas mientras el contenido lo permita; el modo final de despliegue queda abierto.

## Paleta confirmada

Valores HEX indicados en la imagen aportada por el usuario:

| Color | HEX |
| --- | --- |
| Sangria Deep | `#7A1229` |
| Jade Botanical | `#479C73` |
| Pebble Mist | `#E4EAE8` |

La Hero utiliza Pebble Mist como fondo, Sangria Deep para FULLSTACK y DEVELOPER, y Jade Botanical para la firma de marca RubenPG. La sección de proyectos conserva el fondo claro y los textos Sangria. Las partículas parten de Jade y adoptan los colores de la tarjeta del proyecto central al formarla; los logos mantienen sus colores propios. «Mi stack» invierte la base: fondo Sangria, texto Pebble y títulos de grupo Jade en tamaño grande. El reparto de la paleta en las demás secciones sigue pendiente.

Contraste calculado a partir de los HEX, con colores opacos y fondos planos:

| Combinación, en cualquiera de los dos sentidos | Contraste aproximado | Uso en texto |
| --- | --- | --- |
| Sangria Deep y Pebble Mist | 8,86:1 | Apta para texto normal. |
| Sangria Deep y Jade Botanical | 3,22:1 | Apta para texto grande; no para texto normal. |
| Jade Botanical y Pebble Mist | 2,75:1 | No apta para texto normal ni grande. |

WCAG AA exige 4,5:1 para texto normal y 3:1 para texto grande, entendido como al menos 24 px o aproximadamente 18,67 px en negrita. [Criterio de contraste de W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Conservar la paleta, pero no copiar automáticamente las combinaciones de texto de la referencia. Para texto normal, priorizar Sangria Deep sobre Pebble Mist o la combinación inversa. Si un bloque verde necesita texto pequeño, definir un tono auxiliar con contraste suficiente durante el diseño.

## Herramientas de diseño

Instaladas el 18 de octubre de 2026 en `C:/Users/rubik/.codex/skills/`, disponibles para Codex desde el siguiente turno. Son herramientas del asistente, no dependencias de la web ni del despliegue.

| Skill | Función | Fuente y revisión instalada |
| --- | --- | --- |
| Taste Skill (`design-taste-frontend`) | Dirección visual, composición, referencias y revisión de resultados. | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/f624f37a8c650b9cc550253104925efe4c8de246/skills/taste-skill) |
| `ui-ux-pro-max` | Consulta de patrones UX, paletas, tipografías y recomendaciones según producto y stack. | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/56ea9cf174ed86786187daa9de0e6247cb0747e4) |
| `impeccable` | Auditoría, crítica visual y refinamiento de interfaces; incluye perfiles de subagentes. | [pbakaus/impeccable 4.6.0](https://github.com/pbakaus/impeccable/tree/2f46b7a8b059af00d20dd13b64dbe165e7c6a742/.agents/skills/impeccable) |

Adaptaciones: rutas globales y comandos compatibles con PowerShell; Taste prioriza explícitamente las decisiones del usuario y limita sus reglas de páginas completas al alcance real de cada tarea. Se conservan las bibliotecas, referencias y licencias originales. No se han activado hooks automáticos.

Flujo solicitado: usar referencias como inspiración, mantener la identidad confirmada, separar construcción y auditoría mediante subagentes cuando aporte valor, y revisar visualmente las pantallas afectadas en escritorio y móvil. Las recomendaciones de estas skills no sustituyen la paleta, fuentes, contenido ni efectos que el usuario haya elegido. «Referencias» y «subagentes» describen este flujo; no son nombres de paquetes adicionales.

Validación: estructura de las tres skills correcta; catálogo de Taste y búsquedas UX/Next.js de UI UX Pro Max operativos. Impeccable incluye su motor oficial Windows 0.1.15, con SHA-256 comprobado antes de ejecutar; prueba del motor y carga de contexto correctas. Su detector devuelve cero hallazgos en Hero.tsx y Hero.module.css. La revisión de código por un subagente no detectó regresiones; los gradientes de máscara son intencionados y no se eliminan por alertas genéricas de estilo. Firma verde y degradado superior comprobados visualmente en escritorio y móvil; TypeScript, ESLint y formato correctos.

