<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Server from '@lucide/svelte/icons/server';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { tick } from 'svelte';
	import { ui } from '#lib/stores/ui.svelte.ts';
	import { providers } from '#lib/stores/providers.svelte.ts';
	import { models } from '#lib/stores/models.svelte.ts';
	import { toasts } from '#lib/stores/toasts.svelte.ts';
	import { theme } from '#lib/stores/theme.svelte.ts';
	import { appearance, ACCENTS } from '#lib/stores/appearance.svelte.ts';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Moon from '@lucide/svelte/icons/moon';
	import Palette from '@lucide/svelte/icons/palette';
	import Sun from '@lucide/svelte/icons/sun';
	import { focusTrap } from '#lib/utils/focus-trap.ts';
	import { focusWhenReady } from '#lib/utils/focus.ts';
	import type { ProviderModel, ProviderSummary } from '#lib/chat/types.ts';

	let tab = $state<'appearance' | 'providers'>('appearance');
	let editing = $state(false);
	let editingId = $state<string | null>(null);
	let name = $state('');
	let baseUrl = $state('');
	let apiKey = $state('');
	let clearKey = $state(false);
	let modelText = $state('');
	let modelMeta = $state<Record<string, Pick<ProviderModel, 'contextWindow' | 'tools' | 'vision'>>>(
		{}
	);
	let busy = $state(false);
	let discovering = $state(false);
	let deleting = $state<ProviderSummary | null>(null);

	const builtins = $derived(
		models.providers.filter((provider) => ['ollama', 'groq', 'google'].includes(provider.id))
	);

	$effect(() => {
		if (ui.settingsOpen) void providers.load();
	});

	function seedMeta(models: ProviderModel[]) {
		modelMeta = Object.fromEntries(
			models.map((model) => [
				model.id,
				{
					contextWindow: model.contextWindow,
					tools: model.tools,
					vision: model.vision
				}
			])
		);
	}

	function parseIds() {
		return [
			...new Set(
				modelText
					.split(/[\n,]/)
					.map((value) => value.trim())
					.filter(Boolean)
			)
		].slice(0, 200);
	}

	const parsedModels = $derived.by<ProviderModel[]>(() =>
		parseIds().map((id) => ({
			id,
			name: id,
			contextWindow: modelMeta[id]?.contextWindow ?? 131072,
			tools: modelMeta[id]?.tools ?? true,
			vision: modelMeta[id]?.vision ?? false
		}))
	);

	function updateMeta(
		id: string,
		patch: Partial<Pick<ProviderModel, 'contextWindow' | 'tools' | 'vision'>>
	) {
		modelMeta[id] = {
			contextWindow: modelMeta[id]?.contextWindow ?? 131072,
			tools: modelMeta[id]?.tools ?? true,
			vision: modelMeta[id]?.vision ?? false,
			...patch
		};
	}

	async function focusForm() {
		await tick();
		focusWhenReady('#provider-name');
	}

	function startCreate() {
		editing = true;
		editingId = null;
		name = '';
		baseUrl = '';
		apiKey = '';
		clearKey = false;
		modelText = '';
		modelMeta = {};
		void focusForm();
	}

	function startEdit(provider: ProviderSummary) {
		editing = true;
		editingId = provider.id;
		name = provider.name;
		baseUrl = provider.baseUrl;
		apiKey = '';
		clearKey = false;
		modelText = provider.models.map((model) => model.id).join('\n');
		seedMeta(provider.models);
		void focusForm();
	}

	function closeForm() {
		editing = false;
		editingId = null;
	}

	function modelsFromText(): ProviderModel[] {
		return parsedModels;
	}

	async function fetchModels() {
		if (!baseUrl.trim()) {
			toasts.push('Enter the provider base URL first.', 'error');
			return;
		}
		discovering = true;
		try {
			const found = await providers.discover({
				baseUrl: baseUrl.trim(),
				apiKey: apiKey.trim() || undefined,
				providerId: editingId ?? undefined
			});
			modelText = found.map((model) => model.id).join('\n');
			modelMeta = Object.fromEntries(
				found.map((model) => [
					model.id,
					modelMeta[model.id] ?? {
						contextWindow: model.contextWindow,
						tools: model.tools,
						vision: model.vision
					}
				])
			);
			toasts.push(`Found ${found.length} model${found.length === 1 ? '' : 's'}.`, 'success');
		} catch (error) {
			toasts.push(error instanceof Error ? error.message : 'Could not fetch models.', 'error');
		} finally {
			discovering = false;
		}
	}

	async function save() {
		if (busy) return;
		const list = modelsFromText();
		if (!name.trim()) {
			toasts.push('Provider name is required.', 'error');
			return;
		}
		if (!baseUrl.trim()) {
			toasts.push('Base URL is required.', 'error');
			return;
		}
		if (list.length === 0) {
			toasts.push('Add at least one model ID.', 'error');
			return;
		}

		busy = true;
		try {
			const input = {
				name: name.trim(),
				baseUrl: baseUrl.trim(),
				apiKey: clearKey ? undefined : apiKey.trim() || undefined,
				clearKey: editingId ? clearKey : undefined,
				models: list
			};
			if (editingId) {
				await providers.update(editingId, input);
				toasts.push('Provider updated.', 'success');
			} else {
				await providers.create(input);
				toasts.push('Provider added.', 'success');
			}
			closeForm();
		} catch (error) {
			toasts.push(error instanceof Error ? error.message : 'Could not save provider.', 'error');
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!deleting) return;
		const target = deleting;
		deleting = null;
		try {
			await providers.remove(target.id);
			toasts.push('Provider removed.', 'success');
			if (editingId === target.id) closeForm();
		} catch (error) {
			toasts.push(error instanceof Error ? error.message : 'Could not remove provider.', 'error');
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !ui.settingsOpen || busy) return;
		if (deleting) {
			deleting = null;
		} else if (editing) {
			closeForm();
		} else {
			ui.closeSettings();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if ui.settingsOpen}
	<div class="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-6">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
			aria-label="Close settings"
			onclick={() => ui.closeSettings()}
		></button>
		<div
			class="menu-panel animate-pop relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl"
			role="dialog"
			aria-modal="true"
			aria-label="Settings"
			use:focusTrap={'[data-autofocus]'}
		>
			<div class="flex items-center justify-between border-b border-line px-5 py-3.5">
				<div>
					<h2 class="font-serif text-[18px] font-semibold">Settings</h2>
					<p class="mt-0.5 text-[11px] text-faint">Appearance, layout and model providers</p>
				</div>
				<button
					type="button"
					onclick={() => ui.closeSettings()}
					class="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-fg"
					aria-label="Close settings"
				>
					<X size={16} />
				</button>
			</div>

			<div class="flex min-h-0 flex-1">
				<nav
					class="w-[150px] shrink-0 border-r border-line p-2 max-sm:w-[46px]"
					aria-label="Settings sections"
				>
					{#each [{ id: 'appearance', label: 'Appearance', icon: Palette }, { id: 'providers', label: 'Providers', icon: Server }] as item}
						{@const Icon = item.icon}
						<button
							type="button"
							onclick={() => (tab = item.id as typeof tab)}
							aria-pressed={tab === item.id}
							class="mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] {tab ===
							item.id
								? 'bg-accent-soft font-medium text-accent'
								: 'text-muted hover:bg-surface-2'}"
						>
							<Icon size={13} /><span class="max-sm:hidden">{item.label}</span>
						</button>
					{/each}
				</nav>
				<div class="thin-scroll min-w-0 flex-1 overflow-y-auto px-5 py-4">
					{#if tab === 'appearance'}
						<div>
							<h3 class="text-[12px] font-medium">Base theme</h3>
							<p class="mt-0.5 text-[11px] text-faint">System follows the OS setting.</p>
							<div class="mt-2 flex gap-1.5">
								{#each [{ id: 'system', label: 'System', icon: Monitor }, { id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }] as item}
									{@const Icon = item.icon}
									<button
										type="button"
										onclick={() => theme.set(item.id as typeof theme.mode)}
										aria-pressed={theme.mode === item.id}
										class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11.5px] {theme.mode ===
										item.id
											? 'border-accent bg-accent-soft font-medium text-accent'
											: 'border-line bg-surface text-muted hover:bg-surface-2'}"
									>
										<Icon size={13} />{item.label}
									</button>
								{/each}
							</div>
						</div>

						<div class="mt-5">
							<h3 class="text-[12px] font-medium">Accent</h3>
							<p class="mt-0.5 text-[11px] text-faint">Used by buttons, links and selected rows.</p>
							<div class="mt-2 flex flex-wrap gap-2">
								{#each ACCENTS as item}
									<button
										type="button"
										onclick={() => appearance.setAccent(item.id)}
										aria-pressed={appearance.accent === item.id}
										title={item.label}
										class="flex h-8 items-center gap-2 rounded-lg border px-2 text-[11px] {appearance.accent ===
										item.id
											? 'border-fg/30 bg-surface-2 font-medium'
											: 'border-line bg-surface text-muted hover:bg-surface-2'}"
									>
										<span
											class="h-4 w-4 rounded-full border border-black/10"
											style={`background:${theme.resolved === 'dark' ? item.dark : item.light}`}
										></span>
										{item.label}
									</button>
								{/each}
							</div>
						</div>

						<div class="mt-5">
							<h3 class="text-[12px] font-medium">Motion</h3>
							<p class="mt-0.5 text-[11px] text-faint">
								Turn off transitions for a calmer workspace.
							</p>
							<label
								class="mt-2 flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2"
							>
								<span class="text-[11.5px]">Reduce motion</span>
								<input
									type="checkbox"
									class="size-4 accent-accent"
									checked={appearance.motion === 'reduced'}
									onchange={(event) =>
										appearance.setMotion(event.currentTarget.checked ? 'reduced' : 'full')}
								/>
							</label>
						</div>

						<p class="mt-5 text-[10.5px] leading-4 text-faint">
							Panel states (sidebar, inspector, terminal) are remembered per surface — no setting
							needed.
						</p>
					{:else}
						<div class="flex items-center justify-between">
							<div>
								<h3 class="text-[12px] font-medium">Built-in providers</h3>
								<p class="mt-0.5 text-[11px] text-faint">
									Configured through environment variables.
								</p>
							</div>
						</div>
						<div class="mt-2.5 divide-y divide-line overflow-hidden rounded-lg border border-line">
							{#each builtins as provider (provider.id)}
								<div class="flex items-center gap-3 bg-surface px-3 py-2.5">
									<Server size={14} class="shrink-0 text-faint" />
									<div class="min-w-0 flex-1">
										<p class="truncate text-[12.5px] font-medium">{provider.name}</p>
										<p class="truncate text-[10.5px] text-faint">{provider.detail}</p>
									</div>
									<span
										class="rounded-full px-2 py-0.5 text-[10px] {provider.online
											? 'bg-ok/10 text-ok'
											: 'bg-surface-2 text-faint'}"
									>
										{provider.online ? 'Ready' : 'Off'}
									</span>
								</div>
							{/each}
						</div>

						<div class="mt-6 flex items-center justify-between">
							<div>
								<h3 class="text-[12px] font-medium">Custom providers</h3>
								<p class="mt-0.5 text-[11px] text-faint">
									Any OpenAI-compatible endpoint. Keys are encrypted on this device.
								</p>
							</div>
							{#if !editing}
								<button
									type="button"
									onclick={startCreate}
									data-autofocus
									class="inline-flex items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[11.5px] hover:bg-surface-2"
								>
									<Plus size={12} /> Add
								</button>
							{/if}
						</div>

						{#if providers.loading && providers.items.length === 0}
							<div class="mt-2 flex items-center gap-2 px-1 py-4 text-[11.5px] text-faint">
								<Loader2 size={12} class="animate-spin" /> Loading providers.
							</div>
						{:else if providers.items.length === 0 && !editing}
							<div
								class="mt-2 rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-[11.5px] text-faint"
							>
								No custom providers yet. Add a local or remote OpenAI-compatible endpoint.
							</div>
						{:else}
							<div class="mt-2 space-y-1.5">
								{#each providers.items as provider (provider.id)}
									<div
										class="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5"
									>
										<Server size={14} class="shrink-0 text-accent/80" />
										<div class="min-w-0 flex-1">
											<p class="truncate text-[12.5px] font-medium">{provider.name}</p>
											<p class="truncate text-[10.5px] text-faint">
												{provider.baseUrl} · {provider.models.length}
												{provider.models.length === 1 ? 'model' : 'models'}
												{#if provider.hasKey}· key saved{/if}
											</p>
										</div>
										<button
											type="button"
											onclick={() => startEdit(provider)}
											class="flex h-6 w-6 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-fg"
											aria-label={`Edit ${provider.name}`}
											title="Edit"
										>
											<Pencil size={12} />
										</button>
										<button
											type="button"
											onclick={() => (deleting = provider)}
											class="flex h-6 w-6 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-danger"
											aria-label={`Remove ${provider.name}`}
											title="Remove"
										>
											<Trash2 size={12} />
										</button>
									</div>
								{/each}
							</div>
						{/if}

						{#if editing}
							<form
								class="mt-4 rounded-xl border border-line-strong bg-bg p-4"
								onsubmit={(event) => {
									event.preventDefault();
									save();
								}}
							>
								<div class="flex items-center justify-between">
									<h4 class="text-[12px] font-medium">
										{editingId ? 'Edit provider' : 'New provider'}
									</h4>
									<button
										type="button"
										onclick={closeForm}
										class="text-[11px] text-faint hover:text-fg"
									>
										Cancel
									</button>
								</div>
								<div class="mt-3 grid gap-3 sm:grid-cols-2">
									<label class="block">
										<span class="mb-1 block text-[10.5px] font-medium text-muted">Name</span>
										<input
											id="provider-name"
											bind:value={name}
											placeholder="LM Studio"
											maxlength="60"
											class="w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent"
										/>
									</label>
									<label class="block">
										<span class="mb-1 block text-[10.5px] font-medium text-muted">Base URL</span>
										<input
											bind:value={baseUrl}
											placeholder="http://127.0.0.1:1234/v1"
											class="w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent"
										/>
									</label>
								</div>
								<label class="mt-3 block">
									<span class="mb-1 block text-[10.5px] font-medium text-muted">
										API key
										<span class="font-normal text-faint">
											{#if editingId && providers.items.find((item) => item.id === editingId)?.hasKey}
												· saved, leave blank to keep
											{:else}
												· optional
											{/if}
										</span>
									</span>
									<div class="relative">
										<KeyRound
											size={12}
											class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint"
										/>
										<input
											bind:value={apiKey}
											type="password"
											autocomplete="off"
											disabled={clearKey}
											placeholder={clearKey ? 'Existing key will be removed' : 'sk-…'}
											class="w-full rounded-lg border border-line-strong bg-surface py-1.5 pr-2.5 pl-8 text-[12.5px] outline-none focus:border-accent"
										/>
									</div>
								</label>
								{#if editingId && providers.items.find((item) => item.id === editingId)?.hasKey}
									<label class="mt-2 flex items-center gap-2 text-[11.5px] text-muted">
										<input bind:checked={clearKey} type="checkbox" class="size-3.5 accent-accent" />
										Clear the saved API key
									</label>
								{/if}
								<div class="mt-3 block">
									<div
										class="mb-1 flex items-center justify-between text-[10.5px] font-medium text-muted"
									>
										<span>Models <span class="font-normal text-faint">one ID per line</span></span>
										<button
											type="button"
											onclick={fetchModels}
											disabled={discovering || !baseUrl.trim()}
											class="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10.5px] font-normal text-muted hover:bg-surface-2 disabled:opacity-50"
										>
											{#if discovering}
												<Loader2 size={10} class="animate-spin" /> Fetching
											{:else}
												<RefreshCw size={10} /> Fetch models
											{/if}
										</button>
									</div>
									<textarea
										bind:value={modelText}
										rows="4"
										aria-label="Model IDs, one per line"
										placeholder="llama-3.3-70b&#10;qwen2.5-coder-32b"
										class="w-full resize-y rounded-lg border border-line-strong bg-surface px-2.5 py-2 font-mono text-[11.5px] leading-relaxed outline-none focus:border-accent"
									></textarea>
								</div>
								{#if parsedModels.length > 0}
									<div class="mt-2 rounded-lg border border-line bg-surface/50">
										<div class="border-b border-line px-2.5 py-1.5 text-[10px] text-faint">
											Capabilities apply per model. Set context in tokens.
										</div>
										<div class="thin-scroll max-h-44 divide-y divide-line overflow-y-auto">
											{#each parsedModels as model (model.id)}
												<div class="flex items-center gap-2 px-2.5 py-1.5">
													<code
														class="min-w-0 flex-1 truncate font-mono text-[11px]"
														title={model.id}
													>
														{model.id}
													</code>
													<label class="flex shrink-0 items-center gap-1 text-[10.5px] text-muted">
														<input
															type="checkbox"
															checked={model.tools}
															onchange={(event) =>
																updateMeta(model.id, { tools: event.currentTarget.checked })}
															class="accent-accent"
														/>
														Tools
													</label>
													<label class="flex shrink-0 items-center gap-1 text-[10.5px] text-muted">
														<input
															type="checkbox"
															checked={model.vision}
															onchange={(event) =>
																updateMeta(model.id, { vision: event.currentTarget.checked })}
															class="accent-accent"
														/>
														Vision
													</label>
													<label class="flex shrink-0 items-center gap-1 text-[10.5px] text-muted">
														ctx
														<input
															type="number"
															min="1024"
															step="1024"
															value={model.contextWindow}
															onchange={(event) =>
																updateMeta(model.id, {
																	contextWindow: Math.max(
																		1024,
																		Number(event.currentTarget.value) || 1024
																	)
																})}
															class="w-16 rounded border border-line-strong bg-surface px-1 py-0.5 text-right font-mono text-[10.5px] outline-none focus:border-accent"
														/>
													</label>
												</div>
											{/each}
										</div>
									</div>
								{/if}
								<div class="mt-3 flex justify-end">
									<button
										type="submit"
										disabled={busy}
										class="rounded-lg bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-60"
									>
										{busy ? 'Saving.' : editingId ? 'Save provider' : 'Add provider'}
									</button>
								</div>
							</form>
						{/if}
					{/if}
				</div>
			</div>

			<div class="border-t border-line px-5 py-3 text-[10.5px] text-faint">
				Provider keys stay on this machine. Requests go directly from the app to the endpoint.
			</div>
		</div>
	</div>
{/if}

{#if deleting}
	<div class="fixed inset-0 z-[90] flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
			aria-label="Cancel"
			onclick={() => (deleting = null)}
		></button>
		<div
			class="menu-panel animate-pop relative w-full max-w-sm rounded-xl p-5"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="remove-provider-title"
			aria-describedby="remove-provider-body"
			use:focusTrap
		>
			<h2 id="remove-provider-title" class="font-serif text-lg font-semibold">Remove provider?</h2>
			<p id="remove-provider-body" class="mt-1.5 text-[13px] leading-relaxed text-muted">
				"{deleting.name}" and its saved key will be removed. Sessions that used it keep their text
				but cannot be continued with that model.
			</p>
			<div class="mt-4 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg border border-line px-3 py-1.5 text-[12.5px] hover:bg-surface-2"
					onclick={() => (deleting = null)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-lg bg-danger px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90"
					onclick={remove}
				>
					Remove
				</button>
			</div>
		</div>
	</div>
{/if}
