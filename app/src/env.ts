import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Path to the local SQLite database file.'
	},
	OLLAMA_URL: {
		description: 'Base URL of the local Ollama server.',
		schema: (value) => value || 'http://127.0.0.1:11434'
	},
	GROQ_API_KEY: {
		description: 'Optional Groq API key. Enables the Groq models in the model picker.',
		schema: (value) => (value ? value : undefined)
	},
	GEMINI_API_KEY: {
		description: 'Optional Google Gemini API key. Enables the Gemini models in the model picker.',
		schema: (value) => (value ? value : undefined)
	}
});
