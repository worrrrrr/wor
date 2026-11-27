import { and, asc, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from './db/index.ts';
import { conversations, messages, projects } from './db/schema.ts';
import type {
	ChatMessage,
	ChatMode,
	ConversationDetail,
	ConversationSummary,
	MessagePart,
	Usage
} from '#lib/chat/types.ts';

type ConversationRow = typeof conversations.$inferSelect;
type MessageRow = typeof messages.$inferSelect;

function parseParts(raw: string): MessagePart[] {
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as MessagePart[]) : [];
	} catch {
		return [];
	}
}

function toMessage(row: MessageRow): ChatMessage {
	return {
		id: row.id,
		role: row.role === 'user' ? 'user' : 'assistant',
		parts: parseParts(row.parts),
		model: row.model,
		createdAt: row.createdAt,
		usage: row.usage ? (JSON.parse(row.usage) as Usage) : null,
		durationMs: row.durationMs,
		stopped: row.stopped,
		error: row.error
	};
}

export function titleFromText(text: string): string {
	const clean = text
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/[`*_#>~|]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (!clean) return 'New chat';
	if (clean.length <= 60) return clean;
	const clipped = clean.slice(0, 57);
	const lastSpace = clipped.lastIndexOf(' ');
	return (lastSpace > 30 ? clipped.slice(0, lastSpace) : clipped).trimEnd() + '…';
}

export function listConversations(): ConversationSummary[] {
	const rows = db.select().from(conversations).orderBy(desc(conversations.updatedAt)).all();
	if (rows.length === 0) return [];

	const projectRows = db.select({ id: projects.id, name: projects.name }).from(projects).all();
	const projectNames = new Map(projectRows.map((row) => [row.id, row.name]));

	const lastMessages = db
		.select({
			conversationId: messages.conversationId,
			text: messages.text,
			createdAt: messages.createdAt
		})
		.from(messages)
		.orderBy(desc(messages.createdAt))
		.all();

	const preview = new Map<string, string>();
	for (const message of lastMessages) {
		if (!preview.has(message.conversationId) && message.text.trim()) {
			preview.set(message.conversationId, message.text.trim().slice(0, 160));
		}
	}

	const counts = db
		.select({ conversationId: messages.conversationId, count: sql<number>`count(*)` })
		.from(messages)
		.groupBy(messages.conversationId)
		.all();
	const countMap = new Map(counts.map((row) => [row.conversationId, Number(row.count)]));

	return rows.map((row) => ({
		id: row.id,
		projectId: row.projectId,
		projectName: row.projectId ? (projectNames.get(row.projectId) ?? null) : null,
		title: row.title,
		model: row.model,
		mode: row.mode === 'agent' ? 'agent' : 'chat',
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		preview: preview.get(row.id) ?? '',
		messageCount: countMap.get(row.id) ?? 0
	}));
}

export function getConversation(id: string): ConversationDetail | null {
	const row = db.select().from(conversations).where(eq(conversations.id, id)).get();
	if (!row) return null;

	const projectName = row.projectId
		? (db.select({ name: projects.name }).from(projects).where(eq(projects.id, row.projectId)).get()
				?.name ?? null)
		: null;

	const messageRows = db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, id))
		.orderBy(asc(messages.createdAt))
		.all();

	return {
		id: row.id,
		projectId: row.projectId,
		projectName,
		title: row.title,
		model: row.model,
		mode: row.mode === 'agent' ? 'agent' : 'chat',
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		messages: messageRows.map(toMessage)
	};
}

export function createConversation(input: {
	title: string;
	model: string;
	mode: ChatMode;
	projectId?: string | null;
}): ConversationRow {
	const now = Date.now();
	const row: ConversationRow = {
		id: crypto.randomUUID(),
		projectId: input.projectId ?? null,
		title: input.title,
		model: input.model,
		mode: input.mode,
		createdAt: now,
		updatedAt: now
	};
	db.insert(conversations).values(row).run();
	return row;
}

export function touchConversation(
	id: string,
	patch: { model?: string; mode?: ChatMode; title?: string }
) {
	const values: Partial<ConversationRow> = { updatedAt: Date.now() };
	if (patch.model) values.model = patch.model;
	if (patch.mode) values.mode = patch.mode;
	if (patch.title) values.title = patch.title;
	db.update(conversations).set(values).where(eq(conversations.id, id)).run();
}

export function renameConversation(id: string, title: string): boolean {
	const clean = title.replace(/\s+/g, ' ').trim().slice(0, 120);
	if (!clean) return false;
	const result = db
		.update(conversations)
		.set({ title: clean, updatedAt: Date.now() })
		.where(eq(conversations.id, id))
		.run();
	return result.changes > 0;
}

export function moveConversation(id: string, projectId: string | null): boolean {
	if (projectId) {
		const exists = db
			.select({ id: projects.id })
			.from(projects)
			.where(eq(projects.id, projectId))
			.get();
		if (!exists) return false;
	}
	const result = db
		.update(conversations)
		.set({ projectId, updatedAt: Date.now() })
		.where(eq(conversations.id, id))
		.run();
	return result.changes > 0;
}

export function deleteConversation(id: string): boolean {
	const result = db.delete(conversations).where(eq(conversations.id, id)).run();
	return result.changes > 0;
}

export function insertMessage(input: {
	id: string;
	conversationId: string;
	role: 'user' | 'assistant';
	parts: MessagePart[];
	text?: string;
	model?: string | null;
	usage?: Usage | null;
	durationMs?: number | null;
	stopped?: boolean;
	error?: string | null;
	createdAt?: number;
}) {
	const createdAt = input.createdAt ?? Date.now();
	db.insert(messages)
		.values({
			id: input.id,
			conversationId: input.conversationId,
			role: input.role,
			parts: JSON.stringify(input.parts),
			text: input.text ?? '',
			model: input.model ?? null,
			usage: input.usage ? JSON.stringify(input.usage) : null,
			durationMs: input.durationMs ?? null,
			stopped: input.stopped ?? false,
			error: input.error ?? null,
			createdAt
		})
		.run();
	db.update(conversations)
		.set({ updatedAt: createdAt })
		.where(eq(conversations.id, input.conversationId))
		.run();
	return createdAt;
}

export function lastUserMessage(conversationId: string): ChatMessage | null {
	const row = db
		.select()
		.from(messages)
		.where(and(eq(messages.conversationId, conversationId), eq(messages.role, 'user')))
		.orderBy(desc(messages.createdAt))
		.limit(1)
		.get();
	return row ? toMessage(row) : null;
}

export function deleteMessagesAfter(conversationId: string, createdAt: number) {
	db.delete(messages)
		.where(and(eq(messages.conversationId, conversationId), gt(messages.createdAt, createdAt)))
		.run();
}

export function conversationExists(id: string): boolean {
	return !!db
		.select({ id: conversations.id })
		.from(conversations)
		.where(eq(conversations.id, id))
		.get();
}
