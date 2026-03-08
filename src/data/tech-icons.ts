export interface TechIcon {
    kind: "url" | "svg";
    value: string;
}

const icons = {
    n8n: { kind: "url", value: "https://cdn.simpleicons.org/n8n/db2777" },
    supabase: {
        kind: "url",
        value: "https://cdn.simpleicons.org/supabase/3ecf8e",
    },
    astro: { kind: "url", value: "https://cdn.simpleicons.org/astro/ff5d01" },
    tailwind: {
        kind: "url",
        value: "https://cdn.simpleicons.org/tailwindcss/38bdf8",
    },
    traefik: {
        kind: "url",
        value: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/traefik.svg",
    },
    github: {
        kind: "url",
        value: "https://cdn.simpleicons.org/github/181616",
    },
    git: { kind: "url", value: "https://cdn.simpleicons.org/git/e64a19" },
    java: {
        kind: "url",
        value: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
    },
    javascript: {
        kind: "url",
        value: "https://cdn.simpleicons.org/javascript/f5de19",
    },
    typescript: {
        kind: "url",
        value: "https://cdn.simpleicons.org/typescript/3178c6",
    },
    kotlin: {
        kind: "url",
        value: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg",
    },
    compose: {
        kind: "svg",
        value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 286"><path fill="#4285F4" d="M126.936 0a31.94 31.94 0 0 1 15.165 4.126L238.728 58.7a35.7 35.7 0 0 1 10.15 8.581l.096-.057l1.44 2.112l.169.242l1.798 2.65l-.128.077c2.386 4.347 3.699 9.091 3.747 13.917v110.94a31.94 31.94 0 0 1-15.702 27.8l-95.579 56.395a31.8 31.8 0 0 1-12.968 4.256l-.001.142l-6.113.05l.003-.152a32 32 0 0 1-12.846-3.998L11.27 224.309C4.372 220.426.08 213.148 0 205.196V87.707c.057-4.144.779-8.143 2.146-11.821l-.114-.065l2.616-5.467l.148.082a28.44 28.44 0 0 1 9.8-9.62l95.58-56.383A31.9 31.9 0 0 1 126.099 0zM7.5 78.882l-.214.68c-.85 2.815-1.271 5.856-1.239 9.026v116.578a16.1 16.1 0 0 0 8.193 13.876l101.528 57.348a25.9 25.9 0 0 0 9.756 3.173l.211.02l.024-4.932l.02-20.686l-.032-23.482l-.137-.013a20.5 20.5 0 0 1-6.062-1.781l-.714-.353l-.631-.343l-61.507-34.74a14.6 14.6 0 0 1-5.403-5.298a14.65 14.65 0 0 1-2.03-7.318l.001-70.615c-.022-2.247.26-4.437.84-6.502l.197-.66zm239.558-3.473l-42.2 25.203l.093.193c1.042 2.248 1.651 4.641 1.767 7.085l.019.668l-.002 67.2a20.53 20.53 0 0 1-10.098 17.88L138.735 227.8a20.4 20.4 0 0 1-6.442 2.45l-.497.089l.01 4.778l.02 27.678l-.04 16.256l-.006.47l.904-.128a25.7 25.7 0 0 0 8.262-2.845l.7-.398l95.58-56.394a25.9 25.9 0 0 0 9.381-9.563a25.9 25.9 0 0 0 3.344-13.002l.002-110.94c-.034-3.428-.898-6.853-2.496-10.072zM124 86.585c-.914.27-1.794.652-2.615 1.136l-38.813 22.896a10.3 10.3 0 0 0-2.921 2.573q-.47.609-.847 1.274q-.188.335-.356.68l-.209.52a12.6 12.6 0 0 0-.93 3.672q-.069.741-.063 1.5v47.356a7.8 7.8 0 0 0 1.079 3.876a7.74 7.74 0 0 0 2.872 2.814l41.23 23.289a11.7 11.7 0 0 0 5.865 1.516l.44-.017l.003 12.75l.028 12.164l-.03-24.916a11.7 11.7 0 0 0 5.433-1.607l38.813-22.9a11.74 11.74 0 0 0 4.255-4.336c.163-.288.307-.584.445-.886a11.8 11.8 0 0 0 1.072-5l.001-45.06a10.2 10.2 0 0 0-.317-2.408a11 11 0 0 0-.511-1.53a11.6 11.6 0 0 0-.801-1.568l-.177-.284l-.183-.28a13 13 0 0 0-.916-1.19a13.3 13.3 0 0 0-3.486-2.85l-39.239-22.16A11.68 11.68 0 0 0 124 86.585m2.157-80.54A25.86 25.86 0 0 0 113.25 9.64L17.67 66.022a22.36 22.36 0 0 0-7.178 6.739l-.416.635l42.9 24.02l.445-.607a18.4 18.4 0 0 1 4.708-4.321l.564-.346l57.903-34.16a20.52 20.52 0 0 1 20.533-.199l58.539 33.066a22.8 22.8 0 0 1 5.442 4.287l.394.435l42.116-25.154l-.463-.527a29.8 29.8 0 0 0-6.716-5.525l-.687-.402l-96.626-54.572a25.85 25.85 0 0 0-12.97-3.345"/></svg>',
    },
    postgresql: {
        kind: "url",
        value: "https://cdn.simpleicons.org/postgresql/336791",
    },
    stripe: {
        kind: "url",
        value: "https://cdn.simpleicons.org/stripe/635bff",
    },
    grafana: {
        kind: "url",
        value: "https://cdn.simpleicons.org/grafana/f46800",
    },
    threejs: {
        kind: "url",
        value: "https://cdn.simpleicons.org/threedotjs/111111",
    },
    firebase: {
        kind: "url",
        value: "https://cdn.simpleicons.org/firebase/ffca28",
    },
    restApi: {
        kind: "svg",
        value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#0284c7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 13h5m3 3V8h3a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-3m8-5v8M9 16v-5.5a2.5 2.5 0 0 0-5 0V16"/></svg>',
    },
    sqlRpc: {
        kind: "svg",
        value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#0284c7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8a2 2 0 0 1 2 2v4a2 2 0 1 1-4 0v-4a2 2 0 0 1 2-2m5 0v8h4m-8-1l1 1M3 15a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1"/></svg>',
    },
    rlsRealtime: {
        kind: "svg",
        value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="#e11d48" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><circle cx="12" cy="12" r="2"/><path d="M7.5 8C6.5 9 6 10.5 6 12s.5 3 1.5 4m-3-10C3 7.5 2 9.5 2 12s1 4.5 2.5 6m12-2c1-1 1.5-2.5 1.5-4s-.5-3-1.5-4m3 10c1.5-1.5 2.5-3.5 2.5-6s-1-4.5-2.5-6"/></g></svg>',
    },
    amazon: {
        kind: "svg",
        value: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="none"><rect width="256" height="256" fill="#F4F2ED" rx="60"/><path fill="#252F3E" d="M84.745 111.961c0 2.434.263 4.407.723 5.855a35 35 0 0 0 2.106 4.737c.329.526.46 1.052.46 1.513c0 .658-.395 1.316-1.25 1.973l-4.145 2.764c-.592.394-1.184.592-1.71.592c-.658 0-1.316-.329-1.974-.921a20.4 20.4 0 0 1-2.368-3.092a51 51 0 0 1-2.04-3.882q-7.697 9.08-19.342 9.079c-5.526 0-9.934-1.579-13.158-4.737c-3.223-3.158-4.868-7.368-4.868-12.631c0-5.593 1.974-10.132 5.987-13.553s9.342-5.132 16.118-5.132c2.237 0 4.54.198 6.974.527s4.934.855 7.566 1.447v-4.803c0-5-1.053-8.487-3.092-10.526c-2.106-2.04-5.658-3.026-10.724-3.026c-2.303 0-4.671.263-7.105.855s-4.803 1.316-7.106 2.237a19 19 0 0 1-2.302.855c-.46.132-.79.198-1.053.198c-.92 0-1.382-.658-1.382-2.04v-3.224c0-1.052.132-1.842.461-2.302s.921-.921 1.842-1.382q3.454-1.776 8.29-2.96c3.223-.856 6.644-1.25 10.263-1.25c7.829 0 13.552 1.776 17.237 5.328c3.618 3.553 5.46 8.948 5.46 16.185v21.316zm-26.71 10c2.17 0 4.407-.395 6.776-1.185c2.368-.789 4.473-2.237 6.25-4.21c1.052-1.25 1.842-2.632 2.236-4.211s.658-3.487.658-5.723v-2.764a55 55 0 0 0-6.052-1.118a50 50 0 0 0-6.185-.395c-4.408 0-7.631.856-9.802 2.632s-3.224 4.276-3.224 7.566c0 3.092.79 5.394 2.434 6.973c1.58 1.645 3.882 2.435 6.908 2.435m52.828 7.105c-1.184 0-1.974-.198-2.5-.658c-.526-.395-.987-1.316-1.381-2.566l-15.46-50.855c-.396-1.316-.593-2.171-.593-2.632c0-1.052.526-1.645 1.579-1.645h6.447c1.25 0 2.106.198 2.566.658c.526.395.921 1.316 1.316 2.566l11.052 43.553l10.264-43.553c.329-1.316.723-2.17 1.25-2.566c.526-.394 1.447-.657 2.631-.657h5.263c1.25 0 2.106.197 2.632.657c.526.395.987 1.316 1.25 2.566l10.395 44.079l11.381-44.079c.395-1.316.856-2.17 1.316-2.566c.526-.394 1.382-.657 2.566-.657h6.118c1.053 0 1.645.526 1.645 1.644c0 .33-.066.658-.132 1.053c-.065.395-.197.92-.46 1.645l-15.855 50.855q-.593 1.974-1.382 2.566c-.526.394-1.382.658-2.5.658h-5.658c-1.25 0-2.105-.198-2.631-.658c-.527-.461-.987-1.316-1.25-2.632l-10.198-42.434l-10.131 42.368c-.329 1.316-.724 2.171-1.25 2.632c-.527.46-1.448.658-2.632.658zm84.54 1.776c-3.421 0-6.842-.395-10.132-1.184c-3.289-.79-5.855-1.645-7.566-2.632c-1.052-.592-1.776-1.25-2.039-1.842a4.65 4.65 0 0 1-.395-1.842v-3.355c0-1.382.526-2.04 1.513-2.04q.593 0 1.184.198c.395.131.987.394 1.645.658a35.8 35.8 0 0 0 7.237 2.302a39.5 39.5 0 0 0 7.829.79c4.145 0 7.368-.724 9.605-2.171c2.237-1.448 3.421-3.553 3.421-6.25c0-1.842-.592-3.356-1.776-4.606s-3.421-2.368-6.645-3.421l-9.539-2.96c-4.803-1.513-8.356-3.75-10.527-6.71c-2.171-2.895-3.289-6.12-3.289-9.54q0-4.144 1.776-7.303c1.184-2.105 2.763-3.947 4.737-5.394c1.974-1.514 4.211-2.632 6.842-3.422c2.632-.79 5.395-1.118 8.29-1.118c1.447 0 2.96.066 4.408.263c1.513.197 2.894.46 4.276.724c1.316.329 2.566.658 3.75 1.053q1.776.591 2.763 1.184c.921.526 1.579 1.052 1.974 1.644q.592.79.592 2.172v3.092c0 1.381-.526 2.105-1.513 2.105c-.527 0-1.382-.263-2.5-.79q-5.625-2.565-12.632-2.565c-3.75 0-6.71.592-8.75 1.842s-3.092 3.158-3.092 5.855c0 1.842.658 3.421 1.974 4.671s3.75 2.5 7.237 3.618l9.342 2.96c4.736 1.514 8.158 3.619 10.197 6.317s3.026 5.789 3.026 9.21c0 2.829-.592 5.395-1.71 7.632c-1.184 2.237-2.763 4.21-4.803 5.789c-2.039 1.645-4.474 2.829-7.302 3.685c-2.961.921-6.053 1.381-9.408 1.381"/><path fill="#F90" fill-rule="evenodd" d="M207.837 162.816c-21.645 15.987-53.092 24.474-80.132 24.474c-37.894 0-72.04-14.014-97.829-37.303c-2.04-1.842-.197-4.342 2.237-2.895c27.895 16.184 62.303 25.987 97.895 25.987c24.013 0 50.395-5 74.671-15.263c3.618-1.645 6.71 2.368 3.158 5" clip-rule="evenodd"/><path fill="#F90" fill-rule="evenodd" d="M216.85 152.553c-2.763-3.553-18.289-1.711-25.329-.856c-2.105.264-2.434-1.579-.526-2.96c12.368-8.684 32.697-6.184 35.066-3.29c2.368 2.961-.658 23.29-12.237 33.027c-1.777 1.513-3.487.723-2.698-1.25c2.632-6.513 8.487-21.185 5.724-24.671" clip-rule="evenodd"/></g></svg>',
    },
    zoho: { kind: "url", value: "https://cdn.simpleicons.org/zoho/c8202f" },
    gradle: {
        kind: "url",
        value: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gradle/gradle-original.svg",
    },
    maven: {
        kind: "url",
        value: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/maven/maven-original.svg",
    },
    wordpress: {
        kind: "url",
        value: "https://cdn.simpleicons.org/wordpress/0073aa",
    },
    html: { kind: "url", value: "https://cdn.simpleicons.org/html5/e14e1d" },
    woocommerce: {
        kind: "url",
        value: "https://cdn.simpleicons.org/woocommerce/7f54b3",
    },
    digitalocean: {
        kind: "url",
        value: "https://cdn.simpleicons.org/digitalocean/0080ff",
    },
    react: { kind: "url", value: "https://cdn.simpleicons.org/react/00d8ff" },
    docker: {
        kind: "url",
        value: "https://cdn.simpleicons.org/docker/2396ed",
    },
    webhook: {
        kind: "svg",
        value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#e11d48" d="M7 21q-2.075 0-3.537-1.463T2 16q0-1.825 1.138-3.187T6 11.1v2.075q-.875.3-1.437 1.075T4 16q0 1.25.875 2.125T7 19t2.125-.875T10 16v-1h5.875q.2-.225.488-.363T17 14.5q.625 0 1.063.438T18.5 16t-.437 1.063T17 17.5q-.35 0-.638-.137T15.876 17H11.9q-.35 1.725-1.713 2.863T7 21m10 0q-1.4 0-2.537-.687T12.675 18.5h2.675q.35.25.775.375T17 19q1.25 0 2.125-.875T20 16t-.875-2.125T17 13q-.5 0-.925.138t-.8.412l-3.05-5.075q-.525-.1-.875-.5T11 7q0-.625.438-1.062T12.5 5.5t1.063.438T14 7v.213q0 .087-.05.212l2.175 3.65q.2-.05.425-.062T17 11q2.075 0 3.538 1.463T22 16t-1.463 3.538T17 21M7 17.5q-.625 0-1.062-.437T5.5 16q0-.55.35-.95t.85-.525l2.35-3.9q-.725-.675-1.138-1.612T7.5 7q0-2.075 1.463-3.537T12.5 2t3.538 1.463T17.5 7h-2q0-1.25-.875-2.125T12.5 4t-2.125.875T9.5 7q0 1.075.65 1.888t1.65 1.037L8.425 15.55q.05.125.063.225T8.5 16q0 .625-.437 1.063T7 17.5"/></svg>',
    },
} as const;

