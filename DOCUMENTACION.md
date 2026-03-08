# Portfolio RPG — Documentación

# Portfolio RPG — Documentación

## 🎯 Objetivo

Portfolio personal de **Rubén Pezuela García** (RubénPG) — Programador Full Stack. Sitio estático, rápido, limpio, accesible, SEO-friendly y fácil de mantener.

---

## 🛠️ Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Astro | v5 | Framework principal (SSR/Static) |
| Tailwind CSS | v4 | Estilos con design tokens y JIT |
| TypeScript | strict | Tipado estricto en toda la app |
| React | v18 | Componentes interactivos (Prism, Ballpit, Glitch) |
| Three.js / GSAP | latest | Animaciones 3D y partículas interactivas |
| Framer Motion | latest | Orquestación de animaciones UI |

**Features destacadas:**
- 🌍 **Soporte Multi-idioma (ES/EN):** Sistema integrado de i18n con rutas traducidas.
- 🎨 **Estética Premium:** Glassmorphism, efectos de brillo dinámicos, tipografía moderna (Inter) y paleta de colores vibrante.
- ⚡ **Performance 100/100:** Carga optimizada, lazy-loading de componentes pesados y renderizado híbrido.
- 🕹️ **Interactividad 3D:** Experiencias inmersivas con *Prism*, *Ballpit* y *LetterGlitch* distribuidas por toda la web.
- 🛠️ **Sistema de Movimiento:** Micro-interacciones consistentes mediante clases `motion-*` en CSS.
- 📜 **Scroll Custom:** Scrollbar minimalista, moderno y reactivo al hover.
- 📦 **SVG Centralizado:** Gestión de iconos tecnológicos mediante `tech-icons.ts`.

---

## 📜 Scripts
```bash
# Desarrollo local
npm run dev

# Build estático
npm run build

# Preview del build
npm run preview

# Type check
npx astro check
```

---

## 📁 Estructura de carpetas

```
.
├─ public/
│  ├─ me.jpg                              # Tu foto de perfil
│  ├─ cv.pdf                              # Tu CV en PDF
│  ├─ favicon.svg / favicon.ico           # Favicons
│  └─ projects/
│     ├─ loops-grooves/thumb.jpg          # (Nota: carpeta pública mantiene nombre original)
│     ├─ icreategroup-web/thumb.jpg
│     ├─ icreategroup-automation/thumb.png
│     └─ iservices-crm/thumb.png
├─ src/
│  ├─ components/
│  │  ├─ layout/                          # Navbar, Footer, LanguageSwitcher, MotionControllers
│  │  ├─ ui/                              # Elementos básicos (Button, Badge, Container...)
│  │  ├─ projects/                        # ProjectCard, ProjectGrid
│  │  └─ home/                            # ValuePropsBand, LogoLoops, Hero components
│  ├─ content/
│  │  └─ cases/                           # Markdown: loops-n-grooves.md, etc.
│  ├─ data/
│  │  ├─ site.ts                          # Configuración global, SEO, Socials
│  │  ├─ projects.ts                      # Listado de proyectos (tipado)
│  │  ├─ skills.ts                        # Categorías de skills e iconos locales
│  │  ├─ tech-icons.ts                    # Diccionario central de logos SVG/URL
│  │  └─ project-tech-logos.ts            # Generador aut. de logos para el marquee
│  ├─ layouts/
│  │  ├─ BaseLayout.astro                 # Layout base (SEO, navbar, footer)
│  │  └─ CaseLayout.astro                # Layout para case studies
│  ├─ pages/
│  │  ├─ en/                              # Páginas en inglés
│  │  │  ├─ index.astro                   # Home (EN)
│  │  │  ├─ proyectos/index.astro         # Projects (EN)
│  │  │  ├─ sobre-mi.astro                # About (EN)
│  │  │  └─ contacto.astro                # Contact (EN)
│  │  ├─ index.astro                      # Inicio (ES)
│  │  ├─ proyectos/index.astro            # Lista de proyectos con filtro (ES)
│  │  ├─ sobre-mi.astro                   # Sobre mí (ES)
│  │  ├─ contacto.astro                   # Contacto (ES)
│  │  └─ cases/[slug].astro              # Case studies dinámicos
│  ├─ styles/
│  │  ├─ globals.css                      # Tailwind + estilos globales
│  │  └─ theme.css                        # CSS variables (design tokens)
│  └─ content.config.ts                   # Schema de Content Collections
├─ astro.config.mjs
├─ package.json
├─ tsconfig.json
└─ DOCUMENTACION.md                       # Este archivo
```

---

## ✏️ Cómo editar contenido

### 🎨 CTAs y contraste

- Los botones primarios usan el componente `src/components/ui/Button.astro`.
- Si el fondo del CTA es `bg-accent` (amarillo), el texto e iconos deben ir en `text-bg-deep` para mantener contraste legible.
- Evita crear CTAs amarillos con texto claro fuera del componente base; si hace falta un botón nuevo, reutiliza `Button` antes de aplicar clases manuales.

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

