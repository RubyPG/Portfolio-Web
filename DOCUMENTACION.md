# Portfolio RPG â€” DocumentaciÃ³n

# Portfolio RPG â€” DocumentaciÃ³n

## ðŸŽ¯ Objetivo

Portfolio personal de **RubÃ©n Pezuela GarcÃ­a** (RubÃ©nPG) â€” Programador Full Stack. Sitio estÃ¡tico, rÃ¡pido, limpio, accesible, SEO-friendly y fÃ¡cil de mantener.

---

## ðŸ› ï¸ Stack

| TecnologÃ­a | VersiÃ³n | Uso |
|---|---|---|
| Astro | v5 | Framework principal (SSR/Static) |
| Tailwind CSS | v4 | Estilos con design tokens y JIT |
| TypeScript | strict | Tipado estricto en toda la app |
| React | v19 | Componentes interactivos (Prism, Ballpit, Glitch) |
| OGL / Three.js / GSAP | latest | Animaciones 3D, fondos WebGL y partÃ­culas interactivas |
| Framer Motion | latest | OrquestaciÃ³n de animaciones UI |

**Features destacadas:**
- ðŸŒ **Soporte Multi-idioma (ES/EN):** Sistema integrado de i18n con rutas traducidas.
- ðŸŽ¨ **EstÃ©tica Premium:** Glassmorphism, efectos de brillo dinÃ¡micos, tipografÃ­a moderna (Inter) y paleta de colores vibrante.
- âš¡ **Performance 100/100:** Carga optimizada, lazy-loading de componentes pesados y renderizado hÃ­brido.
- ðŸ•¹ï¸ **Interactividad 3D:** Experiencias inmersivas con *Prism*, *Ballpit* y *LetterGlitch* distribuidas por toda la web.
- ðŸ› ï¸ **Sistema de Movimiento:** Micro-interacciones consistentes mediante clases `motion-*` en CSS.
- ðŸ“œ **Scroll Custom:** Scrollbar minimalista, moderno y reactivo al hover.
- ðŸ“¦ **SVG Centralizado:** GestiÃ³n de iconos tecnolÃ³gicos mediante `tech-icons.ts`.

---

## Cambios recientes (UI/animacion)

- SkyBanner (src/SkyBanner/SkyBanner.tsx)
  - Desktop: efecto 3D controlado por puntero.
  - Movil/tactil: efecto 3D controlado por scroll.
  - prefers-reduced-motion: animacion desactivada.

- Hero de sobre-mi (ES/EN)
  - En movil se mantiene card para mejorar legibilidad del texto sobre el fondo.
  - En desktop se elimina el sombreado/blur extra del bloque de texto.
  - Archivos: src/pages/sobre-mi.astro y src/pages/en/sobre-mi.astro.

- BackgroundBeamsWithCollision (src/components/BackgroundBeamsWithCollision.tsx)
  - Se mantiene estilo tech y colision/explosion inferior.
  - Se ajusta la caida para sensacion mas organica (tipo lluvia) y menos patron por rafagas.

---
## ðŸ“œ Scripts
```bash
# Desarrollo local
pnpm dev

# Build estÃ¡tico
pnpm build

# Preview del build
pnpm preview

# Type check
pnpm astro check
```

---

## ðŸ“ Estructura de carpetas

