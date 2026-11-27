<script lang="ts">
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import Monitor from '@lucide/svelte/icons/monitor';
	import { theme } from '#lib/stores/theme.svelte.ts';

	const label = $derived(theme.mode === 'system' ? 'Theme: system' : `Theme: ${theme.mode}`);
</script>

<button
	type="button"
	onclick={() => theme.cycle()}
	title={`${label} — click to change`}
	aria-label={label}
	class="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-fg"
>
	{#if theme.mode === 'system'}
		<Monitor size={16} />
	{:else if theme.mode === 'dark'}
		<Moon size={16} />
	{:else}
		<Sun size={16} />
	{/if}
</button>
