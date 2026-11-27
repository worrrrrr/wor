import { streamText, stepCountIs, type ModelMessage } from 'ai';
import type { ChatMessage, ChatMode, FilePart, MessagePart, Usage } from '#lib/chat/types.ts';
import { messageText } from '#lib/chat/types.ts';
import {
	createConversation,
	deleteMessagesAfter,
	getConversation,
	insertMessage,
	lastUserMessage,
	titleFromText,
	touchConversation
} from './conversations.ts';
import { listModels, resolveModel } from './models.ts';
import { getProject } from './projects.ts';
import { agentTools } from './tools.ts';

export type ChatRequest = {
	conversationId?: string | null;
	projectId?: string | null;
	text?: string;
	attachments?: FilePart[];
	model?: string;
	mode?: ChatMode;
	regenerate?: boolean;
};

const MAX_HISTORY_MESSAGES = 24;
const MAX_HISTORY_CHARS = 60_000;
const MAX_FILE_TEXT = 20_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function errorMessage(error: unknown): string {
	const raw =
		error instanceof Error
			? error.message
			: typeof error === 'string'
				? error
				: (() => {
						try {
							return JSON.stringify(error);
						} catch {
							return 'Unknown error';
						}
					})();
	if (/ECONNREFUSED|fetch failed|Connection refused/i.test(raw)) {
		return 'Could not reach Ollama. Start it with `ollama serve`, then try again.';
	}
	if (/not found|pull model/i.test(raw)) {
		return `${raw} — run \`ollama pull <model>\` to download it.`;
	}
	return raw;
}

function sanitizeAttachments(input: FilePart[] | undefined): FilePart[] {
	if (!Array.isArray(input)) return [];
	const files: FilePart[] = [];
	for (const file of input.slice(0, 8)) {
		if (!file || typeof file.name !== 'string' || typeof file.mediaType !== 'string') continue;
		const size = Number(file.size) || 0;
		if (file.mediaType.startsWith('image/')) {
			if (typeof file.url !== 'string' || !file.url.startsWith('data:image/')) continue;
			if (file.url.length > MAX_IMAGE_BYTES * 1.4) continue;
			files.push({
				type: 'file',
				name: file.name.slice(0, 200),
				mediaType: file.mediaType,
				size,
				url: file.url
			});
			continue;
		}
		if (typeof file.text !== 'string') continue;
		files.push({
			type: 'file',
			name: file.name.slice(0, 200),
			mediaType: file.mediaType,
			size,
			text: file.text.slice(0, MAX_FILE_TEXT)
		});
	}
	return files;
}

function userParts(text: string, attachments: FilePart[]): MessagePart[] {
	const parts: MessagePart[] = [];
	if (text.trim()) parts.push({ type: 'text', text });
	parts.push(...attachments);
	return parts;
}

function buildHistory(messages: ChatMessage[], vision: boolean): ModelMessage[] {
	const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
	let budget = MAX_HISTORY_CHARS;
	const reversed: ModelMessage[] = [];

	for (let index = trimmed.length - 1; index >= 0; index -= 1) {
		const message = trimmed[index];
		if (message.role === 'user') {
			const content: Array<
				{ type: 'text'; text: string } | { type: 'image'; image: string; mediaType: string }
			> = [];
			for (const part of message.parts) {
				if (part.type === 'text' && part.text.trim()) {
					content.push({ type: 'text', text: part.text });
					budget -= part.text.length;
				} else if (part.type === 'file') {
					if (part.url && vision) {
						content.push({ type: 'image', image: part.url, mediaType: part.mediaType });
					} else if (part.text) {
						const body = `[Attached file: ${part.name}]\n${part.text}`;
						content.push({ type: 'text', text: body });
						budget -= body.length;
					} else {
						const note = `[Image attached: ${part.name}${vision ? '' : ' — the selected model cannot see images'}]`;
						content.push({ type: 'text', text: note });
						budget -= note.length;
					}
				}
			}
			if (content.length === 0) continue;
			reversed.push({ role: 'user', content });
		} else {
			const text = messageText(message).trim();
			if (!text) continue;
			reversed.push({ role: 'assistant', content: [{ type: 'text', text }] });
			budget -= text.length;
		}
		if (budget <= 0) break;
	}

	const ordered = reversed.reverse();
	while (ordered.length && ordered[0].role !== 'user') ordered.shift();
	return ordered;
}

