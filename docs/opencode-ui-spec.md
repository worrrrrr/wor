# Wor Code Workspace — UI/UX SPEC

Status: draft v1 for implementation  
Reference: OpenCode Desktop `2.4.2`, installed at  
`C:\Users\worrr\AppData\Local\Programs\ai.opencode.desktop`  
Evidence extracted from `resources/app.asar` (`main-*.js`, `shell-*.js`, `route-*.js`, `themes-*.js`) and the renderer CSS.  
Scope: the **Code Workspace** surface of Wor. Chat mode keeps its current warm, reading-first design. This document specifies the dense, keyboard-first workspace that sits beside it.

This is a behavioural and visual spec, not a instruction to clone OpenCode. Reuse the proven interaction model, keep Wor's own identity.

---

## 0. Product frame

### 0.1 Two surfaces, one product

| Surface | Job | Feel |
|---|---|---|
| Chat | Ask, read, draft, discuss | Warm, spacious, serif prose |
| Code Workspace | Inspect a repository, run an agent, review changes | Dense, neutral, keyboard-first |

The Code Workspace is not a second chat page. It is a persistent workbench with four regions:

```
┌──────────────────────────────────────────────────────────────┐
│ title / project / branch / connection                        │
├───────────────┬──────────────────────────────┬───────────────┤
│ Left Sidebar  │ Main                         │ Right Review  │
│ sessions      │ tabs + timeline + composer   │ files + diff  │
│ projects      │                              │               │
├───────────────┴──────────────────────────────┴───────────────┤
│ Bottom Panel: terminal / browser / logs                      │
├──────────────────────────────────────────────────────────────┤
│ status bar: model · agent · branch · usage · connection      │
└──────────────────────────────────────────────────────────────┘
```

The right panel and bottom panel are collapsible. The left sidebar can collapse to a rail. Any region can be hidden without losing session state.

### 0.2 Principles

1. **Show the work.** Tool calls, files touched, commands run and diffs are first-class, not hidden behind prose.
2. **State is always visible.** Running, waiting for approval, asking a question, failed, done and idle each have a distinct treatment.
3. **Keyboard first, pointer optional.** Every primary action has a command and a shortcut.
4. **Density without ambiguity.** Small type and tight rows are allowed, but hierarchy must come from surface, spacing and weight — not decoration.
5. **Nothing destructive without a boundary.** Delete, overwrite, worktree removal and auto-approve are explicit and reversible where possible.
6. **One source of truth per state.** A running turn, a tab, a diff and a session row all read the same state.

### 0.3 Non-goals for v1

- Multi-user collaboration.
- Cloud sync of workspaces.
- Mobile-native code editing.
- Replacing the existing Chat surface.

---

## 1. Layout shell

### 1.1 Dimensions

| Region | Default | Min | Max | Persisted |
|---|---:|---:|---:|---|
| Left sidebar expanded | 280px | 240px | 320px | yes |
| Left sidebar rail | 48px | — | — | yes |
| Main | flexible | 480px | — | — |
| Right review panel | 240px | 200px | 480px | yes, per workspace |
| Bottom panel | 240px | 160px | 40% viewport | yes |
| Status bar | 28px | — | — | no |

Rules:

- Resize handles are 4px hit areas with a 1px visual line.
- Double-click a handle resets that region to default.
- Sizes persist in `localStorage` under `wor.code.layout`.
- Never allow the main column below 480px; collapse the right panel first, then the left.
- At `< 1100px`, the right panel becomes an overlay drawer.
- At `< 768px`, the left sidebar becomes a drawer and the composer stays pinned to the bottom.

### 1.2 Modes

The workspace supports three navigation modes, selectable in Settings → General → Navigation:

1. **Tabs** — sessions open as tabs; the left sidebar shows recent sessions.
2. **List** — one session at a time; the left sidebar is the primary navigation.
3. **Inbox** — sessions grouped by state: Needs attention, Working, Recent, Archived, Drafts.

Tab layout is independent: **Top tabs** / **Side tabs** / **Inbox**. Tab grouping: None / By project / By server.

### 1.3 Focus and inert

- Opening a mobile drawer or modal sets `inert` on the background workspace.
- Focus enters the first meaningful control, not the panel container.
- Escape closes the topmost overlay only: question → approval → command palette → settings → drawer.
- Focus returns to the element that opened the overlay, except when that element no longer exists; fall back to the main composer.

---

