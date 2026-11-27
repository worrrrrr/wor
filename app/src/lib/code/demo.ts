import type {
	DiffLine,
	PluginInfo,
	SessionItem,
	SessionTab,
	Stat,
	TerminalLine,
	TerminalTab,
	ToolInfo,
	TrajectoryStep
} from './types';

export const demoTabs: SessionTab[] = [
	{
		id: 'auth',
		title: 'Refactor auth middleware',
		project: 'wor',
		branch: 'main',
		status: 'working',
		dirty: true
	},
	{
		id: 'parser',
		title: 'Streaming parser review',
		project: 'wor',
		branch: 'feat/stream',
		status: 'review',
		dirty: true
	},
	{
		id: 'docs',
		title: 'Write the UI spec',
		project: 'wor',
		branch: 'docs/spec',
		status: 'idle',
		dirty: false
	}
];

export const demoSessions: SessionItem[] = [
	{
		id: 'auth',
		title: 'Refactor auth middleware',
		group: 'Pinned',
		project: 'wor',
		age: 'now',
		mode: 'Build',
		unread: true
	},
	{
		id: 'parser',
		title: 'Streaming parser review',
		group: 'Working',
		project: 'wor',
		age: '2m',
		mode: 'Review'
	},
	{
		id: 'flaky',
		title: 'Flaky test in chat-stream',
		group: 'Needs attention',
		project: 'wor',
		age: '12m',
		mode: 'Build',
		unread: true
	},
	{
		id: 'docs',
		title: 'Write the UI spec',
		group: 'Recent',
		project: 'wor',
		age: '1h',
		mode: 'Plan'
	},
	{
		id: 'themes',
		title: 'Theme token audit',
		group: 'Recent',
		project: 'wor',
		age: '3h',
		mode: 'Plan'
	},
	{
		id: 'provider',
		title: 'Custom provider settings',
		group: 'Recent',
		project: 'wor',
		age: 'yesterday',
		mode: 'Build'
	}
];

export const diffLines: DiffLine[] = [
	{
		old: 11,
		new: 11,
		type: 'context',
		text: 'export async function requireUser(event: RequestEvent) {'
	},
	{ old: 12, new: 12, type: 'context', text: '  const headers = event.request.headers;' },
	{
		old: 13,
		new: null,
		type: 'del',
		text: '  const session = await auth.api.getSession({ headers });'
	},
	{ old: null, new: 13, type: 'add', text: '  const session = await sessions.get(headers);' },
	{ old: null, new: 14, type: 'add', text: '  if (!session) throw redirect(303, "/login");' },
	{ old: 14, new: 15, type: 'context', text: '  return session.user;' },
	{ old: 15, new: 16, type: 'context', text: '}' },
	{ old: 17, new: null, type: 'del', text: '// TODO: remove legacy cookie fallback' },
	{ old: null, new: 18, type: 'add', text: 'export const sessionHeader = "x-wor-session";' }
];

export const terminals: Record<TerminalTab, TerminalLine[]> = {
	terminal: [
		{ prompt: 'wor', text: 'bun run check' },
		{ prompt: '', text: 'svelte-check found 0 errors and 0 warnings' },
		{ prompt: 'wor', text: 'bun run test -- auth' },
		{ prompt: '', text: '✓ src/lib/server/auth.test.ts (7 tests)' },
		{ prompt: '', text: 'Tests 7 passed (7)' },
		{ prompt: 'wor', text: '▌' }
	],
	output: [
		{ prompt: '', text: '10:42:18  build  started' },
		{ prompt: '', text: '10:42:19  vite  452 modules transformed' },
		{ prompt: '', text: '10:42:21  build  done in 2.4s' }
	],
	problems: [
		{ prompt: 'warn', text: 'src/lib/server/chat-stream.ts:214  unused import "streamText"' },
		{ prompt: 'warn', text: 'src/routes/code/+page.svelte:88  demo data exceeds 120 lines' }
	]
};

export const demoTools: ToolInfo[] = [
	{ name: 'Read', detail: 'Open files and read line ranges.' },
	{ name: 'Grep', detail: 'Search file contents for a pattern.' },
	{ name: 'Shell', detail: 'Run commands after permission.' },
	{ name: 'Patch', detail: 'Apply edits and show a diff.' },
	{ name: 'Web fetch', detail: 'Retrieve a public page.' },
	{ name: 'Browser', detail: 'Drive a local browser session.' },
	{ name: 'Calculate', detail: 'Evaluate arithmetic exactly.' },
	{ name: 'Astrology', detail: 'Cast charts from the local engine.' }
];

export const demoPlugins: PluginInfo[] = [
	{ name: 'Core agent tools', detail: 'Read, Grep, Shell, Patch and web access' },
	{ name: 'SQLite persistence', detail: 'Sessions and messages in local.db' },
	{ name: 'Ollama runtime', detail: 'Local models through 127.0.0.1' },
	{ name: 'OpenAI-compatible providers', detail: 'Custom endpoints and encrypted keys' },
	{ name: 'Markdown renderer', detail: 'GFM, code blocks and syntax highlighting' },
	{ name: 'Theme system', detail: 'Warm paper palettes with light and dark tokens' }
];

export const demoToolState: Record<string, boolean> = {
	Read: true,
	Grep: true,
	Shell: true,
	Patch: true,
	'Web fetch': true,
	Browser: false,
	Calculate: true,
	Astrology: true
};

export const trajectory: TrajectoryStep[] = [
	{
		index: '01',
		kind: 'Request',
		text: 'Refactor the auth middleware and keep the login page untouched.',
		time: '—',
		meta: '142 in'
	},
	{
		index: '02',
		kind: 'Think',
		text: 'Read the middleware and session store before editing.',
		time: '2.1s',
		meta: '1,204 in · 318 out'
	},
	{
		index: '03',
		kind: 'Read',
		text: 'src/lib/server/auth.ts',
		time: '0.3s',
		meta: '64 lines'
	},
	{
		index: '04',
		kind: 'Grep',
		text: 'createSession',
		time: '0.2s',
		meta: '4 matches'
	},
	{
		index: '05',
		kind: 'Shell',
		text: 'bun run check',
		time: '1.2s',
		meta: 'exit 0'
	},
	{
		index: '06',
		kind: 'Patch',
		text: 'src/lib/server/auth.ts',
		time: '0.4s',
		meta: '+18 −7'
	},
	{
		index: '07',
		kind: 'Approval',
		text: 'Allow once',
		time: '—',
		meta: 'granted'
	},
	{
		index: '08',
		kind: 'Subagent',
		text: 'Explore · auth flow',
		time: '12s',
		meta: 'complete'
	}
];

export const stats: Stat[] = [
	{ label: 'Input', value: '18,420', detail: 'tokens' },
	{ label: 'Output', value: '2,310', detail: 'tokens' },
	{ label: 'Duration', value: '4m 12s', detail: 'wall clock' },
	{ label: 'Cost', value: '$0.00', detail: 'local model' }
];

export const timeBreakdown = [
	{ label: 'Reasoning', value: '38%', width: 'w-[38%]', color: 'bg-accent' },
	{ label: 'Tools', value: '44%', width: 'w-[44%]', color: 'bg-ok' },
	{ label: 'Writing', value: '18%', width: 'w-[18%]', color: 'bg-warn' }
];

export const sessionCounters = [
	{ label: 'Model calls', value: '6' },
	{ label: 'Tool calls', value: '4' },
	{ label: 'Files changed', value: '3' },
	{ label: 'Added', value: '+64' },
	{ label: 'Removed', value: '−21' },
	{ label: 'Approvals', value: '1' }
];
