<script lang="ts">
	import type { SessionTab } from '#lib/code/types.ts';

	import Command from '@lucide/svelte/icons/command';
	import FileCode from '@lucide/svelte/icons/file-code';
	import GitCompare from '@lucide/svelte/icons/git-compare';
	import Loader from '@lucide/svelte/icons/loader';
	import PanelBottom from '@lucide/svelte/icons/panel-bottom';
	import PanelBottomClose from '@lucide/svelte/icons/panel-bottom-close';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';

	let {
		tabs,
		activeId,
		leftOpen,
		bottomOpen,
		rightOpen,
		onselect,
		onclose,
		onnew,
		onopensidebar,
		onopenmobile,
		oncommand,
		ontogglebottom,
		ontoggleinspector
	}: {
		tabs: SessionTab[];
		activeId: string;
		leftOpen: boolean;
		bottomOpen: boolean;
		rightOpen: boolean;
		onselect: (id: string) => void;
		onclose: (id: string) => void;
		onnew: () => void;
		onopensidebar: () => void;
		onopenmobile: () => void;
		oncommand: () => void;
		ontogglebottom: () => void;
		ontoggleinspector: () => void;
	} = $props();
</script>

<header
	class="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-surface/80 px-2 backdrop-blur"
>
	{#if !leftOpen}
		<button
			type="button"
			onclick={onopensidebar}
			class="hidden h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-bg hover:text-fg lg:flex"
			aria-label="Open code sidebar"
		>
			<PanelLeft size={15} />
		</button>
	{/if}
	<button
		type="button"
		onclick={onopenmobile}
		class="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-bg hover:text-fg lg:hidden"
		aria-label="Open code navigation"
	>
		<PanelLeft size={15} />
	</button>

	<div class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
		{#each tabs as tab (tab.id)}
			<div
				class="group flex h-8 max-w-[220px] min-w-0 shrink-0 items-center rounded-md border text-[11.5px] {activeId ===
				tab.id
					? 'border-line-strong bg-bg shadow-sm'
					: 'border-transparent text-muted hover:bg-bg/60'}"
			>
				<button
					type="button"
					onclick={() => onselect(tab.id)}
					class="flex min-w-0 flex-1 items-center gap-1.5 px-2 text-left"
				>
					{#if tab.status === 'working'}
						<Loader size={11} class="shrink-0 animate-spin text-accent" />
					{:else if tab.status === 'review'}
						<GitCompare size={11} class="shrink-0 text-accent" />
					{:else}
						<FileCode size={11} class="shrink-0 text-faint" />
					{/if}
					<span class="truncate">{tab.title}</span>
					{#if tab.dirty}<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"></span>{/if}
				</button>
				<button
					type="button"
					onclick={() => onclose(tab.id)}
					class="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-faint opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-fg"
					aria-label="Close {tab.title}"
				>
					<X size={11} />
				</button>
			</div>
		{/each}
		<button
			type="button"
			onclick={onnew}
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-faint hover:bg-bg hover:text-fg"
			aria-label="New tab"
		>
			<Plus size={14} />
		</button>
	</div>

	<span
		class="hidden items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.08em] text-accent uppercase sm:flex"
	>
		Preview
	</span>
	<button
		type="button"
		onclick={oncommand}
		class="hidden h-7 items-center gap-1 rounded-md border border-line bg-bg px-2 text-[10.5px] text-faint hover:text-fg md:flex"
		aria-label="Open command palette"
	>
		<Command size={12} /> K
	</button>
	<button
		type="button"
		onclick={ontogglebottom}
		class="flex h-7 w-7 items-center justify-center rounded-md {bottomOpen
			? 'bg-accent-soft text-accent'
			: 'text-faint hover:bg-bg hover:text-fg'}"
		aria-label="Toggle bottom panel"
		aria-pressed={bottomOpen}
	>
		{#if bottomOpen}<PanelBottomClose size={15} />{:else}<PanelBottom size={15} />{/if}
	</button>
	<button
		type="button"
		onclick={ontoggleinspector}
		class="flex h-7 w-7 items-center justify-center rounded-md {rightOpen
			? 'bg-accent-soft text-accent'
			: 'text-faint hover:bg-bg hover:text-fg'}"
		aria-label="Toggle inspector"
		aria-pressed={rightOpen}
	>
		{#if rightOpen}<PanelRightClose size={15} />{:else}<PanelRight size={15} />{/if}
	</button>
</header>
