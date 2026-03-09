# RubÃ©nPG â€” Personal Portfolio ðŸš€

![Astro](https://img.shields.io/badge/astro-%232C2052.svg?style=for-the-badge&logo=astro&logoColor=white) 
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) 
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

Mi portfolio personal como **Full Stack Developer & CTO**. Construido desde cero para ser estÃ¡tico, rÃ¡pido, escalable y con un diseÃ±o moderno enfocado en la conversiÃ³n y presentaciÃ³n de servicios/proyectos.

## ðŸŒŸ CaracterÃ­sticas Destacadas

- **EstÃ©tica Premium:** UI/UX de alto nivel con glassmorphism, efectos de iluminaciÃ³n dinÃ¡mica, tipografÃ­a moderna (Inter) y un sistema de movimiento consistente (`motion-system`) sobre Tailwind CSS v4.
- **Interactividad 3D:** IntegraciÃ³n fluida de fondos y elementos interactivos mediante OGL, Three.js y canvas custom (Prism, Ballpit, LetterGlitch) para una experiencia "Wowed".
- **Totalmente BilingÃ¼e (i18n):** Soporte nativo multi-idioma con rutas limpias y cambio de idioma instantÃ¡neo.
- **Rendimiento Extremo:** OptimizaciÃ³n de carga mediante Astro v5, lazy loading inteligente y mÃ©tricas Core Web Vitals en mente.
- **Arquitectura Escalable:** Tipado estricto con TypeScript, colecciones de contenido para Case Studies y gestiÃ³n centralizada de iconos tecnolÃ³gicos.

## ðŸ’» Tech Stack

- **Core:** [Astro v5](https://astro.build/) (Static/SSR)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Interaction:** [React](https://react.dev/) + [Framer Motion](https://www.framer.com/motion/)
- **3D / Graphics:** [OGL](https://oframe.github.io/ogl/) + [Three.js](https://threejs.org/)
- **Automation Integration:** [n8n](https://n8n.io/)
- **Data & Auth:** [Supabase](https://supabase.com/)

## ðŸš€ InstalaciÃ³n y Desarrollo Local

1. Clona el repositorio e instala las dependencias:
   ```bash
   pnpm install
   ```

2. Arranca el servidor de desarrollo en `http://localhost:4321`:
   ```bash
   pnpm dev
   ```

3. Construye para producciÃ³n (generarÃ¡ la carpeta `./dist/`):
   ```bash
   pnpm build
   ```

4. Si en desarrollo `Prism` deja de hidratar o Vite muestra errores tipo `Outdated Optimize Dep` con `ogl`, reinicia `pnpm dev` para forzar el re-optimize de dependencias.

## Notas UI recientes

- SkyBanner en /sobre-mi:
  - desktop con efecto 3D por raton
  - movil con efecto 3D por scroll
- BackgroundBeamsWithCollision:
  - mantiene estilo tech y colision inferior
  - caida ajustada para sensacion mas organica tipo lluvia
- En desktop se elimino el blur/sombreado extra del bloque de texto del hero de /sobre-mi.
## ðŸ“– DocumentaciÃ³n Completa
Para detalles especÃ­ficos sobre la arquitectura de carpetas, cÃ³mo agregar nuevos proyectos o cambiar el copy, consulta el archivo completo:
âž¡ï¸ [DOCUMENTACION.md](./DOCUMENTACION.md)

---
*Desarrollado con â¤ï¸ y mucho cÃ³digo limpio por **RubÃ©n Pezuela GarcÃ­a**.*

