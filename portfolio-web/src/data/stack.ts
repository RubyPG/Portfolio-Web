import { assetPath } from "@/lib/asset-path";

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
      { name: "Next.js", icon: assetPath("/icons/stack/nextjs.svg") },
      { name: "React", icon: assetPath("/icons/stack/react.svg") },
      { name: "TypeScript", icon: assetPath("/icons/stack/typescript.svg") },
      { name: "Astro", icon: assetPath("/icons/stack/astro.svg") },
      { name: "Tailwind CSS", icon: assetPath("/icons/stack/tailwind.svg") },
      { name: "GSAP", icon: assetPath("/icons/stack/gsap.svg") },
    ],
    additional: [
      { name: "HTML5 / CSS3", icon: assetPath("/icons/stack/html.svg") },
      {
        name: "WordPress headless",
        icon: assetPath("/icons/stack/wordpress.svg"),
      },
      {
        name: "WooCommerce API",
        icon: assetPath("/icons/stack/woocommerce.svg"),
      },
    ],
  },
  {
    id: "backend",
    title: "Backend y datos",
    primary: [
      { name: "Supabase", icon: assetPath("/icons/stack/supabase.svg") },
      { name: "PostgreSQL", icon: assetPath("/icons/stack/postgresql.svg") },
      { name: "Stripe", icon: assetPath("/icons/stack/stripe.svg") },
      { name: "Firebase", icon: assetPath("/icons/stack/firebase.svg") },
    ],
    additional: [
      { name: "RLS", icon: assetPath("/icons/stack/rlsRealtime.svg") },
      { name: "REST APIs", icon: assetPath("/icons/stack/restApi.svg") },
      { name: "SQL / RPC", icon: assetPath("/icons/stack/sqlRpc.svg") },
    ],
  },
  {
    id: "ai",
    title: "Inteligencia artificial",
    primary: [
      { name: "Claude Code", icon: assetPath("/icons/stack/claudecode.svg") },
      { name: "Codex", icon: assetPath("/icons/stack/codex.svg") },
      { name: "Hermes Agent", icon: assetPath("/icons/stack/hermes.svg") },
    ],
    additional: [
      { name: "Agent Skills" },
      { name: "MCP", icon: assetPath("/icons/stack/mcp.svg") },
      { name: "Subagentes & Workflows" },
      { name: "Claude API", icon: assetPath("/icons/stack/claude.svg") },
      { name: "Context Engineering" },
      { name: "RAG" },
    ],
  },
  {
    id: "automation",
    title: "Automatización",
    primary: [
      { name: "n8n", icon: assetPath("/icons/stack/n8n.svg") },
      { name: "Docker / Compose", icon: assetPath("/icons/stack/docker.svg") },
      { name: "Git / GitHub", icon: assetPath("/icons/stack/git.svg") },
    ],
    additional: [
      { name: "Webhooks", icon: assetPath("/icons/stack/webhook.svg") },
      { name: "Traefik", icon: assetPath("/icons/stack/traefik.svg") },
      {
        name: "DigitalOcean",
        icon: assetPath("/icons/stack/digitalocean.svg"),
      },
      { name: "Amazon SES / IAM", icon: assetPath("/icons/stack/amazon.svg") },
    ],
  },
  {
    id: "desktop",
    title: "Desktop",
    primary: [
      { name: "Kotlin", icon: assetPath("/icons/stack/kotlin.svg") },
      {
        name: "Compose Multiplatform",
        icon: assetPath("/icons/stack/compose.svg"),
      },
      { name: "Java", icon: assetPath("/icons/stack/java.svg") },
    ],
    additional: [
      { name: "Gradle", icon: assetPath("/icons/stack/gradle.svg") },
      { name: "Maven", icon: assetPath("/icons/stack/maven.svg") },
    ],
  },
];
