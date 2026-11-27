import { listConversations } from '#lib/server/conversations.ts';
import { listProjects } from '#lib/server/projects.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const projectList = listProjects();
	const sessions = listConversations();
	return {
		projects: projectList.map((project) => ({
			...project,
			recent: sessions.filter((session) => session.projectId === project.id).slice(0, 3)
		}))
	};
};
