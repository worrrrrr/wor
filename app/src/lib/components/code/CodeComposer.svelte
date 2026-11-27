<script lang="ts">
	import { models } from '#lib/stores/models.svelte.ts';

	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import AtSign from '@lucide/svelte/icons/at-sign';
	import Bot from '@lucide/svelte/icons/bot';
	import Brain from '@lucide/svelte/icons/brain';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import FileText from '@lucide/svelte/icons/file-text';
	import Lock from '@lucide/svelte/icons/lock';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import Slash from '@lucide/svelte/icons/slash';
	import Square from '@lucide/svelte/icons/square';
	import X from '@lucide/svelte/icons/x';
	import Zap from '@lucide/svelte/icons/zap';

	let {
		running = $bindable(false),
		narrow = false,
		onsend,
		onstop,
		oncommand
	}: {
		running?: boolean;
		narrow?: boolean;
		onsend: (text: string) => void;
		onstop: () => void;
		oncommand: () => void;
	} = $props();

	let text = $state('');
	let attachments = $state<string[]>([]);
	let buildMode = $state('Build');
	let effort = $state('Default');
	let fileInput = $state<HTMLInputElement | null>(null);

	const activeModel = $derived(models.active);

	function send() {
		if (!text.trim() || running) return;
		onsend(text.trim());
		text = '';
	}

	function insertToken(token: string) {
		text = text ? `${text}${text.endsWith(' ') ? '' : ' '}${token}` : token;
		document.querySelector<HTMLTextAreaElement>('#code-composer')?.focus();
	}

	function addFiles(files: FileList | null) {
		if (!files) return;
		attachments = [...new Set([...attachments, ...[...files].map((file) => file.name)])].slice(
			0,
			5
		);
		if (fileInput) fileInput.value = '';
	}
</script>

<div class="shrink-0 border-t border-line bg-surface/70 px-3 py-2.5 sm:px-5">
	<div class="mx-auto {narrow ? 'max-w-[860px]' : 'max-w-[1100px]'}">
		<div
			class="rounded-xl border border-line-strong bg-surface shadow-sm focus-within:border-accent/50"
		>
			<input
				bind:this={fileInput}
				type="file"
				multiple
				class="sr-only"
				onchange={(event) => addFiles(event.currentTarget.files)}
			/>
			{#if attachments.length > 0}
				<div class="flex flex-wrap gap-1 px-2 pt-2">
					{#each attachments as name}
						<span
							class="flex items-center gap-1 rounded-md border border-line bg-bg px-1.5 py-0.5 text-[10px] text-muted"
						>
							<FileText size={10} />
							<span class="max-w-[160px] truncate">{name}</span>
							<button
								type="button"
								onclick={() => (attachments = attachments.filter((item) => item !== name))}
								class="text-faint hover:text-danger"
								aria-label={`Remove ${name}`}
							>
								<X size={9} />
							</button>
						</span>
					{/each}
				</div>
			{/if}
			<textarea
				id="code-composer"
				bind:value={text}
				rows="2"
				onkeydown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						send();
					}
				}}
				class="block max-h-[150px] min-h-[52px] w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[12.5px] leading-relaxed outline-none placeholder:text-faint"
				placeholder="Ask for a change, or describe the next step…"></textarea>
			<div class="flex flex-wrap items-center gap-1 px-2 pb-2">
				<button
					type="button"
					onclick={() => fileInput?.click()}
					class="flex h-7 w-7 items-center justify-center rounded text-faint hover:bg-bg hover:text-fg"
					aria-label="Attach file"
					title="Attach file"
				>
					<Paperclip size={13} />
				</button>
				<button
					type="button"
					onclick={() => insertToken('@')}
					class="flex h-7 w-7 items-center justify-center rounded text-faint hover:bg-bg hover:text-fg"
					aria-label="Add context"
					title="Add context"
				>
					<AtSign size={13} />
				</button>
				<button
					type="button"
					onclick={oncommand}
					class="flex h-7 w-7 items-center justify-center rounded text-faint hover:bg-bg hover:text-fg"
					aria-label="Insert command"
					title="Command palette"
				>
					<Slash size={13} />
				</button>
				<span class="mx-1 h-4 w-px bg-line"></span>
				<label
					class="flex h-6 items-center gap-1 rounded border border-line bg-bg px-1.5 text-muted hover:text-fg"
					title="Agent mode"
				>
					<Bot size={11} />
					<select
						bind:value={buildMode}
						class="appearance-none bg-transparent text-[10px] text-muted outline-none"
						aria-label="Agent mode"
					>
						<option>Build</option>
						<option>Plan</option>
						<option>Review</option>
					</select>
					<ChevronDown size={9} class="pointer-events-none" />
				</label>
				<label
					class="flex h-6 items-center gap-1 rounded border border-line bg-bg px-1.5 text-muted hover:text-fg"
					title="Reasoning effort"
				>
					<Brain size={11} />
					<select
						bind:value={effort}
						class="appearance-none bg-transparent text-[10px] text-muted outline-none"
						aria-label="Reasoning effort"
					>
						<option>Default</option>
						<option>Fast</option>
						<option>Deep</option>
					</select>
					<ChevronDown size={9} class="pointer-events-none" />
				</label>
				<select
					value={activeModel?.id ?? ''}
					onchange={(event) => models.select(event.currentTarget.value)}
					class="ml-auto max-w-[150px] appearance-none truncate bg-transparent text-right text-[9.5px] text-faint outline-none hover:text-fg"
					aria-label="Model"
					title={activeModel?.name ?? 'Select model'}
				>
					{#each models.models as model (model.id)}
						<option value={model.id}>{model.name}</option>
					{/each}
				</select>
				<span class="flex items-center gap-1 text-[9.5px] text-faint">
					{#if activeModel?.local}<Lock size={9} /> local{:else}<Zap size={9} /> cloud{/if}
				</span>
				{#if running}
					<button
						type="button"
						onclick={onstop}
						class="flex h-7 w-7 items-center justify-center rounded-md bg-fg text-bg"
						aria-label="Stop"
					>
						<Square size={12} />
					</button>
				{:else}
					<button
						type="button"
						onclick={send}
						disabled={!text.trim()}
						class="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white disabled:opacity-40"
						aria-label="Send message"
					>
						<ArrowUp size={14} />
					</button>
				{/if}
			</div>
		</div>
		<div class="mt-1 flex items-center justify-between px-1 text-[9.5px] text-faint">
			<span>
				Enter to send · Shift+Enter for a new line · <button
					type="button"
					onclick={oncommand}
					class="hover:text-fg"
				>
					⌘K commands
				</button>
			</span>
		</div>
	</div>
</div>
