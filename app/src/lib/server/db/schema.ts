import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const providers = sqliteTable('providers', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	baseUrl: text('base_url').notNull(),
	apiKey: text('api_key').notNull().default(''),
	models: text('models').notNull().default('[]'),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull()
});

export const projects = sqliteTable('projects', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description').notNull().default(''),
	instructions: text('instructions').notNull().default(''),
	color: text('color').notNull().default('terracotta'),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull()
});

export const conversations = sqliteTable('conversations', {
	id: text('id').primaryKey(),
	projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	model: text('model').notNull(),
	mode: text('mode').notNull().default('chat'),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull()
});

export const messages = sqliteTable(
	'messages',
	{
		id: text('id').primaryKey(),
		conversationId: text('conversation_id')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		role: text('role').notNull(),
		parts: text('parts').notNull(),
		text: text('text').notNull().default(''),
		model: text('model'),
		usage: text('usage'),
		durationMs: integer('duration_ms'),
		stopped: integer('stopped', { mode: 'boolean' }).notNull().default(false),
		error: text('error'),
		createdAt: integer('created_at').notNull()
	},
	(table) => [index('messages_conversation_idx').on(table.conversationId, table.createdAt)]
);
