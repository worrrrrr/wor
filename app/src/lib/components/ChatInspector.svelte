<script lang="ts">
	import type { ChatMessage } from '#lib/chat/types.ts';
	import { messageText } from '#lib/chat/types.ts';

	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import FileText from '@lucide/svelte/icons/file-text';
	import Route from '@lucide/svelte/icons/route';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Wrench from '@lucide/svelte/icons/wrench';
	import X from '@lucide/svelte/icons/x';

	let {
		messages,
		modelName,
		contextWindow = 131072,
		onclose
	}: {
		messages: ChatMessage[];
		modelName: string;
		contextWindow?: number;
		onclose: () => void;
	} = $props();

	let tab = $state<'trajectory' | 'statistics'>('trajectory');
	let scope = $state<'session' | 'last'>('session');
	let limit = $state(60);

	type Step = { id: string; kind: string; text: string; meta: string; state?: string };

	/** Session = every saved message. Last = the final request and everything after it. */
	const scopeMessages = $derived.by(() => {
		if (scope === 'session' || messages.length === 0) return messages;
		for (let index = messages.length - 1; index >= 0; index -= 1) {
			if (messages[index].role === 'user') return messages.slice(index);
		}
		return messages.slice(-1);
	});

	const steps = $derived.by(() => {
		const rows: Step[] = [];
		for (const message of scopeMessages) {
			const position = messages.indexOf(message) + 1;
			rows.push({
				id: `${message.id}-message`,
				kind: message.role === 'user' ? 'Request' : 'Answer',
				text: messageText(message).slice(0, 140) || (message.role === 'user' ? 'Attachment' : '—'),
				meta: `#${position}`
			});
			for (const part of message.parts) {
				if (part.type === 'reasoning') {
					rows.push({
						id: `${message.id}-reasoning`,
						kind: 'Think',
						text: part.text.slice(0, 140),
						meta: 'reasoning'
					});
				} else if (part.type === 'tool') {
					rows.push({
						id: part.toolCallId,
						kind: part.name,
						text: JSON.stringify(part.input).slice(0, 120),
						meta: part.state,
						state: part.state
					});
				} else if (part.type === 'file') {
					rows.push({
						id: `${message.id}-${part.name}`,
						kind: 'File',
						text: part.name,
						meta: `${Math.max(1, Math.round(part.size / 1024))} KB`
					});
				}
			}
		}
		return rows;
	});

	// Long sessions: keep the DOM small, newest records first-visible.
	const visible = $derived(steps.slice(Math.max(0, steps.length - limit)));
	const hiddenCount = $derived(steps.length - visible.length);

	const totals = $derived.by(() => {
		let input = 0;
		let output = 0;
		let duration = 0;
		let toolCalls = 0;
		let answers = 0;
		for (const message of scopeMessages) {
			input += message.usage?.inputTokens ?? 0;
			output += message.usage?.outputTokens ?? 0;
			duration += message.durationMs ?? 0;
			if (message.role === 'assistant') answers += 1;
			for (const part of message.parts) if (part.type === 'tool') toolCalls += 1;
		}
		return { input, output, total: input + output, duration, toolCalls, answers };
	});

	// Context pressure is always session-wide: it describes the live prompt.
	const lastUsage = $derived(messages.at(-1)?.usage?.totalTokens ?? 0);
	const contextPercent = $derived(
		Math.min(100, Math.round((lastUsage / Math.max(1, contextWindow)) * 100))
	);

	function setScope(next: 'session' | 'last') {
		scope = next;
		limit = 60;
	}

	function compact(value: number) {
		if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
		if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
		return `${value}`;
	}

	function seconds(value: number) {
		if (!value) return '—';
		if (value < 1000) return `${value}ms`;
		return `${(value / 1000).toFixed(1)}s`;
	}
</script>

<aside
	class="flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-line bg-surface max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-30 max-md:w-[min(88vw,320px)] max-md:shadow-xl"
	aria-label="Session inspector"
