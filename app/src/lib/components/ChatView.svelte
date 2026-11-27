<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import Copy from '@lucide/svelte/icons/copy';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Composer from '#lib/components/Composer.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ChatInspector from '#lib/components/ChatInspector.svelte';
	import MessageItem from '#lib/components/MessageItem.svelte';
	import PanelIcon from '#lib/components/PanelIcon.svelte';
	import ModelMenu from '#lib/components/ModelMenu.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { models } from '#lib/stores/models.svelte.ts';
	import { conversations } from '#lib/stores/conversations.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';
	import { toasts } from '#lib/stores/toasts.svelte.ts';
	import { copyText } from '#lib/utils/clipboard.ts';
	import { messageText } from '#lib/chat/types.ts';
	import type {
		ChatMessage,
		ChatMode,
		ConversationDetail,
		FilePart,
		ProjectSummary,
		Usage
	} from '#lib/chat/types.ts';

	let {
		conversation = null,
		project = null,
		initialMode = null
	}: {
		conversation?: ConversationDetail | null;
		project?: ProjectSummary | null;
		initialMode?: ChatMode | null;
	} = $props();

	const storedMode = typeof localStorage !== 'undefined' ? localStorage.getItem('wor.mode') : null;

	// Seed once from the loaded conversation. Later prop changes are handled by the
	// reset effect below, so reading the prop here is intentional and untracked.
	let messages = $state<ChatMessage[]>(
		untrack(() => (conversation ? structuredClone(conversation.messages) : []))
	);
	let conversationId = $state<string | null>(untrack(() => conversation?.id ?? null));
	let projectId = $state<string | null>(
		untrack(() => conversation?.projectId ?? project?.id ?? null)
	);
	let projectName = $state<string | null>(
		untrack(() => conversation?.projectName ?? project?.name ?? null)
	);
	let title = $state(untrack(() => conversation?.title ?? 'New chat'));
	let model = $state(untrack(() => conversation?.model ?? ''));
	let mode = $state<ChatMode>(
		untrack(() => conversation?.mode ?? initialMode ?? (storedMode === 'agent' ? 'agent' : 'chat'))
	);
	let lastPropId = untrack(() => conversation?.id ?? null);
	let status = $state<'idle' | 'streaming'>('idle');
	let revision = $state(0);
	let stickToBottom = $state(true);
	let showJump = $state(false);
	let inspectorOpen = $state(false);
	let scroller = $state<HTMLDivElement | null>(null);
	let abortController: AbortController | null = null;
	let started = false;
	let streamToken = 0;
	let lastAttempt: { text: string; files: FilePart[] } | null = null;

	const activeModel = $derived.by(() => models.models.find((item) => item.id === model));
	const streaming = $derived(status === 'streaming');
	const newChatHref = $derived(
		`/${mode === 'agent' ? 'agent' : 'chat'}${projectId ? `?project=${projectId}` : ''}`
	);
	const documentTitle = $derived(
		conversationId ? `${title} · Wor` : `${mode === 'agent' ? 'New agent' : 'New chat'} · Wor`
	);

	$effect(() => {
		if (!model && models.active) model = models.active.id;
	});

	$effect(() => {
		if (models.models.length === 0) return;
		if (model && models.models.some((item) => item.id === model)) return;
		const fallback = models.active?.id;
		if (fallback) model = fallback;
	});

	$effect(() => {
		if (mode === 'agent' && activeModel && !activeModel.tools) mode = 'chat';
	});

	$effect(() => {
		try {
			localStorage.setItem('wor.mode', mode);
		} catch {
			// ignore
		}
	});

	$effect(() => {
		const nextId = conversation?.id ?? null;
		if (nextId === lastPropId) return;
		lastPropId = nextId;

		abortController?.abort();
		abortController = null;
		streamToken += 1;
		conversationId = nextId;
		projectId = conversation?.projectId ?? project?.id ?? null;
		projectName = conversation?.projectName ?? project?.name ?? null;
		title = conversation?.title ?? 'New chat';
		messages = conversation ? structuredClone(conversation.messages) : [];
		model = conversation?.model ?? models.active?.id ?? '';
		if (conversation?.mode) mode = conversation.mode;
		status = 'idle';
		lastAttempt = null;
		revision += 1;
		stickToBottom = true;
		scrollToBottom();
	});

	$effect(() => {
		conversations.activeId = conversation?.id ?? null;
	});

	$effect(() => {
		if (conversation) return;
		const next = project?.id ?? null;
		if (next === projectId) return;
		projectId = next;
		projectName = project?.name ?? null;
		revision += 1;
	});

	$effect(() => {
		const item = conversations.items.find((entry) => entry.id === conversationId);
		if (item && status !== 'streaming' && item.title !== title) title = item.title;
	});

	$effect(() => {
		return () => abortController?.abort();
	});

	$effect(() => {
		void revision;
		const count = messages.length;
		if (count === 0) return;
		if (stickToBottom) scrollToBottom();
	});

	function draftMessage(): ChatMessage | undefined {
		const last = messages[messages.length - 1];
		return last?.role === 'assistant' ? last : undefined;
	}

	function onScroll() {
		const element = scroller;
		if (!element) return;
		const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
		stickToBottom = distance < 120;
		showJump = distance > 260;
	}

	function scrollToBottom(behavior: ScrollBehavior = 'auto') {
		const element = scroller;
		if (!element) return;
		requestAnimationFrame(() => {
			element.scrollTo({ top: element.scrollHeight, behavior });
		});
	}

	function jumpToLatest() {
		stickToBottom = true;
		showJump = false;
		scrollToBottom('smooth');
	}

	function handleEvent(event: Record<string, unknown>, userTempId: string, runId: number) {
		if (runId !== streamToken) return;
		const type = event.t;
		const draft = draftMessage();

		if (type === 'start') {
			started = true;
			conversationId = event.conversationId as string;
			title = (event.conversationTitle as string) ?? title;
			const user = messages.find((message) => message.id === userTempId);
			if (user) user.id = event.userMessageId as string;
			if (draft) draft.id = event.assistantId as string;
			void goto(`/chat/${conversationId}`, { shallow: true, replace: true });
			conversations.activeId = conversationId;
			void conversations.load();
			revision += 1;
			return;
		}

		if (!draft) return;

		if (type === 'text') {
			const last = draft.parts[draft.parts.length - 1];
			if (last?.type === 'text') last.text += event.v as string;
			else draft.parts.push({ type: 'text', text: event.v as string });
			revision += 1;
			return;
		}

		if (type === 'reasoning') {
			const last = draft.parts[draft.parts.length - 1];
			if (last?.type === 'reasoning') last.text += event.v as string;
			else draft.parts.push({ type: 'reasoning', text: event.v as string });
			revision += 1;
			return;
		}

		if (type === 'tool') {
			const id = event.id as string;
			const existing = draft.parts.find((part) => part.type === 'tool' && part.toolCallId === id);
			const state = event.state as 'running' | 'done' | 'error';
			if (existing?.type === 'tool') {
				existing.state = state;
				if (event.output !== undefined) existing.output = event.output;
				if (event.error) existing.error = event.error as string;
				if (event.input !== undefined) existing.input = event.input;
			} else {
				draft.parts.push({
					type: 'tool',
					toolCallId: id,
					name: event.name as string,
					input: event.input,
					output: event.output,
					error: event.error as string | undefined,
					state
				});
			}
			revision += 1;
			return;
		}

		if (type === 'error') {
			draft.error = event.message as string;
			toasts.push(event.message as string, 'error');
			revision += 1;
			return;
		}

		if (type === 'done') {
			draft.usage = (event.usage as Usage | null) ?? null;
			draft.durationMs = (event.durationMs as number) ?? null;
			draft.stopped = Boolean(event.stopped);
			if (event.title) {
				title = event.title as string;
				if (conversationId) conversations.applyTitle(conversationId, title);
			}
			revision += 1;
		}
	}

	async function readStream(
		body: ReadableStream<Uint8Array>,
		userTempId: string,
		runId: number
	): Promise<void> {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		const consume = (line: string) => {
			if (!line.trim()) return;
			try {
				handleEvent(JSON.parse(line) as Record<string, unknown>, userTempId, runId);
			} catch {
				// Ignore malformed lines from an interrupted stream.
			}
		};

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			let newline = buffer.indexOf('\n');
			while (newline !== -1) {
				consume(buffer.slice(0, newline));
				buffer = buffer.slice(newline + 1);
				newline = buffer.indexOf('\n');
			}
		}
		buffer += decoder.decode();
		consume(buffer);
	}

	async function run(body: Record<string, unknown>, userTempId: string) {
		const runId = ++streamToken;
		status = 'streaming';
		started = false;
		const draft: ChatMessage = {
			id: `pending-${crypto.randomUUID()}`,
			role: 'assistant',
			parts: [],
			createdAt: Date.now(),
			model,
			usage: null,
			durationMs: null,
			stopped: false,
			error: null
		};
		messages = [...messages, draft];
		revision += 1;
		stickToBottom = true;
		scrollToBottom();

		const controller = new AbortController();
		abortController = controller;

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
				signal: controller.signal
			});

			if (!response.ok) {
				let message = `Request failed (HTTP ${response.status})`;
				try {
					const data = (await response.json()) as { error?: string };
					if (data.error) message = data.error;
				} catch {
					// keep the status message
				}
				throw new Error(message);
			}
			if (!response.body) throw new Error('The server returned an empty response.');
			await readStream(response.body, userTempId, runId);
		} catch (error) {
			if (runId !== streamToken) return;
			const target = draftMessage();
			if (controller.signal.aborted) {
				if (target) target.stopped = true;
			} else {
				const message = error instanceof Error ? error.message : 'Request failed.';
				if (target) target.error = message;
				toasts.push(message, 'error');
			}
		} finally {
			if (runId !== streamToken) return;
			status = 'idle';
			abortController = null;
			revision += 1;
			conversations.load();

			const target = draftMessage();
			if (target && target.parts.length === 0 && !target.error) {
				messages = messages.filter((message) => message.id !== target.id);
			}
			if (stickToBottom) scrollToBottom();
		}
	}

	async function send(text: string, files: FilePart[]) {
		if (status === 'streaming') return;
		if (!model) {
			toasts.push('No model is available yet.', 'error');
			return;
		}
		const trimmed = text.trim();
		if (!trimmed && files.length === 0) return;

		const userTempId = `user-${crypto.randomUUID()}`;
		const userMessage: ChatMessage = {
			id: userTempId,
			role: 'user',
			parts: [...(trimmed ? [{ type: 'text' as const, text: trimmed }] : []), ...files],
			createdAt: Date.now()
		};
		lastAttempt = { text: trimmed, files };
		messages = [...messages, userMessage];
		stickToBottom = true;

		await run(
			{
				conversationId,
				projectId,
				text: trimmed,
				attachments: files,
				model,
				mode
			},
			userTempId
		);
	}

	function stop() {
		abortController?.abort();
	}

	async function regenerate() {
		if (status === 'streaming' || !conversationId) return;
		const last = messages[messages.length - 1];
		if (last?.role !== 'assistant') return;
		messages = messages.slice(0, -1);
		revision += 1;
		await run({ conversationId, model, mode, regenerate: true }, '');
	}

	async function retry() {
		if (status === 'streaming' || !lastAttempt) return;
		const last = messages[messages.length - 1];
		if (last?.role === 'assistant') messages = messages.slice(0, -1);
		revision += 1;
		if (started && conversationId) {
			await run({ conversationId, model, mode, regenerate: true }, '');
		} else {
			await run(
				{
					conversationId,
					text: lastAttempt.text,
					attachments: lastAttempt.files,
					model,
					mode
				},
				''
			);
		}
	}

	function chooseModel(id: string) {
		model = id;
	}

	async function copyChat() {
		const lines: string[] = [
			`# ${title}`,
			'',
			`${mode === 'agent' ? 'Agent' : 'Chat'} · ${model}`,
			''
		];
		for (const message of messages) {
			const body = messageText(message).trim();
			const files = message.parts.flatMap((part) =>
				part.type === 'file' ? [`[File: ${part.name}]`] : []
			);
			const content = [body, ...files].filter(Boolean).join('\n\n');
			if (!content) continue;
			lines.push(`## ${message.role === 'user' ? 'You' : 'Wor'}`, '', content, '');
		}
		const ok = await copyText(lines.join('\n').trim());
		toasts.push(
			ok ? 'Whole chat copied as Markdown.' : 'Could not copy the chat.',
			ok ? 'success' : 'error'
		);
	}
