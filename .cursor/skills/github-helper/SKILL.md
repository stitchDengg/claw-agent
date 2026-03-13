---
name: github-helper
description: Local GitHub repository helper for search, clone, sync, and issue/PR inspection workflows. Use when users mention github/repo/repository, ask to download or track repositories, or need structured local knowledge with gh CLI and GitHub MCP integration.
---

# GitHub Helper

管理本地 GitHub 仓库目录，维护可检索知识库，并为仓库检索、克隆、Issue/PR 跟踪提供统一流程。

## Local Repository Directory

**Default path**: `/Users/denghao/Documents/github`

Knowledge base file: `CLAUDE.md` in the github directory.

## Core Workflows

### 1. Initialize or Update Knowledge Base

1. Check if the github directory exists
2. If not found, ask user for the correct path
3. Scan using `scripts/scan_repos.py`
4. Update knowledge base using `scripts/update_kb.py`

```bash
python3 .cursor/skills/github-helper/scripts/scan_repos.py /Users/denghao/Documents/github
python3 .cursor/skills/github-helper/scripts/update_kb.py /Users/denghao/Documents/github '<repos_json>'
```

### 2. Search for Repository

1. **Check local first**: Read the knowledge base file in the github directory
2. **If found locally**: Use local path to analyze and answer
3. **If not found**: Search GitHub using `gh` CLI or GitHub MCP tools
4. **Offer to download**: Ask user whether to clone

### 3. Download Repository

1. Clone to the github directory:
   ```bash
   cd /Users/denghao/Documents/github && git clone <repo-url>
   ```
2. After successful clone, update knowledge base (scan + update)

### 4. GitHub Search

Use `gh` CLI first, fall back to GitHub MCP:

```bash
gh search repos <query> --limit 10
gh issue list --repo <owner/repo> --state all --limit 20
gh pr list --repo <owner/repo> --state all --limit 20
```

## Answering Repository Questions

1. Check local knowledge base first
2. If local, prioritize local code inspection
3. If insufficient, query GitHub issues/PRs/releases

## Directory Validation

If the default directory does not exist:
1. Ask user for the correct repository root path
2. Initialize knowledge base at the new location
