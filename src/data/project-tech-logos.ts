import { projects } from "./projects";
import { getTechIcon, type TechIcon } from "./tech-icons";

export interface ProjectTechLogo {
  title: string;
  icon: TechIcon;
}

function cleanLabel(label: string): string {
  return label.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

function getCandidates(label: string): string[] {
  const raw = label.trim();
  if (!raw) return [];

  const splitBySpacedSlash = raw
    .split(/\s+\/\s+/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (splitBySpacedSlash.length <= 1) {
    return [raw];
  }

  // Prioritize split tokens ("Supabase", "PostgreSQL"), then fallback to raw.
  return [...splitBySpacedSlash, raw];
}

export function getProjectTechLogos(): ProjectTechLogo[] {
  const logos: ProjectTechLogo[] = [];
  const seen = new Set<string>();

  for (const project of projects) {
    for (const tag of project.stack) {
      for (const candidate of getCandidates(tag)) {
        const icon = getTechIcon(candidate);
        if (!icon) continue;

        const key = `${icon.kind}:${icon.value}`;
        if (seen.has(key)) continue;

        seen.add(key);
        logos.push({
          title: cleanLabel(candidate) || candidate,
          icon,
        });
      }
    }
  }

  return logos;
}
