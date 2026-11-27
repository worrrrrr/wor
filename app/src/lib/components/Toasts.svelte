<script lang="ts">
	import { page } from '$app/state';
	import { toasts } from '#lib/stores/toasts.svelte.ts';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';

	const onCode = $derived(page.url.pathname.startsWith('/code'));
</script>

<div
	class="pointer-events-none fixed inset-x-0 z-[80] flex flex-col items-center gap-2 px-4 {onCode
		? 'top-14'
		: 'bottom-4'}"
	aria-live="polite"
>
	{#each toasts.items as toast (toast.id)}
		<div
			class="toast animate-pop pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg px-3 py-2 text-[13px]"
		>
			{#if toast.kind === 'success'}
				<Check size={14} class="text-ok" />
			{:else if toast.kind === 'error'}
				<AlertCircle size={14} class="text-danger" />
			{:else}
				<span class="h-1.5 w-1.5 rounded-full bg-accent"></span>
			{/if}
			<span class="min-w-0 flex-1">{toast.message}</span>
			<button
				type="button"
				class="text-faint hover:text-fg"
				onclick={() => toasts.dismiss(toast.id)}
				aria-label="Dismiss"
			>
				<X size={13} />
			</button>
		</div>
	{/each}
</div>
