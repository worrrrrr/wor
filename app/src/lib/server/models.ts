import type { LanguageModel } from 'ai';
import { createOllama } from 'ai-sdk-ollama';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { GROQ_API_KEY, GEMINI_API_KEY, OLLAMA_URL } from '$app/env/private';
import type { ModelInfo, ModelsResponse } from '#lib/chat/types.ts';
import { customModelTarget, customProviderModels, listProviders } from './providers.ts';

const ollamaProvider = createOllama({ baseURL: OLLAMA_URL });
const groqProvider = GROQ_API_KEY ? createGroq({ apiKey: GROQ_API_KEY }) : null;
const googleProvider = GEMINI_API_KEY ? createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY }) : null;

const CLOUD_MODELS: Array<Omit<ModelInfo, 'providerName' | 'local'>> = [
	{
		id: 'groq:openai/gpt-oss-20b',
		provider: 'groq',
		modelId: 'openai/gpt-oss-20b',
		name: 'GPT-OSS 20B',
		description: 'Fast and capable. Great for agent tool use.',
		contextWindow: 131072,
		tools: true,
		vision: false
	},
	{
		id: 'groq:openai/gpt-oss-120b',
		provider: 'groq',
		modelId: 'openai/gpt-oss-120b',
		name: 'GPT-OSS 120B',
		description: 'Stronger reasoning through Groq.',
		contextWindow: 131072,
		tools: true,
		vision: false
	},
	{
		id: 'groq:qwen/qwen3.8-27b',
		provider: 'groq',
		modelId: 'qwen/qwen3.8-27b',
		name: 'Qwen 3.8 27B',
		description: 'Multilingual, strong instruction following.',
		contextWindow: 131072,
		tools: true,
		vision: false
	},
	{
		id: 'google:gemini-flash-latest',
		provider: 'google',
		modelId: 'gemini-flash-latest',
		name: 'Gemini Flash (latest)',
		description: 'Google’s current fast model. Vision and tools.',
		contextWindow: 1048576,
		tools: true,
		vision: true
	},
	{
		id: 'google:gemini-pro-latest',
		provider: 'google',
		modelId: 'gemini-pro-latest',
		name: 'Gemini Pro (latest)',
		description: 'Google’s current reasoning model.',
		contextWindow: 1048576,
		tools: true,
		vision: true
	},
	{
		id: 'google:gemini-3.8-flash',
		provider: 'google',
		modelId: 'gemini-3.8-flash',
		name: 'Gemini 3.8 Flash',
		description: 'Newest Flash generation. Fast and multimodal.',
		contextWindow: 1048576,
		tools: true,
		vision: true
	},
	{
		id: 'google:gemini-3.1-flash-lite',
		provider: 'google',
		modelId: 'gemini-3.1-flash-lite',
		name: 'Gemini 3.1 Flash Lite',
		description: 'Cheapest and quickest Gemini.',
		contextWindow: 1048576,
		tools: true,
		vision: true
	}
];

type OllamaTag = {
	name: string;
	size?: number;
	details?: { family?: string; parameter_size?: string };
};

type OllamaCapabilities = { capabilities: string[] };

type Cache = {
	at: number;
	response: ModelsResponse;
};

let cache: Cache | null = null;
let capabilityCache = new Map<string, { at: number; capabilities: string[] }>();

const CACHE_MS = 15_000;

const OLLAMA_NAMES: Record<string, string> = {
	lfm3: 'LFM 3',
	liquid: 'Liquid',
	qwen3: 'Qwen3',
	qwen2: 'Qwen2',
	'gpt-oss': 'GPT-OSS',
	tev1: 'TEV1',
	gemma3: 'Gemma 3',
	llama3: 'Llama 3',
	mistral: 'Mistral',
	phi4: 'Phi-4'
};

function friendlyOllamaName(tag: string): string {
	const [base, ...rest] = tag.split(':');
	const size = rest.join(':');
	const pretty =
		OLLAMA_NAMES[base] ??
		base.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
	if (!size) return pretty;
	if (size.endsWith('-cloud')) return `${pretty} · cloud`;
	return `${pretty} · ${size.toUpperCase()}`;
}

async function ollamaCapabilities(model: string): Promise<string[]> {
	const cached = capabilityCache.get(model);
	if (cached && Date.now() - cached.at < 60_000) return cached.capabilities;

	try {
		const response = await fetch(new URL('/api/show', OLLAMA_URL), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ model }),
			signal: AbortSignal.timeout(2500)
		});
		if (!response.ok) return [];
		const data = (await response.json()) as OllamaCapabilities;
		const capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];
		capabilityCache.set(model, { at: Date.now(), capabilities });
		return capabilities;
	} catch {
		return [];
	}
}

