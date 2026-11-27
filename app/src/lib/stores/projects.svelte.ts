import type { ProjectSummary } from '#lib/chat/types.ts';
import {
	createProject as createProjectRecord,
	deleteProject as deleteProjectRecord,
	getProjects,
	updateProject as updateProjectRecord
} from '#lib/remote/projects.remote.ts';

class ProjectStore {
	items = $state<ProjectSummary[]>([]);
	loading = $state(true);
	error = $state<string | null>(null);
	private requestId = 0;

	async load() {
		const request = ++this.requestId;
		try {
			const resource = getProjects();
			await resource.refresh();
			const items = await resource;
			if (request !== this.requestId) return;
			this.items = items;
			this.error = null;
		} catch (error) {
			if (request !== this.requestId) return;
			this.error = error instanceof Error ? error.message : 'Could not load projects.';
		} finally {
			if (request === this.requestId) this.loading = false;
		}
	}

	async create(input: {
		name: string;
		description?: string;
		instructions?: string;
	}): Promise<ProjectSummary> {
		const project = await createProjectRecord(input);
		this.items = [project, ...this.items];
		return project;
	}

	async update(
		id: string,
		input: { name?: string; description?: string; instructions?: string }
	): Promise<ProjectSummary> {
		const project = await updateProjectRecord({ id, ...input });
		if (!project) throw new Error('Project not found.');
		this.items = this.items.map((item) => (item.id === id ? project : item));
		return project;
	}

	async remove(id: string) {
		const previous = this.items;
		this.items = this.items.filter((item) => item.id !== id);
		try {
			await deleteProjectRecord(id);
		} catch {
			this.items = previous;
			throw new Error('Could not delete this project.');
		}
	}
}

export const projects = new ProjectStore();