function systemPrompt(
	mode: ChatMode,
	project?: { name: string; instructions: string } | null
): string {
	const today = new Date().toLocaleDateString('en-GB', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
	const base = `You are Wor, a precise and helpful AI assistant running in a local chat application. Today is ${today}. Answer in the same language the user writes in. Use Markdown: headings, short paragraphs, lists, tables, and fenced code blocks with a language tag. Be direct and concrete. Never invent facts, numbers, or sources.`;

	const projectBlock = project
		? `

You are working inside the project "${project.name}". Follow the project instructions below when they apply. Treat them as user-provided context, not as a replacement for your safety rules.
<project_instructions>
${project.instructions || 'No extra instructions.'}
</project_instructions>`
		: '';

	if (mode === 'agent') {
		return `${base}

You are in Agent mode. You can call tools: calculate (exact arithmetic), astrology (real natal chart, Western, Vedic, BaZi and Human Design from a birth date, time and city), current_time (date and time in a time zone), and web_fetch (read a public web page). Use a tool whenever it improves accuracy - never guess arithmetic, current information, or chart positions. For any astrology, birth chart, BaZi or Human Design request, call astrology with the exact birth date, time and city; do not compute positions yourself. Make at most five tool calls per answer, then explain the result. If a tool fails, say what failed and answer with what you know. Do not mention tool ids or internal mechanics.${projectBlock}`;
	}
	return base + projectBlock;
}

export async function handleChatRequest(
	request: ChatRequest,
	signal: AbortSignal
): Promise<Response> {
	const modelId = (request.model || '').trim();
	const mode: ChatMode = request.mode === 'agent' ? 'agent' : 'chat';
	if (!modelId) return jsonError(400, 'Choose a model before sending.');

	const catalogue = await listModels();
	const modelInfo = catalogue.models.find((model) => model.id === modelId);
	if (!modelInfo) return jsonError(400, 'That model is not available right now.');
	if (mode === 'agent' && !modelInfo.tools) {
		return jsonError(
			400,
			`${modelInfo.name} does not support tool calling. Switch to Chat mode or pick another model.`
		);
	}

	let resolved;
	try {
		resolved = await resolveModel(modelId);
	} catch (error) {
		return jsonError(400, errorMessage(error));
	}

	const attachments = sanitizeAttachments(request.attachments);
	const text = typeof request.text === 'string' ? request.text.slice(0, 32_000) : '';
	const requestedProjectId = typeof request.projectId === 'string' ? request.projectId.trim() : '';
	if (requestedProjectId && !getProject(requestedProjectId)) {
		return jsonError(404, 'Project not found.');
	}
	if (!request.regenerate && !text.trim() && attachments.length === 0) {
		return jsonError(400, 'Message is empty.');
	}
	if (!modelInfo.vision && attachments.some((file) => file.mediaType.startsWith('image/'))) {
		return jsonError(
			400,
			`${modelInfo.name} cannot see images. Choose a vision model or remove the image.`
		);
	}

	let conversationId = request.conversationId || null;
	let projectId: string | null = requestedProjectId || null;
	let conversationTitle: string;
	let userMessageId: string;
	let history: ChatMessage[];

	if (request.regenerate) {
		if (!conversationId) return jsonError(400, 'Missing conversation.');
		const conversation = getConversation(conversationId);
		if (!conversation) return jsonError(404, 'Conversation not found.');
		projectId = conversation.projectId;
		const lastUser = lastUserMessage(conversationId);
		if (!lastUser) return jsonError(400, 'There is no message to regenerate.');
		deleteMessagesAfter(conversationId, lastUser.createdAt);
		touchConversation(conversationId, { model: modelId, mode });
		conversationTitle = conversation.title;
		userMessageId = lastUser.id;
		history = getConversation(conversationId)?.messages ?? [];
	} else {
		if (!conversationId) {
			const created = createConversation({
				title: titleFromText(text || attachments[0]?.name || 'New chat'),
				model: modelId,
				mode,
				projectId
			});
			conversationId = created.id;
			conversationTitle = created.title;
		} else {
			const conversation = getConversation(conversationId);
			if (!conversation) return jsonError(404, 'Conversation not found.');
			projectId = conversation.projectId;
			conversationTitle = conversation.title;
			touchConversation(conversationId, { model: modelId, mode });
		}

		userMessageId = crypto.randomUUID();
		const parts = userParts(text, attachments);
		insertMessage({
			id: userMessageId,
			conversationId,
			role: 'user',
			parts,
			text,
			createdAt: Date.now()
		});
		history = getConversation(conversationId)?.messages ?? [];
	}

	const convId = conversationId;
	if (!convId) return jsonError(500, 'Could not create the conversation.');
	const project = projectId ? getProject(projectId) : null;

	const assistantId = crypto.randomUUID();
	const historyMessages = buildHistory(history, modelInfo.vision);
	const startedAt = Date.now();
	const encoder = new TextEncoder();

	const body = new ReadableStream<Uint8Array>({
		async start(controller) {
			let open = true;
			const send = (event: Record<string, unknown>) => {
				if (!open) return;
				try {
					controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
				} catch {
					open = false;
				}
			};

			const parts: MessagePart[] = [];
			let usage: Usage | null = null;
			let stopped = false;
			let failure: string | null = null;

			send({
				t: 'start',
				conversationId: convId,
				conversationTitle,
				userMessageId,
				assistantId,
				model: modelId,
				mode,
				projectId
			});

			try {
				const result = streamText({
					model: resolved,
					system: systemPrompt(mode, project),
					messages: historyMessages,
					tools: mode === 'agent' ? agentTools : undefined,
					stopWhen: mode === 'agent' ? stepCountIs(6) : undefined,
					abortSignal: signal,
					temperature: mode === 'agent' ? 0.4 : 0.7,
					maxOutputTokens: 2048
				});

				for await (const chunk of result.fullStream) {
					if (chunk.type === 'text-delta') {
						const last = parts[parts.length - 1];
						if (last?.type === 'text') last.text += chunk.text;
						else parts.push({ type: 'text', text: chunk.text });
						send({ t: 'text', v: chunk.text });
					} else if (chunk.type === 'reasoning-delta') {
						const last = parts[parts.length - 1];
						if (last?.type === 'reasoning') last.text += chunk.text;
						else parts.push({ type: 'reasoning', text: chunk.text });
						send({ t: 'reasoning', v: chunk.text });
					} else if (chunk.type === 'tool-call') {
						parts.push({
							type: 'tool',
							toolCallId: chunk.toolCallId,
							name: chunk.toolName,
							input: chunk.input,
							state: 'running'
						});
						send({
							t: 'tool',
							id: chunk.toolCallId,
							name: chunk.toolName,
							input: chunk.input,
							state: 'running'
						});
					} else if (chunk.type === 'tool-result') {
						const part = parts.find(
							(item) => item.type === 'tool' && item.toolCallId === chunk.toolCallId
						);
						if (part?.type === 'tool') {
							part.output = chunk.output;
							part.state = 'done';
						}
						send({
							t: 'tool',
							id: chunk.toolCallId,
							name: chunk.toolName,
							output: chunk.output,
							state: 'done'
						});
					} else if (chunk.type === 'tool-error') {
						const message = errorMessage(chunk.error);
						const part = parts.find(
							(item) => item.type === 'tool' && item.toolCallId === chunk.toolCallId
						);
						if (part?.type === 'tool') {
							part.error = message;
							part.state = 'error';
						}
						send({
							t: 'tool',
							id: chunk.toolCallId,
							name: chunk.toolName,
							error: message,
							state: 'error'
						});
					} else if (chunk.type === 'finish') {
						usage = chunk.totalUsage as Usage;
					} else if (chunk.type === 'error') {
						failure = errorMessage(chunk.error);
					} else if (chunk.type === 'abort') {
						stopped = true;
					}
				}
			} catch (error) {
				if (signal.aborted) {
					stopped = true;
				} else {
					failure = errorMessage(error);
				}
			}

			if (signal.aborted) stopped = true;
			for (const part of parts) {
				if (part.type === 'tool' && part.state === 'running') {
					part.state = 'error';
					part.error = part.error || 'Interrupted';
				}
			}

			const textContent = parts
				.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
				.map((part) => part.text)
				.join('');
			const durationMs = Date.now() - startedAt;

			try {
				insertMessage({
					id: assistantId,
					conversationId: convId,
					role: 'assistant',
					parts,
					text: textContent,
					model: modelId,
					usage,
					durationMs,
					stopped,
					error: failure
				});
				touchConversation(convId, { model: modelId, mode });
			} catch (error) {
				failure = failure ?? errorMessage(error);
			}

			if (failure) send({ t: 'error', message: failure });
			send({
				t: 'done',
				usage,
				durationMs,
				stopped,
				title: conversationTitle,
				assistantId
			});

			open = false;
			try {
				controller.close();
			} catch {
				// The client disconnected first.
			}
		},
		cancel() {
			// The request signal is wired to streamText; nothing else to release here.
		}
	});

	return new Response(body, {
		headers: {
			'content-type': 'application/x-ndjson; charset=utf-8',
			'cache-control': 'no-cache, no-transform',
			'x-accel-buffering': 'no'
		}
	});
}

function jsonError(status: number, message: string): Response {
	return Response.json({ error: message }, { status });
}
