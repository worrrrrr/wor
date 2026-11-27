export type LayoutKey = 'codeRight' | 'codeBottom' | 'chatInspector';

type LayoutState = Record<LayoutKey, boolean | null>;

const EMPTY: LayoutState = { codeRight: null, codeBottom: null, chatInspector: null };

class LayoutStore {
	state = $state<LayoutState>({ ...EMPTY });

	constructor() {
		if (typeof window === 'undefined') return;
		try {
			const raw = localStorage.getItem('wor.layout');
			if (!raw) return;
			const parsed = JSON.parse(raw) as Partial<LayoutState>;
			for (const key of Object.keys(EMPTY) as LayoutKey[]) {
				if (typeof parsed[key] === 'boolean') this.state[key] = parsed[key] as boolean;
			}
		} catch {
			// ignore corrupt value
		}
	}

	get(key: LayoutKey, fallback: boolean): boolean {
		return this.state[key] ?? fallback;
	}

	set(key: LayoutKey, value: boolean) {
		if (this.state[key] === value) return;
		this.state[key] = value;
		try {
			localStorage.setItem('wor.layout', JSON.stringify(this.state));
		} catch {
			// ignore
		}
	}
}

export const layout = new LayoutStore();
