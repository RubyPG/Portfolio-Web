/* Copy for the one-page home (ES/EN). All user-facing strings live here
   so both locales render from the same section components. */

export type Lang = "es" | "en";

export interface OnePageCopy {
    hero: {
        badge: string;
        eyebrow: string;
        titleLines: [string, string];
        subtitle: string;
        intro: string;
        stats: { value: string; suffix: string; label: string }[];
        ctaProjects: string;
        ctaContact: string;
        scrollCue: string;
    };
    stack: {
        eyebrow: string;
        title: string;
        subtitle: string;
        panelHint: string;
        inProduction: string;
    };
    ai: {
        eyebrow: string;
        title: string;
        subtitle: string;
        cards: { title: string; body: string }[];
        terminalTitle: string;
        terminalLines: { prompt: boolean; text: string }[];
        footnote: string;
    };
    experience: {
        eyebrow: string;
        title: string;
        subtitle: string;
        items: {
            period: string;
            title: string;
            context: string;
            body: string;
            tags: string[];
            current?: boolean;
        }[];
    };
    projects: {
        eyebrow: string;
        title: string;
        subtitle: string;
        viewCase: string;
        viewDemo: string;
        ctaAll: string;
    };
    contact: {
        eyebrow: string;
        titleLines: [string, string];
        subtitle: string;
        email: string;
        whatsapp: string;
        cv: string;
        responseNote: string;
    };
}

