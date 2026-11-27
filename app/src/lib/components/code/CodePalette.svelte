<script lang="ts">
	import { focusTrap } from '#lib/utils/focus-trap.ts';

	import Code from '@lucide/svelte/icons/code';
	import Columns2 from '@lucide/svelte/icons/columns-2';
	import FileDiff from '@lucide/svelte/icons/file-diff';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Terminal from '@lucide/svelte/icons/terminal';

	let {
		open = $bindable(false),
		onaction
	}: {
		open?: boolean;
		onaction: (action: string) => void;
	} = $props();

	let query = $state('');

	const allCommands = [
		{ group: 'Session', label: 'New session', hint: '⌘ N', action: 'new' },
		{ group: 'Session', label: 'Open review panel', hint: '⌘ ⇧ R', action: 'review' },
		{ group: 'Session', label: 'Toggle terminal', hint: '⌘ J', action: 'terminal' },
		{ group: 'View', label: 'Open changes', hint: '', action: 'split' },
		{ group: 'View', label: 'Focus composer', hint: '⌘ L', action: 'composer' },
		{ group: 'Project', label: 'Open project workspace', hint: '', action: 'project' }
	];

	const commands = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		return needle
			? allCommands.filter((item) => `${item.group} ${item.label}`.toLowerCase().includes(needle))
			: allCommands;
	});

	function run(action: string) {
		open = false;
		query = '';
		onaction(action);
	}
</script>

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]"
		aria-label="Close command palette"
		onclick={() => (open = false)}
	></button>
	<div
		class="menu-panel fixed inset-x-3 top-[12vh] z-50 mx-auto max-w-[560px] overflow-hidden p-0"
		role="dialog"
		aria-modal="true"
		aria-label="Command palette"
		use:focusTrap={'#palette-input'}
	>
		<div class="flex items-center gap-2 border-b border-line px-3">
			<Search size={14} class="text-faint" />
			<input
				id="palette-input"
				bind:value={query}
				class="h-11 min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-faint"
				placeholder="Search sessions, files, commands…"
				aria-label="Search commands"
			/>
			<kbd class="rounded border border-line bg-bg px-1.5 py-0.5 text-[9.5px] text-faint">esc</kbd>
		</div>
		<div class="max-h-[340px] overflow-y-auto p-1.5">
			{#each commands as command}
				<button
					type="button"
					onclick={() => run(command.action)}
					class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-surface-2"
				>
					<span class="flex h-5 w-5 items-center justify-center rounded bg-bg text-faint">
						{#if command.action === 'new'}<Plus size={11} />
						{:else if command.action === 'review'}<FileDiff size={11} />
						{:else if command.action === 'terminal'}<Terminal size={11} />
						{:else if command.action === 'split'}<Columns2 size={11} />
						{:else if command.action === 'composer'}<Code size={11} />
						{:else}<FolderKanban size={11} />{/if}
					</span>
					<span class="text-[11.5px]">{command.label}</span>
					<span class="ml-auto text-[9.5px] text-faint">{command.group}</span>
					{#if command.hint}<kbd class="text-[9.5px] text-faint">{command.hint}</kbd>{/if}
				</button>
			{/each}
			{#if commands.length === 0}<p class="px-3 py-6 text-center text-[11px] text-faint">
					No commands match.
				</p>{/if}
		</div>
		<div class="flex items-center gap-3 border-t border-line px-3 py-1.5 text-[9.5px] text-faint">
			<span>↑↓ navigate</span><span>↵ open</span><span class="ml-auto">Wor Code</span>
		</div>
	</div>
{/if}