## 2. Left Sidebar

### 2.1 Header

- Wor mark; click returns to the workspace home.
- **New session** primary button. Secondary action opens a menu:
  - New chat
  - New agent session
  - New session in project…
  - New session from URL / local folder (later)
- **Search** field; `Ctrl/Cmd+K` opens the command palette instead of focusing the field.
- Collapse control; on mobile, close control.

### 2.2 Sections

Order:

1. **Pinned** — explicitly pinned sessions.
2. **Needs attention** — approval pending, question pending, failed.
3. **Working** — currently running; duration visible.
4. **Recent** — grouped by Today / Yesterday / Previous 7 days / Older.
5. **Archived** — collapsed by default.
6. **Drafts** — unsent composer state, one per project.

Empty rules:

- No sessions at all: one compact line, “No sessions yet.” Do not repeat the main empty-state copy.
- A section with no items is hidden, not rendered as an empty heading.
- Searching: show only matching sessions/projects; show “No matches” once.

### 2.3 Session row anatomy

```
[status] Title…………………………  project · time  [⋯]
```

- Status: spinner (working), dot (unread), warning (approval/question), error (failed), check (done), muted (idle).
- Title: one line, ellipsis, tooltip with full title.
- Meta: project name and relative time; branch only when the session is in a worktree.
- Hover/focus actions: pin, mute, hide, archive, rename, delete.
- Active row: surface layer + 2px accent bar on the leading edge.
- Keyboard: ↑/↓ moves selection; Enter opens; `F2` renames; `Delete` opens confirmation.

### 2.4 Session states

| State | Visual | Sidebar label |
|---|---|---|
| Working | animated dot + elapsed | “Working 2m” |
| Needs approval | warning dot | “Approval” |
| Needs answer | question dot | “Question” |
| Failed | error dot | “Failed” |
| Done, unread | accent dot | “Done” |
| Idle | no dot | relative time |
| Archived | muted row | “Archived” |

### 2.5 Projects

- Project row: icon/color, name, session count, expand chevron.
- Expand shows recent sessions for that project.
- Project actions: open, edit, new session here, archive, remove.
- Project icon: 128×128 recommended; fallback color; missing-folder warning.
- Drag to reorder projects (P1).
- “Open project…” picks a directory; a project without a folder is read-only and shows a repair action.

### 2.6 View options

A single popover controls:

- Group by: None / Project / Server
- Sort by: Manual / Updated / Created / Attention
- Show: Recent sessions / Subagents / Server labels
- Filter: Status (Needs input, Running, Unread, Failed, Idle), Server, Project
- Actions: Mark all read, Reset filters

Persist per workspace. Filters never mutate session data.

### 2.7 Footer

- Settings button.
- Help / docs link.
- Connection status: local server, remote server, offline.
- Collapsed rail shows only brand, new session, search and settings icons.

---

## 3. Main workspace

### 3.1 Tab strip

- Tabs represent open sessions, not projects.
- Active tab: surface + bottom accent line; unsaved/draft marker if composer has content.
- Close button; middle-click closes; `Ctrl/Cmd+W`.
- Overflow: horizontal scroll with fade edges; `Ctrl/Cmd+Tab` cycles.
- Reopen closed tab: `Ctrl/Cmd+Shift+T`.
- Tab context menu: close, close others, close to the right, move to background, copy session ID.
- Group tabs by project/server when enabled; group header is sticky.
- Side-tab mode moves the same tab model into the left edge; Inbox mode uses status groups instead.

### 3.2 Session header

Left to right:

- Mobile menu (if drawer).
- Project / location label; click opens project switcher.
- Branch label with worktree indicator; click opens branch/worktree menu.
- Session title; inline rename.
- Right: review toggle, model chip, agent chip, overflow menu.

Overflow: rename, generate title, fork, compact, export, import, archive, delete, copy ID, move to background.

### 3.3 Timeline

The transcript is a sequence of **turns**. A turn contains:

1. User message (collapsible if `foldUserMessages`).
2. Assistant response blocks in order:
   - reasoning (collapsed by default, expandable)
   - prose
   - tool cards
   - diff summary
   - subagent cards
   - error/retry card
3. Turn footer: duration, token usage, model, agent, stop reason.

Turn status line examples:

- Exploring
- Planning next steps
- Searching the codebase
- Searching the web
- Making edits
- Running commands
- Delegating work
- Thinking
- Waiting for approval
- Waiting for your answer
- Done
- Failed

