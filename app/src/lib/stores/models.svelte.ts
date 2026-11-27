import type { ModelInfo, ModelsResponse } from '#lib/chat/types.ts';
import { getModels } from '#lib/remote/models.remote.ts';

class ModelStore {
	models = $state<ModelInfo[]>([]);
	providers = $state<ModelsResponse['providers']>([]);
	defaultModel = $state<string | null>(null);
	selected = $state<string>('');
	loading = $state(true);
	error = $state<string | null>(null);

	constructor() {
		if (typeof window !== 'undefined') {
			this.selected = localStorage.getItem('wor.model') ?? '';
		}
	}

	get active(): ModelInfo | undefined {
		return (
			this.models.find((model) => model.id === this.selected) ??
			this.models.find((model) => model.id === this.defaultModel) ??
			this.models[0]
		);
	}

	get localOnline(): boolean {
		return this.providers.find((provider) => provider.id === 'ollama')?.online ?? false;
	}

	select(id: string) {
		this.selected = id;
		try {
			localStorage.setItem('wor.model', id);
		} catch {
			// Storage can be unavailable in private mode.
		}
	}

	async load(force = false) {
		this.loading = true;
		try {
			const resource = getModels(force);
			if (force) await resource.refresh();
			const data = await resource;
			this.models = data.models;
			this.providers = data.providers;
			this.defaultModel = data.defaultModel;
			this.error = null;

			const stillValid = data.models.some((model) => model.id === this.selected);
			if (!stillValid) {
				this.selected = data.defaultModel ?? data.models[0]?.id ?? '';
			}
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Could not load models.';
		} finally {
			this.loading = false;
		}
	}
}

export const models = new ModelStore();
