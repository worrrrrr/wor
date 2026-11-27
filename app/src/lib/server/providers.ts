import { asc, eq } from 'drizzle-orm';
import { db } from './db/index.ts';
import { providers } from './db/schema.ts';
import { decryptSecret, encryptSecret } from './secrets.ts';
import type { ModelInfo, ProviderModel, ProviderSummary } from '#lib/chat/types.ts';

type ProviderRow = typeof providers.$inferSelect;

const DEFAULT_CONTEXT = 131072;

function normalizeBaseUrl(value: string): string {
	const url = new URL(value.trim());
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Provider URL must start with http:// or https://.');
	}
	return url.toString().replace(/\/+$/, '');
}

export function parseProviderModels(raw: string): ProviderModel[] {
	try {
		const value = JSON.parse(raw) as unknown;
		if (!Array.isArray(value)) return [];
		return value
			.map((entry): ProviderModel | null => {
				if (!entry || typeof entry !== 'object') return null;
				const model = entry as Record<string, unknown>;
				if (typeof model.id !== 'string' || !model.id.trim()) return null;
				return {
					id: model.id.trim(),
					name:
						typeof model.name === 'string' && model.name.trim()
							? model.name.trim()
							: model.id.trim(),
					contextWindow:
						typeof model.contextWindow === 'number' && model.contextWindow > 0
							? model.contextWindow
							: DEFAULT_CONTEXT,
					tools: model.tools !== false,
					vision: model.vision === true
				};
			})
			.filter((model): model is ProviderModel => model !== null);
	} catch {
		return [];
	}
}

export function toProviderSummary(row: ProviderRow): ProviderSummary {
	return {
		id: row.id,
		name: row.name,
		baseUrl: row.baseUrl,
		hasKey: row.apiKey.length > 0,
		models: parseProviderModels(row.models),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export function listProviders(): ProviderSummary[] {
	return db.select().from(providers).orderBy(asc(providers.name)).all().map(toProviderSummary);
}

export function getProvider(id: string): ProviderRow | null {
	return db.select().from(providers).where(eq(providers.id, id)).get() ?? null;
}

export function createProvider(input: {
	name: string;
	baseUrl: string;
	apiKey?: string;
	models?: ProviderModel[];
}): ProviderSummary {
	const now = Date.now();
	const row: ProviderRow = {
		id: crypto.randomUUID(),
		name: input.name.replace(/\s+/g, ' ').trim().slice(0, 60),
		baseUrl: normalizeBaseUrl(input.baseUrl),
		apiKey: input.apiKey ? encryptSecret(input.apiKey.trim()) : '',
		models: JSON.stringify((input.models ?? []).slice(0, 200)),
		createdAt: now,
		updatedAt: now
	};
	if (!row.name) throw new Error('Provider name is required.');
	db.insert(providers).values(row).run();
	return toProviderSummary(row);
}

export function updateProvider(
	id: string,
	patch: {
		name?: string;
		baseUrl?: string;
		apiKey?: string;
		clearKey?: boolean;
		models?: ProviderModel[];
	}
): ProviderSummary | null {
	const existing = getProvider(id);
	if (!existing) return null;

	const values: Partial<ProviderRow> = { updatedAt: Date.now() };
	if (patch.name !== undefined) {
		const name = patch.name.replace(/\s+/g, ' ').trim().slice(0, 60);
		if (!name) return null;
		values.name = name;
	}
	if (patch.baseUrl !== undefined) values.baseUrl = normalizeBaseUrl(patch.baseUrl);
	if (patch.clearKey) values.apiKey = '';
	else if (patch.apiKey) values.apiKey = encryptSecret(patch.apiKey.trim());
	if (patch.models !== undefined) values.models = JSON.stringify(patch.models.slice(0, 200));

	const result = db.update(providers).set(values).where(eq(providers.id, id)).run();
	return result.changes > 0 ? toProviderSummary(getProvider(id)!) : null;
}

export function deleteProvider(id: string): boolean {
	return db.delete(providers).where(eq(providers.id, id)).run().changes > 0;
}

export function providerSecret(row: ProviderRow): string {
	return row.apiKey ? decryptSecret(row.apiKey) : '';
}

export function customProviderModels(): ModelInfo[] {
	const rows = db.select().from(providers).all();
	return rows.flatMap((row) =>
		parseProviderModels(row.models).map((model) => ({
			id: `custom:${row.id}:${model.id}`,
			provider: 'custom' as const,
			providerName: row.name,
			modelId: model.id,
			name: model.name,
			description: `OpenAI-compatible · ${new URL(row.baseUrl).host}`,
			contextWindow: model.contextWindow,
			tools: model.tools,
			vision: model.vision,
			local: false
		}))
	);
}

export function customModelTarget(id: string): {
	providerId: string;
	providerName: string;
	baseUrl: string;
	apiKey: string;
	modelId: string;
} | null {
	if (!id.startsWith('custom:')) return null;
	const rest = id.slice('custom:'.length);
	const separator = rest.indexOf(':');
	if (separator < 1) return null;
	const providerId = rest.slice(0, separator);
	const modelId = rest.slice(separator + 1);
	if (!modelId) return null;
	const row = getProvider(providerId);
	if (!row) return null;
	return {
		providerId,
		providerName: row.name,
		baseUrl: row.baseUrl,
		apiKey: providerSecret(row),
		modelId
	};
}

function modelIdsFromPayload(payload: unknown): string[] {
	const list = Array.isArray(payload)
		? payload
		: payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
			? (payload as { data: unknown[] }).data
			: payload &&
				  typeof payload === 'object' &&
				  Array.isArray((payload as { models?: unknown }).models)
				? (payload as { models: unknown[] }).models
				: [];

	const ids = list
		.map((entry) => {
			if (typeof entry === 'string') return entry;
			if (
				entry &&
				typeof entry === 'object' &&
				typeof (entry as { id?: unknown }).id === 'string'
			) {
				return (entry as { id: string }).id;
			}
			if (
				entry &&
				typeof entry === 'object' &&
				typeof (entry as { name?: unknown }).name === 'string'
			) {
				return (entry as { name: string }).name;
			}
			return null;
		})
		.filter((value): value is string => Boolean(value && value.trim()));

	return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

export async function discoverProviderModels(input: {
	baseUrl: string;
	apiKey?: string;
	providerId?: string;
}): Promise<ProviderModel[]> {
	const baseUrl = normalizeBaseUrl(input.baseUrl);
	let key = input.apiKey?.trim() ?? '';
	if (!key && input.providerId) {
		const row = getProvider(input.providerId);
		if (row) key = providerSecret(row);
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10_000);
	try {
		const response = await fetch(`${baseUrl}/models`, {
			headers: key ? { authorization: `Bearer ${key}` } : undefined,
			signal: controller.signal
		});
		if (!response.ok) {
			throw new Error(`Provider returned HTTP ${response.status} while listing models.`);
		}
		const ids = modelIdsFromPayload(await response.json()).filter(
			(id) => !/(embed|rerank|bge-)/i.test(id)
		);
		if (ids.length === 0) throw new Error('Provider returned no models.');
		return ids.slice(0, 200).map((id) => ({
			id,
			name: id,
			contextWindow: DEFAULT_CONTEXT,
			tools: true,
			vision: false
		}));
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error('Provider did not respond within 10 seconds.');
		}
		throw error;
	} finally {
		clearTimeout(timer);
	}
}
