<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import FileText from '@lucide/svelte/icons/file-text';
	import Logo from '#lib/components/Logo.svelte';
	import Markdown from '#lib/components/Markdown.svelte';
	import ToolCard from '#lib/components/ToolCard.svelte';
	import type { ChatMessage } from '#lib/chat/types.ts';
	import { messageText } from '#lib/chat/types.ts';
	import { copyText } from '#lib/utils/clipboard.ts';
	import { models } from '#lib/stores/models.svelte.ts';
	import { toasts } from '#lib/stores/toasts.svelte.ts';
	import { formatDuration, usageLabel } from '#lib/utils/format.ts';

	let {
		message,
		isLast = false,
		streaming = false,
		onregenerate,
		onretry
	}: {
		message: ChatMessage;
		isLast?: boolean;
		streaming?: boolean;
		onregenerate?: () => void;
		onretry?: () => void;
	} = $props();

	const text = $derived(messageText(message));
	const modelName = $derived.by(() => {
		if (!message.model) return '';
		return (
			models.models.find((model) => model.id === message.model)?.name ??
			message.model.split(':').slice(1).join(':')
		);
	});
	const files = $derived(message.parts.filter((part) => part.type === 'file'));
	const hasParts = $derived(message.parts.length > 0);

	async function copy() {
		const ok = await copyText(text);
		toasts.push(ok ? 'Copied to clipboard.' : 'Could not copy.', ok ? 'success' : 'error');
	}
</script>

{#if message.role === 'user'}
	<article class="animate-rise flex justify-end" aria-label="Your message">
		<div class="flex max-w-[88%] flex-col items-end gap-1.5">
			{#if files.length}
				<div class="flex flex-wrap justify-end gap-1.5">
					{#each files as file, index (file.name + index)}
						{#if file.type === 'file' && file.url && file.mediaType.startsWith('image/')}
							<a href={file.url} target="_blank" rel="noopener noreferrer" class="block">
								<img
									src={file.url}
									alt={file.name}
									class="max-h-52 max-w-[260px] rounded-xl border border-line object-cover"
								/>
							</a>
						{:else if file.type === 'file'}
							<div
								class="flex max-w-[260px] items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 text-[11.5px]"
							>
								<FileText size={13} class="shrink-0 text-muted" />
								<span class="truncate">{file.name}</span>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
			{#if text.trim()}
				<div
					class="rounded-2xl rounded-br-md bg-userbg px-4 py-2.5 text-[14.5px] leading-relaxed break-words whitespace-pre-wrap"
				>
					{text}
				</div>
			{/if}
		</div>
	</article>
{:else}
	<article class="group/message animate-rise flex gap-3" aria-label="Wor's response">
		<div
			class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-accent"
		>
			<Logo size={14} />
		</div>
		<div class="min-w-0 flex-1">
			{#if hasParts}
				<div>
					{#each message.parts as part, index (index)}
						{#if part.type === 'text'}
							<div>
								<Markdown
									text={part.text}
									streaming={streaming && index === message.parts.length - 1}
								/>
								{#if streaming && index === message.parts.length - 1}
									<span class="stream-caret" aria-hidden="true"></span>
								{/if}
							</div>
						{:else if part.type === 'reasoning'}
							<details
								class="my-2 rounded-lg border border-line bg-surface-2/70 px-3 py-2 text-[12.5px]"
								open={streaming && index === message.parts.length - 1}
							>
								<summary class="cursor-pointer font-medium text-muted select-none">
									Reasoning
								</summary>
								<div
									class="mt-1.5 max-h-64 overflow-y-auto font-serif leading-relaxed whitespace-pre-wrap text-muted"
								>
									{part.text}
								</div>
							</details>
						{:else if part.type === 'tool'}
							<ToolCard {part} />
						{/if}
					{/each}
				</div>
			{:else if streaming}
				<div class="flex h-6 items-center gap-1" aria-label="Thinking">
					<span class="typing-dot"></span>
					<span class="typing-dot"></span>
					<span class="typing-dot"></span>
				</div>
			{/if}

			{#if message.error}
				<div
					class="mt-2 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[12.5px] text-danger"
				>
					<AlertCircle size={14} class="mt-0.5 shrink-0" />
					<div class="min-w-0 flex-1">
						<p class="whitespace-pre-wrap">{message.error}</p>
						{#if onretry && isLast}
							<button
								type="button"
								class="mt-1.5 inline-flex items-center gap-1 rounded-md border border-danger/30 px-2 py-0.5 text-[11.5px] font-medium hover:bg-danger/10"
								onclick={onretry}
							>
								<RotateCw size={10} /> Try again
							</button>
						{/if}
					</div>
				</div>
			{/if}

			{#if !streaming && (hasParts || message.error)}
				<footer class="mt-1.5 flex h-6 items-center gap-2 text-[10.5px] text-faint">
					{#if modelName}<span class="truncate">{modelName}</span>{/if}
					{#if message.durationMs}<span>·</span><span>
							{formatDuration(message.durationMs)}
						</span>{/if}
					{#if usageLabel(message.usage)}<span>·</span><span>{usageLabel(message.usage)}</span>{/if}
					{#if message.stopped}<span>·</span><span>Stopped</span>{/if}
					<div
						class="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100 max-sm:opacity-100"
					>
						{#if text.trim()}
							<button
								type="button"
								onclick={copy}
								class="flex h-6 w-6 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-fg"
								aria-label="Copy response"
								title="Copy"
							>
								<Copy size={12} />
							</button>
						{/if}
						{#if isLast && onregenerate && !message.error}
							<button
								type="button"
								onclick={onregenerate}
								class="flex h-6 w-6 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-fg"
								aria-label="Regenerate response"
								title="Regenerate"
							>
								<RotateCw size={12} />
							</button>
						{/if}
					</div>
				</footer>
			{/if}
		</div>
	</article>
{/if}