Tool card anatomy:

```
[icon] Tool name        [state]
summary / path / command
[output preview]        [expand]
```

Tool types to render: Read, List, Glob, Grep, Shell, Patch, Webfetch, Websearch, Browser, Task/Subagent, Skill, Questions, Execute.

States: queued, running, completed, failed, cancelled, timed out, needs approval.

Diff summary in a turn:

- `N changed files`, additions/deletions.
- First 3 files inline; “Show all”.
- Clicking a file opens the right review panel at that file.
- If diff is unavailable: “Diff unavailable — Retry”.

Subagent card:

- Agent name/type, status, current task, elapsed.
- Expand shows child transcript or summary.
- Stop control while running.
- Link opens child session in a tab (or side panel).

Retry card:

- Attempt number, delay countdown, last error.
- “Retry now”, “Stop”.
- Do not render every retry as a new assistant message; collapse into one card.

### 3.4 Scroll behaviour

- Stick to bottom while streaming only if the user is already near the bottom.
- If the user scrolls up, show “Jump to latest”.
- New user send always forces bottom.
- Preserve scroll position when switching tabs.
- Do not auto-scroll on initial load when the transcript is empty.

### 3.5 Empty state

- Workspace home: project name, branch, quick actions (New session, Open file, Open terminal, Review changes), recent sessions.
- No project: “Open a project” with directory picker.
- No changes: review panel empty state, not main.
- No model: inline banner with “Choose model”, not a blocking modal.

### 3.6 Bottom panel

- Tabs: Terminal 1, Terminal 2, Browser, Logs.
- New terminal; close; rename; split (P1).
- Terminal supports ANSI, copy/paste, clear, kill.
- Browser panel is an embedded preview with address bar, reload, open external.
- Toggle with `Ctrl/Cmd+J`; panel height persisted.
- Terminal state survives tab switches; not persisted across app restart unless explicitly “keep session”.

---

## 4. Right Review Panel

### 4.1 Purpose

Review is not a chat sidebar. It shows the change surface for the active session or workspace.

### 4.2 Header

Title modes:

- Session changes (default)
- Git changes
- Branch changes
- Last turn changes

Controls:

- File tree toggle
- Sidebar position: Left / Right
- Expand/collapse all
- Diff style: Unified / Split
- Show all lines / Hide non-diff lines
- Filter files
- Previous / next file
- Close panel

### 4.3 File tree

- Hierarchical tree with folder collapse.
- Status badge: Added, Modified, Deleted, Renamed.
- Counts: additions/deletions per file.
- Filter by path.
- Click opens the file diff; keyboard ↑/↓ moves; Enter opens.
- “Open file” opens the editor/browser tab.
- Large diff: show “Diff too large to render” with line limit and “Render anyway”.

### 4.4 Diff viewer

- Unified or split.
- Syntax highlighting via the active theme's token colors.
- Line numbers; +/- gutters; word-level highlight for changed spans.
- Sticky file header with path and change status.
- Selection: line range → “Add selection to context”.
- Comment on a line (P1): opens inline comment composer; comments survive reload.
- Collapse unchanged regions with “N hidden lines”.
- Empty states:
  - No git repo: “No tracked changes” + “Create Git repository”.
  - Git repo, no changes: “No file changes yet”.
- Do not render enormous diffs by default; guard at a configurable line limit.

### 4.5 Behaviour

- Panel width 240 default, 200–480; persisted per workspace.
- Can sit on the left or right; the main column adapts.
- “Keep side panel open across sessions” option; default on.
- If closed, a review toggle remains in the session header with change count.
- On mobile, it becomes a full-height overlay; back closes it.

---

## 5. Composer

### 5.1 Anatomy

```
┌────────────────────────────────────────────────────┐
│ attachments / context chips                        │
│                                                    │
│ textarea                                           │
│                                                    │
│ [+ attach] [@ context] [/ command]                 │
│                 [agent] [model] [variant] [send]    │
└────────────────────────────────────────────────────┘
```

- Auto-grow from 1 to 8 lines; then scroll.
- Placeholder: “Ask anything, / for commands, @ for context…”
- Follow-up placeholder: “Add follow-up, / for commands, @ for context…”
- Shell mode placeholder: “Enter shell command…”

### 5.2 Input features

