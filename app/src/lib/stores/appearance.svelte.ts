export type Accent = 'terracotta' | 'violet' | 'teal' | 'blue' | 'green' | 'rose';
export type Motion = 'full' | 'reduced';

export const ACCENTS: { id: Accent; label: string; light: string; dark: string }[] = [
	{ id: 'terracotta', label: 'Terracotta', light: '#c96442', dark: '#e07a56' },
	{ id: 'violet', label: 'Violet', light: '#6b5bd2', dark: '#9a8df0' },
	{ id: 'teal', label: 'Teal', light: '#0f7f76', dark: '#4fc0b4' },
	{ id: 'blue', label: 'Blue', light: '#2f6fd0', dark: '#6fa8f0' },
	{ id: 'green', label: 'Green', light: '#3f7f5a', dark: '#6fb98c' },
	{ id: 'rose', label: 'Rose', light: '#b94a6b', dark: '#e07f9c' }
];

class AppearanceStore {
	accent = $state<Accent>('terracotta');
	motion = $state<Motion>('full');

	constructor() {
		if (typeof window === 'undefined') return;
		const accent = localStorage.getItem('wor.accent') as Accent | null;
		if (accent && ACCENTS.some((item) => item.id === accent)) this.accent = accent;
		if (localStorage.getItem('wor.motion') === 'reduced') this.motion = 'reduced';
		this.apply();
	}

	setAccent(accent: Accent) {
		this.accent = accent;
		this.store('wor.accent', accent);
		this.apply();
	}

	setMotion(motion: Motion) {
		this.motion = motion;
		this.store('wor.motion', motion);
		this.apply();
	}

	private store(key: string, value: string) {
		try {
			localStorage.setItem(key, value);
		} catch {
			// ignore
		}
	}

	private apply() {
		document.documentElement.dataset.accent = this.accent;
		document.documentElement.dataset.motion = this.motion;
	}
}

export const appearance = new AppearanceStore();
