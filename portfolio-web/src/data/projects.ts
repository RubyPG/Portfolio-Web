import { assetPath } from "@/lib/asset-path";

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
  technologies: string[];
}

export const projects: Project[] = [
  {
    slug: "sophos",
    title: "Sophos",
    category: "IA personal",
    description: "Segundo Cerebro de IA personal.",
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
    technologies: ["Astro", "TypeScript", "WordPress", "WooCommerce"],
  },
];
