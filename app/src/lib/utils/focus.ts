export function focusElement(target: string | HTMLElement | null, root: ParentNode = document) {
	const element = typeof target === 'string' ? root.querySelector<HTMLElement>(target) : target;
	if (!element) return false;
	element.focus({ preventScroll: true });
	return document.activeElement === element;
}

/**
 * Focus a target immediately, then again on the microtask and next task so a
 * router focus reset cannot leave the dialog on <body>. No animation frames:
 * background tabs throttle them, which made dialog focus feel delayed.
 */
export function focusWhenReady(target: string | HTMLElement | null, root: ParentNode = document) {
	focusElement(target, root);
	void Promise.resolve().then(() => focusElement(target, root));
	const timer = setTimeout(() => focusElement(target, root), 0);
	return () => clearTimeout(timer);
}
