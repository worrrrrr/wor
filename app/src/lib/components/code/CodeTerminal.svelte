<script lang="ts">
	import { terminals } from '#lib/code/demo.ts';
	import type { TerminalTab } from '#lib/code/types.ts';

	import Bug from '@lucide/svelte/icons/bug';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import Layers from '@lucide/svelte/icons/layers';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import SquareTerminal from '@lucide/svelte/icons/square-terminal';
	import X from '@lucide/svelte/icons/x';

	let { open = $bindable(true) } = $props();

	let tab = $state<TerminalTab>('terminal');
	const items = [
		{ id: 'terminal' as const, label: 'Terminal', icon: SquareTerminal },
		{ id: 'output' as const, label: 'Output', icon: Layers },
		{ id: 'problems' as const, label: 'Problems', icon: Bug }
	];
</script>

{#if open}
	<div class="flex h-[168px] shrink-0 flex-col border-t border-line bg-surface">
		<div class="flex h-8 shrink-0 items-center gap-1 border-b border-line px-2">
			{#each items as item}
				{@const Icon = item.icon}
				<button
					type="button"
					onclick={() => (tab = item.id)}
					class="flex items-center gap-1.5 rounded px-2 py-1 text-[10.5px] {tab === item.id
						? 'bg-bg font-medium text-fg'
						: 'text-faint hover:text-fg'}"
					aria-pressed={tab === item.id}
				>
					<Icon size={12} />
					{item.label}
					{#if item.id === 'problems'}<span
							class="rounded-full bg-danger/15 px-1 text-[9px] text-danger"
						>
							2
						</span>{/if}
				</button>
			{/each}
			<span class="ml-auto flex items-center gap-1">
				<span class="hidden items-center gap-1 text-[9.5px] text-faint sm:flex">
					<CircleDot size={9} class="text-ok" /> wor
				</span>
				<button
					type="button"
					class="rounded p-1 text-faint hover:bg-bg hover:text-fg"
					aria-label="Maximize bottom panel"
				>
					<Maximize2 size={11} />
				</button>
				<button
					type="button"
					onclick={() => (open = false)}
					class="rounded p-1 text-faint hover:bg-bg hover:text-fg"
					aria-label="Close bottom panel"
				>
					<X size={11} />
				</button>
			</span>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[10.5px] leading-5">
			{#each terminals[tab] as line}
				<div class="flex gap-2">
					{#if line.prompt}<span class="shrink-0 text-accent">{line.prompt} $</span>{/if}
					<span
						class="whitespace-pre-wrap {line.prompt === 'warn'
							? 'text-danger'
							: line.prompt
								? 'text-fg'
								: 'text-muted'}"
					>
						{line.text}
					</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
