import type { Usage } from '#lib/chat/types.ts';

export function relativeTime(timestamp: number, now = Date.now()): string {
	const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
	if (seconds < 45) return 'now';
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.round(hours / 24);
	if (days < 7) return `${days}d`;
	return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export type DayBucket = 'Today' | 'Yesterday' | 'Previous 7 days' | 'Older';

export function dayBucket(timestamp: number, now = new Date()): DayBucket {
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const messageDay = new Date(timestamp);
	const messageStart = new Date(
		messageDay.getFullYear(),
		messageDay.getMonth(),
		messageDay.getDate()
	).getTime();
	const days = Math.round((start - messageStart) / 86_400_000);
	if (days <= 0) return 'Today';
	if (days === 1) return 'Yesterday';
	if (days < 7) return 'Previous 7 days';
	return 'Older';
}

export function formatDuration(milliseconds: number | null | undefined): string {
	if (!milliseconds || milliseconds < 0) return '';
	if (milliseconds < 1000) return `${milliseconds}ms`;
	const seconds = milliseconds / 1000;
	if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
	const minutes = Math.floor(seconds / 60);
	return `${minutes}m ${Math.round(seconds % 60)}s`;
}

export function usageLabel(usage: Usage | null | undefined): string {
	if (!usage || !usage.totalTokens) return '';
	const parts: string[] = [];
	if (usage.inputTokens) parts.push(`${usage.inputTokens.toLocaleString()} in`);
	if (usage.outputTokens) parts.push(`${usage.outputTokens.toLocaleString()} out`);
	return parts.length ? parts.join(' · ') : `${usage.totalTokens.toLocaleString()} tokens`;
}

export function formatBytes(bytes: number): string {
	if (!bytes) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / 1024 ** index;
	return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function clockTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function greeting(date = new Date()): string {
	const hour = date.getHours();
	if (hour < 5) return 'Still up?';
	if (hour < 12) return 'Good morning';
	if (hour < 18) return 'Good afternoon';
	return 'Good evening';
}