export const onePageCopy: Record<Lang, OnePageCopy> = {
    es: {
        hero: {
            badge: "Disponible para proyectos",
            eyebrow: "Freelance · Full ownership técnico",
            titleLines: ["Full Stack", "Developer"],
            subtitle: "CRM · ERP · Automatización · IA",
            intro: "Construyo productos que escalan: CRMs y ERPs a medida, webs de alto rendimiento y automatización real — con desarrollo agéntico (Claude Code) en el núcleo del proceso.",
            stats: [
                { value: "4", suffix: "+", label: "Productos reales en producción" },
                { value: "100", suffix: "%", label: "Ownership: de la idea al deploy" },
                { value: "2", suffix: "", label: "Clientes activos como freelance" },
            ],
            ctaProjects: "Ver proyectos",
            ctaContact: "Hablemos",
            scrollCue: "Scroll",
        },
        stack: {
            eyebrow: "Stack técnico",
            title: "Herramientas de producción, no de tutorial",
            subtitle: "Cada tecnología de esta lista está hoy en código que usan personas reales.",
            panelHint: "Sigue haciendo scroll",
            inProduction: "tecnologías en producción",
        },
        ai: {
            eyebrow: "AI-Augmented Development",
            title: "Trabajo con Claude Code, en serio",
            subtitle: "No es un autocompletado: es mi forma de construir. Skills propias por repo, subagentes, MCP y workflows que diseñan, implementan y verifican conmigo.",
            cards: [
                {
                    title: "Claude Code a diario",
                    body: "Desarrollo agéntico como herramienta principal: planifico, implemento y reviso con agentes sobre repos reales.",
                },
                {
                    title: "Agent Skills a medida",
                    body: "Escribo skills propias que encapsulan las convenciones de cada proyecto para que el agente trabaje como el equipo.",
                },
                {
                    title: "MCP & herramientas",
                    body: "Conecto los agentes a Supabase, GitHub y servicios externos vía Model Context Protocol.",
                },
                {
                    title: "Workflows multi-agente",
                    body: "Fan-out de subagentes para auditorías, migraciones y revisión adversarial antes de mergear.",
                },
            ],
            terminalTitle: "claude — sesión real",
            terminalLines: [
                { prompt: true, text: "claude \"añade el semáforo de vencimiento ITV a Flota\"" },
                { prompt: false, text: "✓ Plan: 3 capas afectadas · domain → viewmodel → ui" },
                { prompt: false, text: "✓ 9 archivos · tests en verde · dependency-cruiser OK" },
                { prompt: true, text: "claude /review --adversarial" },
                { prompt: false, text: "✓ 2 hallazgos verificados · 1 falso positivo descartado" },
                { prompt: true, text: "git push — build verde en CI" },
            ],
            footnote: "El resultado: la velocidad de un equipo, la coherencia de una sola cabeza.",
        },
        experience: {
            eyebrow: "Experiencia",
            title: "Lo que estoy construyendo",
            subtitle: "Trabajo freelance y producto propio, todo en producción o camino de estarlo.",
            items: [
                {
                    period: "2026 — actual",
                    title: "CRM Comité de Empresa GXO",
                    context: "Freelance · Cliente",
                    body: "CRM a medida para el comité: afiliados, consultas e incidencias laborales con historial. Alcance, desarrollo y entrega en solitario.",
                    tags: ["TypeScript", "Supabase", "n8n"],
                    current: true,
                },
                {
                    period: "2025 — actual",
                    title: "Archai by Sepharim — ERP modular",
                    context: "Producto · Sepharim",
                    body: "ERP web para logística, flota, RRHH y finanzas. Clean Architecture vigilada por lint, instancia por cliente y design system propio.",
                    tags: ["React", "TypeScript", "Supabase", "MapLibre"],
                    current: true,
                },
                {
                    period: "2025 — 2026",
                    title: "iLead CRM",
                    context: "Producto propio",
                    body: "CRM desktop en producción: Kotlin + Compose, facturación con Stripe, automatizaciones n8n y observabilidad con Grafana.",
                    tags: ["Kotlin", "Compose", "Stripe", "Grafana"],
                },
                {
                    period: "2025",
                    title: "Loops n' Grooves",
                    context: "Freelance · Cliente",
                    body: "E-commerce headless sobre WooCommerce: catálogo real, filtros dinámicos desde ACF y carrito en cliente.",
                    tags: ["Astro", "WooCommerce", "WebGL"],
                },
            ],
        },
        projects: {
            eyebrow: "Proyectos",
            title: "Producto real, en producción",
            subtitle: "Tres ejemplos. El resto — incluido lo que viene — está en la página de proyectos.",
            viewCase: "Ver caso",
            viewDemo: "Demo",
            ctaAll: "Ver todos los proyectos",
        },
        contact: {
            eyebrow: "¿Tienes un proyecto?",
            titleLines: ["Hablemos.", "Respondo en < 24h."],
            subtitle: "Sin intermediarios ni reuniones de descubrimiento eternas: cuéntame qué necesitas y te digo cómo lo construiría.",
            email: "Escríbeme un email",
            whatsapp: "WhatsApp directo",
            cv: "Descargar CV",
            responseNote: "ruben.pezuelagarcia@gmail.com · +34 618 856 782",
        },
    },
    en: {
        hero: {
            badge: "Available for projects",
            eyebrow: "Freelance · Full technical ownership",
            titleLines: ["Full Stack", "Developer"],
            subtitle: "CRM · ERP · Automation · AI",
            intro: "I build products that scale: custom CRMs and ERPs, high-performance websites and real automation — with agentic development (Claude Code) at the core of the process.",
            stats: [
                { value: "4", suffix: "+", label: "Real products in production" },
                { value: "100", suffix: "%", label: "Ownership: from idea to deploy" },
                { value: "2", suffix: "", label: "Active freelance clients" },
            ],
            ctaProjects: "View projects",
            ctaContact: "Let's talk",
            scrollCue: "Scroll",
        },
        stack: {
            eyebrow: "Tech stack",
            title: "Production tools, not tutorial tools",
            subtitle: "Every technology on this list is in code real people use today.",
            panelHint: "Keep scrolling",
            inProduction: "technologies in production",
        },
        ai: {
            eyebrow: "AI-Augmented Development",
            title: "I work with Claude Code, for real",
            subtitle: "Not autocomplete — it's how I build. Per-repo agent skills, subagents, MCP and workflows that design, implement and verify with me.",
            cards: [
                {
                    title: "Claude Code daily",
                    body: "Agentic development as my primary tool: I plan, implement and review with agents on real repos.",
                },
                {
                    title: "Custom Agent Skills",
                    body: "I write skills that encapsulate each project's conventions so the agent works like the team.",
                },
                {
                    title: "MCP & tooling",
                    body: "I connect agents to Supabase, GitHub and external services via the Model Context Protocol.",
                },
                {
                    title: "Multi-agent workflows",
                    body: "Subagent fan-out for audits, migrations and adversarial review before merging.",
                },
            ],
            terminalTitle: "claude — real session",
            terminalLines: [
                { prompt: true, text: "claude \"add the ITV expiry traffic-light to Fleet\"" },
                { prompt: false, text: "✓ Plan: 3 layers touched · domain → viewmodel → ui" },
                { prompt: false, text: "✓ 9 files · tests green · dependency-cruiser OK" },
                { prompt: true, text: "claude /review --adversarial" },
                { prompt: false, text: "✓ 2 findings verified · 1 false positive discarded" },
                { prompt: true, text: "git push — CI build green" },
            ],
            footnote: "The result: a team's velocity with a single mind's coherence.",
        },
        experience: {
            eyebrow: "Experience",
            title: "What I'm building",
            subtitle: "Freelance work and own products — in production or on the way there.",
            items: [
                {
                    period: "2026 — present",
                    title: "GXO Works Council CRM",
                    context: "Freelance · Client",
                    body: "Custom CRM for the works council: members, queries and labour cases with full history. Scoped, built and delivered solo.",
                    tags: ["TypeScript", "Supabase", "n8n"],
                    current: true,
                },
                {
                    period: "2025 — present",
                    title: "Archai by Sepharim — modular ERP",
                    context: "Product · Sepharim",
                    body: "Web ERP for logistics, fleet, HR and finance. Lint-enforced Clean Architecture, per-client instances and a custom design system.",
                    tags: ["React", "TypeScript", "Supabase", "MapLibre"],
                    current: true,
                },
                {
                    period: "2025 — 2026",
                    title: "iLead CRM",
                    context: "Own product",
                    body: "Desktop CRM in production: Kotlin + Compose, Stripe billing, n8n automations and Grafana observability.",
                    tags: ["Kotlin", "Compose", "Stripe", "Grafana"],
                },
                {
                    period: "2025",
                    title: "Loops n' Grooves",
                    context: "Freelance · Client",
                    body: "Headless e-commerce on WooCommerce: real catalogue, ACF-driven dynamic filters and a client-side cart.",
                    tags: ["Astro", "WooCommerce", "WebGL"],
                },
            ],
        },
        projects: {
            eyebrow: "Projects",
            title: "Real product, in production",
            subtitle: "Three examples. The rest — including what's coming — lives on the projects page.",
            viewCase: "View case",
            viewDemo: "Demo",
            ctaAll: "View all projects",
        },
        contact: {
            eyebrow: "Got a project?",
            titleLines: ["Let's talk.", "I reply in < 24h."],
            subtitle: "No middlemen, no endless discovery meetings: tell me what you need and I'll tell you how I'd build it.",
            email: "Send me an email",
            whatsapp: "Direct WhatsApp",
            cv: "Download CV",
            responseNote: "ruben.pezuelagarcia@gmail.com · +34 618 856 782",
        },
    },
};
