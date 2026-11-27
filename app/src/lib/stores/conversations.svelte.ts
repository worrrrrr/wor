import type { ConversationSummary } from '#lib/chat/types.ts';
import { deleteSession, getSessions, updateSession } from '#lib/remote/conversations.remote.ts';

class ConversationStore {
	items = $state<ConversationSummary[]>([]);
	activeId = $state<string | null>(null);
	loading = $state(true);
	error = $state<string | null>(null);
	private requestId = 0;

	async load() {
		const request = ++this.requestId;
		try {
			const resource = getSessions();
			await resource.refresh();
			const items = await resource;
			if (request !== this.requestId) return;
			this.items = items;
			this.error = null;
		} catch (error) {
			if (request !== this.requestId) return;
			this.error = error instanceof Error ? error.message : 'Could not load chats.';
		} finally {
			if (request === this.requestId) this.loading = false;
		}
	}

	async update(id: string, input: { title: string; projectId: string | null }) {
		const previous = this.items;
		this.items = this.items.map((item) =>
			item.id === id ? { ...item, title: input.title, projectId: input.projectId } : item
		);
		try {
			const result = await updateSession({ id, ...input });
			if (!result) throw new Error('Missing session');
		} catch {
			this.items = previous;
			throw new Error('Could not update this chat.');
		}
	}

	async remove(id: string) {
		const previous = this.items;
		this.items = this.items.filter((item) => item.id !== id);
		try {
			await deleteSession(id);
		} catch {
			this.items = previous;
			throw new Error('Could not delete this chat.');
		}
	}

	applyTitle(id: string, title: string) {
		this.items = this.items.map((item) => (item.id === id ? { ...item, title } : item));
	}
}

export const conversations = new ConversationStore();
