/* ── Content Collections configuration ── */

import { defineCollection, z } from 'astro:content';

const casesCollection = defineCollection({
    type: 'content',
    schema: z.object({
        caseSlug: z.string(),
        title: z.string(),
        summary: z.string(),
        type: z.string(),
        year: z.string(),
        status: z.string(),
        role: z.string(),
        stack: z.array(z.string()),
        tags: z.array(z.string()),
        cover: z.string().optional(),
        links: z
            .object({
                repo: z.string().nullable().optional(),
                demo: z.string().nullable().optional(),
                docs: z.string().nullable().optional(),
            })
            .optional(),
        gallery: z
            .array(
                z.object({
                    image: z.string(),
                    alt: z.string(),
                    title: z.string(),
                    description: z.string(),
                    label: z.string().optional(),
                })
            )
            .optional(),
    }),
});

export const collections = {
    cases: casesCollection,
};
