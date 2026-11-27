import { command, query } from '$app/server';
import { z } from 'zod';
import {
	createProject as createProjectRecord,
	deleteProject as deleteProjectRecord,
	listProjects,
	updateProject as updateProjectRecord
} from '#lib/server/projects.ts';

const projectInput = z.object({
	name: z.string().trim().min(1).max(80),
	description: z.string().max(500).optional(),
	instructions: z.string().max(8000).optional()
});

export const getProjects = query(() => listProjects());

export const createProject = command(projectInput, (input) => createProjectRecord(input));

export const updateProject = command(
	projectInput.partial().extend({ id: z.string().min(1) }),
	({ id, ...input }) => updateProjectRecord(id, input)
);

export const deleteProject = command(z.string().min(1), (id) => {
	deleteProjectRecord(id);
	return { id };
});
