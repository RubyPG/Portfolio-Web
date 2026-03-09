/* ── Skills data grouped by categories ── */

export interface Skill {
    name: string;
    level?: 'learning' | 'intermediate' | 'advanced' | 'expert';
}

export interface SkillCategory {
    title: string;
    icon: string;
    skills: Skill[];
}

export const skillCategories: SkillCategory[] = [
    {
        title: 'Web',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"><path fill="#7c4dff" d="M12.106 25.849c-1.262-1.156-1.63-3.586-1.105-5.346a5.18 5.18 0 0 0 3.484 1.66a9.68 9.68 0 0 0 5.882-.734c.215-.106.413-.247.648-.39a3.5 3.5 0 0 1 .16 1.555a4.26 4.26 0 0 1-1.798 3.021c-.404.3-.832.569-1.25.852a2.613 2.613 0 0 0-1.15 3.372l.048.161a3.4 3.4 0 0 1-1.5-1.285a3.6 3.6 0 0 1-.578-1.962a9 9 0 0 0-.05-1.037c-.114-.831-.504-1.204-1.238-1.225a1.45 1.45 0 0 0-1.507 1.18c-.012.056-.028.112-.046.178M4.901 20a17.75 17.75 0 0 1 7.4-2l2.913-8.38a.765.765 0 0 1 1.527 0L19.7 18a14.24 14.24 0 0 1 7.399 2S20.704 2.877 20.692 2.842C20.51 2.33 20.202 2 19.787 2h-7.619c-.415 0-.71.33-.904.842z"/></svg>',
        skills: [
            { name: 'Astro', level: 'advanced' },
            { name: 'Tailwind CSS', level: 'advanced' },
            { name: 'TypeScript', level: 'advanced' },
            { name: 'React', level: 'intermediate' },
            { name: 'HTML5 / CSS3', level: 'expert' },
            { name: 'WordPress (headless)', level: 'intermediate' },
            { name: 'WooCommerce API', level: 'intermediate' },
        ],
    },
    {
        title: 'Backend & Data',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="#3ecf8e" d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z"/></svg>',
        skills: [
            { name: 'Supabase', level: 'advanced' },
            { name: 'PostgreSQL', level: 'advanced' },
            { name: 'Firebase', level: 'intermediate' },
            { name: 'REST APIs', level: 'advanced' },
            { name: 'SQL / RPC', level: 'advanced' },
            { name: 'RLS (Row Level Security)', level: 'intermediate' },
        ],
    },
    {
        title: 'Automatización & DevOps',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="#EA4B71" d="M21.474 5.684a2.53 2.53 0 0 0-2.447 1.895H16.13a2.526 2.526 0 0 0-2.492 2.11l-.103.624a1.26 1.26 0 0 1-1.246 1.055h-1.001a2.527 2.527 0 0 0-4.893 0H4.973a2.527 2.527 0 1 0 0 1.264h1.422a2.527 2.527 0 0 0 4.894 0h1a1.26 1.26 0 0 1 1.247 1.055l.103.623a2.526 2.526 0 0 0 2.492 2.111h.37a2.527 2.527 0 1 0 0-1.263h-.37a1.26 1.26 0 0 1-1.246-1.056l-.103-.623A2.52 2.52 0 0 0 13.96 12a2.52 2.52 0 0 0 .82-1.48l.104-.622a1.26 1.26 0 0 1 1.246-1.056h2.896a2.527 2.527 0 1 0 2.447-3.158m0 1.263a1.263 1.263 0 0 1 1.263 1.263a1.263 1.263 0 0 1-1.263 1.264A1.263 1.263 0 0 1 20.21 8.21a1.263 1.263 0 0 1 1.264-1.263m-18.948 3.79A1.263 1.263 0 0 1 3.79 12a1.263 1.263 0 0 1-1.264 1.263A1.263 1.263 0 0 1 1.263 12a1.263 1.263 0 0 1 1.263-1.263m6.316 0A1.263 1.263 0 0 1 10.105 12a1.263 1.263 0 0 1-1.263 1.263A1.263 1.263 0 0 1 7.58 12a1.263 1.263 0 0 1 1.263-1.263m10.106 3.79a1.263 1.263 0 0 1 1.263 1.263a1.263 1.263 0 0 1-1.263 1.263a1.263 1.263 0 0 1-1.264-1.263a1.263 1.263 0 0 1 1.263-1.264"/></svg>',
        skills: [
            { name: 'n8n', level: 'advanced' },
            { name: 'Docker / Docker Compose', level: 'intermediate' },
            { name: 'Traefik', level: 'intermediate' },
            { name: 'DigitalOcean', level: 'intermediate' },
            { name: 'Webhooks', level: 'advanced' },
            { name: 'Amazon SES / IAM', level: 'intermediate' },
            { name: 'Zoho Mail', level: 'intermediate' },
            { name: 'Git / GitHub', level: 'advanced' },
        ],
    },
    {
        title: 'Desktop',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 128 128"><path fill="#0074bd" d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092c0 0 2.871 1.795 6.873 3.351c-24.439 10.47-55.308-.607-36.115-5.969m-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6c0 0 1.993 2.025 5.132 3.131c-29.542 8.64-62.446.68-41.309-6.336"/><path fill="#ea2d2e" d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58c0 .001-42.731 10.67-22.324 34.187"/><path fill="#0074bd" d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171c-4.451-1.938 3.899-4.625 6.526-5.192c2.739-.593 4.303-.485 4.303-.485c-4.953-3.487-32.013 6.85-13.743 9.815c49.821 8.076 90.817-3.637 77.896-9.468M49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326c9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958c10.832-5.239 19.644-4.643 19.644-4.643m40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285c-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725c0-.002.359-.327.468-.617"/><path fill="#ea2d2e" d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559c-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587"/><path fill="#0074bd" d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436c0 0-1.571 4.032-18.577 7.231c-19.186 3.612-42.854 3.191-56.887.874c0 .001 2.875 2.381 17.647 3.331"/></svg>',
        skills: [
            { name: 'Java', level: 'advanced' },
            { name: 'Kotlin', level: 'advanced' },
            { name: 'Compose Multiplatform', level: 'advanced' },
            { name: 'Maven', level: 'intermediate' },
            { name: 'Gradle', level: 'intermediate' },
        ],
    },
];
