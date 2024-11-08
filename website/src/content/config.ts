import { defineCollection, z } from "astro:content";

const sessions = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		speaker: z.string(),
		speakerImageURL: z.string().optional(),
		date: z.coerce.date(),
		draft: z.boolean().optional(),
	}),
});

export const collections = { sessions };
