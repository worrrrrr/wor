<script lang="ts">
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Code2 from '@lucide/svelte/icons/code-2';
	import Mail from '@lucide/svelte/icons/mail';
	import FileSearch from '@lucide/svelte/icons/file-search';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Calculator from '@lucide/svelte/icons/calculator';
	import Globe from '@lucide/svelte/icons/globe';
	import GitCompare from '@lucide/svelte/icons/git-compare';
	import Logo from '#lib/components/Logo.svelte';
	import type { ChatMode } from '#lib/chat/types.ts';

	let {
		mode,
		disabled = false,
		local = true,
		providerName = 'the selected provider',
		onsend
	}: {
		mode: ChatMode;
		disabled?: boolean;
		local?: boolean;
		providerName?: string;
		onsend: (prompt: string) => void;
	} = $props();

	const chatSuggestions = [
		{
			icon: Lightbulb,
			tag: 'Explain',
			title: 'Explain a hard idea',
			prompt: 'Explain how transformers work, using a concrete analogy and no jargon.'
		},
		{
			icon: Code2,
			tag: 'Build',
			title: 'Write working code',
			prompt:
				'Write a TypeScript function that debounces async calls and cancels stale results. Include tests.'
		},
		{
			icon: Mail,
			tag: 'Draft',
			title: 'Write something clear',
			prompt:
				'Draft a short, friendly email asking a client to move a deadline by one week, without sounding unreliable.'
		},
		{
			icon: FileSearch,
			tag: 'Attach',
			title: 'Read a file with me',
			prompt: 'Summarize the attached file and list the three most important points.'
		}
	];

	const agentSuggestions = [
		{
			icon: Calculator,
			tag: 'Calculate',
			title: 'Do exact math',
			prompt: 'What is 18% of 4,780 plus 12.5% of 1,240? Use the calculator and show the steps.'
		},
		{
			icon: Globe,
			tag: 'Fetch',
			title: 'Read the live web',
			prompt: 'Fetch https://news.ycombinator.com and summarize the top five stories right now.'
		},
		{
			icon: MapPin,
			tag: 'Plan',
			title: 'Plan with real times',
			prompt:
				'Check the current time in Bangkok, then plan a two-hour evening around it with realistic travel times.'
		},
		{
			icon: GitCompare,
			tag: 'Compare',
			title: 'Weigh two options',
			prompt:
				'Compare SQLite and PostgreSQL for a single-user desktop app. Give a recommendation and the tradeoff that decides it.'
		}
	];

	const suggestions = $derived(mode === 'agent' ? agentSuggestions : chatSuggestions);
</script>

<div
	class="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-start px-5 py-8 md:justify-center md:px-8 md:py-14"
>
	<div class="flex items-center gap-3">
		<span
			class="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-sm"
		>
			<Logo size={24} />
		</span>
		<div>
			<p class="text-[10px] font-medium tracking-[0.14em] text-faint uppercase">AI workspace</p>
			<h1 class="font-serif text-[26px] leading-tight font-semibold md:text-[30px]">
				What can I help with?
			</h1>
		</div>
	</div>

	<p class="mt-4 max-w-md text-[13.5px] leading-relaxed text-muted">
		{#if mode === 'agent'}
			Agent mode can calculate, read the clock and fetch live pages. Every step is visible.{#if local}
				Nothing leaves this device.{:else}
				Prompts and tool results are sent to {providerName} for this response.{/if}
		{:else if local}
			Pick a model, attach a file, and start talking. Conversations are saved to SQLite on this
			device, and the model runs here too.
		{:else}
			Pick a model, attach a file, and start talking. Conversations are saved to SQLite on this
			device; prompts are sent to {providerName} to generate a response.
		{/if}
	</p>

	<div class="mt-8 grid gap-2 sm:grid-cols-2">
		{#each suggestions as suggestion (suggestion.title)}
			<button
				type="button"
				{disabled}
				onclick={() => onsend(suggestion.prompt)}
				class="group rounded-xl border border-line bg-surface p-3.5 text-left transition-all hover:-translate-y-px hover:border-line-strong hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<span
					class="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-faint uppercase"
				>
					<suggestion.icon size={12} class="text-accent" />
					{suggestion.tag}
				</span>
				<span class="mt-1.5 block text-[13px] font-medium">{suggestion.title}</span>
				<span class="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-muted">
					{suggestion.prompt}
				</span>
			</button>
		{/each}
	</div>

	<div class="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-faint">
		<span>{local ? 'Runs on your machine' : 'Cloud model'}</span>
		<span>·</span>
		<span>Streaming responses</span>
		<span>·</span>
		<span>Saved locally</span>
	</div>
</div>
