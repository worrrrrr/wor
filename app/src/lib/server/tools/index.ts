import { tool } from 'ai';
import { z } from 'zod';
import { calculateTool } from './calculate.ts';
import { astrologyTool } from './astrology.ts';

const BLOCKED_HOST =
	/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

function stripHtml(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
		.replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
		.replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

export const agentTools = {
	calculate: calculateTool,
	astrology: astrologyTool,

	current_time: tool({
		description:
			'Get the current date and time in a specific IANA time zone, for example "Asia/Bangkok".',
		inputSchema: z.object({
			timezone: z
				.string()
				.optional()
				.describe('IANA time zone name. Defaults to the server time zone.')
		}),
		execute: async ({ timezone }) => {
			const zone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
			const now = new Date();
			const formatter = new Intl.DateTimeFormat('en-GB', {
				timeZone: zone,
				dateStyle: 'full',
				timeStyle: 'long'
			});
			return {
				timezone: zone,
				iso: now.toISOString(),
				formatted: formatter.format(now)
			};
		}
	}),

	web_fetch: tool({
		description:
			'Fetch a public web page or JSON endpoint and return its readable text. Use this when the answer depends on current information. Private and local addresses are blocked.',
		inputSchema: z.object({
			url: z.string().describe('An absolute http or https URL')
		}),
		execute: async ({ url }) => {
			let parsed: URL;
			try {
				parsed = new URL(url);
			} catch {
				throw new Error('Invalid URL');
			}
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				throw new Error('Only http and https URLs are allowed');
			}
			if (BLOCKED_HOST.test(parsed.hostname)) {
				throw new Error('Local and private addresses are blocked');
			}

			const response = await fetch(parsed, {
				headers: {
					'user-agent': 'WorChat/1.0 (+local agent)',
					accept: 'text/html,application/json,text/plain;q=0.9,*/*;q=0.5'
				},
				redirect: 'follow',
				signal: AbortSignal.timeout(15_000)
			});
			if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}`);

			const contentType = response.headers.get('content-type') ?? '';
			const raw = (await response.text()).slice(0, 500_000);
			const isHtml = contentType.includes('html') || /^\s*<(!doctype|html)/i.test(raw);
			const title = isHtml
				? (raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '')
				: '';
			const text = isHtml ? stripHtml(raw) : raw.replace(/\s+\n/g, '\n').trim();
			const limit = 12_000;
			const truncated = text.length > limit;

			return {
				url: parsed.toString(),
				title: title.slice(0, 200),
				contentType,
				text: text.slice(0, limit),
				truncated
			};
		}
	})
};

export type AgentTools = typeof agentTools;
