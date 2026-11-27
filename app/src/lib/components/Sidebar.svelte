<script lang="ts">
	import { page } from '$app/state';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Bot from '@lucide/svelte/icons/bot';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Settings from '@lucide/svelte/icons/settings';
	import Code2 from '@lucide/svelte/icons/code-2';
	import Logo from '#lib/components/Logo.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { conversations } from '#lib/stores/conversations.svelte.ts';
	import { models } from '#lib/stores/models.svelte.ts';
	import { projects } from '#lib/stores/projects.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';
	import { toasts } from '#lib/stores/toasts.svelte.ts';
	import { dayBucket, relativeTime } from '#lib/utils/format.ts';
	import { focusTrap } from '#lib/utils/focus-trap.ts';
	import type { ConversationSummary } from '#lib/chat/types.ts';

	let query = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);
	let tab = $state<'projects' | 'chats' | 'agents'>(
		typeof localStorage === 'undefined'
			? 'projects'
			: ((localStorage.getItem('wor.nav') as 'projects' | 'chats' | 'agents' | null) ?? 'projects')
	);
	let renaming = $state<ConversationSummary | null>(null);
	let renameTitle = $state('');
	let renameProjectId = $state('');
	let renameInput = $state<HTMLInputElement | null>(null);
	let deleting = $state<ConversationSummary | null>(null);
	let busy = $state(false);
	let expanded = $state<Record<string, boolean>>({});
	let newMenuOpen = $state(false);
	let newMenu = $state<HTMLDivElement | null>(null);

	const activeId = $derived(
		conversations.activeId ??
			(page.url.pathname.startsWith('/chat/') ? page.url.pathname.split('/')[2] : null)
	);
	const activeProjectId = $derived(
		page.url.pathname.startsWith('/project/') ? page.url.pathname.split('/')[2] : null
	);

	const needle = $derived(query.trim().toLowerCase());
	const looseSessions = $derived(conversations.items.filter((item) => !item.projectId));
	const matchedProjects = $derived(
		needle
			? projects.items.filter(
					(item) =>
						item.name.toLowerCase().includes(needle) ||
						item.description.toLowerCase().includes(needle) ||
						conversations.items.some(
							(session) =>
								session.projectId === item.id && session.title.toLowerCase().includes(needle)
						)
				)
			: projects.items
	);

	const groups = $derived.by(() => {
		const filtered = needle
			? looseSessions.filter(
					(item) =>
						item.title.toLowerCase().includes(needle) || item.preview.toLowerCase().includes(needle)
				)
			: looseSessions;

		const order = ['Today', 'Yesterday', 'Previous 7 days', 'Older'] as const;
		const buckets = new Map<string, ConversationSummary[]>();
		for (const item of filtered) {
			const bucket = dayBucket(item.updatedAt);
			buckets.set(bucket, [...(buckets.get(bucket) ?? []), item]);
		}
		return order
			.filter((label) => buckets.has(label))
			.map((label) => ({ label, items: buckets.get(label) ?? [] }));
	});

	const localCount = $derived(models.models.filter((model) => model.local).length);
	const modeSessions = $derived.by(() => {
		const mode = tab === 'chats' ? 'chat' : 'agent';
		return conversations.items.filter((item) => {
			if (item.mode !== mode) return false;
			if (!needle) return true;
			return `${item.title} ${item.preview} ${item.projectName ?? ''}`
				.toLowerCase()
				.includes(needle);
		});
	});
	const modeGroups = $derived.by(() => {
		const order = ['Today', 'Yesterday', 'Previous 7 days', 'Older'] as const;
		const buckets = new Map<string, ConversationSummary[]>();
		for (const item of modeSessions) {
			const bucket = dayBucket(item.updatedAt);
			buckets.set(bucket, [...(buckets.get(bucket) ?? []), item]);
		}
		return order
			.filter((label) => buckets.has(label))
			.map((label) => ({ label, items: buckets.get(label) ?? [] }));
	});
	const counts = $derived({
		chats: conversations.items.filter((item) => item.mode === 'chat').length,
		agents: conversations.items.filter((item) => item.mode === 'agent').length
	});

	$effect(() => {
		localStorage.setItem('wor.nav', tab);
	});

	function projectSessions(projectId: string): ConversationSummary[] {
		return conversations.items.filter((item) => item.projectId === projectId);
	}

	$effect(() => {
		if (renaming && renameInput) {
			renameInput.focus();
			renameInput.select();
		}
	});

	$effect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (deleting) {
					deleting = null;
					return;
				}
				if (renaming) {
					renaming = null;
					return;
				}
			}
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				searchInput?.focus();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (!newMenuOpen) return;
		const onPointer = (event: PointerEvent) => {
			if (newMenu && !newMenu.contains(event.target as Node)) newMenuOpen = false;
		};
		document.addEventListener('pointerdown', onPointer);
		return () => document.removeEventListener('pointerdown', onPointer);
	});

	function closeMobile() {
		ui.closeMobile();
	}

	function startRename(item: ConversationSummary) {
		renaming = item;
		renameTitle = item.title;
		renameProjectId = item.projectId ?? '';
	}

	async function saveRename() {
		if (!renaming) return;
		const id = renaming.id;
		const previousProject = renaming.projectId ?? '';
		const title = renameTitle.trim();
		const projectId = renameProjectId || null;
		if (!title) return;
		try {
			await conversations.update(id, { title, projectId });
			renaming = null;
			if (projectId !== previousProject) await projects.load();
		} catch (error) {
			toasts.push(error instanceof Error ? error.message : 'Update failed.', 'error');
			await conversations.load();
		}
	}

	async function confirmDelete() {
		if (!deleting || busy) return;
		busy = true;
		const id = deleting.id;
		const projectId = deleting.projectId;
		try {
			await conversations.remove(id);
			deleting = null;
			if (activeId === id) {
				window.location.assign(projectId ? `/project/${projectId}` : '/chat');
			}
			toasts.push('Session deleted.', 'success');
		} catch (error) {
			toasts.push(error instanceof Error ? error.message : 'Delete failed.', 'error');
		} finally {
			busy = false;
		}
	}
