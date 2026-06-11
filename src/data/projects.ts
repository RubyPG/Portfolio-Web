/* Projects data with strict typing.
   Bilingual fields use { es, en }. To publish Archai: set comingSoon to false,
   add a thumbnail and (optionally) a casePath. Nothing else to touch. */

export interface Localized {
    es: string;
    en: string;
}

export interface LocalizedList {
    es: string[];
    en: string[];
}

export interface ProjectLinks {
    repo: string | null;
    demo: string | null;
    docs: string | null;
}

export interface Project {
    slug: string;
    title: string;
    kind: Localized; // e.g. "ERP modular" / "Modular ERP"
    context: Localized; // e.g. "Freelance", "Producto propio"
    tagline: Localized; // one-liner shown in cards
    description: Localized; // longer summary for the showcase row
    year: string;
    status: Localized;
    role: Localized;
    stack: string[];
    highlights: LocalizedList;
    links: ProjectLinks;
    casePath: string | null;
    thumbnail: string | null;
    featured: boolean;
    comingSoon?: boolean;
}

export const projects: Project[] = [
    {
        slug: "archai-erp",
        title: "Archai by Sepharim",
        kind: { es: "ERP modular", en: "Modular ERP" },
        context: { es: "Producto · Sepharim", en: "Product · Sepharim" },
        tagline: {
            es: "ERP web para logística, flota, RRHH y finanzas operativas — módulos activables por licencia, sin forks por cliente.",
            en: "Web ERP for logistics, fleet, HR and operational finance — license-gated modules, no per-client forks.",
        },
        description: {
            es: "ERP modular con Clean Architecture vigilada por lint (una violación de capas es error de build, no de estilo). Cada cliente corre su propia instancia con su Supabase y branding, con multi-empresa interna vía RLS. Routing con mapa, flota con semáforos de vencimiento ITV/seguro, documentos unificados con OCR y un design system propio: tablas con edición inline y undo-redo, scrollbar custom y cursor propio.",
            en: "Modular ERP with lint-enforced Clean Architecture (a layer violation is a build error, not a style nit). Each client runs its own instance with its own Supabase and branding, with internal multi-company isolation via RLS. Routing with maps, fleet with ITV/insurance expiry traffic-lights, unified documents with OCR, and a custom design system: inline-editable tables with undo-redo, custom scrollbar and custom cursor.",
        },
        year: "2025-2026",
        status: { es: "En desarrollo", en: "In development" },
        role: {
            es: "Arquitectura + Full Stack",
            en: "Architecture + Full Stack",
        },
        stack: [
            "React",
            "TypeScript",
            "Vite",
            "TanStack Query",
            "Zustand",
            "Supabase / PostgreSQL",
            "MapLibre GL",
            "Tailwind CSS",
        ],
        highlights: {
            es: [
                "Clean Architecture en 5 capas vigilada con dependency-cruiser",
                "Instancia aislada por cliente + multi-empresa interna con RLS",
                "DataTable genérica con edición inline, undo-redo y toasts",
                "Documentos unificados: bandeja, OCR y visor en una sola pantalla",
                "License gate por suscripción (ACTIVE / TRIAL / EXPIRED)",
            ],
            en: [
                "5-layer Clean Architecture enforced with dependency-cruiser",
                "Isolated instance per client + internal multi-company via RLS",
                "Generic DataTable with inline editing, undo-redo and toasts",
                "Unified documents: inbox, OCR and viewer in a single screen",
                "Subscription license gate (ACTIVE / TRIAL / EXPIRED)",
            ],
        },
        links: { repo: null, demo: null, docs: null },
        casePath: null,
        thumbnail: null,
        featured: true,
        comingSoon: true,
    },
    {
        slug: "gxo-crm",
        title: "CRM Comité GXO",
        kind: { es: "CRM a medida", en: "Custom CRM" },
        context: { es: "Freelance · Cliente", en: "Freelance · Client" },
        tagline: {
            es: "CRM a medida para el Comité de Empresa de GXO: gestión de afiliados, consultas e incidencias en un único flujo.",
            en: "Custom CRM for GXO's Works Council: members, queries and case tracking in a single flow.",
        },
        description: {
            es: "Proyecto freelance en curso para el Comité de Empresa de GXO. Sustituye hojas de cálculo y correo disperso por una herramienta única: registro de afiliados, seguimiento de consultas e incidencias laborales con su historial, y comunicación organizada con los trabajadores. Detalles de cliente bajo confidencialidad.",
            en: "Ongoing freelance project for GXO's Works Council. Replaces scattered spreadsheets and email with a single tool: member registry, tracking of labour queries and cases with full history, and organized communication with employees. Client details under NDA.",
        },
        year: "2026",
        status: { es: "En curso", en: "Ongoing" },
        role: {
            es: "Full Stack — proyecto freelance integral",
            en: "Full Stack — end-to-end freelance project",
        },
        stack: ["TypeScript", "Supabase / PostgreSQL", "n8n"],
        highlights: {
            es: [
                "Cliente real como freelance: alcance, desarrollo y entrega",
                "Gestión de afiliados con historial de consultas e incidencias",
                "Automatización de avisos y comunicaciones con n8n",
                "Datos sensibles: roles y RLS desde el primer día",
            ],
            en: [
                "Real freelance client: scoping, development and delivery",
                "Member management with query and case history",
                "Automated notices and communications with n8n",
                "Sensitive data: roles and RLS from day one",
            ],
        },
        links: { repo: null, demo: null, docs: null },
        casePath: null,
        thumbnail: null,
        featured: true,
    },
    {
        slug: "ilead-crm",
        title: "iLead CRM",
        kind: { es: "CRM Lead-to-Cash", en: "Lead-to-Cash CRM" },
        context: { es: "Producto propio", en: "Own product" },
        tagline: {
            es: "CRM desktop con facturación Stripe, automatizaciones n8n y KPIs embebidos.",
            en: "Desktop CRM with Stripe billing, n8n automations and embedded KPIs.",
        },
        description: {
            es: "Plataforma desktop orientada a operaciones comerciales: leads, clientes, facturación y seguimiento de cobro en un único flujo. Arquitectura modular con Kotlin + Compose, capa de datos en Supabase/PostgreSQL, automatizaciones en n8n, sincronización de estado de facturas con Stripe y observabilidad con Grafana.",
            en: "Desktop platform for sales operations: leads, clients, invoicing and collection in a single flow. Modular Kotlin + Compose architecture, Supabase/PostgreSQL data layer, n8n automations, Stripe invoice-state sync and Grafana observability.",
        },
        year: "2025-2026",
        status: { es: "En producción", en: "In production" },
        role: {
            es: "Arquitectura de producto + Full Stack + Automatización",
            en: "Product architecture + Full Stack + Automation",
        },
        stack: [
            "Kotlin",
            "Compose Multiplatform",
            "Supabase / PostgreSQL",
            "n8n",
            "Stripe",
            "Grafana",
        ],
        highlights: {
            es: [
                "Flujo unificado Lead → Cliente → Factura → Cobro",
                "Edición inline + autosave para operativa comercial",
                "Sincronización de estados de facturas por webhooks Stripe",
                "Recomendación de oferta con RAG (website/PDF + KB interna)",
                "KPIs operativos embebidos con dashboard de métricas",
            ],
            en: [
                "Unified Lead → Client → Invoice → Collection flow",
                "Inline editing + autosave for sales operations",
                "Invoice-state sync via Stripe webhooks",
                "Offer recommendation with RAG (website/PDF + internal KB)",
                "Embedded operational KPIs with metrics dashboard",
            ],
        },
        links: { repo: null, demo: null, docs: null },
        casePath: "/cases/ilead-crm",
        thumbnail: "/projects/ilead-crm/thumb.webp",
        featured: true,
    },
    {
        slug: "iservices-crm",
        title: "iServices",
        kind: { es: "SaaS CRM modular", en: "Modular SaaS CRM" },
        context: { es: "Producto propio", en: "Own product" },
        tagline: {
            es: "SaaS CRM para negocios de servicios con SSR, Supabase Realtime y rumbo a ERP modular.",
            en: "SaaS CRM for service businesses with SSR, Supabase Realtime and a modular-ERP roadmap.",
        },
        description: {
            es: "SaaS CRM modular para negocios de servicios construido con Astro SSR y Supabase. Gestión de clientes, agenda de citas con Realtime y menú operativo para el flujo comercial. Arquitectura modular por módulos (core/icalendar/imenu) con RLS, auth email/password y middleware de protección. Incluye wizard público de reservas para clientes finales.",
            en: "Modular SaaS CRM for service businesses built with Astro SSR and Supabase. Client management, Realtime appointment calendar and an operational menu for the sales flow. Module-based architecture (core/icalendar/imenu) with RLS, email/password auth and route-protection middleware. Includes a public booking wizard for end clients.",
        },
        year: "2025-2026",
        status: { es: "En producción", en: "In production" },
        role: {
            es: "Arquitectura + Full Stack",
            en: "Architecture + Full Stack",
        },
        stack: [
            "Astro SSR",
            "TypeScript",
            "Tailwind CSS",
            "Supabase / PostgreSQL",
            "Realtime",
            "RLS",
        ],
        highlights: {
            es: [
                "Gestión de clientes y citas/agenda con Realtime",
                "Módulos: core / icalendar / imenu",
                "Auth email/password + middleware para /admin/*",
                "Wizard público /[slug]/reserva para clientes",
                "Roadmap: gastos, ingresos, RRHH y facturación → ERP modular",
            ],
            en: [
                "Client and appointment management with Realtime",
                "Modules: core / icalendar / imenu",
                "Email/password auth + middleware guarding /admin/*",
                "Public /[slug]/booking wizard for end clients",
                "Roadmap: expenses, income, HR and invoicing → modular ERP",
            ],
        },
        links: { repo: null, demo: null, docs: null },
        casePath: "/cases/iservices-crm",
        thumbnail: "/projects/iservices-crm/thumb.webp",
        featured: true,
    },
    {
        slug: "loops-grooves",
        title: "Loops n' Grooves",
        kind: { es: "E-commerce headless", en: "Headless e-commerce" },
        context: { es: "Cliente", en: "Client" },
        tagline: {
            es: "E-commerce headless con WooCommerce API, carrito en cliente y filtros dinámicos desde ACF.",
            en: "Headless e-commerce with the WooCommerce API, client-side cart and ACF-driven dynamic filters.",
        },
        description: {
            es: "Frontend headless para un e-commerce musical construido con Astro v5 y conectado a WordPress + WooCommerce. Productos reales servidos desde la API con paginación, filtros dinámicos alimentados por campos ACF (bpm, key, tags, categorías) y carrito gestionado en localStorage. Incluye componente WebGL personalizado.",
            en: "Headless frontend for a music e-commerce built with Astro v5 on top of WordPress + WooCommerce. Real products served from the API with pagination, dynamic filters fed by ACF fields (bpm, key, tags, categories) and a localStorage cart. Includes a custom WebGL component.",
        },
        year: "2025",
        status: { es: "En producción", en: "In production" },
        role: {
            es: "Frontend + Integración headless",
            en: "Frontend + headless integration",
        },
        stack: [
            "Astro",
            "TypeScript",
            "Tailwind CSS",
            "WordPress",
            "WooCommerce API",
            "React",
            "WebGL (ogl)",
        ],
        highlights: {
            es: [
                "Catálogo real desde WooCommerce con paginación",
                "Filtros dinámicos desde ACF que se actualizan solos con WP",
                "Carrito en localStorage con badge y página /cart",
                "Extracción ACF/meta_data: bpm, key, preview_audio, 3d_model…",
                "Componente WebGL Threads personalizado",
            ],
            en: [
                "Real WooCommerce catalogue with pagination",
                "ACF-driven dynamic filters that update with WP changes",
                "localStorage cart with badge and /cart page",
                "ACF/meta_data extraction: bpm, key, preview_audio, 3d_model…",
                "Custom WebGL Threads component",
            ],
        },
        links: { repo: null, demo: "https://loopsngrooves.com", docs: null },
        casePath: "/cases/loops-n-grooves",
        thumbnail: "/projects/loopsngrooves/thumb.webp",
        featured: false,
    },
];

/* Featured projects for the home teaser (skips coming-soon) */
export function getFeaturedProjects(limit = 3): Project[] {
    return projects.filter((p) => p.featured && !p.comingSoon).slice(0, limit);
}

/* Get a single project by slug */
export function getProjectBySlug(slug: string): Project | undefined {
    return projects.find((p) => p.slug === slug);
}
