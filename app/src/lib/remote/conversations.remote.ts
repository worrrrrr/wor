import { command, query } from '$app/server';
import { z } from 'zod';
import {
	deleteConversation,
	getConversation,
	listConversations,
	moveConversation,
	renameConversation
} from '#lib/server/conversations.ts';

export const getSessions = query(() => listConversations());

export const getSession = query(z.string(), (id) => getConversation(id));

export const renameSession = command(
	z.object({ id: z.string().min(1), title: z.string().trim().min(1).max(120) }),
	({ id, title }) => {
		renameConversation(id, title);
		return { id, title };
	}
);

export const updateSession = command(
	z.object({
		id: z.string().min(1),
		title: z.string().trim().min(1).max(120),
		projectId: z.string().min(1).nullable()
	}),
	({ id, title, projectId }) => {
		if (!renameConversation(id, title)) return null;
		if (!moveConversation(id, projectId)) return null;
		return { id, title, projectId };
	}
);

export const deleteSession = command(z.string().min(1), (id) => {
	deleteConversation(id);
	return { id };
});
