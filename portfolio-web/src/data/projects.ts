import { assetPath } from "@/lib/asset-path";
import { getProjectMedia } from "@/lib/project-media";

export interface Project {
  slug: string;
  title: string;
  category: string;
  description: string;
  image: string;
  imageAlt: string;
  preview: { src: string; alt: string; width: number; height: number };
  problem: string;
  contribution: string;
  /** Provisional copy for the shared detail template, visibly marked in the UI. */
  detailNote: string;
  technologies: string[];
}

const projectDefinitions: Project[] = [
  {
    slug: "sophos",
    title: "Sophos",
    category: "IA personal",
    description: "Un segundo cerebro personal con inteligencia artificial.",
    image: assetPath("/images/projects/sophos.svg"),
    imageAlt: "Logotipo de Sophos, Segundo Cerebro de IA personal",
    preview: {
      src: assetPath("/images/projects/capturas/sin-captura.svg"),
      alt: "Captura de Sophos pendiente",
      width: 1600,
      height: 1000,
    },
    problem: "Un segundo cerebro personal con inteligencia artificial.",
    contribution: "Diseño y desarrollo completos.",
    detailNote:
      "Ideas, notas y conexiones. Un lugar al que volver y seguir pensando.",
    technologies: [],
  },
  {
    slug: "loops-grooves",
    title: "Loops n’ Grooves",
    category: "E-commerce musical",
    description:
      "Una tienda de productos musicales con catálogo, filtros y carrito. El frontend en Astro se conecta con WordPress y WooCommerce.",
    image: assetPath("/images/projects/loops-grooves.svg"),
    imageAlt: "Logotipo azul de Loops n’ Grooves en forma de onda sonora",
    preview: {
      src: assetPath("/images/projects/capturas/sin-captura.svg"),
      alt: "Captura de Loops n’ Grooves pendiente",
      width: 1600,
      height: 1000,
    },
    problem:
      "Encontrar y comprar productos musicales con catálogo, filtros y carrito.",
    contribution: "Diseño y desarrollo completos.",
    detailNote: "Del catálogo al carrito, con la música en primer plano.",
    technologies: ["Astro", "TypeScript", "WordPress", "WooCommerce"],
  },
];

export const projects: Project[] = projectDefinitions.map((project) => {
  const cover = getProjectMedia(project.slug).find(
    (item) => item.type === "image",
  );
  return cover
    ? {
        ...project,
        preview: {
          ...project.preview,
          src: cover.src,
          alt: `Vista previa de ${project.title}`,
        },
      }
    : project;
});
