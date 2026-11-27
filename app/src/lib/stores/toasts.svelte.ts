export type ToastKind = 'info' | 'success' | 'error';

export type Toast = {
	id: number;
	message: string;
	kind: ToastKind;
};

class ToastStore {
	items = $state<Toast[]>([]);
	private next = 0;

	push(message: string, kind: ToastKind = 'info') {
		const id = ++this.next;
		this.items = [...this.items, { id, message, kind }];
		setTimeout(() => this.dismiss(id), kind === 'error' ? 6000 : 3200);
	}

	dismiss(id: number) {
		this.items = this.items.filter((toast) => toast.id !== id);
	}
}

export const toasts = new ToastStore();
