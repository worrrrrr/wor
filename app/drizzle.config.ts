import { defineConfig } from 'drizzle-kit';

try {
	// Load .env when the CLI runs outside SvelteKit/Bun.
	process.loadEnvFile?.();
} catch {
	// .env is optional if DATABASE_URL is already exported.
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true
});
