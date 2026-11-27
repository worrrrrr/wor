export type ChatMode = 'chat' | 'agent';

export type TextPart = { type: 'text'; text: string };
export type ReasoningPart = { type: 'reasoning'; text: string };
export type FilePart = {
	type: 'file';
	name: string;
	mediaType: string;
	size: number;
	/** Data URL for images, extracted text for text files. */
	url?: string;
	text?: string;
};
export type ToolPart = {
	type: 'tool';
	toolCallId: string;
	name: string;
	input: unknown;
	output?: unknown;
	error?: string;
	state: 'running' | 'done' | 'error';
};

export type MessagePart = TextPart | ReasoningPart | FilePart | ToolPart;

export type Usage = {
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
};

export type ChatMessage = {
	id: string;
	role: 'user' | 'assistant';
	parts: MessagePart[];
	model?: string | null;
	createdAt: number;
	usage?: Usage | null;
	durationMs?: number | null;
	stopped?: boolean;
	error?: string | null;
};

export type ConversationSummary = {
	id: string;
	projectId: string | null;
	projectName: string | null;
	title: string;
	model: string;
	mode: ChatMode;
	createdAt: number;
	updatedAt: number;
	preview: string;
	messageCount: number;
};

export type ConversationDetail = {
	id: string;
	projectId: string | null;
	projectName: string | null;
	title: string;
	model: string;
	mode: ChatMode;
	createdAt: number;
	updatedAt: number;
	messages: ChatMessage[];
};

export type ProjectSummary = {
	id: string;
	name: string;
	description: string;
	instructions: string;
	color: string;
	createdAt: number;
	updatedAt: number;
	conversationCount: number;
	lastActivity: number | null;
};

export type ProviderModel = {
	id: string;
	name: string;
	contextWindow: number;
	tools: boolean;
	vision: boolean;
};

export type ProviderSummary = {
	id: string;
	name: string;
	baseUrl: string;
	hasKey: boolean;
	models: ProviderModel[];
	createdAt: number;
	updatedAt: number;
};

export type ModelInfo = {
	id: string;
	provider: 'ollama' | 'groq' | 'google' | 'custom';
	providerName: string;
	modelId: string;
	name: string;
	description?: string;
	contextWindow?: number;
	tools: boolean;
	vision: boolean;
	local: boolean;
};

export type ModelsResponse = {
	models: ModelInfo[];
	defaultModel: string | null;
	providers: Array<{ id: string; name: string; online: boolean; detail?: string }>;
};

export function messageText(message: ChatMessage): string {
	return message.parts
		.filter((part): part is TextPart => part.type === 'text')
		.map((part) => part.text)
		.join('');
}

export function hasVisibleContent(message: ChatMessage): boolean {
	return message.parts.some(
		(part) =>
			(part.type === 'text' && part.text.trim().length > 0) ||
			(part.type === 'reasoning' && part.text.trim().length > 0) ||
			part.type === 'tool' ||
			part.type === 'file'
	);
}
