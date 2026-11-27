export type ThemeMode = 'system' | 'light' | 'dark';

class ThemeStore {
	mode = $state<ThemeMode>('system');
	resolved = $state<'light' | 'dark'>('light');
	private media: MediaQueryList | null = null;

	init() {
		if (typeof window === 'undefined') return;
		const stored = localStorage.getItem('wor.theme');
		this.mode = stored === 'light' || stored === 'dark' ? stored : 'system';
		this.media = window.matchMedia('(prefers-color-scheme: dark)');
		this.media.addEventListener('change', this.handleSystemChange);
		this.apply();
	}

	set(mode: ThemeMode) {
		this.mode = mode;
		try {
			localStorage.setItem('wor.theme', mode);
		} catch {
			// ignore
		}
		this.apply();
	}

	cycle() {
		const order: ThemeMode[] = ['system', 'light', 'dark'];
		this.set(order[(order.indexOf(this.mode) + 1) % order.length]);
	}

	private handleSystemChange = () => {
		if (this.mode === 'system') this.apply();
	};

	private apply() {
		const dark = this.mode === 'dark' || (this.mode === 'system' && (this.media?.matches ?? false));
		this.resolved = dark ? 'dark' : 'light';
		document.documentElement.dataset.theme = this.resolved;
		document.documentElement.style.colorScheme = this.resolved;
	}
}

export const theme = new ThemeStore();
