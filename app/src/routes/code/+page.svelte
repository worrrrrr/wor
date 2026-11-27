<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import CodeComposer from '#lib/components/code/CodeComposer.svelte';
	import CodeInspector from '#lib/components/code/CodeInspector.svelte';
	import CodePalette from '#lib/components/code/CodePalette.svelte';
	import CodeSidebar from '#lib/components/code/CodeSidebar.svelte';
	import CodeTerminal from '#lib/components/code/CodeTerminal.svelte';
	import CodeTimeline from '#lib/components/code/CodeTimeline.svelte';
	import CodeTopBar from '#lib/components/code/CodeTopBar.svelte';
	import { demoSessions, demoTabs } from '#lib/code/demo.ts';
	import type { SessionItem, SessionTab } from '#lib/code/types.ts';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { ui } from '#lib/stores/ui.svelte.ts';
	import { models } from '#lib/stores/models.svelte.ts';
	import { toasts } from '#lib/stores/toasts.svelte.ts';
	import { focusTrap } from '#lib/utils/focus-trap.ts';

	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';
	import PanelBottom from '@lucide/svelte/icons/panel-bottom';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import SquareTerminal from '@lucide/svelte/icons/square-terminal';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import FileCode from '@lucide/svelte/icons/file-code';
	import FileText from '@lucide/svelte/icons/file-text';
	import FileDiff from '@lucide/svelte/icons/file-diff';
	import GitBranch from '@lucide/svelte/icons/git-branch';
	import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal';
	import GitCompare from '@lucide/svelte/icons/git-compare';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Loader from '@lucide/svelte/icons/loader';
	import User from '@lucide/svelte/icons/user';
	import Clock from '@lucide/svelte/icons/clock';
	import Eye from '@lucide/svelte/icons/eye';
	import Workflow from '@lucide/svelte/icons/workflow';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Command from '@lucide/svelte/icons/command';

	let leftOpen = $state(typeof window === 'undefined' ? true : window.innerWidth >= 1024);
	let leftMobile = $state(false);
	let rightOpen = $state(typeof window === 'undefined' ? false : window.innerWidth >= 1536);
	let bottomOpen = $state(true);
	let rightWidth = $state(340);
	let wide = $state(typeof window === 'undefined' ? false : window.innerWidth >= 1536);

	let tabs = $state<SessionTab[]>([...demoTabs]);
	let activeTabId = $state('auth');
	let inspectorTab = $state<'trajectory' | 'statistics' | 'inspector' | 'tools' | 'plugins'>(
		'trajectory'
	);
	let sessionFilter = $state<'all' | 'working' | 'attention'>('all');
	let query = $state('');
	let commandOpen = $state(false);
	let running = $state(false);
	let permission = $state<'pending' | 'allowed' | 'denied'>('pending');
	let sent = $state<string[]>([]);

	const activeTab = $derived(tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]);

	function openSession(item: SessionItem) {
		if (tabs.some((tab) => tab.id === item.id)) activeTabId = item.id;
		else {
			tabs = [
				...tabs,
				{
					id: item.id,
					title: item.title,
					project: item.project,
					branch: 'main',
					status: item.group === 'Working' ? 'working' : 'idle',
					dirty: item.group === 'Needs attention'
				}
			];
			activeTabId = item.id;
		}
	}

	function selectTab(id: string) {
		activeTabId = id;
	}

	function closeTab(id: string) {
		if (tabs.length === 1) return;
		const index = tabs.findIndex((tab) => tab.id === id);
		tabs = tabs.filter((tab) => tab.id !== id);
		if (activeTabId === id) activeTabId = tabs[Math.max(0, index - 1)].id;
	}

	function newTab() {
		const id = `draft-${tabs.length + 1}`;
		tabs = [
			...tabs,
			{
				id,
				title: 'Untitled session',
				project: 'wor',
				branch: 'main',
				status: 'idle',
				dirty: false
			}
		];
		activeTabId = id;
	}

	function runCommand(action: string) {
		commandOpen = false;
		if (action === 'new') newTab();
		if (action === 'review') {
			inspectorTab = 'inspector';
			rightOpen = true;
		}
		if (action === 'terminal') bottomOpen = !bottomOpen;
		if (action === 'split') {
			inspectorTab = 'inspector';
			rightOpen = true;
		}
		if (action === 'composer')
			document.querySelector<HTMLTextAreaElement>('#code-composer')?.focus();
		if (action === 'project') window.location.assign('/project');
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			commandOpen = !commandOpen;
			return;
		}
		if (event.key === 'Escape') {
			if (commandOpen) commandOpen = false;
			else if (leftMobile) leftMobile = false;
			else if (rightOpen && !wide) rightOpen = false;
		}
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
			event.preventDefault();
			bottomOpen = !bottomOpen;
		}
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			document.querySelector<HTMLTextAreaElement>('#code-composer')?.focus();
		}
	}

	let timer: ReturnType<typeof setTimeout> | undefined;

	function sendMessage(text: string) {
		if (!text || running) return;
		sent = [...sent, text];
		running = true;
		clearTimeout(timer);
		timer = setTimeout(() => {
			running = false;
			toasts.push('Preview message queued. Connect the agent runtime to execute it.', 'success');
		}, 900);
	}

	function stopMessage() {
		clearTimeout(timer);
		running = false;
	}

	function allowPermission() {
		permission = 'allowed';
		toasts.push('Command approved for this session.', 'success');
	}

	function denyPermission() {
		permission = 'denied';
		toasts.push('Command denied.', 'error');
	}

	$effect(() => {
		const sync = () => {
			wide = window.innerWidth >= 1536;
		};
		sync();
		window.addEventListener('resize', sync);
		return () => window.removeEventListener('resize', sync);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-dvh w-full overflow-hidden bg-bg text-fg">
	{#if leftMobile}
		<button
			type="button"
			class="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
			aria-label="Close workspace navigation"
			onclick={() => (leftMobile = false)}
		></button>
	{/if}

	{#if leftOpen || leftMobile}
		<CodeSidebar
			bind:open={leftOpen}
			bind:mobileOpen={leftMobile}
			activeId={activeTabId}
			onnew={() => {
				newTab();
				leftMobile = false;
			}}
			onopen={openSession}
			onreview={() => (rightOpen = true)}
		/>
	{/if}

	<div class="flex min-w-0 flex-1 flex-col">
		<CodeTopBar
			{tabs}
			activeId={activeTabId}
			{leftOpen}
			{bottomOpen}
			{rightOpen}
			onselect={selectTab}
			onclose={closeTab}
			onnew={newTab}
			onopensidebar={() => (leftOpen = true)}
			onopenmobile={() => (leftMobile = true)}
			oncommand={() => (commandOpen = true)}
			ontogglebottom={() => (bottomOpen = !bottomOpen)}
			ontoggleinspector={() => (rightOpen = !rightOpen)}
		/>

		<div class="flex min-h-0 flex-1">
			<CodeTimeline
				session={activeTab}
				narrow={rightOpen && wide}
				{permission}
				{sent}
				{running}
				onallow={allowPermission}
				ondeny={denyPermission}
				onopenreview={() => {
					inspectorTab = 'inspector';
					rightOpen = true;
				}}
			/>

			<CodeInspector bind:open={rightOpen} bind:width={rightWidth} bind:tab={inspectorTab} {wide} />
		</div>

		<CodeTerminal bind:open={bottomOpen} />

		<CodeComposer
			bind:running
			narrow={rightOpen && wide}
			onsend={sendMessage}
			onstop={stopMessage}
			oncommand={() => (commandOpen = true)}
		/>
	</div>
</div>

<CodePalette bind:open={commandOpen} onaction={runCommand} />