function normalize(label: string): string {
    return label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function getTechIcon(label: string): TechIcon | null {
    const value = normalize(label);

    if (value.includes("n8n")) return icons.n8n;
    if (value.includes("compose multiplatform")) return icons.compose;
    if (value.includes("supabase")) return icons.supabase;
    if (value.includes("postgres")) return icons.postgresql;
    if (value.includes("stripe")) return icons.stripe;
    if (value.includes("grafana")) return icons.grafana;
    if (
        value.includes("three.js") ||
        value.includes("threejs") ||
        value.includes("r3f")
    )
        return icons.threejs;
    if (value.includes("firebase")) return icons.firebase;
    if (value.includes("rest api")) return icons.restApi;
    if (value.includes("sql") && value.includes("rpc")) return icons.sqlRpc;
    if (value.includes("rls") || value.includes("realtime"))
        return icons.rlsRealtime;
    if (value.includes("amazon ses") || value.includes("iam"))
        return icons.amazon;
    if (value.includes("zoho")) return icons.zoho;
    if (value.includes("astro")) return icons.astro;
    if (value.includes("tailwind")) return icons.tailwind;
    if (value.includes("traefik")) return icons.traefik;
    if (value.includes("woocommerce")) return icons.woocommerce;
    if (value.includes("wordpress")) return icons.wordpress;
    if (value.includes("digitalocean")) return icons.digitalocean;
    if (value.includes("react")) return icons.react;
    if (value.includes("docker")) return icons.docker;
    if (value.includes("webhook")) return icons.webhook;
    if (value.includes("github")) return icons.github;
    if (value.includes("typescript") || value === "ts") return icons.typescript;
    if (value.includes("javascript") || value === "js") return icons.javascript;
    if (value.includes("java")) return icons.java;
    if (value.includes("kotlin")) return icons.kotlin;
    if (value.includes("gradle")) return icons.gradle;
    if (value.includes("maven")) return icons.maven;
    if (value.includes("html")) return icons.html;
    if (value === "git" || value.startsWith("git /") || value.includes(" git "))
        return icons.git;

    return null;
}
