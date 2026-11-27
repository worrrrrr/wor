export type SessionStatus = 'working' | 'review' | 'idle';

export type SessionTab = {
	id: string;
	title: string;
	project: string;
	branch: string;
	status: SessionStatus;
	dirty: boolean;
};

export type SessionGroup = 'Pinned' | 'Needs attention' | 'Working' | 'Recent' | 'Archived';

export type SessionItem = {
	id: string;
	title: string;
	group: SessionGroup;
	project: string;
	age: string;
	mode: 'Build' | 'Plan' | 'Review';
	unread?: boolean;
};

export type DiffLine = {
	old: number | null;
	new: number | null;
	type: 'context' | 'add' | 'del';
	text: string;
};

export type TerminalLine = {
	prompt: string;
	text: string;
};

export type TerminalTab = 'terminal' | 'output' | 'problems';

export type ToolInfo = {
	name: string;
	detail: string;
};

export type PluginInfo = {
	name: string;
	detail: string;
};

export type TrajectoryStep = {
	index: string;
	kind: string;
	text: string;
	time: string;
	meta: string;
};

export type Stat = {
	label: string;
	value: string;
	detail: string;
};

export type InspectorTab = 'trajectory' | 'statistics' | 'inspector' | 'tools' | 'plugins';

export type ReviewScope = 'session' | 'git' | 'branch' | 'turn';

export type DiffMode = 'unified' | 'split';
