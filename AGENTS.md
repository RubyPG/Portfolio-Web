# Portfolio · normas del proyecto

## Contexto y comunicación

- Responder en español, de forma breve, directa y útil. Si hay un enfoque claramente mejor, explicarlo antes de continuar y aplicarlo salvo que falte una decisión importante del usuario.
- Al empezar, leer [README.md](README.md) y consultar únicamente la documentación relevante de `portfolio-vault/` y el código afectado.
- Distinguir decisiones confirmadas, propuestas y material histórico. Las instrucciones nuevas y explícitas del usuario prevalecen sobre decisiones anteriores.
- Este archivo es la fuente común de normas. `CLAUDE.md` lo importa o remite a él; no mantener dos copias de las instrucciones.
- El contexto escrito se comparte entre asistentes; los chats, permisos, conexiones y herramientas no se transfieren por estos archivos. Comprobar el acceso disponible en cada sesión.

## Ámbito y organización

- Contenedor canónico: `D:\Dev\src\RPG\10_Projects\Portfolio`. Mantener aquí todo el contenido propio de este proyecto.
- `portfolio-web/`: código de la web activa, dependencias, pruebas, configuración y documentación técnica junto al código cuando exista.
- `portfolio-vault/`: decisiones, planificación, referencias y contexto de desarrollo. No es una dependencia de la web ni exige Obsidian.
- `_archive/Portfolio viejo/`: versión anterior conservada como referencia. No modificarla, instalar dependencias dentro de ella ni reactivar sus despliegues salvo petición explícita.
- `_temp/`: auxiliares y resultados temporales del proyecto. No guardar aquí la única copia de trabajo importante.
- No modificar otros proyectos ni la organización general de `D:\Dev` como efecto lateral. Los recursos externos se consultan solo cuando la tarea lo necesite y el acceso esté disponible.
- No crear carpetas o documentos vacíos por previsión. Mantener una fuente por tema y enlazarla desde el README.

## Desarrollo y archivo anterior

- La nueva web se construye en `portfolio-web/`. No confundir el código archivado con la implementación activa.
- El framework, diseño, contenido y despliegue del portfolio antiguo no son decisiones confirmadas para el nuevo. Consultar el estado y pendientes del README antes de elegirlos.
- Reutilizar piezas del archivo solo cuando encajen en la tarea; comprobar su código y dependencias. No copiar en bloque configuraciones, secretos, historial Git, dependencias instaladas o resultados compilados.
- Los documentos y referencias del archivo sirven como consulta, no como instrucciones operativas del proyecto nuevo. Verificar textos profesionales, fechas, proyectos, enlaces y datos antes de publicarlos; no inventar experiencia ni resultados.
- Priorizar soluciones simples y mantenibles. En la web, comprobar adaptación móvil y escritorio, navegación por teclado, contraste y movimiento reducido cuando corresponda.
- Ejecutar comandos desde la carpeta de la aplicación activa y según su configuración real. No presentar los comandos del archivo como comandos del proyecto nuevo.
- Conservar cambios del usuario y archivos personales. No incluir secretos, credenciales ni información privada en documentación o Git.
- Antes de inicializar Git, comprobar la raíz y excluir del repositorio nuevo `_archive/`, `_temp/`, dependencias, resultados generados y secretos. El archivo contiene un repositorio propio: no incorporarlo accidentalmente como repositorio anidado ni borrar su historial.

## Verificación y relevo

- Tras cambios de código, ejecutar las comprobaciones pertinentes que existan y comunicar sus resultados reales. Para documentación, comprobar rutas, enlaces y coherencia; no hace falta instalar ni compilar la web archivada.
- Al terminar un cambio relevante, actualizar el estado y siguiente paso del README. Documentar decisiones o planes amplios en `portfolio-vault/` y enlazarlos, sin duplicar su contenido.
- Si el relevo crece, mantenerlo en un documento de contexto dentro de `portfolio-vault/` y enlazarlo desde el README. No convertir las normas en un diario ni copiar conversaciones completas.
- Al alternar asistentes, releer los archivos actuales antes de editar. Evitar ediciones simultáneas sobre los mismos archivos.
