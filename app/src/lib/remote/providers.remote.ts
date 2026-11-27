import { command, query } from '$app/server';
import { z } from 'zod';
import {
	createProvider,
	deleteProvider,
	discoverProviderModels,
	listProviders,
	updateProvider
} from '#lib/server/providers.ts';

const modelInput = z.object({
	id: z.string().trim().min(1).max(200),
	name: z.string().trim().min(1).max(200),
	contextWindow: z.number().int().positive().max(10_000_000),
	tools: z.boolean(),
	vision: z.boolean()
});

const providerInput = z.object({
	name: z.string().trim().min(1).max(60),
	baseUrl: z.string().trim().url(),
	apiKey: z.string().max(500).optional(),
	clearKey: z.boolean().optional(),
	models: z.array(modelInput).max(200)
});

export const getProviders = query(() => listProviders());

export const discoverModels = command(
	z.object({
		baseUrl: z.string().trim().url(),
		apiKey: z.string().max(500).optional(),
		providerId: z.string().min(1).optional()
	}),
	(input) => discoverProviderModels(input)
);

export const createProviderRecord = command(providerInput, (input) => createProvider(input));

export const updateProviderRecord = command(
	providerInput.partial().extend({ id: z.string().min(1) }),
	({ id, ...patch }) => updateProvider(id, patch)
);

export const deleteProviderRecord = command(z.string().min(1), (id) => {
	deleteProvider(id);
	return { id };
});