</script>

{#if ui.mobileOpen}
	<button
		type="button"
		class="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] md:hidden"
		aria-label="Close sidebar"
		onclick={closeMobile}
	></button>
{/if}

<aside
	class="sidebar-surface fixed inset-y-0 left-0 z-40 flex w-[282px] shrink-0 flex-col overflow-hidden transition-[transform,width,opacity] duration-200 md:static md:z-auto md:translate-x-0 {ui.mobileOpen
		? 'translate-x-0'
		: '-translate-x-full'} {ui.collapsed
		? 'md:w-0 md:border-0 md:opacity-0'
		: 'md:w-[282px] md:opacity-100'}"
	aria-label="Workspace navigation"
>
	<div class="flex items-center justify-between px-3 pt-3 pb-1">
		<a
			href="/project"
			data-sveltekit-reload
			onclick={closeMobile}
			class="flex items-center gap-2"
			aria-label="Wor projects"
		>
			<span
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white shadow-sm"
			>
				<Logo size={16} />
			</span>
			<span class="font-serif text-[15px] font-semibold tracking-tight">Wor</span>
		</a>
		<div class="flex items-center">
			<button
				type="button"
				onclick={() => ui.toggleCollapsed()}
				class="hidden h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface hover:text-fg md:flex"
				aria-label="Collapse sidebar"
				title="Collapse sidebar"
			>
				<PanelLeftClose size={15} />
			</button>
			<button
				type="button"
				onclick={closeMobile}
				class="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface hover:text-fg md:hidden"
				aria-label="Close sidebar"
			>
				<X size={16} />
			</button>
		</div>
	</div>

	<div bind:this={newMenu} class="relative mt-2 px-3">
		{#if tab === 'projects'}
			<button
				type="button"
				onclick={() => (newMenuOpen = !newMenuOpen)}
				aria-expanded={newMenuOpen}
				aria-haspopup="menu"
				class="flex w-full items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] font-medium shadow-sm transition-colors hover:bg-surface-2"
			>
				<Plus size={15} class="text-accent" />
				New session
				<ChevronDown size={13} class="ml-auto text-faint" />
			</button>
			{#if newMenuOpen}
				<div
					class="menu-panel animate-pop absolute inset-x-3 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg p-1"
				>
					<a
						href="/chat"
						data-sveltekit-reload
						onclick={closeMobile}
						class="flex items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] hover:bg-surface-2"
					>
						<MessageSquare size={13} class="text-faint" />
						<span class="flex-1">New chat</span>
						<span class="text-[10px] text-faint">Chat</span>
					</a>
					<a
						href="/agent"
						data-sveltekit-reload
						onclick={closeMobile}
						class="flex items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] hover:bg-surface-2"
					>
						<Bot size={13} class="text-faint" />
						<span class="flex-1">New agent</span>
						<span class="text-[10px] text-faint">Tools</span>
					</a>
				</div>
			{/if}
		{:else}
			<a
				href={tab === 'chats' ? '/chat' : '/agent'}
				data-sveltekit-reload
				onclick={closeMobile}
				class="flex w-full items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] font-medium shadow-sm transition-colors hover:bg-surface-2"
			>
				<Plus size={15} class="text-accent" />
				{tab === 'chats' ? 'New chat' : 'New agent'}
				<kbd
					class="ml-auto rounded border border-line bg-bg px-1 py-0.5 font-sans text-[10px] text-faint"
				>
					⌘N
				</kbd>
			</a>
		{/if}
	</div>

	<div class="grid grid-cols-3 gap-1 px-3 pb-2 text-[10.5px]">
		{#each [{ id: 'projects', label: 'Projects', icon: FolderKanban, count: projects.items.length }, { id: 'chats', label: 'Chats', icon: MessageSquare, count: counts.chats }, { id: 'agents', label: 'Agents', icon: Bot, count: counts.agents }] as item}
			{@const Icon = item.icon}
			<button
				type="button"
				onclick={() => (tab = item.id as typeof tab)}
				class="flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition-colors {tab ===
				item.id
					? 'border-line bg-surface text-fg shadow-sm'
					: 'border-transparent text-muted hover:bg-surface/70 hover:text-fg'}"
				aria-pressed={tab === item.id}
			>
				<Icon size={14} />
				<span>{item.label}</span>
				{#if item.count > 0}<span class="text-[9px] text-faint">{item.count}</span>{/if}
			</button>
		{/each}
	</div>

	<div class="relative mx-3 mt-1">
		<Search
			size={13}
			class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint"
		/>
		<input
			bind:this={searchInput}
			bind:value={query}
			type="search"
			placeholder={tab === 'projects' ? 'Search projects and sessions' : `Search ${tab}`}
			aria-label={tab === 'projects' ? 'Search projects and sessions' : `Search ${tab}`}
			class="w-full rounded-lg border border-transparent bg-surface/70 py-1.5 pr-2.5 pl-8 text-[12.5px] outline-none placeholder:text-faint focus:border-line-strong focus:bg-surface"
		/>
	</div>

	<nav class="thin-scroll mt-2 flex-1 overflow-y-auto px-2 pb-3">
		{#if tab === 'projects'}
			<div class="mb-1 flex items-center justify-between px-3 pt-3 pb-1">
				<a
					href="/project"
					class="text-[10px] font-medium tracking-wide text-faint uppercase hover:text-fg"
				>
					Projects
				</a>
				<a
					href="/project?new=1"
					class="flex h-5 w-5 items-center justify-center rounded text-faint hover:bg-surface hover:text-fg"
					aria-label="New project"
					title="New project"
				>
					<Plus size={12} />
				</a>
			</div>

			{#if projects.loading && projects.items.length === 0}
				<div class="flex items-center gap-2 px-3 py-2 text-[11.5px] text-faint">
					<Loader2 size={12} class="animate-spin" /> Loading projects.
				</div>
			{:else if matchedProjects.length === 0}
				{#if needle}
					<div class="px-3 py-2 text-[11.5px] text-faint">No projects match.</div>
				{/if}
			{:else}
				{#each matchedProjects as project (project.id)}
					{@const sessions = projectSessions(project.id)}
					{@const open = expanded[project.id] || (needle.length > 0 && sessions.length > 0)}
					<div class="mb-0.5">
						<div class="group/project flex items-center">
							<a
								href={`/project/${project.id}`}
								onclick={closeMobile}
								class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-[6px] transition-colors {activeProjectId ===
								project.id
									? 'border border-line bg-surface shadow-sm'
									: 'border border-transparent hover:bg-surface/70'}"
							>
								<FolderKanban size={13} class="shrink-0 text-accent/80" />
								<span class="min-w-0 flex-1 truncate text-[12.5px]">{project.name}</span>
							</a>
							{#if sessions.length > 0}
								<button
									type="button"
									onclick={() => (expanded[project.id] = !open)}
									class="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-faint/80 transition hover:bg-surface hover:text-fg"
									aria-label={open ? 'Collapse project sessions' : 'Expand project sessions'}
									title={open ? 'Collapse' : 'Expand'}
								>
									<ChevronRight
										size={11}
										class={open ? 'rotate-90 transition-transform' : 'transition-transform'}
									/>
								</button>
							{/if}
						</div>
						{#if open && sessions.length > 0}
							<div class="mt-0.5 ml-4 border-l border-line pl-2">
								{#each sessions as session (session.id)}
									<div class="group/subrow relative">
										<a
											href={`/chat/${session.id}`}
											onclick={closeMobile}
											class="flex items-center gap-1.5 rounded-md py-[5px] pr-12 pl-2 text-[11.5px] transition-colors {activeId ===
											session.id
												? 'bg-surface text-fg shadow-sm'
												: 'text-muted hover:bg-surface/60 hover:text-fg'}"
										>
											{#if session.mode === 'agent'}<Bot
													size={10}
													class="shrink-0 text-faint"
												/>{:else}<MessageSquare size={10} class="shrink-0 text-faint" />{/if}
											<span class="truncate">{session.title}</span>
										</a>
										<div
											class="absolute top-1/2 right-0.5 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover/subrow:opacity-100 focus-within:opacity-100 max-md:opacity-100"
										>
											<button
												type="button"
												onclick={() => startRename(session)}
												class="flex h-5 w-5 items-center justify-center rounded bg-surface/90 text-faint hover:text-fg"
												aria-label="Rename session"
												title="Rename"
											>
												<Pencil size={10} />
											</button>
											<button
												type="button"
												onclick={() => (deleting = session)}
												class="flex h-5 w-5 items-center justify-center rounded bg-surface/90 text-faint hover:text-danger"
												aria-label="Delete session"
												title="Delete"
											>
												<Trash2 size={10} />
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			{/if}

			<div class="mt-4 mb-1 px-3 pt-2 pb-1">
				<span class="text-[10px] font-medium tracking-wide text-faint uppercase">Sessions</span>
			</div>

			{#if conversations.loading && conversations.items.length === 0}
				<div class="flex items-center gap-2 px-3 py-6 text-[12px] text-faint">
					<Loader2 size={13} class="animate-spin" /> Loading sessions.
				</div>
			{:else if groups.length === 0}
				{#if needle}
					<div class="flex flex-col items-center px-4 py-8 text-center text-[12px] text-faint">
						<MessageSquare size={18} class="mb-2 opacity-60" />
						No sessions match "{query}".
					</div>
				{:else}
					<div class="px-3 py-5 text-[11.5px] text-faint">No sessions yet.</div>
				{/if}
			{:else}
				{#each groups as group (group.label)}
					<div class="mb-1">
						<div class="px-3 pt-3 pb-1 text-[10px] font-medium tracking-wide text-faint uppercase">
							{group.label}
						</div>
						{#each group.items as item (item.id)}
							<div class="group/row relative">
								<a
									href={`/chat/${item.id}`}
									onclick={closeMobile}
									class="flex items-center gap-2 rounded-lg px-2.5 py-[7px] pr-14 transition-colors {activeId ===
									item.id
										? 'border border-line bg-surface shadow-sm'
										: 'border border-transparent hover:bg-surface/70'}"
								>
									<span class="min-w-0 flex-1">
										<span
											class="block truncate text-[12.5px] leading-5 {activeId === item.id
												? 'font-medium text-fg'
												: 'text-fg/90'}"
										>
											{item.title}
										</span>
										<span class="block truncate text-[10.5px] text-faint">
											{relativeTime(item.updatedAt)}{item.mode === 'agent' ? ' · agent' : ''}
										</span>
									</span>
								</a>
								<div
									class="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 max-md:opacity-100"
								>
									<button
										type="button"
										onclick={() => startRename(item)}
										class="flex h-6 w-6 items-center justify-center rounded-md bg-surface/90 text-faint hover:text-fg"
										aria-label="Rename session"
										title="Rename"
									>
										<Pencil size={11} />
									</button>
									<button
										type="button"
										onclick={() => (deleting = item)}
										class="flex h-6 w-6 items-center justify-center rounded-md bg-surface/90 text-faint hover:text-danger"
										aria-label="Delete session"
										title="Delete"
									>
										<Trash2 size={11} />
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/each}
			{/if}
		{:else}
			<div class="flex items-center justify-between px-3 pt-3 pb-1">
				<span class="text-[10px] font-medium tracking-wide text-faint uppercase">
					{tab === 'chats' ? 'Chats' : 'Agents'}
				</span>
				<span class="text-[10px] text-faint">{modeSessions.length}</span>
			</div>

			{#if conversations.loading && conversations.items.length === 0}
				<div class="flex items-center gap-2 px-3 py-6 text-[12px] text-faint">
					<Loader2 size={13} class="animate-spin" /> Loading.
				</div>
			{:else if modeGroups.length === 0}
				<div class="flex flex-col items-center px-4 py-8 text-center text-[12px] text-faint">
					{#if tab === 'chats'}<MessageSquare size={18} class="mb-2 opacity-60" />{:else}<Bot
							size={18}
							class="mb-2 opacity-60"
						/>{/if}
					{needle
						? `No ${tab} match "${query}".`
						: tab === 'chats'
							? 'No chats yet.'
							: 'No agents yet.'}
				</div>
			{:else}
				{#each modeGroups as group (group.label)}
					<div class="mb-1">
						<div class="px-3 pt-3 pb-1 text-[10px] font-medium tracking-wide text-faint uppercase">
							{group.label}
						</div>
						{#each group.items as item (item.id)}
							<div class="group/row relative">
								<a
									href={`/chat/${item.id}`}
									onclick={closeMobile}
									class="flex items-center gap-2 rounded-lg px-2.5 py-[7px] pr-14 transition-colors {activeId ===
									item.id
										? 'border border-line bg-surface shadow-sm'
										: 'border border-transparent hover:bg-surface/70'}"
								>
									<span class="min-w-0 flex-1">
										<span
											class="block truncate text-[12.5px] leading-5 {activeId === item.id
												? 'font-medium text-fg'
												: 'text-fg/90'}"
										>
											{item.title}
										</span>
										<span class="block truncate text-[10.5px] text-faint">
											{item.projectName ?? 'No project'} · {relativeTime(item.updatedAt)}
										</span>
									</span>
								</a>
								<div
									class="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 max-md:opacity-100"
								>
									<button
										type="button"
										onclick={() => startRename(item)}
										class="flex h-6 w-6 items-center justify-center rounded-md bg-surface/90 text-faint hover:text-fg"
										aria-label="Rename session"
										title="Rename"
									>
										<Pencil size={11} />
									</button>
									<button
										type="button"
										onclick={() => (deleting = item)}
										class="flex h-6 w-6 items-center justify-center rounded-md bg-surface/90 text-faint hover:text-danger"
										aria-label="Delete session"
										title="Delete"
									>
										<Trash2 size={11} />
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/each}
			{/if}
		{/if}
	</nav>

	<div class="border-t border-line px-3 py-2.5">
		<a
			href="/code"
			onclick={closeMobile}
			class="mb-2 flex items-center gap-2 rounded-lg border border-line bg-surface/70 px-2 py-1.5 text-[12px] text-muted transition-colors hover:bg-surface hover:text-fg"
		>
			<Code2 size={13} class="text-accent" />
			<span class="flex-1 truncate">Code workspace</span>
			<span
				class="rounded bg-accent-soft px-1.5 py-0.5 text-[9px] tracking-wide text-accent uppercase"
			>
				Preview
			</span>
		</a>
		<div class="flex items-center justify-between">
			<div class="flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
				<span class="h-1.5 w-1.5 shrink-0 rounded-full {models.localOnline ? 'bg-ok' : 'bg-danger'}"
				></span>
				<span class="truncate">
					{models.localOnline
						? `${localCount} local model${localCount === 1 ? '' : 's'}`
						: 'Ollama offline'}
				</span>
			</div>
			<div class="flex items-center gap-0.5">
				<button
					type="button"
					onclick={() => ui.openSettings()}
					class="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-fg"
					aria-label="Settings"
					title="Settings"
				>
					<Settings size={14} />
				</button>
				<ThemeToggle />
			</div>
		</div>
		<p class="mt-1 text-[10px] text-faint">Saved locally · SQLite</p>
	</div>
</aside>

{#if renaming}
	<div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
			aria-label="Cancel"
			onclick={() => (renaming = null)}
		></button>
		<div
			class="menu-panel animate-pop relative w-full max-w-sm rounded-xl p-5"
			role="dialog"
			aria-modal="true"
			aria-labelledby="edit-session-title"
			use:focusTrap={'input'}
		>
			<form
				onsubmit={(event) => {
					event.preventDefault();
					saveRename();
				}}
			>
				<h2 id="edit-session-title" class="font-serif text-lg font-semibold">Edit session</h2>
				<label class="mt-3 block">
					<span class="mb-1 block text-[11px] font-medium text-muted">Title</span>
					<input
						bind:this={renameInput}
						bind:value={renameTitle}
						class="w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-[13px] outline-none focus:border-accent"
						aria-label="Session title"
						maxlength="120"
						onkeydown={(event) => {
							if (event.key === 'Escape') renaming = null;
						}}
					/>
				</label>
				<label class="mt-3 block">
					<span class="mb-1 block text-[11px] font-medium text-muted">Project</span>
					<select
						bind:value={renameProjectId}
						class="w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-[13px] outline-none focus:border-accent"
					>
						<option value="">No project</option>
						{#each projects.items as project (project.id)}
							<option value={project.id}>{project.name}</option>
						{/each}
					</select>
				</label>
				<div class="mt-4 flex justify-end gap-2">
					<button
						type="button"
						class="rounded-lg border border-line px-3 py-1.5 text-[12.5px] hover:bg-surface-2"
						onclick={() => (renaming = null)}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90"
					>
						Save
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
			onclick={() => (deleting = null)}
		></button>
		<div
			class="menu-panel animate-pop relative w-full max-w-sm rounded-xl p-5"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="delete-session-title"
			aria-describedby="delete-session-body"
			use:focusTrap
		>
			<h2 id="delete-session-title" class="font-serif text-lg font-semibold">Delete session?</h2>
			<p id="delete-session-body" class="mt-1.5 text-[13px] leading-relaxed text-muted">
				"{deleting.title}" and all of its messages will be removed from this device.
			</p>
			<div class="mt-4 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg border border-line px-3 py-1.5 text-[12.5px] hover:bg-surface-2"
					onclick={() => (deleting = null)}
					disabled={busy}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-lg bg-danger px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
					onclick={confirmDelete}
					disabled={busy}
				>
					{busy ? 'Deleting.' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
