# Sobre mí y contacto

## Dirección confirmada · 22 de octubre de 2026

- Sección personal después de «Mi stack». No repetir proyectos ni convertirla en un currículum.
- Rasgos aportados por Rubén: aprende rápido, se mantiene actualizado —incluida la IA— y está abierto a distintas oportunidades.
- Mantener League Gothic, Amazed y la paleta. Fondo Pebble Mist, texto Sangria y firma Jade.
- Radar de React Bits como fondo bajo y discreto, transparente, Jade y en posición horizonte. El texto mantiene la prioridad.
- El texto publicado está en [About.tsx](../portfolio-web/src/components/sections/About.tsx). No se añaden años de experiencia, empresas, aficiones, resultados ni anécdotas no confirmadas.
- Contacto es la siguiente y última sección, con el giro de horizonte a cenital solicitado. Rubén confirma `ruben.pezuelagarcia@gmail.com` y GitHub [RubyPG](https://github.com/RubyPG). LinkedIn queda pendiente y no se publica un marcador. Fuente única de estos enlaces: [contact.ts](../portfolio-web/src/config/contact.ts).

## Qué conviene transmitir

Asociación buscada: **Rubén → curiosidad, aprendizaje rápido y adaptación**. Esta es una decisión editorial aplicada a lo que ha contado el usuario, no una evaluación psicológica ni una garantía de recuerdo por parte de selección.

| Idea | Cómo incluirla | Qué aporta al lector |
| --- | --- | --- |
| Persona reconocible | Nombre propio y primera persona, con tono natural. | Facilita asociar la página a una persona. |
| Aprendizaje rápido | Decirlo directamente, una vez. | Hace explícito el rasgo que Rubén quiere destacar. |
| Curiosidad y actualización | Hablar de explorar y ampliar conocimientos. | Da continuidad al aprendizaje; evita una lista estática de herramientas. |
| Relación con la IA | Presentarla como parte de su exploración. | Expresa actualidad sin prometer superioridad ni sustituir criterio por una herramienta. |
| Adaptabilidad | Apertura a distintos retos y formas de trabajar. | Comunica flexibilidad sin el ambiguo «me vale cualquier cosa». |
| Identidad coherente | Repetir la firma y los colores; radar en segundo plano. | Ofrece señales visuales consistentes para reconocer el portfolio. |
| Credibilidad | Frases breves, sin superlativos o logros inventados. | Evita que la presentación prometa más de lo que se puede comprobar. |

Una anécdota personal breve y verdadera podría aportar más singularidad en una revisión posterior. No se ha inventado una para rellenar esta sección.

La jerarquía y las frases breves se apoyan en los estudios de lectura y escaneo de [Nielsen Norman Group](https://www.nngroup.com/articles/how-people-read-online/). Las señales coherentes se inspiran en su explicación de [reconocimiento y recuerdo](https://www.nngroup.com/articles/recognition-and-recall/). Aplicar esas observaciones al portfolio es una inferencia de diseño; no son estudios específicos de contratación ni pruebas de que una animación mejore las posibilidades laborales.

## Tipografía de la presentación

El usuario pide una fuente con personalidad para «Soy Rubén. Me gusta seguir descubriendo.», compatible con los títulos y con un gesto próximo a la firma, pero diferente. La propuesta Cormorant Garamond Medium Italic fue **rechazada explícitamente** y se retiró. Tras ver dos opciones, Rubén delega la elección y recalca que el tamaño de la firma debe mantenerse.

Se aplica [Nothing You Could Do 400](https://fonts.google.com/specimen/Nothing+You+Could+Do) únicamente a `.copy .lead`, con espaciado natural. Se conserva la escala anterior de la frase: 28–44 px en escritorio, 28–40 px en móvil y 28 px en paisaje bajo; interlineado 1,2 y medida de 22ch. WOFF2 latino oficial local (16.096 bytes), `font-display: swap`, ruta mediante `assetPath` y [licencia OFL](../portfolio-web/public/fonts/NothingYouCouldDo-OFL.txt), sin precarga adicional en la Hero.

**Firma:** mantener exactamente Amazed y sus reglas originales. Sobre mí usa `clamp(2.75rem, 4vw, 4.5rem)` y giro de −7°; la Hero, `clamp(2rem, 7.2cqw, 5.4rem)` y −9°. Auditoría independiente confirma que esas reglas y el archivo Amazed eran idénticos a `ae8caf2`; este cambio tampoco los toca. La comparativa temporal `_temp/type-options/opciones-tipografia.png` estaba dibujada a otra escala y no representa los tamaños de la web. Cambiar la fuente del párrafo puede cambiar sus saltos y la posición vertical del contenido posterior; no cambia el tamaño de la firma. Mantener League Gothic para los títulos y las animaciones existentes.

Glifos de la frase y español verificados en el archivo, peso real 400 y detector sin hallazgos. Build de producción, TypeScript y ESLint correctos; archivo de layout formateado. Rubén aprueba visualmente esta alternativa y solicita subirla a GitHub. La revisión visual independiente sigue limitada por la restricción guardada del navegador local. Publicación mediante el workflow de `main`.

## Transición y alternativas

**Implementada el 22 de octubre tras descartar la curva:** paso de página lateral. El stack se retira un 16 % hacia la izquierda mientras el papel Pebble de «Sobre mí» entra desde el borde derecho hasta cubrirlo. Ambos usan el mismo reloj y `power3.inOut` durante 1,08 s, permanecen opacos y se solapan; el carrusel inferior nunca queda expuesto entre ellos. El título y el cuerpo llegan juntos, con una diferencia de desplazamiento limitada al 5 % del ancho y un máximo de 64 px. No hay inclinación, escala, desenfoque ni fundido del texto. El radar permanece asentado respecto al papel, sin entrada propia; su giro posterior hacia contacto sigue independiente. El regreso recorre la misma animación y conserva la posición de lectura del stack. Un gesto nuevo al final de su scroll, o el enlace «Sobre mí», abre la sección; no se alarga el recorrido físico de scroll. Con movimiento reducido se mantiene el flujo natural, sin estos efectos.

La apertura inicial desde una línea y el refinamiento posterior con elipsis, perspectiva y desenfoque quedan sustituidos por esta versión. El usuario confirmó que el tramo a revisar era «Mi stack → Sobre mí».

Alternativas para valorar, sin implementar:

- **Pliegue editorial:** una lámina se dobla y descubre el contenido. Más teatral; exige cuidar el texto durante la perspectiva.
- **Barrido de radar:** la luz revela el contenido por zonas. Más ligado al fondo; puede competir con la lectura si se aplica a cada frase.

**Implementado hacia contacto:** un único Radar persiste como hermano de ambos planos de contenido. La cámara gira de 64° a 0°, sube del centro vertical 0,94 a 0,5 y cambia su escala de 1,3 a 0,92 para dejar las marcas del círculo dentro del encuadre cenital. Duración: 1,25 s, con `power2.inOut`. Los textos salen hacia arriba y se inclinan; «HABLEMOS», correo y GitHub entran desde abajo hasta quedar planos. Cámara, desplazamiento, escala, opacidad y máscara superior derivan del mismo progreso en [contact-transition.ts](../portfolio-web/src/lib/contact-transition.ts); la reversa recorre exactamente los mismos valores. La geometría del horizonte se recalibra al compartir un canvas de altura completa.

La transición se inicia con un gesto nuevo al final del scroll de «Sobre mí» o su enlace «Hablemos». En contacto, subir desde el inicio o usar «Volver a sobre mí» invierte el giro y recupera la posición de lectura previa. Durante la transición se bloquean gestos nuevos y no se encolan; foco y controles solo se activan al terminar. El hash inicial `#contacto` restaura cámara y contenido final. Sin animación, ambas secciones siguen el flujo del documento y el radar estático queda detrás de contacto. El fondo se pausa fuera de la zona personal; no se reinicia al cambiar entre ambos planos.

[Contact.tsx](../portfolio-web/src/components/sections/Contact.tsx) mantiene título, texto y enlaces reales separados del canvas. League Gothic y la paleta se conservan; los enlaces tienen objetivos de 44 px, el correo admite saltos y las pantallas bajas utilizan scroll interior. La decisión inicial de usar solo enlaces queda sustituida por la petición de formulario del 23 de octubre.

## Formulario de contacto

**Petición del 23 de octubre de 2026:** recibir mensajes desde la web, mediante formulario integrado o modal a criterio de diseño. Se elige integrado para evitar un paso extra: presentación y enlaces a la izquierda, formulario a la derecha desde 900 px; debajo en pantallas menores. Conserva League Gothic, Sangria/Pebble/Jade y el giro del radar. La firma no cambia.

- [ContactForm.tsx](../portfolio-web/src/components/ui/ContactForm.tsx): nombre, correo y mensaje con etiquetas persistentes, autocompletado y foco visible. Estados de envío, éxito y error anunciados; conserva el texto ante fallos, impide duplicados mientras hay una solicitud y no reintenta automáticamente. Una respuesta tardía no roba el foco si el visitante ha salido del formulario.
- [contact-form.ts](../portfolio-web/src/lib/contact-form.ts): validación de vacíos y límites, conexión AJAX preparada para Formspree y éxito solo tras respuesta confirmada. La petición utiliza HTTPS y JSON, sin credenciales del navegador. El campo oculto `_gotcha` queda preparado para el filtro del servicio; la validación cliente no sustituye controles del proveedor.
- El contrato de respuesta se comprobó en el [cliente oficial de Formspree](https://github.com/formspree/formspree-js/blob/main/packages/formspree-core/src/submission.ts): reconoce `{ next: string }` como éxito. El helper admite ese contrato y `{ ok: true }`, siempre con HTTP correcto y sin errores. Los rechazos de verificación conservan el mensaje, muestran aviso y no repiten la petición ni redirigen automáticamente.
- Rueda y tacto iniciados en un campo editable conservan el control durante ese gesto; no vuelven a Sobre mí al alcanzar un borde del mensaje. El bloqueo durante las animaciones conserva prioridad. El textarea contiene su scroll y admite redimensionado vertical. La transición y el canvas no se modifican.
- No hay PHP, backend propio ni nuevas dependencias. GitHub Pages sirve la exportación estática y Formspree gestionará el envío. Hostinger no se usará como alojamiento ni SMTP; disponer del dominio `sepharim.eu` no cambia esa decisión.

**Decisión del 23 de octubre: GitHub Pages + Formspree.** Rubén creó el formulario y facilitó `https://formspree.io/f/myeeyrzo`. Su ID público está conectado mediante [contact.ts](../portfolio-web/src/config/contact.ts), compartido por desarrollo y la exportación de Pages; el botón de envío queda habilitado. No es una credencial: no necesita `.env.local` ni variables de GitHub. Se conserva el componente React y su transporte AJAX, adaptados al diseño existente, sin añadir dependencias. Publicado en GitHub Pages por petición de Rubén; la entrega al destinatario aún no se ha comprobado.

Comprobaciones pendientes del servicio:

1. Comprobar una entrega real desde la web al correo confirmado de Rubén. La creación del formulario no acredita que la notificación llegue; por ahora solo se han simulado respuestas y no se ha enviado correo real.
2. Confirmar protección anti-spam y compatibilidad con AJAX. Si el formulario exige un CAPTCHA propio, conectar su clave pública antes de publicar. No se ha accedido al panel de Formspree ni cambiado su configuración externa; no desactivar protecciones para evitar una integración.

Referencias: [Formspree AJAX](https://help.formspree.io/articles/building-your-form/submit-forms-with-javascript-ajax), [reCAPTCHA](https://help.formspree.io/articles/form-and-project-settings/recaptcha-settings) y [honeypot](https://help.formspree.io/articles/building-your-form/honeypot-spam-filtering). La revisión interactiva local sigue pendiente por la restricción de acceso documentada abajo.

**Comprobado tras conectar el ID:** build estático con `/Portfolio-Web`, 51 recursos exportados resueltos, TypeScript, ESLint y formato de los archivos ajustados. HTML exportado con el endpoint exacto, método POST, botón habilitado y `noindex, follow`. Las 14 pruebas pasan: nueve de validación/transporte con `fetch` simulado, más las cinco suites existentes; la suite de gestos incorpora rueda/touch y teclado sobre un textarea. El detector de diseño de la revisión anterior no encontró incidencias; esta conexión no cambia estilos. No se ha comprobado entrega real ni interacción visual en navegador.

**Publicación comprobada el 23 de octubre a las 20:07 UTC:** `main` incorpora `b235411` (carpetas de capturas) y `4afa68f` (formulario y noindex). El [workflow de este último commit](https://github.com/RubyPG/Portfolio-Web/actions/runs/40016405716) completó build y deploy con éxito. La [web pública](https://rubypg.github.io/Portfolio-Web/) responde HTTP 200 con el endpoint indicado, POST, botón habilitado y `noindex, follow`; sus 11 recursos Next.js referenciados también responden 200. No se han enviado mensajes de prueba ni cambiado DNS o ajustes de Formspree.

## Dominio y visibilidad

**Decisiones de Rubén del 23 de octubre y estado de implementación:**

- Mantener el portfolio en GitHub Pages y configurar `ruben.sepharim.eu`, con `noindex`. DNS y dominio personalizado de Pages siguen sin configurar.
- Mantener `sepharim.eu` público e indexable, sin enlace al portfolio desde la raíz.
- Permitir acceder por enlace al portfolio y a las páginas legales de Sophos, evitando que aparezcan en buscadores.

`noindex, follow` está configurado en [layout.tsx](../portfolio-web/src/app/layout.tsx) y comprobado como meta `robots` tanto en la exportación local como en la web pública de GitHub Pages. Build estático y TypeScript correctos; `verify:export` comprueba 51 recursos. DNS y dominio personalizado de Pages siguen pendientes. Excluir esas superficies de sitemaps y enlaces públicos de descubrimiento es la propuesta complementaria; no se bloqueará en `robots.txt` el rastreo necesario para leer `noindex`.

**Límite:** `noindex` y la ausencia de enlaces no son autenticación ni garantizan secreto. Quien conozca o reciba una URL podrá acceder; si se necesitara acceso privado, haría falta un control de acceso distinto. La raíz pública debe conservar su indexabilidad.

Las páginas legales de Sophos están fuera de este proyecto: no se han inspeccionado ni modificado. Antes de actuar se necesitan sus rutas y acceso al proyecto o servicio correspondiente. GitHub Pages y Formspree son los proveedores elegidos para el portfolio y su formulario; no se necesita configurar alojamiento ni SMTP en Hostinger.

## Verificación

Build, TypeScript, ESLint y Prettier correctos; detector Impeccable sin hallazgos en la nueva superficie. Revisión independiente de la navegación y prueba con GSAP real sobre objetos: construcción de timelines sin callbacks prematuros, reversa que restaura el stack y conservación de progreso al redimensionar. Eventos simulados de rueda, teclado y tacto comprueban que llegar al borde con el mismo gesto no abre la siguiente sección y que las ráfagas no encadenan transiciones. No son pruebas interactivas de navegador.

Para contacto se ejecutó el controlador real extraído de `LandingStory.tsx` con GSAP y sustitutos de DOM: About ↔ Contact ↔ Stack, bloqueo durante movimiento, hash inicial, foco, redimensionado intermedio y limpieza al volver al flujo natural. Las pruebas de gestos usan el callback real de enrutamiento y eventos simulados. La auditoría corrigió acumulación de tweens por fotograma mediante `quickSetter` y cambió a Sangria el foco sobre fondo Pebble. Estas comprobaciones no validan píxeles ni WebGL.

El paso lateral Stack → About comprueba además la restauración de las posiciones, el solapamiento continuo de los dos papeles durante tres ciclos, ausencia de transformación propia del radar, reversa idéntica, redimensionado de escritorio a 390 px a mitad del recorrido y conservación de la posición de lectura al regresar. El cleanup recupera la posición natural de la zona personal. Auditoría independiente de integración sin bloqueadores.

Radar conserva los ocho bloques GLSL del componente oficial. Limita resolución y frecuencia, se pausa cuando la sección queda oculta o la pestaña está en segundo plano y dibuja estático con movimiento reducido. Sin WebGL, el contenido personal permanece disponible. Se conserva [la licencia original](../portfolio-web/src/components/ui/LICENSE-react-bits.md) y la [procedencia del componente](https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/Radar/Radar.tsx).

La revisión interactiva y el render WebGL siguen pendientes por la denegación guardada del navegador sobre el origen local. No usar capturas antiguas como prueba del resultado actual.