```
.
â”œâ”€ public/
â”‚  â”œâ”€ me.jpg                              # Tu foto de perfil
â”‚  â”œâ”€ cv.pdf                              # Tu CV en PDF
â”‚  â”œâ”€ favicon.svg / favicon.ico           # Favicons
â”‚  â””â”€ projects/
â”‚     â”œâ”€ loops-grooves/thumb.jpg          # (Nota: carpeta pÃºblica mantiene nombre original)
â”‚     â”œâ”€ icreategroup-web/thumb.jpg
â”‚     â”œâ”€ icreategroup-automation/thumb.png
â”‚     â””â”€ iservices-crm/thumb.png
â”œâ”€ src/
â”‚  â”œâ”€ components/
â”‚  â”‚  â”œâ”€ layout/                          # Navbar, Footer, LanguageSwitcher, MotionControllers
â”‚  â”‚  â”œâ”€ ui/                              # Elementos bÃ¡sicos (Button, Badge, Container...)
â”‚  â”‚  â”œâ”€ projects/                        # ProjectCard, ProjectGrid
â”‚  â”‚  â””â”€ home/                            # ValuePropsBand, LogoLoops, Hero components
â”‚  â”œâ”€ content/
â”‚  â”‚  â””â”€ cases/                           # Markdown: loops-n-grooves.md, etc.
â”‚  â”œâ”€ data/
â”‚  â”‚  â”œâ”€ site.ts                          # ConfiguraciÃ³n global, SEO, Socials
â”‚  â”‚  â”œâ”€ projects.ts                      # Listado de proyectos (tipado)
â”‚  â”‚  â”œâ”€ skills.ts                        # CategorÃ­as de skills e iconos locales
â”‚  â”‚  â”œâ”€ tech-icons.ts                    # Diccionario central de logos SVG/URL
â”‚  â”‚  â””â”€ project-tech-logos.ts            # Generador aut. de logos para el marquee
â”‚  â”œâ”€ layouts/
â”‚  â”‚  â”œâ”€ BaseLayout.astro                 # Layout base (SEO, navbar, footer)
â”‚  â”‚  â””â”€ CaseLayout.astro                # Layout para case studies
â”‚  â”œâ”€ pages/
â”‚  â”‚  â”œâ”€ en/                              # PÃ¡ginas en inglÃ©s
â”‚  â”‚  â”‚  â”œâ”€ index.astro                   # Home (EN)
â”‚  â”‚  â”‚  â”œâ”€ proyectos/index.astro         # Projects (EN)
â”‚  â”‚  â”‚  â”œâ”€ sobre-mi.astro                # About (EN)
â”‚  â”‚  â”‚  â””â”€ contacto.astro                # Contact (EN)
â”‚  â”‚  â”œâ”€ index.astro                      # Inicio (ES)
â”‚  â”‚  â”œâ”€ proyectos/index.astro            # Lista de proyectos con filtro (ES)
â”‚  â”‚  â”œâ”€ sobre-mi.astro                   # Sobre mÃ­ (ES)
â”‚  â”‚  â”œâ”€ contacto.astro                   # Contacto (ES)
â”‚  â”‚  â””â”€ cases/[slug].astro              # Case studies dinÃ¡micos
â”‚  â”œâ”€ styles/
â”‚  â”‚  â”œâ”€ globals.css                      # Tailwind + estilos globales
â”‚  â”‚  â””â”€ theme.css                        # CSS variables (design tokens)
â”‚  â””â”€ content.config.ts                   # Schema de Content Collections
â”œâ”€ astro.config.mjs
â”œâ”€ package.json
â”œâ”€ tsconfig.json
â””â”€ DOCUMENTACION.md                       # Este archivo
```

---

## âœï¸ CÃ³mo editar contenido

### ðŸŽ¨ CTAs y contraste

- Los botones primarios usan el componente `src/components/ui/Button.astro`.
- Si el fondo del CTA es `bg-accent` (amarillo), el texto e iconos deben ir en `text-bg-deep` para mantener contraste legible.
- Evita crear CTAs amarillos con texto claro fuera del componente base; si hace falta un botÃ³n nuevo, reutiliza `Button` antes de aplicar clases manuales.

### Datos de perfil (`src/data/site.ts`)

Edita nombre, rol, contacto, redes sociales y SEO en un solo archivo:

```ts
export const site: SiteData = {
  name: 'Tu Nombre',
  shortName: 'TuMarca',
  role: 'Tu Rol',
  subtitle: 'Astro/Tailwind, Supabase/PostgreSQL, Kotlin Compose, n8n',
  // ...
};
```

### Skills (`src/data/skills.ts`)

AÃ±ade, edita o reorganiza habilidades por categorÃ­a:

```ts
export const skillCategories: SkillCategory[] = [
  {
    title: 'Web',
    icon: 'ðŸŒ',
    skills: [
      { name: 'Astro', level: 'advanced' },
      // AÃ±ade mÃ¡s skills aquÃ­
    ],
  },
  {
    title: 'Desktop',
    icon: 'ðŸ–¥ï¸',
    skills: [
      { name: 'Java', level: 'advanced' },
      { name: 'Kotlin', level: 'advanced' },
      { name: 'Compose Multiplatform', level: 'advanced' },
      { name: 'Maven/Gradle', level: 'intermediate' },
    ],
  },
  // MÃ¡s categorÃ­as...
];
```

### Proyectos (`src/data/projects.ts`)

Cada proyecto tiene tipado estricto. Edita o aÃ±ade entradas:

```ts
{
  slug: 'mi-proyecto',
  title: 'Mi Proyecto',
  shortDescription: 'DescripciÃ³n breve...',
  // ... todos los campos son obligatorios
  featured: true, // true para mostrar en la home
}
```

### Cases (`src/content/cases/*.md`)

Cada case es un archivo Markdown con frontmatter YAML:

```md
---
caseSlug: "mi-proyecto"
title: "TÃ­tulo del Case"
summary: "Resumen..."
type: "Web"
year: "2025"
status: "En curso"
role: "Mi rol"
stack:
  - "Astro"
  - "Tailwind"
tags:
  - "Web"
  - "React"
cover: "/projects/mi-proyecto/thumb.jpg"
links:
  repo: "https://github.com/..."
  demo: null
  docs: null
---

## Contexto
...

## Problema
...

## SoluciÃ³n
...
```

