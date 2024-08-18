import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    type: 'data',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        // Transform string to Date object
        // pubDate: z.coerce.date(),
        pubDate: z.string(),
        // updatedDate: z.coerce.date().optional(),
        thumbnail: z.string().optional(),
        link: z.string().optional(),
        i18n: z
            .object({
                fr: z
                    .object({
                        title: z.string().optional(),
                        description: z.string(),
                    })
                    .optional(),
            })
            .optional(),
    }),
});

export const collections = { blog };
