<script lang="ts">
	import {
		diffLines,
		demoPlugins,
		demoToolState,
		demoTools,
		sessionCounters,
		stats,
		timeBreakdown,
		trajectory
	} from '#lib/code/demo.ts';
	import type { DiffMode, InspectorTab, ReviewScope } from '#lib/code/types.ts';
	import { toasts } from '#lib/stores/toasts.svelte.ts';

	import X from '@lucide/svelte/icons/x';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Columns2 from '@lucide/svelte/icons/columns-2';
	import FileCode from '@lucide/svelte/icons/file-code';
	import FileDiff from '@lucide/svelte/icons/file-diff';
	import FileText from '@lucide/svelte/icons/file-text';
	import Folder from '@lucide/svelte/icons/folder';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import Minimize2 from '@lucide/svelte/icons/minimize-2';
	import Plug from '@lucide/svelte/icons/plug';
	import Route from '@lucide/svelte/icons/route';
	import Rows2 from '@lucide/svelte/icons/rows-2';
	import Wrench from '@lucide/svelte/icons/wrench';

	let {
		open = $bindable(false),
		wide = false,
		width = $bindable(340),
		tab = $bindable<InspectorTab>('trajectory')
	} = $props();

	let reviewScope = $state<ReviewScope>('session');
	let diffMode = $state<DiffMode>('unified');
	let toolEnabled = $state<Record<string, boolean>>({ ...demoToolState });
	let expandedFolders = $state<Record<string, boolean>>({ server: true, routes: true });
	let activeFile = $state('src/lib/server/auth.ts');

	const reviewWide = $derived(width >= 420);
	const splitRows = $derived(
		diffLines.map((line) => ({
			old: line.type === 'add' ? null : line.old,
			new: line.type === 'del' ? null : line.new,
			oldText: line.type === 'add' ? '' : line.text,
			newText: line.type === 'del' ? '' : line.text,
			type: line.type
		}))
	);

	function toggleFolder(name: string) {
		expandedFolders[name] = !expandedFolders[name];
	}

	function startResize(event: PointerEvent) {
		event.preventDefault();
		const startX = event.clientX;
		const startWidth = width;
		const onMove = (moveEvent: PointerEvent) => {
			width = Math.min(520, Math.max(280, startWidth - (moveEvent.clientX - startX)));
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	function acceptAll() {
		toasts.push('All changes accepted in this preview.', 'success');
	}

	function rejectAll() {
		toasts.push('All changes rejected in this preview.', 'error');
	}
</script>

{#if open && !wide}
	<button
		type="button"
		class="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] 2xl:hidden"
		aria-label="Close inspector"
		onclick={() => (open = false)}
	></button>
{/if}

{#if open}
	<aside
		class="fixed inset-y-0 right-0 z-40 flex w-[min(92vw,380px)] shrink-0 flex-col overflow-hidden border-l border-line bg-surface 2xl:static 2xl:z-auto"
		style={wide ? `width: ${width}px` : undefined}
		aria-label="Inspector"
	>
		<button
			type="button"
			onpointerdown={startResize}
			class="absolute inset-y-0 left-0 z-10 hidden w-1 -translate-x-1/2 cursor-col-resize bg-transparent hover:bg-accent/40 2xl:block"
			aria-label="Resize inspector"
		></button>

		<div class="flex h-9 shrink-0 items-center border-b border-line pr-1">
			<div class="grid min-w-0 flex-1 grid-cols-3 text-[10.5px]">
				{#each [{ id: 'trajectory', label: 'Trajectory', icon: Route }, { id: 'statistics', label: 'Statistics', icon: ChartColumn }, { id: 'inspector', label: 'Changes', icon: FileDiff }] as item}
					{@const Icon = item.icon}
					<button
						type="button"
						onclick={() => (tab = item.id as InspectorTab)}
						class="flex h-9 items-center justify-center gap-1.5 border-b-2 px-1 text-center {tab ===
						item.id
							? 'border-accent font-medium text-fg'
							: 'border-transparent text-faint hover:text-muted'}"
						title={item.label}
						aria-label={item.label}
						aria-pressed={tab === item.id}
					>
						<Icon size={13} />
						{#if tab === item.id}<span>{item.label}</span>{/if}
					</button>
				{/each}
			</div>
			<div class="flex shrink-0 items-center gap-0.5 pl-1">
				<button
					type="button"
					onclick={() => (width = reviewWide ? 340 : 520)}
					class="rounded p-1 text-faint hover:bg-bg hover:text-fg"
					aria-label={reviewWide ? 'Restore inspector width' : 'Expand inspector'}
				>
					{#if reviewWide}<Minimize2 size={12} />{:else}<Maximize2 size={12} />{/if}
				</button>
				<button
					type="button"
					onclick={() => (open = false)}
					class="rounded p-1 text-faint hover:bg-bg hover:text-fg"
					aria-label="Close inspector"
				>
					<X size={13} />
				</button>
			</div>
		</div>

		{#if tab === 'trajectory'}
			<div class="flex min-h-0 flex-1 flex-col">
				<div class="shrink-0 border-b border-line px-3 py-2">
					<div class="flex items-center justify-between text-[10px]">
						<span class="font-medium">Turn 1</span>
						<span class="text-faint">18.4k in · 2.3k out · 4m 12s</span>
					</div>
					<div class="mt-2 flex h-1.5 overflow-hidden rounded-full bg-bg">
						<span class="w-[18%] bg-accent" title="Think 2.1s"></span>
						<span class="w-[48%] bg-ok" title="Tools 3.7s"></span>
						<span class="w-[22%] bg-warn" title="Write 0.4s"></span>
						<span class="w-[12%] bg-line-strong" title="Wait"></span>
					</div>
					<div class="mt-1.5 flex gap-3 text-[9px] text-faint">
						<span>
							<i class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-accent"></i>Think 2.1s
						</span>
						<span><i class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-ok"></i>Tools 3.7s</span>
						<span>
							<i class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-warn"></i>Write 0.4s
						</span>
					</div>
				</div>
				<div
					class="flex shrink-0 items-center gap-2 border-b border-line px-3 py-1.5 text-[9px] tracking-wide text-faint uppercase"
				>
					<span class="w-4">#</span>
					<span class="w-[54px]">Kind</span>
					<span class="flex-1">Step</span>
					<span>Time</span>
				</div>
				<div class="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
					{#each trajectory as step}
						<div class="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-bg/60">
							<span class="w-4 shrink-0 text-[9px] text-faint">{step.index}</span>
							<span
								class="w-[54px] shrink-0 truncate text-[9px] font-medium {step.kind === 'Patch'
									? 'text-ok'
									: step.kind === 'Approval'
										? 'text-warn'
										: step.kind === 'Request'
											? 'text-accent'
											: 'text-muted'}"
							>
								{step.kind}
							</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-[10.5px]">{step.text}</span>
								<span class="mt-0.5 block truncate text-[9px] text-faint">{step.meta}</span>
							</span>
							<span class="shrink-0 text-[9px] text-faint">{step.time}</span>
						</div>
					{/each}
				</div>
				<div
					class="flex shrink-0 items-center justify-between border-t border-line px-3 py-2 text-[9px] text-faint"
				>
					<span>8 records · 1 turn</span>
					<span>Follows tail while streaming</span>
				</div>
			</div>
		{:else if tab === 'statistics'}
			<div class="min-h-0 flex-1 overflow-y-auto p-3">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-[10px] font-medium tracking-wide text-faint uppercase">
						Session statistics
					</span>
					<span class="text-[9px] text-faint">LFM 3 · 1.7B</span>
				</div>
				<div class="grid grid-cols-2 gap-1.5">
					{#each stats as stat}
						<div class="rounded-lg border border-line bg-bg/50 p-2">
							<div class="text-[9px] text-faint">{stat.label}</div>
							<div class="mt-0.5 text-[15px] font-medium tabular-nums">{stat.value}</div>
							<div class="text-[9px] text-faint">{stat.detail}</div>
						</div>
					{/each}
				</div>

				<div class="mt-2 rounded-lg border border-line p-2.5">
					<div class="flex items-center justify-between text-[9px] text-faint">
						<span>Context window</span>
						<span>41,230 / 128,000</span>
					</div>
					<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg">
						<span class="block h-full w-[32%] rounded-full bg-accent"></span>
					</div>
					<div class="mt-1 text-[9px] text-faint">32% used · 86,770 remaining</div>
				</div>

				<div class="mt-2 rounded-lg border border-line p-2.5">
					<div class="text-[9px] tracking-wide text-faint uppercase">Time breakdown</div>
					{#each timeBreakdown as row}
						<div class="mt-2 text-[9.5px]">
							<div class="flex justify-between">
								<span>{row.label}</span><span class="text-faint">{row.value}</span>
							</div>
							<div class="mt-1 h-1 overflow-hidden rounded-full bg-bg">
								<span class="block h-full {row.width} {row.color}"></span>
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-2 rounded-lg border border-line p-2.5 text-[9.5px]">
					{#each sessionCounters as row}
						<div
							class="flex items-center justify-between border-b border-line/60 py-1 last:border-0"
						>
							<span class="text-faint">{row.label}</span>
							<span class="tabular-nums">{row.value}</span>
						</div>
					{/each}
				</div>
				<p class="mt-2 px-1 text-[9px] leading-4 text-faint">
					Preview metrics. Connect the agent runtime to measure real usage.
				</p>
			</div>
		{:else if tab === 'inspector'}
			<div class="grid shrink-0 grid-cols-4 border-b border-line text-[10px]">
				{#each [{ id: 'session', label: 'Session' }, { id: 'git', label: 'Git' }, { id: 'branch', label: 'Branch' }, { id: 'turn', label: 'Last turn' }] as scope}
					<button
						type="button"
						onclick={() => (reviewScope = scope.id as ReviewScope)}
						class="border-b-2 px-1 py-2 text-center {reviewScope === scope.id
							? 'border-accent text-fg'
							: 'border-transparent text-faint hover:text-muted'}"
					>
						{scope.label}
					</button>
				{/each}
			</div>

			<div
				class="flex shrink-0 items-center justify-between border-b border-line px-3 py-1.5 text-[10px] text-faint"
			>
				<span>
					3 files · <span class="text-ok">+64</span> <span class="text-danger">−21</span>
				</span>
				<div class="flex items-center gap-0.5">
					<button
						type="button"
						class="rounded p-1 hover:bg-bg hover:text-fg"
						aria-label="Show all lines"
						title="Show all lines"
					>
						<Rows2 size={12} />
					</button>
					<button
						type="button"
						onclick={() => (diffMode = diffMode === 'unified' ? 'split' : 'unified')}
						class="rounded p-1 hover:bg-bg hover:text-fg"
						aria-label={diffMode === 'unified' ? 'Switch to split diff' : 'Switch to unified diff'}
						title={diffMode === 'unified' ? 'Split diff' : 'Unified diff'}
					>
						<Columns2 size={12} />
					</button>
				</div>
			</div>

			<div class="shrink-0 border-b border-line px-2 py-1.5">
				<button
					type="button"
					onclick={() => toggleFolder('server')}
					class="flex w-full items-center gap-1 rounded px-1 py-1 text-[10px] text-muted hover:bg-bg"
				>
					<ChevronRight
						size={10}
						class="transition-transform {expandedFolders.server ? 'rotate-90' : ''}"
					/>
					<Folder size={11} class="text-faint" /> src
				</button>
				{#if expandedFolders.server}
					<div class="ml-3 border-l border-line pl-1">
						<button
							type="button"
							onclick={() => (activeFile = 'src/lib/server/auth.ts')}
							class="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[10px] {activeFile ===
							'src/lib/server/auth.ts'
								? 'bg-accent/10 text-fg'
								: 'text-muted hover:bg-bg'}"
						>
							<FileCode size={11} class="text-accent" /> auth.ts
							<span class="ml-auto text-[9px]">
								<span class="text-ok">+18</span> <span class="text-danger">−7</span>
							</span>
						</button>
						<button
							type="button"
							onclick={() => (activeFile = 'src/lib/server/session.ts')}
							class="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[10px] {activeFile ===
							'src/lib/server/session.ts'
								? 'bg-accent/10 text-fg'
								: 'text-muted hover:bg-bg'}"
						>
							<FileCode size={11} class="text-faint" /> session.ts
							<span class="ml-auto text-[9px]">
								<span class="text-ok">+31</span> <span class="text-danger">−9</span>
							</span>
						</button>
					</div>
				{/if}
			</div>

			<div class="flex shrink-0 items-center justify-between border-b border-line px-3 py-1.5">
				<span class="truncate text-[10px] font-medium">{activeFile.split('/').at(-1)}</span>
				<div class="flex items-center gap-1 text-[9px]">
					<button
						type="button"
						onclick={() => (diffMode = 'unified')}
						class="rounded px-1.5 py-0.5 {diffMode === 'unified'
							? 'bg-bg text-fg'
							: 'text-faint hover:text-fg'}"
					>
						Unified
					</button>
					<button
						type="button"
						onclick={() => (diffMode = 'split')}
						class="rounded px-1.5 py-0.5 {diffMode === 'split'
							? 'bg-bg text-fg'
							: 'text-faint hover:text-fg'}"
					>
						Split
					</button>
					<button
						type="button"
						onclick={() => toasts.push('File opened in the editor preview.', 'success')}
						class="rounded p-1 text-faint hover:bg-bg hover:text-fg"
						aria-label="Open file"
						title="Open file"
					>
						<FileText size={11} />
					</button>
				</div>
			</div>

			<div class="min-h-0 flex-1 overflow-auto">
				{#if diffMode === 'unified'}
					<div class="min-w-[520px] font-mono text-[10px] leading-5">
						{#each diffLines as line}
							<div
								class="flex {line.type === 'add'
									? 'bg-ok/10'
									: line.type === 'del'
										? 'bg-danger/10'
										: ''}"
							>
								<span class="w-8 shrink-0 border-r border-line px-1 text-right text-faint">
									{line.old ?? ''}
								</span>
								<span class="w-8 shrink-0 border-r border-line px-1 text-right text-faint">
									{line.new ?? ''}
								</span>
								<span class="px-2 whitespace-pre">{line.text}</span>
							</div>
						{/each}
					</div>
				{:else}
					<div class="min-w-[520px] font-mono text-[10px] leading-5">
						{#each splitRows as row}
							<div class="grid grid-cols-2">
								<div class="flex border-r border-line {row.type === 'del' ? 'bg-danger/10' : ''}">
									<span class="w-7 shrink-0 px-1 text-right text-faint">{row.old ?? ''}</span>
									<span class="truncate px-1">{row.oldText}</span>
								</div>
								<div class="flex {row.type === 'add' ? 'bg-ok/10' : ''}">
									<span class="w-7 shrink-0 px-1 text-right text-faint">{row.new ?? ''}</span>
									<span class="truncate px-1">{row.newText}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-2 border-t border-line px-3 py-2 text-[10px] text-faint">
				<button
					type="button"
					class="rounded p-1 hover:bg-bg hover:text-fg"
					aria-label="Previous file"
				>
					<ChevronRight size={11} class="rotate-180" />
				</button>
				<span>1 of 3</span>
				<button type="button" class="rounded p-1 hover:bg-bg hover:text-fg" aria-label="Next file">
					<ChevronRight size={11} />
				</button>
				<span class="ml-auto">UTF-8 · LF</span>
			</div>

			<div class="border-t border-line p-2">
				<div class="flex gap-1.5">
					<button
						type="button"
						onclick={rejectAll}
						class="flex-1 rounded-md border border-line-strong bg-surface px-2 py-1.5 text-[10.5px] font-medium hover:bg-surface-2"
					>
						Reject all
					</button>
					<button
						type="button"
						onclick={acceptAll}
						class="flex-1 rounded-md bg-accent px-2 py-1.5 text-[10.5px] font-medium text-white hover:bg-accent-hover"
					>
						Accept all
					</button>
				</div>
			</div>
		{:else if tab === 'tools'}
			<div class="min-h-0 flex-1 overflow-y-auto p-3">
				<p class="mb-2 text-[10px] font-medium tracking-wide text-faint uppercase">Agent tools</p>
				<div class="space-y-1">
					{#each demoTools as tool}
						<label
							class="flex items-start gap-2 rounded-lg border border-line px-2.5 py-2 hover:bg-bg/40"
						>
							<span class="min-w-0 flex-1">
								<span class="block text-[11.5px] font-medium">{tool.name}</span>
								<span class="mt-0.5 block text-[10px] leading-4 text-faint">{tool.detail}</span>
							</span>
							<input
								type="checkbox"
								checked={toolEnabled[tool.name]}
								onchange={(event) => (toolEnabled[tool.name] = event.currentTarget.checked)}
								class="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
								aria-label={`Enable ${tool.name}`}
							/>
						</label>
					{/each}
				</div>
				<p class="mt-3 text-[10px] leading-4 text-faint">
					Tool availability is enforced per model. These switches are preview state only.
				</p>
			</div>
		{:else}
			<div class="min-h-0 flex-1 overflow-y-auto p-3">
				<p class="mb-2 text-[10px] font-medium tracking-wide text-faint uppercase">Built in</p>
				<div class="space-y-1">
					{#each demoPlugins as plugin}
						<div class="flex items-start gap-2 rounded-lg border border-line px-2.5 py-2">
							<CircleCheck size={12} class="mt-0.5 shrink-0 text-ok" />
							<span class="min-w-0 flex-1">
								<span class="block text-[11.5px] font-medium">{plugin.name}</span>
								<span class="mt-0.5 block text-[10px] leading-4 text-faint">{plugin.detail}</span>
							</span>
							<span class="text-[9px] text-faint">active</span>
						</div>
					{/each}
				</div>
				<div
					class="mt-3 rounded-lg border border-dashed border-line px-3 py-4 text-center text-[10.5px] leading-4 text-faint"
				>
					Plugin loading is not wired in this preview.
				</div>
			</div>
		{/if}

		<div class="flex h-8 shrink-0 items-center gap-0.5 border-t border-line px-1.5">
			<button
				type="button"
				onclick={() => (tab = 'tools')}
				class="rounded p-1 {tab === 'tools'
					? 'bg-bg text-fg'
					: 'text-faint hover:bg-bg hover:text-fg'}"
				aria-label="Tools"
				title="Tools"
				aria-pressed={tab === 'tools'}
			>
				<Wrench size={12} />
			</button>
			<button
				type="button"
				onclick={() => (tab = 'plugins')}
				class="rounded p-1 {tab === 'plugins'
					? 'bg-bg text-fg'
					: 'text-faint hover:bg-bg hover:text-fg'}"
				aria-label="Plugins"
				title="Plugins"
				aria-pressed={tab === 'plugins'}
			>
				<Plug size={12} />
			</button>
		</div>
	</aside>
{/if}
