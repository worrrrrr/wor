import { error } from '@sveltejs/kit';
import { listConversations } from '#lib/server/conversations.ts';
import { getProject } from '#lib/server/projects.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const project = getProject(params.id);
	if (!project) error(404, 'Project not found');
	const sessions = listConversations().filter((session) => session.projectId === project.id);
	return { project, sessions };
};