async function listOllamaModels(): Promise<{
	models: ModelInfo[];
	online: boolean;
	detail?: string;
}> {
	try {
		const response = await fetch(new URL('/api/tags', OLLAMA_URL), {
			signal: AbortSignal.timeout(1800)
		});
		if (!response.ok) return { models: [], online: false, detail: `HTTP ${response.status}` };
		const data = (await response.json()) as { models?: OllamaTag[] };
		const tags = Array.isArray(data.models) ? data.models : [];

		const inspected = await Promise.all(
			tags.map(async (tag) => ({
				tag,
				capabilities: await ollamaCapabilities(tag.name)
			}))
		);

		const models: ModelInfo[] = inspected
			.filter(({ tag, capabilities }) => {
				if (capabilities.length === 0) {
					// Unknown capabilities: keep anything that is not obviously an embedding model.
					return !/embed|nomic|bert/i.test(`${tag.name} ${tag.details?.family ?? ''}`);
				}
				return capabilities.includes('completion');
			})
			.map(({ tag, capabilities }) => ({
				id: `ollama:${tag.name}`,
				provider: 'ollama',
				providerName: 'Ollama',
				modelId: tag.name,
				name: friendlyOllamaName(tag.name),
				description: tag.name.endsWith('-cloud')
					? 'Runs through Ollama Cloud.'
					: 'Runs on this machine. No data leaves it.',
				tools: capabilities.includes('tools'),
				vision: capabilities.includes('vision'),
				local: !tag.name.endsWith('-cloud')
			}));

		return { models, online: true };
	} catch {
		return {
			models: [],
			online: false,
			detail: 'Ollama is not reachable at ' + OLLAMA_URL
		};
	}
}

export async function listModels(force = false): Promise<ModelsResponse> {
	if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.response;

	const local = await listOllamaModels();
	const cloud = CLOUD_MODELS.filter((model) =>
		model.provider === 'groq' ? !!groqProvider : !!googleProvider
	).map((model) => ({
		...model,
		providerName: model.provider === 'groq' ? 'Groq' : 'Google',
		local: false
	}));

	const models = [...local.models, ...cloud, ...customProviderModels()];
	const preferred =
		models.find((model) => model.id === 'ollama:lfm3:1.7b') ??
		models.find((model) => model.local) ??
		models[0];

	const configured = listProviders();

	const response: ModelsResponse = {
		models,
		defaultModel: preferred?.id ?? null,
		providers: [
			{
				id: 'ollama',
				name: 'Ollama',
				online: local.online,
				detail: local.online ? 'Local models ready' : local.detail
			},
			{
				id: 'groq',
				name: 'Groq',
				online: !!groqProvider,
				detail: groqProvider ? 'API key configured' : 'Set GROQ_API_KEY to enable'
			},
			{
				id: 'google',
				name: 'Google',
				online: !!googleProvider,
				detail: googleProvider ? 'API key configured' : 'Set GEMINI_API_KEY to enable'
			},
			...configured.map((provider) => ({
				id: `custom:${provider.id}`,
				name: provider.name,
				online: true,
				detail: `${provider.models.length} model${provider.models.length === 1 ? '' : 's'}`
			}))
		]
	};

	cache = { at: Date.now(), response };
	return response;
}

export async function resolveModel(id: string): Promise<LanguageModel> {
	const index = id.indexOf(':');
	if (index === -1) throw new Error(`Invalid model id: ${id}`);
	const provider = id.slice(0, index);
	const modelId = id.slice(index + 1);

	if (provider === 'ollama') return ollamaProvider(modelId, { think: false });
	if (provider === 'groq') {
		if (!groqProvider) throw new Error('Groq is not configured. Set GROQ_API_KEY.');
		return groqProvider(modelId);
	}
	if (provider === 'google') {
		if (!googleProvider) throw new Error('Google is not configured. Set GEMINI_API_KEY.');
		return googleProvider(modelId);
	}
	if (provider === 'custom') {
		const target = customModelTarget(id);
		if (!target) throw new Error('This provider is no longer configured.');
		const client = createOpenAICompatible({
			name: target.providerName,
			baseURL: target.baseUrl,
			apiKey: target.apiKey || undefined
		});
		return client(target.modelId);
	}
	throw new Error(`Unknown model provider: ${provider}`);
}

export async function modelSupportsVision(id: string): Promise<boolean> {
	const { models } = await listModels();
	return models.find((model) => model.id === id)?.vision ?? false;
}
