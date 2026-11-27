<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageProps } from './$types';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Bot from '@lucide/svelte/icons/bot';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import Menu from '@lucide/svelte/icons/menu';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import { ui } from '#lib/stores/ui.svelte.ts';
	import { projects } from '#lib/stores/projects.svelte.ts';
	import { focusTrap } from '#lib/utils/focus-trap.ts';
	import { toasts } from '#lib/stores/toasts.svelte.ts';
	import { relativeTime } from '#lib/utils/format.ts';

	let { data }: PageProps = $props();

	let editing = $state(false);
	let name = $state('');
	let description = $state('');
	let instructions = $state('');
	let busy = $state(false);
	let deleting = $state(false);

	function openEdit() {
		name = data.project.name;
		description = data.project.description;
		instructions = data.project.instructions;
		editing = true;
	}

	async function save() {
		if (busy) return;
		busy = true;
		try {
			await projects.update(data.project.id, { name, description, instructions });
			await invalidateAll();
			editing = false;
			toasts.push('Project updated.', 'success');
		} catch (error) {
			toasts.push(error instanceof Error ? error.message : 'Could not update project.', 'error');
		} finally {
			busy = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (deleting) {
			deleting = false;
			return;
		}
		if (editing) editing = false;
	}

	async function remove() {
		if (busy) return;
		busy = true;
		try {
			await projects.remove(data.project.id);
			await goto('/project');
			toasts.push('Project deleted.', 'success');
		} catch (error) {
			toasts.push(error instanceof Error ? error.message : 'Could not delete project.', 'error');
			busy = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="thin-scroll h-dvh flex-1 overflow-y-auto bg-bg">
	<div class="mx-auto w-full max-w-4xl px-5 py-8 md:px-8 md:py-10">
		<div class="flex items-center justify-between gap-3">
			<a
				href="/project"
				class="inline-flex items-center gap-1.5 text-[11.5px] text-faint hover:text-fg"
			>
				<ArrowLeft size={13} /> All projects
			</a>
			<button
				type="button"
				onclick={() => ui.openMobile()}
				aria-label="Open sidebar"
				class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] text-muted hover:text-fg md:hidden"
			>
				<Menu size={15} /> Menu
			</button>
		</div>

		<div class="mt-4 flex items-start gap-3">
			<span
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"
			>
				<FolderKanban size={21} />
			</span>
			<div class="min-w-0 flex-1">
				<h1 class="font-serif text-[26px] leading-tight font-semibold">{data.project.name}</h1>
				<p class="mt-1 text-[12.5px] text-muted">
					{data.sessions.length}
					{data.sessions.length === 1 ? 'session' : 'sessions'}
					{#if data.project.lastActivity}· active {relativeTime(data.project.lastActivity)}{/if}
				</p>
			</div>
			<div class="flex shrink-0 items-center gap-1">
				<button
					type="button"
					onclick={openEdit}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
					aria-label="Edit project"
					title="Edit project"
				>
					<Pencil size={14} />
				</button>
				<button
					type="button"
					onclick={() => (deleting = true)}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"
					aria-label="Delete project"
					title="Delete project"
				>
					<Trash2 size={14} />
				</button>
			</div>
		</div>

		{#if data.project.description}
			<p class="mt-4 max-w-2xl text-[13px] leading-relaxed text-muted">
				{data.project.description}
			</p>
		{/if}

		{#if data.project.instructions}
			<details class="mt-4 rounded-xl border border-line bg-surface px-4 py-3">
				<summary class="cursor-pointer text-[12px] font-medium text-muted">
					Project instructions
				</summary>
				<pre class="mt-2 font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap text-fg">{data
						.project.instructions}</pre>
			</details>
		{/if}

		<div class="mt-6 flex flex-wrap items-center gap-3">
			<a
				href={`/chat?project=${data.project.id}`}
				data-sveltekit-reload
				class="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12.5px] font-medium text-white hover:opacity-90"
			>
				<Plus size={14} /> New session
			</a>
			<span class="text-[11.5px] text-faint">Choose Chat or Agent inside the composer.</span>
		</div>

		<h2 class="mt-8 text-[10.5px] font-medium tracking-[0.12em] text-faint uppercase">Sessions</h2>
		{#if data.sessions.length === 0}
			<div class="mt-3 rounded-xl border border-dashed border-line-strong px-5 py-10 text-center">
				<MessageSquare size={18} class="mx-auto text-faint opacity-70" />
				<p class="mt-2 text-[12.5px] text-muted">No sessions in this project yet.</p>
			</div>
		{:else}
			<div
				class="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
			>
				{#each data.sessions as session (session.id)}
					<a
						href={`/chat/${session.id}`}
						class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70"
					>
						<span
							class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-faint"
						>
							{#if session.mode === 'agent'}<Bot size={13} />{:else}<MessageSquare size={13} />{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[12.5px] font-medium">{session.title}</span>
							<span class="block truncate text-[10.5px] text-faint">
								{session.mode === 'agent' ? 'Agent' : 'Chat'} · {relativeTime(session.updatedAt)}
							</span>
						</span>
						<span class="text-[10.5px] text-faint">{session.messageCount} msgs</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>

{#if editing}
	<div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
			aria-label="Cancel"
			onclick={() => (editing = false)}
		></button>
		<div
			class="menu-panel animate-pop relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="edit-project-title"
			use:focusTrap={'input'}
		>
			<form
				class="flex min-h-0 flex-1 flex-col"
				onsubmit={(event) => {
					event.preventDefault();
					save();
				}}
			>
				<div class="flex items-center justify-between border-b border-line px-5 py-3.5">
					<h2 id="edit-project-title" class="font-serif text-[17px] font-semibold">Edit project</h2>
					<button
						type="button"
						onclick={() => (editing = false)}
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
							bind:value={name}
							class="w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-[13px] outline-none focus:border-accent"
							maxlength="80"
						/>
					</label>
					<label class="block">
						<span class="mb-1.5 block text-[11.5px] font-medium text-muted">Description</span>
						<textarea
							bind:value={description}
							rows="2"
							class="w-full resize-none rounded-lg border border-line-strong bg-bg px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-accent"
							maxlength="500"></textarea>
					</label>
					<label class="block">
						<span class="mb-1.5 block text-[11.5px] font-medium text-muted">Instructions</span>
						<textarea
							bind:value={instructions}
							rows="5"
							class="w-full resize-none rounded-lg border border-line-strong bg-bg px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-accent"
							maxlength="8000"></textarea>
					</label>
				</div>
				<div class="flex justify-end gap-2 border-t border-line px-5 py-3.5">
					<button
						type="button"
						class="rounded-lg border border-line px-3 py-1.5 text-[12.5px] hover:bg-surface-2"
						onclick={() => (editing = false)}
						disabled={busy}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
						disabled={busy}
					>
						{busy ? 'Saving.' : 'Save changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if deleting}
	<div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
			aria-label="Cancel"
			onclick={() => (deleting = false)}
		></button>
		<div
			class="menu-panel animate-pop relative w-full max-w-sm rounded-xl p-5"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="delete-project-title"
			aria-describedby="delete-project-body"
			use:focusTrap
		>
			<h2 id="delete-project-title" class="font-serif text-lg font-semibold">Delete project?</h2>
			<p id="delete-project-body" class="mt-1.5 text-[13px] leading-relaxed text-muted">
				"{data.project.name}" and its {data.sessions.length}
				{data.sessions.length === 1 ? 'session' : 'sessions'} will be removed from this device.
			</p>
			<div class="mt-4 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg border border-line px-3 py-1.5 text-[12.5px] hover:bg-surface-2"
					onclick={() => (deleting = false)}
					disabled={busy}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-lg bg-danger px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
					onclick={remove}
					disabled={busy}
				>
					{busy ? 'Deleting.' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
