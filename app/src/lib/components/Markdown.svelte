<script lang="ts">
	import { renderMarkdown } from '#lib/markdown.ts';
	import { copyText } from '#lib/utils/clipboard.ts';
	import { toasts } from '#lib/stores/toasts.svelte.ts';

	let {
		text,
		streaming = false,
		class: className = ''
	}: { text: string; streaming?: boolean; class?: string } = $props();

	let html = $derived(renderMarkdown(text, !streaming));

	async function handleClick(event: MouseEvent) {
		const target = event.target as HTMLElement | null;
		const button = target?.closest<HTMLButtonElement>('[data-copy]');
		if (!button) return;
		const code = button.closest('.code-block')?.querySelector('code');
		const value = code?.textContent ?? '';
		const ok = await copyText(value);
		button.textContent = ok ? 'Copied' : 'Copy failed';
		if (!ok) toasts.push('Could not copy code. Select the block and copy manually.', 'error');
		setTimeout(() => (button.textContent = 'Copy'), 1400);
	}

	function handleCopyClicks(node: HTMLElement) {
		node.addEventListener('click', handleClick);
		return {
			destroy() {
				node.removeEventListener('click', handleClick);
			}
		};
	}
</script>

<div class="md {className}" use:handleCopyClicks>
	{@html html}
</div>
