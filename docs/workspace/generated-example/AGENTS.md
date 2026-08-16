---
id: ART-0002
title: Workspace Agent Guide
type: guide
status: generated
project: PRJ-0001
related:
  - AGENTS.md
updated: "2026-08-16"
---

# AGENTS.md — Workspace Agent Guide

## Purpose

This workspace is the portable, machine-readable specification of the project. Agents (Claude, ChatGPT, Qwen, or compatible) can execute task packs and verify definitions of done without any other context.

## Reading Order

1. README.md — overview and health snapshot
2. 00-meta/project.md — project profile
3. 02-requirements/srs.md — the requirements (traceability root)
4. 03-design/hld.md + lld.md — architecture and data model
5. 09-agent-plans/master-plan.md — plan and phases
6. 09-agent-plans/tasks.md — executable task packs
## Rules for Agents

- Treat the database as the source of truth; Markdown here is generated output.
- Never edit files that do not carry the `<!-- protected -->` marker — edits are lost on regeneration.
- Reference artifacts by canonical ID (REQ-0001, TASK-0012), never by title.
- Complete task checklists in order and verify each item before marking it done.
- Record verification results back in the task pack before moving on.
- Do not start optional work without approval.
## Protected Sections

A file is preserved across regenerations when its content contains `<!-- protected -->` or frontmatter `protected: true`. Use it for manually maintained sections.