</script>

<svelte:head>
	<title>{documentTitle}</title>
</svelte:head>

<div class="relative flex h-dvh min-w-0 flex-1 flex-col bg-bg">
	<header class="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 md:px-4">
		<button
			type="button"
			onclick={() => ui.openMobile()}
			class="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg md:hidden"
			aria-label="Open sidebar"
		>
			<PanelIcon side="left" size={17} />
		</button>

		<div class="min-w-0 flex-1">
			<h1 class="truncate text-[13.5px] font-medium" {title}>{title}</h1>
			<p class="hidden text-[10.5px] text-faint sm:block">
				{projectName ? `${projectName} · ` : ''}{mode === 'agent'
					? 'Agent mode · tools enabled'
					: 'Chat mode'} · saved locally
			</p>
		</div>

		{#if messages.length > 0}
			<button
				type="button"
				onclick={copyChat}
				class="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
				aria-label="Copy whole chat"
				title="Copy whole chat"
			>
				<Copy size={15} />
			</button>
		{/if}
		<button
			type="button"
			onclick={() => (inspectorOpen = !inspectorOpen)}
			class="flex h-8 w-8 items-center justify-center rounded-lg {inspectorOpen
				? 'bg-accent-soft text-accent'
				: 'text-muted hover:bg-surface-2 hover:text-fg'}"
			aria-label="Toggle inspector"
			aria-pressed={inspectorOpen}
			title="Session inspector"
		>
			<PanelIcon side="right" open={inspectorOpen} size={16} />
		</button>
		<ModelMenu value={model} onchange={chooseModel} />
		<ThemeToggle />
		<a
			href={newChatHref}
			data-sveltekit-reload
			class="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
			aria-label="New chat"
			title="New chat"
		>
			<SquarePen size={16} />
		</a>
	</header>

	{#if !models.loading && (!model || models.models.length === 0)}
		<div class="flex items-center gap-2 border-b border-line bg-accent-soft/60 px-4 py-2">
			<AlertTriangle size={14} class="shrink-0 text-accent" />
			<p class="min-w-0 flex-1 text-[12px] text-fg">
				<span class="font-medium">No model available.</span>
				{models.error ?? 'Start Ollama with “ollama serve”, then retry.'}
			</p>
			<button
				type="button"
				onclick={() => models.load(true)}
				class="inline-flex shrink-0 items-center gap-1 rounded-md border border-line-strong bg-surface px-2 py-1 text-[11.5px] hover:bg-surface-2"
			>
				<RefreshCw size={11} /> Retry
			</button>
		</div>
	{/if}

	<div class="flex min-h-0 flex-1">
		<div class="relative flex min-w-0 flex-1 flex-col">
			<div
				bind:this={scroller}
				onscroll={onScroll}
				class="thin-scroll relative flex-1 overflow-y-auto overscroll-contain"
			>
				{#if messages.length === 0}
					<EmptyState
						{mode}
						disabled={!model}
						local={activeModel?.local ?? true}
						providerName={activeModel?.providerName ?? 'the selected provider'}
						onsend={(prompt) => send(prompt, [])}
					/>
				{:else}
					<div class="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 md:px-6">
						<div class="flex flex-col gap-6">
							{#each messages as message, index (message.id)}
								<MessageItem
									{message}
									isLast={index === messages.length - 1}
									streaming={streaming &&
										index === messages.length - 1 &&
										message.role === 'assistant'}
									onregenerate={regenerate}
									onretry={index === messages.length - 1 ? retry : undefined}
								/>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			{#if showJump}
				<div class="pointer-events-none absolute inset-x-0 bottom-[128px] z-20 flex justify-center">
					<button
						type="button"
						onclick={jumpToLatest}
						class="menu-panel pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] text-muted hover:text-fg"
					>
						<ArrowDown size={12} /> Jump to latest
					</button>
				</div>
			{/if}

			<div
				class="shrink-0 bg-bg px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:pb-4"
			>
				<div class="mx-auto w-full max-w-3xl">
					<Composer
						bind:mode
						{streaming}
						disabled={!model}
						vision={activeModel?.vision ?? false}
						tools={activeModel?.tools ?? true}
						modelName={activeModel?.name ?? ''}
						onsend={send}
						onstop={stop}
					/>
				</div>
			</div>
		</div>
		{#if inspectorOpen}
			<ChatInspector
				{messages}
				modelName={activeModel?.name ?? ''}
				contextWindow={activeModel?.contextWindow ?? 131072}
				onclose={() => (inspectorOpen = false)}
			/>
		{/if}
	</div>

	<span class="sr-only" aria-live="polite">
		{streaming ? 'Wor is responding' : 'Wor is idle'}
	</span>
</div>
