import { error } from '@sveltejs/kit';
import { getProject } from '#lib/server/projects.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const projectId = url.searchParams.get('project');
	if (!projectId) return { project: null };
	const project = getProject(projectId);
	if (!project) error(404, 'Project not found');
	return { project };
};
