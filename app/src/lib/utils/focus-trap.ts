import { focusElement } from './focus.ts';

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusTrap(node: HTMLElement, initialSelector?: string) {
	const previouslyFocused =
		document.activeElement instanceof HTMLElement ? document.activeElement : null;

	function focusFirst() {
		const target =
			(initialSelector ? node.querySelector<HTMLElement>(initialSelector) : null) ??
			node.querySelector<HTMLElement>(FOCUSABLE);
		if (target) {
			focusElement(target);
		} else {
			node.tabIndex = -1;
			node.focus({ preventScroll: true });
		}
	}

	// Run synchronously, then again after any router focus reset. Animation
	// frames are throttled in background tabs and caused a visible delay.
	focusFirst();
	void Promise.resolve().then(focusFirst);
	const timer = setTimeout(focusFirst, 0);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;
		const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			(element) => element.offsetParent !== null
		);
		if (items.length === 0) {
			event.preventDefault();
			node.focus();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement;
		if (event.shiftKey && (active === first || !node.contains(active))) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && (active === last || !node.contains(active))) {
			event.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			clearTimeout(timer);
			node.removeEventListener('keydown', handleKeydown);
			previouslyFocused?.focus();
		}
	};
}
