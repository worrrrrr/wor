<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import SettingsDialog from '#lib/components/SettingsDialog.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import { theme } from '#lib/stores/theme.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';
	import { models } from '#lib/stores/models.svelte.ts';
	import { conversations } from '#lib/stores/conversations.svelte.ts';
	import { projects } from '#lib/stores/projects.svelte.ts';

	let { children }: LayoutProps = $props();

	const isCode = $derived(page.url.pathname.startsWith('/code'));
	const projectName = $derived((page.data as { project?: { name: string } }).project?.name ?? null);
	const pageTitle = $derived(
		isCode
			? 'Code workspace · Wor'
			: page.url.pathname.startsWith('/project')
				? projectName
					? `${projectName} · Wor`
					: 'Projects · Wor'
				: page.url.pathname.startsWith('/agent')
					? 'New agent · Wor'
					: page.url.pathname === '/chat'
						? 'New chat · Wor'
						: 'Wor — Local AI workspace'
	);

	onMount(() => {
		theme.init();
		ui.init();
		void models.load();
		void conversations.load();
		void projects.load();
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && ui.mobileOpen) {
			ui.closeMobile();
			return;
		}
		if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
			event.preventDefault();
			window.location.assign('/chat');
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{pageTitle}</title>
	<meta
		name="description"
		content="A local-first AI workspace for chat, agents, projects and custom model providers."
	/>
</svelte:head>

<div class="flex h-dvh w-full overflow-hidden">
	{#if !isCode}
		{#if !ui.collapsed || ui.mobileOpen}
			<Sidebar />
		{/if}
		{#if ui.collapsed}
			<div
				class="hidden w-11 shrink-0 flex-col items-center gap-3 border-r border-line bg-sidebar pt-3 md:flex"
			>
				<button
					type="button"
					onclick={() => ui.toggleCollapsed()}
					class="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface hover:text-fg"
					aria-label="Expand sidebar"
					title="Expand sidebar"
				>
					<PanelLeftOpen size={15} />
				</button>
				<a
					href="/project"
					class="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white"
					aria-label="Wor projects"
				>
					<Logo size={15} />
				</a>
			</div>
		{/if}
	{/if}
	<main class="flex min-w-0 flex-1" inert={ui.mobileOpen}>
		{@render children()}
	</main>
</div>

<Toasts />
<SettingsDialog />