- `/` opens command menu; typed text filters commands.
- `@` opens context menu: files, folders, selections, sessions, docs.
- Prompt history: `↑` at start of empty input; searchable history.
- Attachments: drop images, PDFs, text, code; paste images; file picker.
- Attachment chip: icon/thumbnail, name, size, remove, upload progress, cancel.
- Limits: max 8 files; images 5MB; text preview 20k chars; reject binary NUL.
- Drag overlay: “Drop images, PDFs, or files to add”.
- No silent truncation: show a toast when a file is rejected.

### 5.3 Model and agent controls

- Model picker: grouped by provider; search; favorite; local/cloud marker; context window; tools/vision badges.
- Agent picker: Build, Plan, custom agents; “Show agent” setting controls visibility.
- Variant and speed selectors appear only when the selected model supports them.
- Changing model/agent preserves draft text and attachments.
- If the selected model lacks tools, Agent mode is disabled with a reason.

### 5.4 Send behaviour

- Enter sends; Shift+Enter newline.
- While streaming: primary button becomes Stop; Enter does not send unless queue/steer is explicit.
- Follow-up behaviour: Queue (wait for current turn) or Steer (inject into current turn). Setting default; `Ctrl/Cmd+Enter` toggles.
- Optimistic user message appears immediately; assistant draft follows.
- If send fails: keep the draft, show inline error and Retry.

### 5.5 Shell mode

- Toggle from command palette or a leading `!`.
- Placeholder changes; send runs the command in the workspace cwd.
- Output renders as a terminal block with exit code.
- Shell mode never sends the command to the model.
- Destructive command guard: confirm before `rm -rf`, `git reset --hard`, force push, database drop.

### 5.6 Permissions and questions

- Permission request card appears above the composer or inline in the timeline:
  - tool, target, risk, command/diff preview
  - Allow once / Allow for project / Deny
  - “Auto-accept” is a separate, explicit setting; never the default for writes or shell.
- Question dock:
  - one question at a time, options + free text
  - keyboard: 1–9 selects, Enter submits, Esc dismisses if allowed
  - “Submit answer” only enabled when valid
- Notifications: system notification when approval/question/completion occurs and the window is unfocused.

---

## 6. Command palette

Opened by `Ctrl/Cmd+K`; also from search field.

Search sources:

- Commands
- Files
- Sessions (recent first)
- Settings pages
- Projects

Group order: Commands, Files, Recent sessions, Settings.

Rules:

- Query matches title, keywords and path.
- Arrow keys navigate; Enter runs; `Tab` completes; Esc closes.
- Show shortcut on the right of each command.
- Empty query: recent sessions + suggested commands.
- No results: “No results found” with a hint to search files or commands.
- Palette is a modal; background inert; focus trapped.

Commands to include (v1):

- New session, search sessions, previous/next session
- Open project, open file
- Toggle sidebar, review, bottom panel
- Focus composer
- Choose model, choose agent, cycle agent, cycle model variant
- Toggle shell mode, stop session
- Undo/redo, compact, fork, export, rename, archive, delete
- Auto-accept permissions on/off, for project
- Add selection to context
- Reload configuration, open settings
- Open terminal, new terminal

---

## 7. Settings

Settings is a full page, not a modal. Left navigation + searchable content + back to app.

### 7.1 Shell

- Header: “Settings”, search field.
- Left nav: Servers, Preferences, Shortcuts, Notifications, Projects, Extensions, Experimental, About, Worktrees.
- Search across pages and settings; group results by Pages / Settings / Projects / Servers.
- Empty search: “No results for …”, suggest narrowing.
- Back returns to the previous app surface.

### 7.2 Preferences

| Group | Setting | Values / behaviour |
|---|---|---|
| Navigation | Navigation | Tabs / List |
| Navigation | Tab position | Top / Side / Inbox |
| Navigation | Group tabs | None / Project / Server |
| Layout | Interface layout | Top tabs / Side tabs / Inbox |
| Layout | Keep side panel open across sessions | on/off |
| Layout | Show agent | show/hide agent picker in composer |
| Language | Language | display language |
| Terminal | Terminal shell | Auto / specific shell |
| Appearance | Color scheme | System / Light / Dark |
| Appearance | Theme | theme picker, preview, collection filter |
| Appearance | UI font | family + size |
| Appearance | Code font | family |
| Appearance | Terminal font | family |
| Behaviour | Follow-up behaviour | Queue / Steer |
| Behaviour | Question submit key | Enter / Mod+Enter |
| Behaviour | Pinch to zoom | on/off |
| Behaviour | Spellcheck | on/off |
| Mobile | Bottom navigation | on/off |

