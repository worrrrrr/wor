import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SECRET_FILE = resolve(process.cwd(), '.wor-secret');
const PREFIX = 'v1';

function decodeSecret(value: string): Buffer {
	const trimmed = value.trim();
	const hex = /^[0-9a-f]{64}$/i.test(trimmed);
	const key = Buffer.from(trimmed, hex ? 'hex' : 'base64');
	if (key.length !== 32)
		throw new Error('WOR_SECRET must be 32 bytes (64 hex characters or base64).');
	return key;
}

function loadKey(): Buffer {
	const fromEnv = process.env.WOR_SECRET;
	if (fromEnv) return decodeSecret(fromEnv);

	if (existsSync(SECRET_FILE)) return decodeSecret(readFileSync(SECRET_FILE, 'utf8'));

	const key = randomBytes(32);
	writeFileSync(SECRET_FILE, key.toString('base64'), { mode: 0o600 });
	return key;
}

let cached: Buffer | null = null;

function key(): Buffer {
	cached ??= loadKey();
	return cached;
}

export function encryptSecret(value: string): string {
	if (!value) return '';
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key(), iv);
	const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return [
		PREFIX,
		iv.toString('base64url'),
		tag.toString('base64url'),
		encrypted.toString('base64url')
	].join(':');
}

export function decryptSecret(value: string): string {
	if (!value) return '';
	const [prefix, iv, tag, payload] = value.split(':');
	if (prefix !== PREFIX || !iv || !tag || !payload)
		throw new Error('Stored provider key is corrupt.');
	const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
	decipher.setAuthTag(Buffer.from(tag, 'base64url'));
	return Buffer.concat([
		decipher.update(Buffer.from(payload, 'base64url')),
		decipher.final()
	]).toString('utf8');
}
