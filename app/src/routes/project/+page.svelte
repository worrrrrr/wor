<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import Menu from '@lucide/svelte/icons/menu';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { ui } from '#lib/stores/ui.svelte.ts';
	import { projects } from '#lib/stores/projects.svelte.ts';
	import { focusTrap } from '#lib/utils/focus-trap.ts';
	import { focusWhenReady } from '#lib/utils/focus.ts';
	import { toasts } from '#lib/stores/toasts.svelte.ts';
	import { relativeTime } from '#lib/utils/format.ts';

	let { data }: PageProps = $props();

	let creating = $state(page.url.searchParams.get('new') === '1');
	let name = $state('');
	let description = $state('');
	let instructions = $state('');
	let busy = $state(false);

	afterNavigate(() => {
		if (page.url.searchParams.get('new') === '1') {
			creating = true;
			ui.closeMobile();
			void tick().then(() => focusWhenReady('#new-project-name'));
		}
	});

	function openCreate() {
		name = '';
		description = '';
		instructions = '';
		creating = true;
	}

	function closeCreate() {
		creating = false;
		if (page.url.searchParams.has('new')) {
			void goto('/project', { replaceState: true });
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && creating) closeCreate();
	}

	async function createProject() {
		if (busy) return;
		const clean = name.trim();
		if (!clean) {
			toasts.push('Give the project a name.', 'error');
			return;
		}
		busy = true;
		try {
			const project = await projects.create({ name: clean, description, instructions });
			creating = false;
			toasts.push('Project created.', 'success');
			await goto(`/project/${project.id}`);
		} catch (error) {
			toasts.push(error instanceof Error ? error.message : 'Could not create project.', 'error');
		} finally {
			busy = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="thin-scroll h-dvh flex-1 overflow-y-auto bg-bg">
	<div class="mx-auto w-full max-w-5xl px-5 py-8 md:px-8 md:py-12">
		<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div>
				<button
					type="button"
					onclick={() => ui.openMobile()}
					aria-label="Open sidebar"
					class="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] text-muted hover:text-fg md:hidden"
				>
					<Menu size={15} /> Menu
				</button>
				<p class="text-[10.5px] font-medium tracking-[0.14em] text-faint uppercase">Workspace</p>
				<h1 class="mt-1 font-serif text-[28px] leading-tight font-semibold">Projects</h1>
				<p class="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
					Group sessions around a body of work. Instructions given here travel with every session in
					the project.
				</p>
			</div>
			<button
				type="button"
				onclick={openCreate}
				class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12.5px] font-medium text-white shadow-sm hover:opacity-90"
			>
				<Plus size={14} /> New project
			</button>
		</div>

		{#if data.projects.length === 0}
			<div
				class="mt-10 rounded-2xl border border-dashed border-line-strong bg-surface/40 px-6 py-14 text-center"
			>
				<span
					class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"
				>
					<FolderKanban size={20} />
				</span>
				<h2 class="mt-3 font-serif text-lg font-semibold">No projects yet</h2>
				<p class="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">
					A project keeps related chats and agents together, with shared instructions and context.
				</p>
			</div>
		{:else}
			<div class="mt-7 grid gap-3 sm:grid-cols-2">
				{#each data.projects as project (project.id)}
					<a
						href={`/project/${project.id}`}
						class="group flex flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2/60"
					>
						<div class="flex items-start gap-3">
							<span
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"
							>
								<FolderKanban size={17} />
							</span>
							<div class="min-w-0 flex-1">
								<h2 class="truncate text-[13.5px] font-medium">{project.name}</h2>
								<p class="mt-0.5 text-[11px] text-faint">
									{project.conversationCount}
									{project.conversationCount === 1 ? 'session' : 'sessions'}
									{#if project.lastActivity}· {relativeTime(project.lastActivity)}{/if}
								</p>
							</div>
							<ArrowRight
								size={15}
								class="mt-1 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
							/>
						</div>
						<p class="mt-3 line-clamp-2 min-h-[34px] text-[12px] leading-relaxed text-muted">
							{project.description || 'No description yet.'}
						</p>
						{#if project.recent.length > 0}
							<div
								class="mt-3 flex items-center gap-1.5 border-t border-line pt-2.5 text-[11px] text-faint"
							>
								<MessageSquare size={11} />
								<span class="truncate">{project.recent[0].title}</span>
							</div>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>

{#if creating}
	<div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
			aria-label="Cancel"
			onclick={closeCreate}
		></button>
		<div
			class="menu-panel animate-pop relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="new-project-title"
			use:focusTrap={'input'}
		>
			<form
				class="flex min-h-0 flex-1 flex-col"
				onsubmit={(event) => {
					event.preventDefault();
					createProject();
				}}
			>
				<div class="flex items-center justify-between border-b border-line px-5 py-3.5">
					<h2 id="new-project-title" class="font-serif text-[17px] font-semibold">New project</h2>
					<button
						type="button"
						onclick={closeCreate}
						class="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-fg"
						aria-label="Close"
					>
						<X size={15} />
					</button>
				</div>
				<div class="thin-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
					<label class="block">
						<span class="mb-1.5 block text-[11.5px] font-medium text-muted">Name</span>
						<input
							id="new-project-name"
							bind:value={name}
							class="w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-[13px] outline-none focus:border-accent"
							placeholder="Research, Client work, Product launch."
							maxlength="80"
						/>
					</label>
					<label class="block">
						<span class="mb-1.5 block text-[11.5px] font-medium text-muted">Description</span>
						<textarea
							bind:value={description}
							rows="2"
							class="w-full resize-none rounded-lg border border-line-strong bg-bg px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-accent"
							placeholder="What belongs in this project?"
							maxlength="500"></textarea>
					</label>
					<label class="block">
						<span class="mb-1.5 block text-[11.5px] font-medium text-muted">
							Instructions <span class="font-normal text-faint">optional</span>
						</span>
						<textarea
							bind:value={instructions}
							rows="4"
							class="w-full resize-none rounded-lg border border-line-strong bg-bg px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-accent"
							placeholder="Tone, constraints, background the assistant should keep in mind."
							maxlength="8000"></textarea>
					</label>
				</div>
				<div class="flex justify-end gap-2 border-t border-line px-5 py-3.5">
					<button
						type="button"
						class="rounded-lg border border-line px-3 py-1.5 text-[12.5px] hover:bg-surface-2"
						onclick={closeCreate}
						disabled={busy}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
						disabled={busy}
					>
						{busy ? 'Creating.' : 'Create project'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
