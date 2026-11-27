import { query } from '$app/server';
import { z } from 'zod';
import { listModels } from '#lib/server/models.ts';

export const getModels = query(z.boolean().optional(), async (refresh) =>
	listModels(refresh ?? false)
);