>
	<div class="flex h-9 shrink-0 items-center border-b border-line pr-1">
		<div class="grid min-w-0 flex-1 grid-cols-2 text-[10.5px]">
			{#each [{ id: 'trajectory', label: 'Trajectory', icon: Route }, { id: 'statistics', label: 'Statistics', icon: ChartColumn }] as item}
				{@const Icon = item.icon}
				<button
					type="button"
					onclick={() => (tab = item.id as typeof tab)}
					class="flex h-9 items-center justify-center gap-1.5 border-b-2 px-1 {tab === item.id
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
		<button
			type="button"
			onclick={onclose}
			class="rounded p-1 text-faint hover:bg-bg hover:text-fg"
			aria-label="Close inspector"
		>
			<X size={13} />
		</button>
	</div>

	<div class="flex shrink-0 items-center gap-1 border-b border-line px-2 py-1.5">
		<div class="flex rounded-md border border-line p-0.5 text-[9.5px]">
			{#each [{ id: 'session', label: 'Session' }, { id: 'last', label: 'Last turn' }] as option}
				<button
					type="button"
					onclick={() => setScope(option.id as typeof scope)}
					class="rounded px-1.5 py-0.5 {scope === option.id
						? 'bg-accent-soft font-medium text-accent'
						: 'text-faint hover:text-muted'}"
					aria-pressed={scope === option.id}
				>
					{option.label}
				</button>
			{/each}
		</div>
		<span class="ml-auto text-[9px] text-faint">
			{scope === 'session' ? `${messages.length} messages` : `${scopeMessages.length} messages`}
		</span>
	</div>

	{#if tab === 'trajectory'}
		<div
			class="flex shrink-0 items-center justify-between border-b border-line px-3 py-1.5 text-[9.5px] text-faint"
		>
			<span>{steps.length} records</span>
			<span>{modelName}</span>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
			{#if hiddenCount > 0}
				<button
					type="button"
					onclick={() => (limit += 60)}
					class="mb-1 w-full rounded-md border border-line px-2 py-1.5 text-[9.5px] text-faint hover:bg-bg hover:text-muted"
				>
					Show {Math.min(60, hiddenCount)} earlier records · {hiddenCount} hidden
				</button>
			{/if}
			{#each visible as step (step.id)}
				<div class="flex items-start gap-2 rounded-md px-1.5 py-1.5 hover:bg-bg/60">
					<span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-faint">
						{#if step.kind === 'Request'}<Route size={10} />
						{:else if step.kind === 'Answer'}<Sparkles size={10} class="text-accent" />
						{:else if step.kind === 'File'}<FileText size={10} />
						{:else}<Wrench size={10} />{/if}
					</span>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-1 text-[9px] font-medium text-muted">
							{step.kind}
							{#if step.state === 'error'}<span class="text-danger">failed</span>{/if}
						</span>
						<span class="mt-0.5 line-clamp-2 block text-[10.5px] leading-4">{step.text}</span>
					</span>
					<span class="shrink-0 text-[9px] text-faint">{step.meta}</span>
				</div>
			{/each}
			{#if steps.length === 0}
				<p class="px-2 py-6 text-[10.5px] text-faint">No activity yet.</p>
			{/if}
		</div>
	{:else}
		<div class="min-h-0 flex-1 overflow-y-auto p-3">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-[10px] font-medium tracking-wide text-faint uppercase">
					{scope === 'session' ? 'Session statistics' : 'Last turn statistics'}
				</span>
				<span class="max-w-[110px] truncate text-[9px] text-faint">{modelName}</span>
			</div>
			<div class="grid grid-cols-2 gap-1.5">
				{#each [{ label: 'Input', value: compact(totals.input), detail: 'tokens' }, { label: 'Output', value: compact(totals.output), detail: 'tokens' }, { label: 'Duration', value: seconds(totals.duration), detail: 'wall clock' }, { label: 'Answers', value: `${totals.answers}`, detail: 'assistant turns' }] as stat}
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
					<span>{compact(lastUsage)} / {compact(contextWindow)}</span>
				</div>
				<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg">
					<span class="block h-full rounded-full bg-accent" style={`width: ${contextPercent}%`}
					></span>
				</div>
				<div class="mt-1 text-[9px] text-faint">
					{contextPercent}% used · {compact(Math.max(0, contextWindow - lastUsage))} remaining
				</div>
			</div>

			<div class="mt-2 rounded-lg border border-line p-2.5 text-[9.5px]">
				{#each [{ label: 'Messages', value: `${scopeMessages.length}` }, { label: 'Tool calls', value: `${totals.toolCalls}` }, { label: 'Total tokens', value: compact(totals.total) }, { label: 'Avg answer', value: totals.answers ? seconds(Math.round(totals.duration / totals.answers)) : '—' }, { label: 'Model', value: modelName }] as row}
					<div class="flex items-center justify-between border-b border-line/60 py-1 last:border-0">
						<span class="text-faint">{row.label}</span>
						<span class="max-w-[150px] truncate tabular-nums">{row.value}</span>
					</div>
				{/each}
			</div>
			<p class="mt-2 px-1 text-[9px] leading-4 text-faint">
				Measured from saved messages in this conversation. Context pressure is always session-wide.
			</p>
		</div>
	{/if}
</aside>