---

## ðŸ–¼ï¸ CÃ³mo aÃ±adir imÃ¡genes

### Foto de perfil
1. Reemplaza `public/me.jpg` con tu foto real
2. Recomendado: mÃ­nimo 512x512px, formato JPG/WebP

### Miniaturas de proyecto
1. Crea la miniatura en formato 16:9 (ej: 1280x720px)
2. ColÃ³cala en `public/projects/<slug>/thumb.jpg`
3. TambiÃ©n puedes aÃ±adir capturas: `public/projects/<slug>/screenshot-01.jpg`

### CV
1. Reemplaza `public/cv.pdf` con tu CV real

---

## âž• CÃ³mo aÃ±adir un nuevo proyecto (paso a paso)

### 1. AÃ±adir datos del proyecto
Edita `src/data/projects.ts` y aÃ±ade una nueva entrada al array `projects`:

```ts
{
  slug: 'nuevo-proyecto',
  title: 'Nuevo Proyecto',
  shortDescription: 'DescripciÃ³n corta...',
  longSummary: 'DescripciÃ³n larga...',
  year: '2026',
  status: 'En curso',
  type: 'Web', // Web | E-commerce | SaaS/CRM | AutomatizaciÃ³n | Infra/DevOps | Desktop
  role: 'Mi rol',
  stack: ['Astro', 'Tailwind'],
  highlights: ['Feature 1', 'Feature 2'],
  links: { repo: null, demo: null, docs: null },
  casePath: '/cases/nuevo-proyecto',
  thumbnail: '/projects/nuevo-proyecto/thumb.jpg',
  featured: false,
}
```

### 2. Crear el case study
Crea `src/content/cases/nuevo-proyecto.md` usando el frontmatter actualizado (ver secciÃ³n Cases arriba):
- AsegÃºrate de incluir `caseSlug: "nuevo-proyecto"`
- Define `type`, `status`, `stack`, `tags`, etc.
- Usa `cover` para la imagen principal (en lugar de `gallery`).
- AÃ±ade las secciones de contenido: Contexto, Problema, SoluciÃ³n...

### 3. AÃ±adir miniatura
Crea `public/projects/nuevo-proyecto/thumb.jpg` (16:9, ej: 1280x720)

### 4. Verificar
```bash
pnpm dev
```
Navega a `/proyectos` y comprueba que aparece la card.

---

## Desarrollo local: incidencias conocidas

- `Prism` usa `ogl` y el proyecto fuerza su prebundle en `astro.config.mjs`.
- Si en local aparece un error de Vite tipo `Outdated Optimize Dep` o falla la hidrataciÃ³n de `Prism`, reinicia `pnpm dev` para regenerar las dependencias optimizadas.
- En `/contacto`, `Ballpit` ya limita la captura tÃ¡ctil a su propio canvas para no bloquear la navbar mÃ³vil ni los enlaces del footer.

---

## âœ… Checklist de calidad

### SEO
- [x] Title tag por pÃ¡gina
- [x] Meta description por pÃ¡gina
- [x] Open Graph tags
- [x] Canonical URLs
- [x] Heading hierarchy (1 H1 por pÃ¡gina)
- [x] Semantic HTML
- [ ] Sitemap (TODO: aÃ±adir `@astrojs/sitemap`)

### Accesibilidad
- [x] Focus visible en todos los elementos interactivos
- [x] Contraste de colores correcto
- [x] NavegaciÃ³n por teclado
- [x] aria-labels donde aplica
- [x] Alt text en imÃ¡genes

### Performance & UX
- [x] Static / Hybrid output (Astro v5)
- [x] Lazy loading de componentes 3D e imÃ¡genes
- [x] Motion System optimizado (transformaciones 3D por hardware)
- [x] Scrollbar personalizado moderno
- [x] MÃ­nimo Cumulative Layout Shift (CLS)
- [x] SVG inlining para iconos crÃ­ticos
- [x] Font display swap (Inter)

---

## ðŸ”— TODOs

- [x] Soporte bÃ¡sico multi-idioma (ES/EN)
- [ ] Actualizar URL de LinkedIn en `src/data/site.ts`
- [ ] Subir foto real a `public/me.jpg` o actualizar ruta de foto.
- [ ] Subir CV a `public/cv.pdf`
- [ ] Subir miniaturas reales a `public/projects/*/thumb.jpg`
- [ ] Subir capturas de proyectos
- [ ] Instalar `@astrojs/sitemap` y configurar
- [ ] Crear imagen OG (`public/og-image.jpg`)
- [ ] Opcional: Integrar correo mediante APIs backend en lugar de link `mailto:` del front.
- [ ] Actualizar dominio real en `astro.config.mjs` y `src/data/site.ts`

