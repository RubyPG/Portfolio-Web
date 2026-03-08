/* Projects data with strict typing */

export type ProjectType =
    | "Web"
    | "E-commerce"
    | "SaaS/CRM"
    | "Automatización"
    | "Infra/DevOps"
    | "Desktop";

export type ProjectStatus =
    | "En curso"
    | "Finalizado"
    | "Ajustable"
    | "Flexible"
    | "Escalable";

export interface ProjectLinks {
    repo: string | null;
    demo: string | null;
    docs: string | null;
}

export interface Project {
    slug: string;
    title: string;
    shortDescription: string;
    longSummary: string;
    year: string;
    status: ProjectStatus;
    type: ProjectType;
    categories?: ProjectType[];
    role: string;
    stack: string[];
    highlights: string[];
    links: ProjectLinks;
    casePath: string;
    thumbnail: string;
    thumbnailIframe?: string;
    thumbnailIframeScale?: number;
    featured: boolean;
}

export const projectTypes: ProjectType[] = [
    "Web",
    "E-commerce",
    "SaaS/CRM",
    "Automatización",
    "Infra/DevOps",
    "Desktop",
];

export const projects: Project[] = [
    {
        slug: "ilead-crm",
        title: "CRM iLead - Lead-to-Cash Platform",
        shortDescription:
            "CRM desktop con facturacion Stripe, automatizaciones n8n y KPIs embebidos.",
        longSummary:
            "Plataforma desktop orientada a operaciones comerciales: leads, clientes, facturacion y seguimiento de cobro en un unico flujo. Arquitectura modular con Kotlin + Compose, capa de datos en Supabase/PostgreSQL, automatizaciones en n8n, sincronizacion de estado de facturas con Stripe y observabilidad con Grafana.",
        year: "2025-2026",
        status: "Escalable",
        type: "SaaS/CRM",
        categories: ["Desktop"],
        role: "Arquitectura de producto + Full Stack + Automatizacion",
        stack: [
            "Kotlin",
            "Compose Multiplatform",
            "Supabase / PostgreSQL",
            "n8n",
            "Stripe",
            "Grafana",
        ],
        highlights: [
            "Flujo unificado Lead -> Cliente -> Factura -> Cobro",
            "Edicion inline + autosave para operativa comercial",
            "Sincronizacion de estados de facturas por webhooks Stripe",
            "Recomendacion de oferta con RAG (website/PDF + KB interna)",
            "KPIs operativos embebidos con dashboard de metricas",
        ],
        links: {
            repo: null,
            demo: null,
            docs: null,
        },
        casePath: "/cases/ilead-crm",
        thumbnail: "/projects/ilead-crm/thumb.png",
        featured: true,
    },
    {
        slug: "iservices-crm",
        title: "SaaS CRM iServices",
        shortDescription:
            "SaaS CRM modular con SSR, Supabase Realtime y evolucion planificada a ERP.",
        longSummary:
            "SaaS CRM modular para iCreate Group construido con Astro en modo SSR y Supabase como backend. Gestion de clientes, citas/agenda con Realtime, y menu operativo para flujo comercial. Arquitectura modular por src/modules (core/icalendar/imenu) con RLS, auth email/password y middleware de proteccion. En roadmap: gastos, ingresos, RRHH/Nominas, facturacion y evolucion a ERP modular.",
        year: "2025-2026",
        status: "Flexible",
        type: "SaaS/CRM",
        role: "Cofounder & CTO",
        stack: [
            "Astro SSR",
            "Tailwind v4",
            "Supabase (@supabase/ssr)",
            "PostgreSQL",
            "Realtime",
            "RLS",
            "TypeScript",
        ],
        highlights: [
            "Gestion de clientes y citas/agenda con Realtime",
            "Menu operativo para flujo comercial y atencion",
            "Modulos: core / icalendar / imenu",
            "Auth email/password + middleware para /admin/*",
            "Wizard publico /[slug]/reserva para clientes",
            "Roadmap: gastos, ingresos, RRHH, facturacion -> ERP modular",
        ],
        links: {
            repo: null,
            demo: null,
            docs: null,
        },
        casePath: "/cases/iservices-crm",
        thumbnail: "/projects/iservices-crm/thumb.png",
        featured: true,
    },
    {
        slug: "loops-grooves",
        title: "Loops n' Grooves",
        shortDescription:
            "E-commerce headless con WooCommerce API, carrito cliente y filtros dinamicos ACF.",
        longSummary:
            "Frontend headless para un e-commerce musical construido con Astro v5 y conectado a WordPress + WooCommerce como backend. Productos reales servidos desde la API de WooCommerce con paginacion, filtros dinamicos alimentados por campos ACF (bpm, key, tags, categorias) y carrito gestionado en localStorage. Incluye componente WebGL Threads personalizado y modal anti-duplicados.",
        year: "2025",
        status: "En curso",
        type: "E-commerce",
        role: "Frontend + Integracion Headless",
        stack: [
            "Astro v5",
            "TypeScript",
            "Tailwind v4",
            "WordPress",
            "WooCommerce API",
            "React",
            "WebGL (ogl)",
        ],
        highlights: [
            "Productos reales desde WooCommerce en /loops y /bundles con paginacion",
            "Extraccion ACF/meta_data (bpm, key, preview_audio, 3d_model...)",
            "Carrito cliente en localStorage con badge y pagina /cart",
            "Filtros dinamicos alimentados por ACF que se actualizan con cambios en WP",
            "Modal informativo anti-duplicados en carrito",
            "Componente WebGL Threads (React Bits) personalizado",
        ],
        links: {
            repo: null,
            demo: "https://loopsngrooves.com",
            docs: null,
        },
        casePath: "/cases/loops-n-grooves",
        thumbnail: "/projects/loops-grooves/thumb.jpg",
        thumbnailIframe: "https://loopsngrooves.com",
        featured: true,
    },
    {
        slug: "icreategroup-automation",
        title: "iCreate Group - Plataforma de Automatizacion",
        shortDescription:
            "Plataforma de automatizacion multi-tenant con n8n, Supabase y webhooks.",
        longSummary:
            "Plataforma de automatizacion integral para iCreate Group. Arquitectura basada en el patron Frontend -> Webhook -> Orquestacion (n8n) -> Persistencia (Supabase) -> Respuesta. Multi-tenant logico por client_code y app_slug sin duplicar infraestructura. Desplegada con Docker Compose y Traefik como reverse proxy en DigitalOcean, con email transaccional via Amazon SES y Zoho Mail.",
        year: "2025-2026",
        status: "Escalable",
        type: "Automatización",
        categories: ["Infra/DevOps"],
        role: "Cofounder & CTO",
        stack: [
            "n8n",
            "Supabase / PostgreSQL",
            "Webhooks",
            "Amazon SES / IAM",
            "Zoho Mail",
            "Docker Compose",
            "Traefik",
            "DigitalOcean",
        ],
        highlights: [
            "Patron: Frontend -> Webhook -> n8n -> Supabase -> Respuesta",
            "Multi-tenant logico por client_code y app_slug",
            "Subdominios: admin privado, webhooks publico, frontends publicos",
            "Normalizacion, idempotencia y persistencia minima",
            "Observabilidad con client_code / app_slug / session_id",
        ],
        links: {
            repo: null,
            demo: null,
            docs: null,
        },
        casePath: "/cases/icreategroup-automation-platform",
        thumbnail: "/projects/icreategroup-automation/thumb.png",
        featured: false,
    },
    {
        slug: "icreategroup-web",
        title: "iCreate Group - Web Corporativa",
        shortDescription:
            "Web corporativa para captacion de leads con chatbot automatizado e integraciones n8n.",
        longSummary:
            "Sitio web corporativo de iCreate Group (icreategroup.net) disenado para captacion de leads y presentacion de servicios, proyectos y equipo. Incluye chatbot integrado que envia mensajes e historial con session_id hacia n8n para cualificacion automatica de leads, y formulario de contacto con envio a webhook automatizado.",
        year: "2025-2026",
        status: "Finalizado",
        type: "Web",
        role: "Cofounder & CTO",
        stack: [
            "Astro (static)",
            "Tailwind v4",
            "React (chatbot)",
            "Three.js / R3F",
            "n8n",
        ],
        highlights: [
            "Chatbot conversacional con cualificacion de leads via n8n",
            "Formulario de contacto con webhook automatizado",
            "Efectos 3D experimentales con Three.js / React Three Fiber",
            "Diseno responsive y optimizado para conversion",
        ],
        links: {
            repo: null,
            demo: "https://icreategroup.net",
            docs: null,
        },
        casePath: "/cases/icreategroup-web",
        thumbnail: "/projects/icreategroup-web/thumb.jpg",
        thumbnailIframe: "https://icreategroup.net",
        thumbnailIframeScale: 0.55,
        featured: true,
    },
];

const featuredOrder: Record<string, number> = {
    "ilead-crm": 0,
    "loops-grooves": 1,
    "iservices-crm": 2,
    "icreategroup-web": 3,
};

/* Get featured projects (max 4) */
export function getFeaturedProjects(): Project[] {
    return projects
        .filter((p) => p.featured)
        .sort(
            (a, b) =>
                (featuredOrder[a.slug] ?? Number.MAX_SAFE_INTEGER) -
                (featuredOrder[b.slug] ?? Number.MAX_SAFE_INTEGER),
        )
        .slice(0, 4);
}

/* Filter projects by type */
export function getProjectsByType(type: ProjectType | "Todos"): Project[] {
    if (type === "Todos") return projects;
    return projects.filter(
        (p) => p.type === type || p.categories?.includes(type),
    );
}

/* Get a single project by slug */
export function getProjectBySlug(slug: string): Project | undefined {
    return projects.find((p) => p.slug === slug);
}
