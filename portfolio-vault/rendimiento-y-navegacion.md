# Rendimiento y navegación global

## Decisiones confirmadas · 22 de octubre de 2026

- Mantener el diseño, las animaciones y la densidad de los efectos. Optimizar trabajo redundante y carga de recursos antes de reducir calidad.
- Integrar StaggeredMenu del adjunto del usuario, adaptado a League Gothic y la paleta Sangria / Jade / Pebble.
- Enlaces a Inicio, Proyectos, Mi stack, Sobre mí y Contacto. Seleccionar una sección ejecuta salida con desplazamiento y fade, cambio de escena mientras está oculta y entrada inversa; no recorre las secciones intermedias.
- El menú suspende la interacción con la escena. Tiene cierre por Escape, control de foco y alternativa inmediata con movimiento reducido. Navegar desde una ficha abierta limpia la ficha y su selección manteniendo el proyecto central del carrusel.
- Subir el nuevo portfolio a `RubyPG/Portfolio-Web`, directamente sobre `main`, conservando el historial anterior. Se versionan `portfolio-web/`, `portfolio-vault/` y las normas/documentación de raíz. `_archive/`, `_temp/`, dependencias, compilados y secretos quedan excluidos.

## Corrección del menú

El desplazamiento inicial `translateX(100%)` del CSS se interpretaba como píxeles al inicializar GSAP. Animar solo `xPercent` conservaba ese desplazamiento adicional, dejando el panel fuera de posición. La animación ahora restablece `x: 0` explícitamente y se inicializa cuando termina la carga, con el menú visible para medirlo. El CSS sigue ocultando los paneles antes de hidratar.

El botón conserva fondo Sangria, texto Pebble e icono Jade en todas las secciones, sin cambiar de tema antes de que llegue el panel. Mantiene contraste durante los bloqueos de navegación y un borde Jade al pasar el ratón.

La regresión prueba desplazamientos previos equivalentes a paneles de 320 y 520 px y la espera durante la carga, además de los ciclos de apertura, cierre, foco y movimiento reducido. Usa GSAP sobre objetos con ambos canales de desplazamiento; no verifica la descomposición CSS ni el renderizado en un navegador. Las cinco suites, build, tipos, ESLint y formato pasan. Se ha reiniciado el servidor local con la build corregida; queda pendiente su comprobación visual por la restricción de acceso descrita abajo.

## Cambios de rendimiento

- Fuentes reales convertidas a WOFF2, conservando originales y licencias. Los dos archivos servidos pasan de 109.848 a 50.368 bytes (−54,1 %). Validación de glifos, contornos, métricas, mapas de caracteres, nombres y variaciones.
- PNG recompreso sin pérdida: 1.385.044 → 1.202.878 bytes (−13,2 %), con RGBA y dimensiones idénticos. Se mantiene PNG, sin modificar retrato, máscara ni transparencia. La huella actual está en [Base técnica y visual](base-tecnica-y-visual.md).
- Radar separado del JavaScript inicial mediante importación diferida. Se prepara al entrar en stack y conserva los valores de cámara recibidos mientras se descarga. La alternativa de flujo natural lo prepara por proximidad.
- El controlador de escenas solo escribe visibilidad, atributos, estado y cámara cuando cambian. Las transiciones que no giran el radar ya no reconstruyen sus parámetros en cada fotograma.
- Los efectos evitan trabajo repetido ante cambios de transformaciones de sus antecesores, ajustes idénticos o redimensionados sin cambio de tamaño. Conservan sus límites de resolución y los parámetros visuales.
- TechText prepara los glifos al estar disponible su sección y difiere los redimensionados mientras está oculta. El texto HTML permanece accesible y sirve de alternativa sin efecto.
- El contador de carga se actualiza cada 100 ms y se pausa con la pestaña oculta; la barra mantiene su animación continua y el tiempo final se calcula al terminar.
- El filtro Floyd del retrato produce los mismos bytes en siete tamaños probados. Redimensionados repetidos no reconstruyen sus texturas y el cursor exterior deja de activar pasadas del retrato. El carrusel evita invalidarse ante callbacks o progresos idénticos; las partículas no redibujan estados sin cambios.
- En pruebas con GPU sustituida por un registrador, el radar conserva uniforms y contactos durante 60 fotogramas horizonte → cenital, mientras las asignaciones del buffer dinámico pasan de 60 a 1. PatternWaves reutiliza su campo congelado durante la salida, manteniendo los estados de shaders.

## Verificación y límites

Build de producción, TypeScript, ESLint, formato y cinco suites de pruebas permanentes: correctos. El detector Impeccable no encuentra incidencias en el menú y las superficies ajustadas. Comparación de los scripts modernos incluidos en el HTML de producción (excluido `nomodule`): 724.953 → 714.832 bytes; gzip calculado localmente: 224.268 → 220.302 bytes. Incluye el nuevo menú. Son tamaños de artefactos, no una captura de transferencia de red.

Las pruebas permanentes de `portfolio-web/tests/` ejecutan código real de los controladores, con GSAP real y sustitutos explícitos para DOM/canvas/GPU. Comprueban gestos nuevos frente a inercia, saltos directos del menú, entrada y reversa, foco, limpieza, visibilidad y movimiento reducido. No son capturas ni pruebas de píxeles.

La revisión visual y la medición real de FPS/Core Web Vitals siguen pendientes: la herramienta de navegador mantiene una denegación de acceso al origen local. No sortearla mediante otro puerto, hostname o herramienta. Los ahorros de bytes y de operaciones redundantes no se presentan como una medición de velocidad del navegador.

El push de código no constituye un despliegue. No se reactivan los workflows del sitio archivado. El destino de hosting confirmado por el usuario sigue siendo Hostinger; su configuración está pendiente.