Defaults observed in OpenCode: UI font size 14, tab layout horizontal, show custom agents on, timeline width comfortable, fold user messages off, show turn diffs off, background activity left.

### 7.3 Notifications

- Agent complete / needs attention
- Permission required
- Question asked
- Error occurred

Each: system notification on/off. Sounds are a separate section:

- Agent, permissions, questions, errors, interface.
- Sound picker + preview + volume.

### 7.4 Shortcuts

- Groups: General, Session, Navigation, Model and agent, Terminal, Prompt.
- Each row: action, current chord, reset.
- Rebind by pressing keys; detect conflicts and show “already assigned to …”.
- Unbind, add alternate key, reset all to defaults.
- Search shortcuts.

### 7.5 Providers and models

- Connected providers list; tags: Environment, Config, Custom, Account, Other.
- Connect/disconnect; multiple accounts per provider; account name; active account.
- Popular providers; “Show more”.
- Custom OpenAI-compatible provider: name, base URL, API key, models, per-model context/tools/vision.
- Models page: enable/disable all, choose which appear in picker.
- Disconnect confirmation explains which models disappear.
- Secrets are never returned to the client; show “configured” only.

### 7.6 Extensions

Tabs: Plugins, MCPs, Skills.
- Available to all projects vs project-scoped.
- Add extension: install from store, folder, or config.
- Enable/disable, reload, update, remove.
- Show load failures with details.
- Per-project LSP list: auto-detected, configured, enabled/disabled.
- Link to `opencode.json` / project config.

### 7.7 Projects

- Project name, icon (128×128), color.
- Auto-accept permissions for this project: default/on/off.
- Worktree startup command, with `$OPENCODE_WORKTREE_BASE` and `$OPENCODE_WORKTREE_PATH`.
- Extensions available to this project: MCPs, plugins, skills, LSPs.
- Missing folder: repair or close project.

### 7.8 Worktrees / Workspaces

- Default environment for new sessions: Last used per project / Local directory / New worktree.
- List all projects; filter; count sessions; last active session.
- Delete one, delete all, delete those without sessions.
- Confirmations list exactly what will be deleted; warn about unmerged changes.
- Blocked deletions: active worktree; warn when linked sessions will lose their directory.
- Disk usage summary (P1).

### 7.9 Experimental

- New timeline
- New question UI
- Tab groups
- Organize vertical sidebar: Recent / One list / Customize / Consolidated

Experimental features carry a short description and a visible “Experimental” label. They must degrade to the stable UI when disabled.

### 7.10 About

Version, license, contributors, website, third-party notices.

---

## 8. Themes and design tokens

### 8.1 Theme model

- **Color scheme** and **theme** are separate.
  - Color scheme: System / Light / Dark.
  - Theme: a specific palette with its own `colorScheme` (light/dark).
- A theme declares: `name`, `displayName`, `colorScheme`, `collection`, `palette` or `seeds`.
- Collections: `pierre`, `shiki`, and custom.
- Custom themes are loaded from config; duplicate names are rejected.
- Themes are lazy-loaded; never ship all palettes in the initial bundle.
- A theme preview shows background, surface, text, accent, success, warning, danger, and a code block.

### 8.2 Token set

Required semantic tokens:

```
bg.base, bg.layer-01, bg.layer-02, bg.layer-03, bg.layer-04
text.base, text.muted, text.faint, text.inverted
border.base, border.muted, border.strong, border.focus
accent, accent-hover, accent-soft, accent-contrast
success, warning, danger, info
selection, diff.added, diff.removed, diff.modified
code.bg, code.fg, code.token.*
```

Rules:

- No component hardcodes a hex value.
- Borders: 0.5px or 1px; never heavy outlines.
- Radius: 4px small, 6px controls, 8px panels, 12px modal.
- Shadows: only for overlays; no decorative shadows.
- Focus ring: 2px accent at 2px offset; visible in both schemes.
- Contrast: body text ≥ 4.5:1; large text ≥ 3:1; UI borders ≥ 3:1 where they convey state.

### 8.3 Typography

- UI: Inter or system sans; 13px base in dense mode, 14px comfortable.
- Code: JetBrains Mono / IBM Plex Mono; 12.5–13px.
- Prose in Chat: Noto Serif Thai / serif; not used for dense UI.
- Line height: 1.4 UI, 1.5 prose, 1.55 code.
- Numeric alignment: tabular numbers for counts, durations, token usage.

