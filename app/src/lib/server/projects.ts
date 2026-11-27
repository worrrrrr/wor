import { desc, eq, sql } from 'drizzle-orm';
import { db } from './db/index.ts';
import { conversations, projects } from './db/schema.ts';
import type { ProjectSummary } from '#lib/chat/types.ts';

type ProjectRow = typeof projects.$inferSelect;

function toSummary(row: ProjectRow, count: number, lastActivity: number | null): ProjectSummary {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		instructions: row.instructions,
		color: row.color,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		conversationCount: count,
		lastActivity
	};
}

export function listProjects(): ProjectSummary[] {
	const rows = db.select().from(projects).orderBy(desc(projects.updatedAt)).all();
	const stats = db
		.select({
			projectId: conversations.projectId,
			count: sql<number>`count(*)`,
			lastActivity: sql<number>`max(${conversations.updatedAt})`
		})
		.from(conversations)
		.groupBy(conversations.projectId)
		.all();
	const byProject = new Map(
		stats
			.filter((row) => row.projectId)
			.map((row) => [row.projectId as string, { count: Number(row.count), last: row.lastActivity }])
	);

	return rows.map((row) => {
		const stat = byProject.get(row.id);
		return toSummary(row, stat?.count ?? 0, stat?.last ?? null);
	});
}

export function getProject(id: string): ProjectSummary | null {
	const row = db.select().from(projects).where(eq(projects.id, id)).get();
	if (!row) return null;
	const stat = db
		.select({
			count: sql<number>`count(*)`,
			lastActivity: sql<number>`max(${conversations.updatedAt})`
		})
		.from(conversations)
		.where(eq(conversations.projectId, id))
		.get();
	return toSummary(row, Number(stat?.count ?? 0), stat?.lastActivity ?? null);
}

export function createProject(input: {
	name: string;
	description?: string;
	instructions?: string;
	color?: string;
}): ProjectSummary {
	const now = Date.now();
	const row: ProjectRow = {
		id: crypto.randomUUID(),
		name: input.name.replace(/\s+/g, ' ').trim().slice(0, 80),
		description: (input.description ?? '').trim().slice(0, 500),
		instructions: (input.instructions ?? '').trim().slice(0, 8000),
		color: input.color ?? 'terracotta',
		createdAt: now,
		updatedAt: now
	};
	db.insert(projects).values(row).run();
	return toSummary(row, 0, null);
}

export function updateProject(
	id: string,
	patch: { name?: string; description?: string; instructions?: string; color?: string }
): ProjectSummary | null {
	const values: Partial<ProjectRow> = { updatedAt: Date.now() };
	if (patch.name !== undefined) {
		const name = patch.name.replace(/\s+/g, ' ').trim().slice(0, 80);
		if (!name) return null;
		values.name = name;
	}
	if (patch.description !== undefined) values.description = patch.description.trim().slice(0, 500);
	if (patch.instructions !== undefined)
		values.instructions = patch.instructions.trim().slice(0, 8000);
	if (patch.color !== undefined) values.color = patch.color;
	const result = db.update(projects).set(values).where(eq(projects.id, id)).run();
	return result.changes > 0 ? getProject(id) : null;
}

export function deleteProject(id: string): boolean {
	const result = db.delete(projects).where(eq(projects.id, id)).run();
	return result.changes > 0;
}
