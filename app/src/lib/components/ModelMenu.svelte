<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Check from '@lucide/svelte/icons/check';
	import Wrench from '@lucide/svelte/icons/wrench';
	import Eye from '@lucide/svelte/icons/eye';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Settings from '@lucide/svelte/icons/settings';
	import Cloud from '@lucide/svelte/icons/cloud';
	import Cpu from '@lucide/svelte/icons/cpu';
	import { models } from '#lib/stores/models.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';

	let { value = '', onchange }: { value?: string; onchange?: (id: string) => void } = $props();

	let open = $state(false);
	let root: HTMLDivElement;

	const active = $derived(models.models.find((model) => model.id === value) ?? models.active);
	const groups = $derived.by(() => {
		const map = new Map<string, typeof models.models>();
		for (const model of models.models) {
			const key = model.providerName;
			map.set(key, [...(map.get(key) ?? []), model]);
		}
		return [...map.entries()];
	});

	$effect(() => {
		if (!open) return;
		const onPointer = (event: PointerEvent) => {
			if (root && !root.contains(event.target as Node)) open = false;
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') open = false;
		};
		document.addEventListener('pointerdown', onPointer);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointer);
			document.removeEventListener('keydown', onKey);
		};
	});

	function choose(id: string) {
		models.select(id);
		onchange?.(id);
		open = false;
	}
</script>

<div class="relative" bind:this={root}>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-haspopup="listbox"
		aria-expanded={open}
		class="flex max-w-[52vw] items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-fg transition-colors hover:border-line-strong sm:max-w-none"
		title="Change model"
	>
		{#if active?.local}
			<Cpu size={13} class="shrink-0 text-accent" />
		{:else if active}
			<Cloud size={13} class="shrink-0 text-accent" />
		{/if}
		<span class="truncate">{active?.name ?? (models.loading ? 'Loading…' : 'Select model')}</span>
		<ChevronDown size={13} class="shrink-0 text-faint" />
	</button>

	{#if open}
		<div
			class="menu-panel animate-pop absolute top-full right-0 z-50 mt-2 w-[330px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl"
			role="listbox"
			aria-label="Models"
		>
			<div
				class="border-b border-line px-3 py-2 text-[11px] font-medium tracking-wide text-faint uppercase"
			>
				Model
			</div>

			<div class="max-h-[58vh] overflow-y-auto p-1.5">
				{#if models.loading && models.models.length === 0}
					<div class="flex items-center gap-2 px-2.5 py-6 text-[12.5px] text-muted">
						<Loader2 size={14} class="animate-spin" /> Looking for models…
					</div>
				{:else if models.models.length === 0}
					<div class="px-2.5 py-5 text-[12.5px] text-muted">
						<p>No models available.</p>
						{#if models.error}<p class="mt-1 text-[11.5px] text-danger">{models.error}</p>{/if}
						<button
							type="button"
							class="mt-2 inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11.5px] hover:bg-surface-2"
							onclick={() => models.load(true)}
						>
							<RotateCw size={11} /> Retry
						</button>
					</div>
				{:else}
					{#each groups as [provider, entries] (provider)}
						<div
							class="px-2.5 pt-2 pb-1 text-[10.5px] font-medium tracking-wide text-faint uppercase"
						>
							{provider}
						</div>
						{#each entries as model (model.id)}
							<button
								type="button"
								role="option"
								aria-selected={model.id === active?.id}
								onclick={() => choose(model.id)}
								class="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2"
								class:bg-surface-2={model.id === active?.id}
							>
								<span
									class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
									class:bg-ok={model.local}
									class:bg-accent={!model.local}
								></span>
								<span class="min-w-0 flex-1">
									<span class="flex items-center gap-1.5 text-[13px] font-medium">
										{model.name}
										{#if model.id === active?.id}<Check size={12} class="text-accent" />{/if}
									</span>
									{#if model.description}
										<span class="mt-0.5 block text-[11px] leading-snug text-muted">
											{model.description}
										</span>
									{/if}
									<span class="mt-1 flex items-center gap-2 text-[10px] text-faint">
										{#if model.tools}<span class="inline-flex items-center gap-0.5">
												<Wrench size={9} /> tools
											</span>{/if}
										{#if model.vision}<span class="inline-flex items-center gap-0.5">
												<Eye size={9} /> vision
											</span>{/if}
										{#if model.contextWindow}<span>
												{Math.round(model.contextWindow / 1024)}k ctx
											</span>{/if}
									</span>
								</span>
							</button>
						{/each}
					{/each}
				{/if}
			</div>

			<div
				class="flex items-center justify-between border-t border-line px-3 py-2 text-[11px] text-muted"
			>
				<span class="flex items-center gap-1.5">
					<span
						class="h-1.5 w-1.5 rounded-full"
						class:bg-ok={models.localOnline}
						class:bg-danger={!models.localOnline}
					></span>
					{models.localOnline ? 'Ollama connected' : 'Ollama offline'}
				</span>
				<div class="flex items-center gap-0.5">
					<button
						type="button"
						class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-surface-2 hover:text-fg"
						onclick={() => models.load(true)}
						disabled={models.loading}
					>
						<RotateCw size={10} class={models.loading ? 'animate-spin' : ''} /> Refresh
					</button>
					<button
						type="button"
						class="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg"
						onclick={() => {
							open = false;
							ui.openSettings();
						}}
						aria-label="Manage providers"
						title="Manage providers"
					>
						<Settings size={11} />
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