Añade, edita o reorganiza habilidades por categoría:

```ts
export const skillCategories: SkillCategory[] = [
  {
    title: 'Web',
    icon: '🌐',
    skills: [
      { name: 'Astro', level: 'advanced' },
      // Añade más skills aquí
    ],
  },
  {
    title: 'Desktop',
    icon: '🖥️',
    skills: [
      { name: 'Java', level: 'advanced' },
      { name: 'Kotlin', level: 'advanced' },
      { name: 'Compose Multiplatform', level: 'advanced' },
      { name: 'Maven/Gradle', level: 'intermediate' },
    ],
  },
  // Más categorías...
];
```

### Proyectos (`src/data/projects.ts`)

Cada proyecto tiene tipado estricto. Edita o añade entradas:

```ts
{
  slug: 'mi-proyecto',
  title: 'Mi Proyecto',
  shortDescription: 'Descripción breve...',
  // ... todos los campos son obligatorios
  featured: true, // true para mostrar en la home
}
```

### Cases (`src/content/cases/*.md`)

Cada case es un archivo Markdown con frontmatter YAML:

```md
---
caseSlug: "mi-proyecto"
title: "Título del Case"
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

## Solución
...
```

---

## 🖼️ Cómo añadir imágenes

### Foto de perfil
1. Reemplaza `public/me.jpg` con tu foto real
2. Recomendado: mínimo 512x512px, formato JPG/WebP

### Miniaturas de proyecto
1. Crea la miniatura en formato 16:9 (ej: 1280x720px)
2. Colócala en `public/projects/<slug>/thumb.jpg`
3. También puedes añadir capturas: `public/projects/<slug>/screenshot-01.jpg`

### CV
1. Reemplaza `public/cv.pdf` con tu CV real

---

## ➕ Cómo añadir un nuevo proyecto (paso a paso)

### 1. Añadir datos del proyecto
Edita `src/data/projects.ts` y añade una nueva entrada al array `projects`:

```ts
{
  slug: 'nuevo-proyecto',
  title: 'Nuevo Proyecto',
  shortDescription: 'Descripción corta...',
  longSummary: 'Descripción larga...',
  year: '2026',
  status: 'En curso',
  type: 'Web', // Web | E-commerce | SaaS/CRM | Automatización | Infra/DevOps | Desktop
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
Crea `src/content/cases/nuevo-proyecto.md` usando el frontmatter actualizado (ver sección Cases arriba):
- Asegúrate de incluir `caseSlug: "nuevo-proyecto"`
- Define `type`, `status`, `stack`, `tags`, etc.
- Usa `cover` para la imagen principal (en lugar de `gallery`).
- Añade las secciones de contenido: Contexto, Problema, Solución...

### 3. Añadir miniatura
Crea `public/projects/nuevo-proyecto/thumb.jpg` (16:9, ej: 1280x720)

### 4. Verificar
```bash
npm run dev
```
Navega a `/proyectos` y comprueba que aparece la card.

---

## ✅ Checklist de calidad

### SEO
- [x] Title tag por página
- [x] Meta description por página
- [x] Open Graph tags
- [x] Canonical URLs
- [x] Heading hierarchy (1 H1 por página)
- [x] Semantic HTML
- [ ] Sitemap (TODO: añadir `@astrojs/sitemap`)

### Accesibilidad
- [x] Focus visible en todos los elementos interactivos
- [x] Contraste de colores correcto
- [x] Navegación por teclado
- [x] aria-labels donde aplica
- [x] Alt text en imágenes

### Performance & UX
- [x] Static / Hybrid output (Astro v5)
- [x] Lazy loading de componentes 3D e imágenes
- [x] Motion System optimizado (transformaciones 3D por hardware)
- [x] Scrollbar personalizado moderno
- [x] Mínimo Cumulative Layout Shift (CLS)
- [x] SVG inlining para iconos críticos
- [x] Font display swap (Inter)

---

## 🔗 TODOs

- [x] Soporte básico multi-idioma (ES/EN)
- [ ] Actualizar URL de LinkedIn en `src/data/site.ts`
- [ ] Subir foto real a `public/me.jpg` o actualizar ruta de foto.
- [ ] Subir CV a `public/cv.pdf`
- [ ] Subir miniaturas reales a `public/projects/*/thumb.jpg`
- [ ] Subir capturas de proyectos
- [ ] Instalar `@astrojs/sitemap` y configurar
- [ ] Crear imagen OG (`public/og-image.jpg`)
- [ ] Opcional: Integrar correo mediante APIs backend en lugar de link `mailto:` del front.
- [ ] Actualizar dominio real en `astro.config.mjs` y `src/data/site.ts`
