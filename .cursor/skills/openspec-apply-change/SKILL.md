---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks from an openspec change.
---

# OpenSpec Apply Change

Implement tasks from an OpenSpec change.

**Input**: Optionally specify a change name. If omitted, infer from context. If ambiguous, prompt for available changes.

## Steps

### 1. Select the change

If a name is provided, use it. Otherwise:
- Infer from conversation context
- Auto-select if only one active change exists
- If ambiguous, run `openspec list --json` and ask the user to select

Announce: "Using change: <name>"

### 2. Check status

```bash
openspec status --change "<name>" --json
```

Parse `schemaName` and which artifact contains tasks.

### 3. Get apply instructions

```bash
openspec instructions apply --change "<name>" --json
```

Returns: context file paths, progress (total/complete/remaining), task list, dynamic instructions.

**Handle states:**
- `state: "blocked"` → show message, suggest continuing change setup
- `state: "all_done"` → congratulate, suggest archive
- Otherwise → proceed to implementation

### 4. Read context files

Read files listed in `contextFiles` from the apply instructions output. Files vary by schema.

### 5. Show current progress

Display: schema, progress ("N/M tasks complete"), remaining tasks, dynamic instruction.

### 6. Implement tasks (loop)

For each pending task:
- Show which task is being worked on
- Make focused code changes
- Mark complete: `- [ ]` → `- [x]`
- Continue to next task

**Pause if**: task is unclear, design issue found, error/blocker encountered, user interrupts.

### 7. On completion/pause, show status

- Tasks completed this session
- Overall progress
- If all done: suggest archive
- If paused: explain why

## Guardrails

- Always read context files before starting
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors or unclear requirements — don't guess
- Use contextFiles from CLI output, don't assume file names
