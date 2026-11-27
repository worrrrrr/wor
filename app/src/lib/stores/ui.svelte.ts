class UiStore {
	collapsed = $state(false);
	mobileOpen = $state(false);
	settingsOpen = $state(false);

	init() {
		if (typeof window === 'undefined') return;
		this.collapsed = localStorage.getItem('wor.sidebar') === 'collapsed';
	}

	toggleCollapsed() {
		this.collapsed = !this.collapsed;
		try {
			localStorage.setItem('wor.sidebar', this.collapsed ? 'collapsed' : 'open');
		} catch {
			// ignore
		}
	}

	openMobile() {
		this.mobileOpen = true;
	}

	closeMobile() {
		this.mobileOpen = false;
	}

	toggleMobile() {
		this.mobileOpen = !this.mobileOpen;
	}

	openSettings() {
		this.settingsOpen = true;
	}

	closeSettings() {
		this.settingsOpen = false;
	}
}

export const ui = new UiStore();
