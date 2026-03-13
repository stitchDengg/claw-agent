---
name: openspec-propose
description: Propose a new change with all artifacts generated in one step. Use when the user wants to quickly describe what they want to build and get a complete proposal with design, specs, and tasks ready for implementation.
---

# OpenSpec Propose

Create a change and generate all artifacts in one step:
- `proposal.md` (what & why)
- `design.md` (how)
- `tasks.md` (implementation steps)

When ready to implement, use the openspec-apply-change skill.

## Steps

### 1. Get user input

If no clear input, ask: "What change do you want to work on? Describe what you want to build or fix."

Derive a kebab-case name from the description (e.g., "add user authentication" → `add-user-auth`).

### 2. Create the change

```bash
openspec new change "<name>"
```

Creates scaffolded change at `openspec/changes/<name>/` with `.openspec.yaml`.

### 3. Get artifact build order

```bash
openspec status --change "<name>" --json
```

Parse `applyRequires` (artifacts needed before implementation) and `artifacts` (list with status and dependencies).

### 4. Create artifacts in sequence

Loop through artifacts in dependency order:

For each `ready` artifact:
1. Get instructions:
   ```bash
   openspec instructions <artifact-id> --change "<name>" --json
   ```
2. Read completed dependency files for context
3. Create artifact using `template` as structure
4. Apply `context` and `rules` as constraints — do NOT copy them into the file
5. After each artifact, re-check status until all `applyRequires` are `done`

If unclear context, ask the user to clarify.

### 5. Show final status

```bash
openspec status --change "<name>"
```

Summarize: change name/location, artifacts created, ready status.

## Artifact Guidelines

- Follow `instruction` field from CLI for each artifact type
- Read dependency artifacts before creating new ones
- Use `template` as output structure
- `context` and `rules` are constraints for YOU, not content for the file
- If change name already exists, ask whether to continue or create new

## Guardrails

- Create ALL artifacts needed for implementation (per schema's `apply.requires`)
- Prefer making reasonable decisions over blocking on minor ambiguity
- Verify each artifact file exists before proceeding to next
