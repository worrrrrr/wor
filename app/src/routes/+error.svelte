<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';

	const status = $derived(page.status);
	const message = $derived(
		page.error?.message ?? (status === 404 ? 'This page does not exist.' : 'Something went wrong.')
	);
</script>

<svelte:head><title>{status} · Wor</title></svelte:head>

<div class="flex h-dvh w-full flex-col items-center justify-center bg-bg px-6 text-center">
	<span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white">
		<Logo size={26} />
	</span>
	<p class="mt-5 font-mono text-[11px] tracking-[0.2em] text-faint uppercase">Error {status}</p>
	<h1 class="mt-2 font-serif text-2xl font-semibold">{message}</h1>
	<p class="mt-2 max-w-sm text-[13px] text-muted">
		The conversation may have been deleted, or the address is wrong.
	</p>
	<a
		href="/project"
		class="mt-6 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white hover:bg-accent-hover"
	>
		Back to chat
	</a>
</div>
