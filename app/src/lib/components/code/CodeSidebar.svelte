<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { demoSessions } from '#lib/code/demo.ts';
	import type { SessionGroup, SessionItem } from '#lib/code/types.ts';
	import { models } from '#lib/stores/models.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';

	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import CircleExclamationPoint from '@lucide/svelte/icons/circle-exclamation-point';
	import FileDiff from '@lucide/svelte/icons/file-diff';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import Loader from '@lucide/svelte/icons/loader';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import Pin from '@lucide/svelte/icons/pin';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Settings from '@lucide/svelte/icons/settings';
	import X from '@lucide/svelte/icons/x';

	let {
		open = $bindable(true),
		mobileOpen = $bindable(false),
		activeId,
		onnew,
		onopen,
		onreview
	}: {
		open?: boolean;
		mobileOpen?: boolean;
		activeId: string;
		onnew: () => void;
		onopen: (item: SessionItem) => void;
		onreview: () => void;
	} = $props();

	let query = $state('');
	let filter = $state<'all' | 'working' | 'attention'>('all');

	const filtered = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		return demoSessions.filter((item) => {
			if (filter === 'working' && item.group !== 'Working') return false;
			if (filter === 'attention' && item.group !== 'Needs attention') return false;
			if (needle && !`${item.title} ${item.project}`.toLowerCase().includes(needle)) return false;
			return true;
		});
	});

	const groups = $derived.by(() => {
		const order: SessionGroup[] = ['Pinned', 'Needs attention', 'Working', 'Recent'];
		return order
			.map((label) => ({ label, items: filtered.filter((item) => item.group === label) }))
			.filter((group) => group.items.length > 0);
	});

	function pick(item: SessionItem) {
		onopen(item);
		mobileOpen = false;
	}
</script>

<aside
	class="fixed inset-y-0 left-0 z-40 flex w-[286px] shrink-0 flex-col border-r border-line bg-sidebar lg:static lg:z-auto {mobileOpen
		? 'translate-x-0'
		: '-translate-x-full lg:translate-x-0'}"
	aria-label="Code workspace navigation"
>
	<div class="flex items-center justify-between px-3 pt-3 pb-2">
		<a href="/project" class="flex min-w-0 items-center gap-2" aria-label="Wor projects">
			<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
				<Logo size={16} />
			</span>
			<span class="min-w-0">
				<span class="block font-serif text-[15px] leading-4 font-semibold tracking-tight">Wor</span>
				<span class="block text-[10px] font-medium tracking-[0.13em] text-faint uppercase">
					Code workspace
				</span>
			</span>
		</a>
		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={() => (open = false)}
				class="hidden h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface hover:text-fg lg:flex"
				aria-label="Collapse code sidebar"
				title="Collapse sidebar"
			>
				<PanelLeftClose size={15} />
			</button>
			<button
				type="button"
				onclick={() => (mobileOpen = false)}
				class="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface hover:text-fg lg:hidden"
				aria-label="Close code sidebar"
			>
				<X size={16} />
			</button>
		</div>
	</div>

	<div class="px-3 pb-2">
		<button
			type="button"
			onclick={onnew}
			class="flex w-full items-center justify-between rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-[12px] font-medium shadow-sm hover:border-accent/40 hover:bg-surface-2"
		>
			<span class="flex items-center gap-2"><Plus size={14} /> New session</span>
			<kbd class="rounded border border-line bg-bg px-1 py-0.5 font-sans text-[10px] text-faint">
				⌘N
			</kbd>
		</button>
	</div>

	<div class="grid grid-cols-2 gap-1 px-3 pb-3 text-[11px]">
		<a
			href="/project"
			class="flex flex-col items-center gap-1 rounded-md px-1 py-1.5 text-muted hover:bg-surface hover:text-fg"
		>
			<FolderKanban size={14} /> Projects
		</a>
		<button
			type="button"
			onclick={onreview}
			class="flex flex-col items-center gap-1 rounded-md px-1 py-1.5 text-muted hover:bg-surface hover:text-fg"
		>
			<FileDiff size={14} /> Review
		</button>
	</div>

	<div class="px-3 pb-2">
		<div class="relative">
			<Search
				size={13}
				class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint"
			/>
			<input
				bind:value={query}
				class="w-full rounded-lg border border-line bg-bg py-1.5 pr-2 pl-8 text-[12px] outline-none placeholder:text-faint focus:border-accent/60"
				placeholder="Search sessions"
				aria-label="Search sessions"
			/>
		</div>
	</div>

	<div class="flex items-center gap-1 px-3 pb-2">
		{#each [{ id: 'all', label: 'All' }, { id: 'working', label: 'Working' }, { id: 'attention', label: 'Attention' }] as item}
			<button
				type="button"
				onclick={() => (filter = item.id as typeof filter)}
				class="rounded-md px-2 py-1 text-[10.5px] font-medium {filter === item.id
					? 'bg-accent-soft text-accent'
					: 'text-faint hover:bg-surface hover:text-fg'}"
			>
				{item.label}
			</button>
		{/each}
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
		{#each groups as group}
			<div class="mb-2">
				<div class="flex items-center justify-between px-2 py-1">
					<span class="text-[10px] font-semibold tracking-[0.1em] text-faint uppercase">
						{group.label}
					</span>
					<span class="text-[10px] text-faint">{group.items.length}</span>
				</div>
				{#each group.items as item}
					<button
						type="button"
						onclick={() => pick(item)}
						class="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left {activeId ===
						item.id
							? 'bg-surface shadow-sm'
							: 'hover:bg-surface/70'}"
					>
						<span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
							{#if item.group === 'Working'}
								<Loader size={12} class="animate-spin text-accent" />
							{:else if item.group === 'Needs attention'}
								<CircleExclamationPoint size={12} class="text-danger" />
							{:else if item.group === 'Pinned'}
								<Pin size={12} class="text-accent" />
							{:else}
								<CircleDot size={11} class="text-faint" />
							{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[12px] font-medium">{item.title}</span>
							<span class="mt-0.5 flex items-center gap-1.5 text-[10px] text-faint">
								<span>{item.project}</span><span>·</span><span>{item.mode}</span><span>
									·
								</span><span>{item.age}</span>
							</span>
						</span>
						{#if item.unread}
							<span class="mt-1 h-1.5 w-1.5 rounded-full bg-accent"></span>
						{/if}
					</button>
				{/each}
			</div>
		{/each}
		{#if groups.length === 0}
			<p class="px-2 py-6 text-[11px] text-faint">No sessions match.</p>
		{/if}
	</div>

	<div class="border-t border-line px-3 py-2">
		<div class="flex items-center justify-between text-[10.5px] text-faint">
			<span class="flex items-center gap-1.5">
				<span class="h-1.5 w-1.5 rounded-full bg-ok"></span>
				{models.models.filter((model) => model.local).length} local models
			</span>
			<span>SQLite</span>
		</div>
		<div class="mt-1.5 flex items-center gap-1 text-faint">
			<button
				type="button"
				onclick={() => ui.openSettings()}
				class="rounded p-1.5 hover:bg-surface hover:text-fg"
				aria-label="Settings"
				title="Settings"
			>
				<Settings size={13} />
			</button>
			<ThemeToggle />
		</div>
	</div>
</aside>
