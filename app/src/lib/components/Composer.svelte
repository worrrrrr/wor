<script lang="ts">
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Square from '@lucide/svelte/icons/square';
	import X from '@lucide/svelte/icons/x';
	import FileText from '@lucide/svelte/icons/file-text';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import type { ChatMode, FilePart } from '#lib/chat/types.ts';
	import { formatBytes } from '#lib/utils/format.ts';
	import { toasts } from '#lib/stores/toasts.svelte.ts';

	let {
		streaming = false,
		disabled = false,
		mode = $bindable<ChatMode>('chat'),
		vision = false,
		tools = true,
		modelName = '',
		onsend,
		onstop
	}: {
		streaming?: boolean;
		disabled?: boolean;
		mode?: ChatMode;
		vision?: boolean;
		tools?: boolean;
		modelName?: string;
		onsend: (text: string, files: FilePart[]) => void;
		onstop: () => void;
	} = $props();

	let text = $state('');
	let attachments = $state<FilePart[]>([]);
	let textarea = $state<HTMLTextAreaElement | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let dragging = 0;
	let uploadBusy = $state(false);

	const dragActive = $derived(dragging > 0);
	const canSend = $derived(
		(text.trim().length > 0 || attachments.length > 0) && !streaming && !disabled
	);

	const TEXT_TYPES =
		/^(text\/|application\/(json|javascript|typescript|xml|x-yaml|sql|toml|ld\+json)|image\/svg\+xml)/;
	const TEXT_EXTENSIONS =
		/\.(md|mdx|txt|json|jsonc|csv|tsv|log|ya?ml|toml|ini|conf|env|sql|py|ts|tsx|js|jsx|svelte|vue|css|scss|html|xml|sh|bash|zsh|ps1|rs|go|java|c|h|cpp|hpp|cs|php|rb|swift|kt|lua|r|tex|gitignore|dockerfile)$/i;

	const MAX_IMAGE = 5 * 1024 * 1024;
	const MAX_TEXT = 2 * 1024 * 1024;
	const MAX_FILES = 8;

	$effect(() => {
		void text;
		const element = textarea;
		if (!element) return;
		element.style.height = '0px';
		element.style.height = `${Math.min(element.scrollHeight, 220)}px`;
	});

	$effect(() => {
		if (window.innerWidth > 768) textarea?.focus();
	});

	function isTextFile(file: File): boolean {
		return TEXT_TYPES.test(file.type) || TEXT_EXTENSIONS.test(file.name);
	}

	function readDataUrl(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(new Error('Could not read file.'));
			reader.readAsDataURL(file);
		});
	}

	async function addFiles(files: Iterable<File>) {
		if (uploadBusy) return;
		uploadBusy = true;
		try {
			for (const file of files) {
				if (attachments.length >= MAX_FILES) {
					toasts.push(`Up to ${MAX_FILES} attachments per message.`, 'error');
					break;
				}
				if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
					if (!vision) {
						toasts.push(
							`${modelName || 'This model'} cannot see images. Pick a vision model.`,
							'error'
						);
						continue;
					}
					if (file.size > MAX_IMAGE) {
						toasts.push(`${file.name} is larger than 5 MB.`, 'error');
						continue;
					}
					const url = await readDataUrl(file);
					attachments = [
						...attachments,
						{
							type: 'file',
							name: file.name,
							mediaType: file.type || 'image/png',
							size: file.size,
							url
						}
					];
					continue;
				}

				if (!isTextFile(file)) {
					toasts.push(`Unsupported file type: ${file.name}. Attach text or images.`, 'error');
					continue;
				}
				if (file.size > MAX_TEXT) {
					toasts.push(`${file.name} is larger than 2 MB.`, 'error');
					continue;
				}
				const content = await file.text();
				if (content.includes('\u0000')) {
					toasts.push(`${file.name} looks binary. Only text files are supported.`, 'error');
					continue;
				}
				attachments = [
					...attachments,
					{
						type: 'file',
						name: file.name,
						mediaType: file.type || 'text/plain',
						size: file.size,
						text: content.slice(0, 20_000)
					}
				];
			}
		} catch (error) {
			toasts.push(error instanceof Error ? error.message : 'Could not attach file.', 'error');
		} finally {
			uploadBusy = false;
		}
	}

	function removeAttachment(index: number) {
		attachments = attachments.filter((_, position) => position !== index);
	}

	function submit() {
		if (!canSend) return;
		const outgoing = text.trim();
		const files = attachments;
		text = '';
		attachments = [];
		onsend(outgoing, files);
		textarea?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			submit();
		}
	}

	function handlePaste(event: ClipboardEvent) {
		const files = [...(event.clipboardData?.files ?? [])];
		if (files.length) {
			event.preventDefault();
			addFiles(files);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragging = 0;
		if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files);
	}
</script>

