---
name: openspec-archive-change
description: Archive a completed change in the OpenSpec workflow. Use when the user wants to finalize and archive a change after implementation is complete.
---

# OpenSpec Archive Change

Archive a completed change in the OpenSpec workflow.

**Input**: Optionally specify a change name. If omitted, prompt for selection.

## Steps

### 1. Select the change

Run `openspec list --json` to get available changes. Ask the user to select.
Show only active (not archived) changes. **Do NOT auto-select.**

### 2. Check artifact completion

```bash
openspec status --change "<name>" --json
```

Parse `schemaName` and `artifacts` list with their status.
If any artifacts are not `done`, warn and confirm before proceeding.

### 3. Check task completion

Read the tasks file. Count `- [ ]` (incomplete) vs `- [x]` (complete).
If incomplete tasks found, warn and confirm. If no tasks file, proceed.

### 4. Assess delta spec sync

Check for delta specs at `openspec/changes/<name>/specs/`. If none, skip.

If delta specs exist:
- Compare with corresponding main specs at `openspec/specs/<capability>/spec.md`
- Show combined summary
- Prompt: "Sync now (recommended)" or "Archive without syncing"

### 5. Perform the archive

```bash
mkdir -p openspec/changes/archive
mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
```

Check for name conflicts before moving.

### 6. Display summary

Show: change name, schema used, archive location, sync status, any warnings.

## Guardrails

- Always prompt for change selection if not provided
- Don't block archive on warnings — inform and confirm
- Preserve `.openspec.yaml` when moving (it moves with the directory)
