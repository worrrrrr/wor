import { handleChatRequest, type ChatRequest } from '#lib/server/chat-stream.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: ChatRequest;
	try {
		body = (await request.json()) as ChatRequest;
	} catch {
		return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
	}

	try {
		return await handleChatRequest(body, request.signal);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unexpected server error.';
		return Response.json({ error: message }, { status: 500 });
	}
};
