/* Site-wide data: profile, SEO, social links, contact */

export interface SocialLink {
    label: string;
    url: string;
    icon: string; // SVG path or icon name
}

export interface ContactInfo {
    email: string;
    phone: string;
    whatsapp: string;
}

export interface SiteData {
    name: string;
    shortName: string;
    role: string;
    roleEn: string;
    subtitle: string;
    description: string;
    siteUrl: string;
    locale: string;
    contact: ContactInfo;
    socials: SocialLink[];
    footer: {
        copyright: string;
    };
    seo: {
        defaultTitle: string;
        titleTemplate: string;
        defaultDescription: string;
        defaultTitleEn: string;
        defaultDescriptionEn: string;
        ogImage: string;
    };
}

export const site: SiteData = {
    name: "Rubén Pezuela García",
    shortName: "RubénPG",
    role: "Full Stack Developer · Freelance",
    roleEn: "Full Stack Developer · Freelance",
    subtitle: "CRM · ERP · Automatización · AI-Augmented Development",
    description:
        "Full Stack Developer freelance. Construyo CRMs, ERPs y webs de alto rendimiento con Supabase, Astro, React y Kotlin — con automatización (n8n) y desarrollo agéntico con Claude Code en el núcleo del proceso.",
    siteUrl: "https://rubenpg.dev", // TODO: actualizar con dominio real
    locale: "es_ES",

    contact: {
        email: "ruben.pezuelagarcia@gmail.com",
        phone: "+34618856782",
        whatsapp: "34618856782",
    },

    socials: [
        {
            label: "GitHub",
            url: "https://github.com/RubyPG",
            icon: "github",
        },
        {
            label: "LinkedIn",
            url: "https://linkedin.com/in/rubenpg", // TODO: actualizar con URL real de LinkedIn
            icon: "linkedin",
        },
    ],

    footer: {
        copyright: "© 2026 RubénPG. Todos los derechos reservados.",
    },

    seo: {
        defaultTitle: "Rubén Pezuela García — Full Stack Developer Freelance",
        titleTemplate: "%s | RubénPG",
        defaultDescription:
            "Full Stack Developer freelance especializado en CRM y ERP a medida, automatización con n8n y desarrollo aumentado con IA (Claude Code, agent skills, MCP). Productos reales en producción.",
        defaultTitleEn: "Rubén Pezuela García — Freelance Full Stack Developer",
        defaultDescriptionEn:
            "Freelance Full Stack Developer specialized in custom CRM/ERP systems, n8n automation and AI-augmented development (Claude Code, agent skills, MCP). Real products in production.",
        ogImage: "/og-image.jpg",
    },
};
