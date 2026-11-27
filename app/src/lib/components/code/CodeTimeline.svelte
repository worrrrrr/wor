<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import type { SessionTab } from '#lib/code/types.ts';

	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Clock from '@lucide/svelte/icons/clock';
	import Eye from '@lucide/svelte/icons/eye';
	import FileCode from '@lucide/svelte/icons/file-code';
	import FileDiff from '@lucide/svelte/icons/file-diff';
	import FileText from '@lucide/svelte/icons/file-text';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import GitBranch from '@lucide/svelte/icons/git-branch';
	import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal';
	import Loader from '@lucide/svelte/icons/loader';
	import Search from '@lucide/svelte/icons/search';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import SquareTerminal from '@lucide/svelte/icons/square-terminal';
	import User from '@lucide/svelte/icons/user';
	import Workflow from '@lucide/svelte/icons/workflow';

	let {
		session,
		narrow = false,
		permission,
		sent,
		running,
		onallow,
		ondeny,
		onopenreview
	}: {
		session: SessionTab;
		narrow?: boolean;
		permission: 'pending' | 'allowed' | 'denied';
		sent: string[];
		running: boolean;
		onallow: () => void;
		ondeny: () => void;
		onopenreview: () => void;
	} = $props();
</script>

<section class="flex min-w-0 flex-1 flex-col bg-bg">
	<div
		class="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3 text-[11px] text-faint"
	>
		<span class="flex min-w-0 items-center gap-1.5">
			<FolderKanban size={12} />
			<span class="truncate">{session.project}</span>
		</span>
		<span class="hidden items-center gap-1 sm:flex">
			<GitBranch size={11} />
			{session.branch}
		</span>
		<span class="ml-auto flex items-center gap-1.5">
			<span class="hidden items-center gap-1 rounded-full bg-ok/10 px-1.5 py-0.5 text-ok sm:flex">
				<CircleCheck size={10} />
				{session.status === 'review' ? 'Ready for review' : 'Tests passing'}
			</span>
		</span>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto">
		<div class="mx-auto w-full px-4 py-6 sm:px-6 {narrow ? 'max-w-[860px]' : 'max-w-[1100px]'}">
			<div class="mb-6">
				<div class="mb-2 flex flex-wrap items-center gap-2">
					<span
						class="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent uppercase"
					>
						Agent · Build
					</span>
					<span
						class="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] text-muted"
					>
						2 files changed
					</span>
					<span class="flex items-center gap-1 text-[10px] text-faint">
						<Clock size={10} /> 4m 12s
					</span>
				</div>
				<h1 class="font-serif text-[26px] leading-tight font-semibold tracking-[-0.01em]">
					{session.title}
				</h1>
				<p class="mt-1.5 max-w-[680px] text-[12.5px] leading-relaxed text-muted">
					Move auth off the legacy cookie helper, keep redirects for unauthenticated requests, and
					leave the API route behavior unchanged.
				</p>
			</div>

			<div class="space-y-4">
				<div class="flex gap-3">
					<div
						class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-faint"
					>
						<User size={13} />
					</div>
					<div
						class="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-3 text-[12.5px] leading-relaxed"
					>
						Refactor the auth middleware to use the new session store. Keep the redirect for
						unauthenticated users and update the tests. Don't touch the login page.
					</div>
				</div>

				<div class="flex gap-3">
					<div
						class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white"
					>
						<Logo size={13} />
					</div>
					<div class="min-w-0 flex-1 space-y-3">
						<p class="text-[12.5px] leading-relaxed">
							I'll read the current middleware and the session store first, then patch the callsite
							and run the focused tests.
						</p>

						<details open class="overflow-hidden rounded-lg border border-line bg-surface">
							<summary
								class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left select-none hover:bg-surface-2 [&::-webkit-details-marker]:hidden"
							>
								<Eye size={13} class="text-muted" />
								<span class="text-[11.5px] font-medium">Read</span>
								<code
									class="truncate rounded bg-codebg px-1.5 py-0.5 font-mono text-[10.5px] text-muted"
								>
									src/lib/server/auth.ts
								</code>
								<span class="ml-auto text-[10px] text-faint">1–64 · 0.3s</span>
								<ChevronDown
									size={13}
									class="-rotate-90 text-faint transition-transform in-open:rotate-0"
								/>
							</summary>
							<div
								class="border-t border-line bg-codebg px-3 py-2 font-mono text-[10.5px] leading-5 text-muted"
							>
								<div>
									<span class="mr-3 text-faint select-none">11</span>export async function
									requireUser(event: RequestEvent) &#123;
								</div>
								<div>
									<span class="mr-3 text-faint select-none">13</span> const session = await auth.api.getSession(&#123;
									headers &#125;);
								</div>
								<div>
									<span class="mr-3 text-faint select-none">14</span> return session.user;
								</div>
							</div>
						</details>

						<details class="overflow-hidden rounded-lg border border-line bg-surface">
							<summary
								class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left select-none hover:bg-surface-2 [&::-webkit-details-marker]:hidden"
							>
								<Search size={13} class="text-muted" />
								<span class="text-[11.5px] font-medium">Grep</span>
								<code class="rounded bg-codebg px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
									createSession
								</code>
								<span class="ml-auto text-[10px] text-faint">4 matches</span>
								<ChevronDown
									size={13}
									class="-rotate-90 text-faint transition-transform in-open:rotate-0"
								/>
							</summary>
							<div class="divide-y divide-line border-t border-line">
								<div class="flex items-center gap-2 px-3 py-1.5 font-mono text-[10.5px]">
									<span class="text-faint">auth.ts:13</span><span class="truncate text-muted">
										const session = await auth.api.getSession
									</span>
								</div>
								<div class="flex items-center gap-2 px-3 py-1.5 font-mono text-[10.5px]">
									<span class="text-faint">session.ts:8</span><span class="truncate text-muted">
										export async function createSession
									</span>
								</div>
								<div class="flex items-center gap-2 px-3 py-1.5 font-mono text-[10.5px]">
									<span class="text-faint">hooks.ts:21</span><span class="truncate text-muted">
										await createSession(event)
									</span>
								</div>
							</div>
						</details>

						<details class="group overflow-hidden rounded-lg border border-line bg-surface">
							<summary
								class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left select-none hover:bg-surface-2 [&::-webkit-details-marker]:hidden"
							>
								<SquareTerminal size={13} class="text-muted" />
								<span class="text-[11.5px] font-medium">Shell</span>
								<code class="rounded bg-codebg px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
									bun run check
								</code>
								<span class="ml-auto flex items-center gap-1 text-[10px] text-ok">
									<CircleCheck size={10} /> exit 0
								</span>
								<ChevronDown
									size={13}
									class="-rotate-90 text-faint transition-transform in-open:rotate-0"
								/>
							</summary>
							<div
								class="border-t border-line bg-codebg px-3 py-2 font-mono text-[10.5px] leading-5 text-muted"
							>
								<div>svelte-check found 0 errors and 0 warnings</div>
								<div class="text-faint">
									$ svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
								</div>
							</div>
						</details>

						<div class="overflow-hidden rounded-lg border border-line bg-surface">
							<div class="flex items-center gap-2 px-3 py-2">
								<FileDiff size={13} class="text-accent" />
								<span class="text-[11.5px] font-medium">Patch</span>
								<code
									class="truncate rounded bg-codebg px-1.5 py-0.5 font-mono text-[10.5px] text-muted"
								>
									src/lib/server/auth.ts
								</code>
								<span class="ml-auto font-mono text-[10px]">
									<span class="text-ok">+18</span> <span class="text-danger">−7</span>
								</span>
							</div>
							<div
								class="border-t border-line bg-codebg px-3 py-2 font-mono text-[10.5px] leading-5"
							>
								<div class="text-danger">
									<span class="mr-3 opacity-60 select-none">13</span><span class="mr-2">
										−
									</span>const session = await auth.api.getSession(&#123; headers &#125;);
								</div>
								<div class="text-ok">
									<span class="mr-3 opacity-60 select-none">13</span><span class="mr-2">
										+
									</span>const session = await sessions.get(headers);
								</div>
								<div class="text-ok">
									<span class="mr-3 opacity-60 select-none">14</span><span class="mr-2">+</span>if
									(!session) throw redirect(303, "/login");
								</div>
							</div>
						</div>

						<div class="overflow-hidden rounded-lg border border-line bg-surface">
							<div class="flex items-center gap-2 px-3 py-2">
								<Workflow size={13} class="text-muted" />
								<span class="text-[11.5px] font-medium">Subagent</span>
								<span class="text-[11px] text-muted">Explore · auth flow</span>
								<span class="ml-auto flex items-center gap-1 text-[10px] text-ok">
									<CircleCheck size={10} /> done
								</span>
							</div>
							<div class="border-t border-line px-3 py-2 text-[11px] text-muted">
								8 files read · 3 notes · found one legacy import in <code
									class="font-mono text-[10.5px]"
								>
									src/routes/api/auth/+server.ts
								</code>
							</div>
						</div>

						{#if permission === 'pending'}
							<div class="rounded-lg border border-warn/40 bg-warn/5 p-3">
								<div class="flex items-start gap-2">
									<ShieldCheck size={15} class="mt-0.5 shrink-0 text-warn" />
									<div class="min-w-0 flex-1">
										<p class="text-[11.5px] font-medium">Allow this command?</p>
										<p class="mt-0.5 font-mono text-[10.5px] text-muted">bun run test -- auth</p>
										<p class="mt-1 text-[10.5px] text-faint">
											Runs in <code class="font-mono">wor</code> · shell access · session only
										</p>
									</div>
								</div>
								<div class="mt-2.5 flex flex-wrap gap-1.5">
									<button
										type="button"
										onclick={onallow}
										class="rounded-md bg-fg px-2.5 py-1.5 text-[10.5px] font-medium text-bg hover:opacity-90"
									>
										Allow once
									</button>
									<button
										type="button"
										onclick={onallow}
										class="rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-[10.5px] hover:bg-surface-2"
									>
										Always allow
									</button>
									<button
										type="button"
										onclick={ondeny}
										class="rounded-md border border-line bg-surface px-2.5 py-1.5 text-[10.5px] text-muted hover:text-danger"
									>
										Deny
									</button>
								</div>
							</div>
						{:else}
							<div
								class="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-muted"
							>
								{#if permission === 'allowed'}<CircleCheck size={13} class="text-ok" /> Command approved
									· <code class="font-mono text-[10.5px]">bun run test -- auth</code>
								{:else}<CircleX size={13} class="text-danger" /> Command denied · agent will ask for another
									approach
								{/if}
							</div>
						{/if}

						<div class="rounded-lg border border-line bg-surface p-3">
							<div class="flex items-center gap-2">
								<GitCommitHorizontal size={14} class="text-accent" />
								<span class="text-[11.5px] font-medium">3 files changed</span>
								<span class="ml-auto font-mono text-[10px]">
									<span class="text-ok">+64</span> <span class="text-danger">−21</span>
								</span>
							</div>
							<div class="mt-2 space-y-1 font-mono text-[10.5px]">
								<div class="flex items-center gap-2 text-muted">
									<FileCode size={11} class="text-accent" /> src/lib/server/auth.ts<span
										class="ml-auto text-ok"
									>
										+18
									</span><span class="text-danger">−7</span>
								</div>
								<div class="flex items-center gap-2 text-muted">
									<FileCode size={11} class="text-accent" /> src/lib/server/session.ts<span
										class="ml-auto text-ok"
									>
										+31
									</span><span class="text-danger">−9</span>
								</div>
								<div class="flex items-center gap-2 text-muted">
									<FileText size={11} class="text-accent" /> src/routes/api/auth/+server.ts<span
										class="ml-auto text-ok"
									>
										+15
									</span><span class="text-danger">−5</span>
								</div>
							</div>
							<button
								type="button"
								onclick={onopenreview}
								class="mt-2 flex items-center gap-1 text-[10.5px] font-medium text-accent hover:text-accent-hover"
							>
								<FileDiff size={12} /> Open review
							</button>
						</div>

						{#each sent as message}
							<div
								class="ml-auto max-w-[85%] rounded-xl border border-line bg-userbg px-3.5 py-2 text-[12px]"
							>
								{message}
							</div>
						{/each}

						{#if running}
							<div class="flex items-center gap-2 text-[11px] text-faint">
								<Loader size={12} class="animate-spin" /> Thinking · checking the next callsite
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
