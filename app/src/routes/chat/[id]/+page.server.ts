import { error } from '@sveltejs/kit';
import { getConversation } from '#lib/server/conversations.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const conversation = getConversation(params.id);
	if (!conversation) error(404, 'Conversation not found');
	return { conversation };
};
