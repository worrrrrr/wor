<script lang="ts">
	import Calculator from '@lucide/svelte/icons/calculator';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Clock from '@lucide/svelte/icons/clock';
	import Globe from '@lucide/svelte/icons/globe';
	import Wrench from '@lucide/svelte/icons/wrench';
	import Check from '@lucide/svelte/icons/check';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import type { ToolPart } from '#lib/chat/types.ts';

	let { part }: { part: ToolPart } = $props();

	const icons: Record<string, typeof Wrench> = {
		calculate: Calculator,
		calculator: Calculator,
		astrology: Sparkles,
		current_time: Clock,
		web_fetch: Globe
	};

	const labels: Record<string, string> = {
		calculate: 'Calculate',
		calculator: 'Calculator',
		astrology: 'Natal chart',
		current_time: 'Current time',
		web_fetch: 'Web fetch'
	};

	const Icon = $derived(icons[part.name] ?? Wrench);
	const label = $derived(labels[part.name] ?? part.name);
	const input = $derived((part.input ?? {}) as Record<string, unknown>);

	const summary = $derived.by(() => {
		if (typeof input.expression === 'string') return input.expression;
		if (typeof input.url === 'string') return input.url;
		if (typeof input.timezone === 'string') return input.timezone;
		if (typeof input.date === 'string' && typeof input.time === 'string') {
			return `${input.date} ${input.time} · ${input.location ?? ''}${input.focus ? ` · ${input.focus}` : ''}`;
		}
		return '';
	});

	const result = $derived.by(() => {
		if (part.error) return part.error;
		const output = part.output as Record<string, unknown> | string | undefined;
		if (output == null) return '';
		if (typeof output === 'string') return output;
		if (typeof output.summary === 'string') return output.summary;
		if (typeof output.formatted === 'string') return output.formatted;
		if (typeof output.result === 'number' || typeof output.result === 'string') {
			return `${input.expression ?? 'Result'} = ${output.result}`;
		}
		if (typeof output.title === 'string' && typeof output.text === 'string') {
			return `${output.title ? output.title + '\n\n' : ''}${output.text}`;
		}
		return JSON.stringify(output, null, 2);
	});

	const preview = $derived(result.length > 240 ? result.slice(0, 240).trimEnd() + '…' : result);
</script>

<div
	class="tool-card my-3 overflow-hidden text-[13px]"
	class:tool-running={part.state === 'running'}
>
	<div class="flex items-center gap-2.5 px-3 py-2">
		<span
			class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-muted"
		>
			<Icon size={13}></Icon>
		</span>
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<span class="font-medium">{label}</span>
				{#if part.state === 'running'}
					<Loader2 size={11} class="animate-spin text-accent" />
				{:else if part.state === 'done'}
					<Check size={11} class="text-ok" />
				{:else}
					<AlertCircle size={11} class="text-danger" />
				{/if}
			</div>
			{#if summary}
				<p class="mt-0.5 truncate font-mono text-[11px] text-faint">{summary}</p>
			{/if}
		</div>
	</div>

	{#if preview && part.state !== 'running'}
		<div class="border-t border-line px-3 py-2">
			<p
				class="line-clamp-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-muted"
			>
				{preview}
			</p>
			{#if result.length > 240}
				<details class="mt-1.5">
					<summary class="cursor-pointer text-[11px] text-accent">Full output</summary>
					<pre
						class="mt-2 max-h-64 overflow-auto rounded-md border border-line bg-codebg p-2 text-[11px] text-fg">{result}</pre>
				</details>
			{/if}
		</div>
	{/if}
</div>