### 8.4 Theme inventory (OpenCode 2.4.2)

**Pierre (10)**
- Dark: `pierre-dark`, `pierre-dark-soft`, `pierre-dark-vibrant`, `pierre-dark-protanopia-deuteranopia`, `pierre-dark-tritanopia`
- Light: `pierre-light`, `pierre-light-soft`, `pierre-light-vibrant`, `pierre-light-protanopia-deuteranopia`, `pierre-light-tritanopia`

**Shiki light (21)**
`ayu-light`, `catppuccin-latte`, `everforest-light`, `github-light`, `github-light-default`, `github-light-high-contrast`, `gruvbox-light-hard`, `gruvbox-light-medium`, `gruvbox-light-soft`, `horizon-bright`, `kanagawa-lotus`, `light-plus`, `material-theme-lighter`, `min-light`, `night-owl-light`, `one-light`, `rose-pine-dawn`, `slack-ochin`, `snazzy-light`, `solarized-light`, `vitesse-light`

**Shiki dark (45)**
`andromeeda`, `aurora-x`, `ayu-dark`, `ayu-mirage`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`, `dark-plus`, `dracula`, `dracula-soft`, `everforest-dark`, `github-dark`, `github-dark-default`, `github-dark-dimmed`, `github-dark-high-contrast`, `gruvbox-dark-hard`, `gruvbox-dark-medium`, `gruvbox-dark-soft`, `horizon`, `houston`, `kanagawa-dragon`, `kanagawa-wave`, `laserwave`, `material-theme`, `material-theme-darker`, `material-theme-ocean`, `material-theme-palenight`, `min-dark`, `monokai`, `night-owl`, `nord`, `one-dark-pro`, `plastic`, `poimandres`, `red`, `rose-pine`, `rose-pine-moon`, `slack-dark`, `solarized-dark`, `synthwave-84`, `tokyo-night`, `vesper`, `vitesse-black`, `vitesse-dark`

Default for Wor: `wor-light` / `wor-dark`, plus the full list above as optional. The default palette must preserve the existing warm paper identity in Chat and use neutral layers in Code.

---

## 9. Workspace management

### 9.1 Concepts

| Concept | Meaning |
|---|---|
| Project | A folder the user opened, with identity settings |
| Worktree | An isolated checkout for a session or group of sessions |
| Session | One conversation/agent run; belongs to a project and optionally a worktree |
| Location | The directory a session executes in; can cycle between project root and worktree |

### 9.2 Project lifecycle

- Open folder → create project record (name, path, color).
- Edit name/icon/color.
- Per-project auto-accept permission policy.
- Per-project worktree startup command.
- Per-project extensions and LSPs.
- Missing folder → read-only state with repair/close.
- Remove project: keep or delete sessions; never delete the folder.

### 9.3 Worktree lifecycle

- Create from a base branch; name generated or supplied.
- Run startup command once after creation, with base/path env vars.
- Sessions can be assigned to the worktree.
- List worktrees with session count, last active, disk usage.
- Delete one/all/without sessions.
- Never delete a worktree with uncommitted changes without explicit confirmation.
- Block deletion of the active worktree.
- Deleting a worktree deletes its branch; warn if unmerged.

### 9.4 Location switching

- Session header branch menu: choose base branch, cycle location, create worktree.
- Moving a session preserves transcript and settings; only cwd changes.
- If the new location is missing, block with an actionable error.

---

## 10. Session lifecycle and actions

### 10.1 Create

- New session inherits the selected project, location, model, agent and mode.
- Draft is created on first keystroke; not persisted as a session until send.
- Title: generated from first user message; editable; “Generate title” available.

### 10.2 Run

- States: queued, running, waiting_approval, waiting_answer, retrying, done, failed, cancelled.
- A running session can continue in the background when the tab closes.
- Closing a tab does not stop the agent unless “Stop on close” is set.

### 10.3 History actions

- Undo last message (revert to before it), Redo.
- Fork from a message into a new session.
- Compact: summarize older context, keep recent turns.
- Export as JSON; import.
- Rename, archive, delete.
- Copy session ID.
- Move to background.

### 10.4 Persistence

- Session events are append-only.
- Every model-visible input is reconstructable.
- Tabs, active session, panel sizes and filters persist per workspace.
- App restart restores tabs in a paused state; running work does not silently resume without a policy decision.

---

## 11. Permissions, approvals and questions

### 11.1 Permission request

Must show:

- Tool name and action
- Target path or command
- Risk level
- Diff preview for writes
- Allow once / Allow for project / Deny
- “Always allow this tool” only as an explicit advanced action

### 11.2 Auto-accept

- Global and per-project.
- Default off for writes, shell and network mutations.
- Enabling requires a confirmation that lists what will be auto-approved.
- Auto-accepted actions still appear in the audit trail.
- Revoke at any time; takes effect on the next tool call.

### 11.3 Questions

- One question at a time; multi-question batches show progress “2 of 3”.
- Options with descriptions; free-text answer.
- Keyboard-first: number keys, arrows, Enter.
- Timeout does not auto-answer; it stays pending and notifies.

### 11.4 Audit

- Every approval, denial, auto-approval and tool result is recorded in the session log.
- The timeline shows who approved (user/policy) and when.

---

## 12. Keyboard model

Proposed defaults; all configurable.

| Action | Shortcut |
|---|---|
| Command palette | `Ctrl/Cmd+K` |
| New session | `Ctrl/Cmd+N` |
| Close tab | `Ctrl/Cmd+W` |
| Reopen closed tab | `Ctrl/Cmd+Shift+T` |
| Toggle left sidebar | `Ctrl/Cmd+B` |
| Toggle right review | `Ctrl/Cmd+Shift+B` |
| Toggle bottom panel | `Ctrl/Cmd+J` |
| Focus composer | `Ctrl/Cmd+L` |
| Send | `Enter` |
| New line | `Shift+Enter` |
| Queue/steer toggle | `Ctrl/Cmd+Enter` |
| Previous/next session | `Ctrl/Cmd+Shift+[` / `]` |
| Previous/next message | `Alt+↑` / `Alt+↓` |
| Search sessions | `Ctrl/Cmd+Shift+F` |
| Stop run | `Esc` while composer focused, then confirm |

Rules:

- Shortcuts never fire while a text field is composing, except explicit chords.
- Show the chord in tooltips and command palette rows.
- Conflict detection is mandatory.

---

## 13. State matrix

Every surface must define:

| State | Required UI |
|---|---|
| Loading | skeleton rows; no layout shift |
| Empty | one sentence + one action |
| Error | cause, retry, copy details |
| Offline | banner; queue or disable send; explain |
| Unauthorized | connect/sign-in action; no dead end |
| Partial | show what loaded; mark missing sections |
| Streaming | stop control; status line; no fake progress |
| Long-running | elapsed time; background indicator; notification on done |
| Cancelled | preserve partial output; mark stopped |
| Rate limited | reset time; switch model action |

Toasts are for transient confirmations only, never for errors that need a decision.

---

## 14. Accessibility

- All dialogs: `role="dialog"` or `alertdialog`, `aria-modal`, labelled title, focus trap, Escape.
- Icon-only buttons: `aria-label` + tooltip.
- Tabs: `role="tablist"`, arrow-key navigation, `aria-selected`.
- Trees: `role="tree"`, `aria-expanded`, `aria-level`.
- Timeline: live region only for status, not every token.
- Diff: text alternatives for added/removed lines; not color alone.
- Contrast: WCAG AA in both schemes.
- Reduced motion: disable spinners? Keep a static status indicator; disable transitions.
- Target size: ≥ 24×24px; ≥ 32×32 for primary controls on touch.
- Screen reader: announce approval/question once, not repeatedly.

---

## 15. Data model (implementation-facing)

Minimum tables/records:

```
projects(id, name, path, color, icon, settings_json, created_at, updated_at)
worktrees(id, project_id, path, branch, base_branch, status, created_at, last_active_at)
sessions(id, project_id, worktree_id, title, mode, model, agent, status, created_at, updated_at)
session_events(id, session_id, type, payload_json, created_at)
tabs(id, workspace_id, session_id, position, group_key)
approvals(id, session_id, tool_call_id, decision, scope, created_at)
settings(key, value_json, scope, scope_id)
themes(name, display_name, color_scheme, collection, palette_json, source)
```

Rules:

- Session events are append-only; projections are derived.
- Settings are scoped: global, project, workspace.
- Deleting a project cascades sessions/worktrees only after explicit confirmation.
- Secrets are stored encrypted; never in settings JSON returned to the client.

---

## 16. Implementation phases

### Phase 1 — Shell and navigation
- Layout regions, resize/collapse, mobile drawers, focus/inert.
- Left sidebar: header, sessions list, groups, states, search, view options.
- Main: tabs, session header, empty state.
- Composer: textarea, send/stop, attachments, model picker.
- Acceptance: open project, create session, send a message, switch tabs, collapse panels; keyboard-only path; no overflow at 390/768/1440.

### Phase 2 — Timeline and tools
- Turn grouping, reasoning, tool cards, status lines, retry, subagent, diff summary.
- Scroll/follow/jump-to-latest.
- Acceptance: a real agent run with read/shell/patch tools; every state visible; errors recoverable.

### Phase 3 — Review panel
- File tree, diff viewer, unified/split, filters, selection to context, empty states.
- Acceptance: open a changed file, review a diff, add selected lines to composer context.

### Phase 4 — Settings, themes and palette
- Settings shell + all tabs; provider/model management; shortcuts; themes; command palette.
- Acceptance: every setting persists; theme applies to UI and code; palette reaches all primary actions.

### Phase 5 — Workspace management
- Projects, worktrees, location switching, startup scripts, cleanup.
- Acceptance: create/switch/delete worktree with guards; session moves without losing transcript.

### Phase 6 — Permissions and questions
- Approval cards, auto-accept, question dock, notifications, audit.
- Acceptance: a write/shell action requires approval; deny stops the action; auto-accept is explicit and revocable.

---

## 17. Acceptance criteria (global)

1. A new user can open a project, start a session and send a prompt without visiting Settings.
2. A returning user can find any session by title, project, status or search.
3. A running agent's state is visible from the sidebar without opening the session.
4. A permission request can be approved or denied with the keyboard.
5. A diff can be reviewed and a line range added to context without leaving the workspace.
6. Every primary action is reachable from the command palette.
7. No horizontal overflow at 390px; no clipped composer; no background focus through a drawer.
8. Light and dark themes pass WCAG AA for body text.
9. Reload restores tabs, panel sizes, theme and filters.
10. A failed tool call does not erase the transcript; retry is available.
11. No secrets appear in client state, logs or exported sessions.
12. Destructive actions require confirmation and name the target.

---

## 18. Open questions

- Should tabs be per-window or per-workspace? (Default: per-workspace.)
- Should closing a tab stop a running agent? (Default: no; move to background with a clear indicator.)
- Should the right review panel default open or closed? (Default: open when changes exist, closed otherwise.)
- Should the left sidebar support drag-reorder of sessions? (P1; manual sort must be explicit.)
- Which settings are project-scoped vs global? (Default: appearance/shortcuts global; permissions/extensions/tools project-scoped.)

---

## Appendix A — Observed OpenCode feature inventory

From installed `2.4.2` i18n keys and renderer:

- Navigation: tabs/list, top/side/inbox, tab grouping by project/server.
- Sidebar: pinned, working, needs attention, recent, archived, drafts; pin/mute/hide/archive; filters; mark all read.
- Review: session changes / git changes / branch changes / last turn; unified/split; file tree; show all lines; previous/next; selection to context.
- Composer: @ context, / commands, prompt history, attachments, shell mode, model/agent/variant/speed, queue/steer, send/stop.
- Commands: new/search session, previous/next, open project/file, toggle sidebar/review/bottom, choose model/agent, auto-accept permissions, undo/redo, compact, fork, export/import, rename, archive, delete, background, side question.
- Settings: servers, preferences, shortcuts, notifications, projects, extensions (plugins/MCPs/skills/LSP), experimental, about, worktrees.
- Themes: 10 Pierre + 66 Shiki, plus custom themes; system/light/dark color scheme; UI/code/terminal fonts.

## Appendix B — Evidence boundaries

Verified from the installed app:

- Strings/labels and option lists in `main-mu5c-cC4.js`.
- Theme names and collections in `themes-Dngs41B_.js`.
- Review panel defaults (`240px`, side start/end, 200–480 range) in `route-BEI6CXto.js`.
- Settings section keys in `main-mu5c-cC4.js` and `shell-iJ-6AyC2.js`.

Not verified:

- Exact default keybindings for every command.
- Backend behaviour of remote servers and paired machines.
- Whether every experimental feature is enabled in the stable build.
- Exact animation timings and easing curves.

Where this spec states a default that was not observed, it is marked “proposed” or “default for Wor”.