<div
	class="relative"
	role="presentation"
	ondragenter={(event) => {
		event.preventDefault();
		dragging += 1;
	}}
	ondragover={(event) => event.preventDefault()}
	ondragleave={(event) => {
		event.preventDefault();
		dragging = Math.max(0, dragging - 1);
	}}
	ondrop={handleDrop}
>
	{#if dragActive}
		<div
			class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-accent bg-accent-soft/90 text-[13px] font-medium text-accent"
		>
			<Paperclip size={18} />
			Drop files to attach
		</div>
	{/if}

	<div class="composer-well rounded-2xl px-2.5 pt-2 pb-2">
		{#if attachments.length > 0}
			<div class="mb-1.5 flex flex-wrap gap-1.5 px-0.5">
				{#each attachments as attachment, index (attachment.name + index)}
					<div
						class="flex max-w-[220px] items-center gap-1.5 rounded-lg border border-line bg-surface-2 py-1 pr-1 pl-1.5 text-[11.5px]"
					>
						{#if attachment.url && attachment.mediaType.startsWith('image/')}
							<img
								src={attachment.url}
								alt={attachment.name}
								class="h-6 w-6 rounded object-cover"
							/>
						{:else}
							<FileText size={13} class="shrink-0 text-muted" />
						{/if}
						<span class="min-w-0 flex-1 truncate">{attachment.name}</span>
						<span class="shrink-0 text-[10px] text-faint">{formatBytes(attachment.size)}</span>
						<button
							type="button"
							class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-faint hover:bg-surface hover:text-fg"
							onclick={() => removeAttachment(index)}
							aria-label={`Remove ${attachment.name}`}
						>
							<X size={11} />
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<textarea
			bind:this={textarea}
			bind:value={text}
			onkeydown={handleKeydown}
			onpaste={handlePaste}
			rows="1"
			placeholder={disabled
				? 'No model available — check your connection'
				: mode === 'agent'
					? 'Ask the agent to do something…'
					: 'Message Wor…'}
			aria-label="Message"
			class="max-h-[220px] min-h-9 w-full resize-none bg-transparent px-1.5 py-1 text-[14.5px] leading-6 outline-none placeholder:text-faint"
		></textarea>

		<div class="flex items-center gap-1 px-0.5">
			<input
				bind:this={fileInput}
				type="file"
				multiple
				class="hidden"
				accept="image/png,image/jpeg,image/webp,image/gif,text/*,.md,.json,.csv,.ts,.tsx,.js,.svelte,.py,.css,.html,.sql,.yaml,.yml,.toml,.log,.sh,.go,.rs,.java,.c,.cpp,.h,.xml"
				onchange={(event) => {
					const files = event.currentTarget.files;
					if (files) addFiles(files);
					event.currentTarget.value = '';
				}}
			/>
			<button
				type="button"
				onclick={() => fileInput?.click()}
				class="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
				aria-label="Attach files"
				title="Attach files"
				disabled={uploadBusy}
			>
				<Paperclip size={16} />
			</button>

			<div class="flex items-center rounded-full bg-surface-2 p-0.5 text-[11.5px] font-medium">
				<button
					type="button"
					onclick={() => (mode = 'chat')}
					class="flex items-center gap-1 rounded-full px-2 py-1 transition-colors {mode === 'chat'
						? 'bg-surface text-fg shadow-sm'
						: 'text-muted hover:text-fg'}"
					aria-pressed={mode === 'chat'}
				>
					<MessageCircle size={11} /> Chat
				</button>
				<button
					type="button"
					onclick={() => (mode = 'agent')}
					disabled={!tools}
					class="flex items-center gap-1 rounded-full px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 {mode ===
					'agent'
						? 'bg-surface text-accent shadow-sm'
						: 'text-muted hover:text-fg'}"
					aria-pressed={mode === 'agent'}
					title={tools ? 'Agent can use tools' : 'This model does not support tool calling'}
				>
					<Sparkles size={11} /> Agent
				</button>
			</div>

			<div class="flex-1"></div>

			{#if streaming}
				<button
					type="button"
					onclick={onstop}
					class="flex h-8 items-center gap-1.5 rounded-full bg-fg px-3 text-[12px] font-medium text-bg transition-opacity hover:opacity-85"
					aria-label="Stop generating"
				>
					<Square size={11} fill="currentColor" /> Stop
				</button>
			{:else}
				<button
					type="button"
					onclick={submit}
					disabled={!canSend}
					class="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-faint disabled:shadow-none"
					aria-label="Send message"
				>
					<ArrowUp size={16} />
				</button>
			{/if}
		</div>
	</div>

	<p class="mt-2 text-center text-[10.5px] text-faint">
		{#if mode === 'agent'}
			Agent can use calculator, clock and web fetch · Enter to send
		{:else}
			Enter to send · Shift+Enter for a new line
		{/if}
	</p>
</div>
