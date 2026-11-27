import {
	createProviderRecord,
	deleteProviderRecord,
	discoverModels,
	getProviders,
	updateProviderRecord
} from '#lib/remote/providers.remote.ts';
import type { ProviderModel, ProviderSummary } from '#lib/chat/types.ts';
import { models } from './models.svelte.ts';

type ProviderInput = {
	name: string;
	baseUrl: string;
	apiKey?: string;
	clearKey?: boolean;
	models: ProviderModel[];
};

class ProviderStore {
	items = $state<ProviderSummary[]>([]);
	loading = $state(true);
	error = $state<string | null>(null);
	private requestId = 0;

	async load() {
		const request = ++this.requestId;
		try {
			const resource = getProviders();
			await resource.refresh();
			const data = await resource;
			if (request !== this.requestId) return;
			this.items = data;
			this.error = null;
		} catch (error) {
			if (request !== this.requestId) return;
			this.error = error instanceof Error ? error.message : 'Could not load providers.';
		} finally {
			if (request === this.requestId) this.loading = false;
		}
	}

	async create(input: ProviderInput): Promise<ProviderSummary> {
		const result = await createProviderRecord(input);
		this.items = [...this.items, result].sort((a, b) => a.name.localeCompare(b.name));
		await models.load(true);
		return result;
	}

	async update(id: string, patch: Partial<ProviderInput>): Promise<ProviderSummary> {
		const result = await updateProviderRecord({ id, ...patch });
		if (!result) throw new Error('This provider no longer exists.');
		this.items = this.items
			.map((item) => (item.id === id ? result : item))
			.sort((a, b) => a.name.localeCompare(b.name));
		await models.load(true);
		return result;
	}

	async remove(id: string) {
		const previous = this.items;
		this.items = this.items.filter((item) => item.id !== id);
		try {
			await deleteProviderRecord(id);
			await models.load(true);
		} catch (error) {
			this.items = previous;
			throw error;
		}
	}

	async discover(input: {
		baseUrl: string;
		apiKey?: string;
		providerId?: string;
	}): Promise<ProviderModel[]> {
		return discoverModels(input);
	}
}

export const providers = new ProviderStore();
