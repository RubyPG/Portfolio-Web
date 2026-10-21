export interface StackTechnology {
  name: string;
  icon?: string;
}

export interface StackGroup {
  id: string;
  title: string;
  primary: StackTechnology[];
  additional: StackTechnology[];
}

// The declared stack comes from the archived portfolio's src/data/skills.ts.
// Next.js and Codex reflect this portfolio's current implementation and workflow.
// Historical proficiency levels and production claims are deliberately omitted.
export const stackGroups: StackGroup[] = [
  {
    id: "frontend",
    title: "Frontend",
    primary: [
      { name: "Next.js", icon: "/icons/stack/nextjs.svg" },
      { name: "React", icon: "/icons/stack/react.svg" },
      { name: "TypeScript", icon: "/icons/stack/typescript.svg" },
      { name: "Astro", icon: "/icons/stack/astro.svg" },
      { name: "Tailwind CSS", icon: "/icons/stack/tailwind.svg" },
      { name: "GSAP", icon: "/icons/stack/gsap.svg" },
    ],
    additional: [
      { name: "HTML5 / CSS3", icon: "/icons/stack/html.svg" },
      { name: "WordPress headless", icon: "/icons/stack/wordpress.svg" },
      { name: "WooCommerce API", icon: "/icons/stack/woocommerce.svg" },
    ],
  },
  {
    id: "backend",
    title: "Backend y datos",
    primary: [
      { name: "Supabase", icon: "/icons/stack/supabase.svg" },
      { name: "PostgreSQL", icon: "/icons/stack/postgresql.svg" },
      { name: "Stripe", icon: "/icons/stack/stripe.svg" },
      { name: "Firebase", icon: "/icons/stack/firebase.svg" },
    ],
    additional: [
      { name: "RLS", icon: "/icons/stack/rlsRealtime.svg" },
      { name: "REST APIs", icon: "/icons/stack/restApi.svg" },
      { name: "SQL / RPC", icon: "/icons/stack/sqlRpc.svg" },
    ],
  },
  {
    id: "ai",
    title: "Inteligencia artificial",
    primary: [
      { name: "Claude Code", icon: "/icons/stack/claudecode.svg" },
      { name: "Codex", icon: "/icons/stack/codex.svg" },
      { name: "Hermes Agent", icon: "/icons/stack/hermes.svg" },
    ],
    additional: [
      { name: "Agent Skills" },
      { name: "MCP", icon: "/icons/stack/mcp.svg" },
      { name: "Subagentes & Workflows" },
      { name: "Claude API", icon: "/icons/stack/claude.svg" },
      { name: "Context Engineering" },
      { name: "RAG" },
    ],
  },
  {
    id: "automation",
    title: "Automatización",
    primary: [
      { name: "n8n", icon: "/icons/stack/n8n.svg" },
      { name: "Docker / Compose", icon: "/icons/stack/docker.svg" },
      { name: "Git / GitHub", icon: "/icons/stack/git.svg" },
    ],
    additional: [
      { name: "Webhooks", icon: "/icons/stack/webhook.svg" },
      { name: "Traefik", icon: "/icons/stack/traefik.svg" },
      { name: "DigitalOcean", icon: "/icons/stack/digitalocean.svg" },
      { name: "Amazon SES / IAM", icon: "/icons/stack/amazon.svg" },
    ],
  },
  {
    id: "desktop",
    title: "Desktop",
    primary: [
      { name: "Kotlin", icon: "/icons/stack/kotlin.svg" },
      {
        name: "Compose Multiplatform",
        icon: "/icons/stack/compose.svg",
      },
      { name: "Java", icon: "/icons/stack/java.svg" },
    ],
    additional: [
      { name: "Gradle", icon: "/icons/stack/gradle.svg" },
      { name: "Maven", icon: "/icons/stack/maven.svg" },
    ],
  },
];
