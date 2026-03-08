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
        ogImage: string;
    };
}

export const site: SiteData = {
    name: "Rubén Pezuela García",
    shortName: "RubénPG",
    role: "Full Stack Developer & CTO",
    subtitle: "CRM iLead · n8n · Supabase · Kotlin · Astro",
    description:
        "Full Stack Developer y CTO de iCreate Group. Construyo CRMs, automatizo procesos con n8n, desarrollo webs de alto rendimiento y apps desktop. Productos reales en producción.",
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
        defaultTitle: "Rubén Pezuela García — Full Stack Developer & CTO",
        titleTemplate: "%s | RubénPG",
        defaultDescription:
            "Full Stack Developer y CTO de iCreate Group. Especializado en CRM a medida, automatización con n8n, webs con Astro y apps desktop con Kotlin. Construyo productos que escalan.",
        ogImage: "/og-image.jpg",
    },
};
