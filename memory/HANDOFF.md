# HANDOFF

This file is used when context is close to exhaustion or when a session must be interrupted.

If this file is not empty, the agent must read it carefully before continuing.

## Latest Checkpoint

Checkpoint 2026-08-16 (scope-change session, plans only):

- completed: Prompts 00–12 fully implemented and verified (75/75 tests, backend smoke 185/185, preview running). Old Prompt 13 (deployment-and-final-audit) removed from required scope; four new required plans created in prompts/13-platform-configuration.md, prompts/14-multi-project-workspace.md, prompts/15-custom-node-palette.md, prompts/16-skills-and-final-audit.md; prompts/README.md updated; memory updated (DEC-015/DEC-016, STATE.json, PROJECT_MEMORY, NEXT_ACTION, USER_REQUESTS, SESSION_LOG).
- partially completed: none — user chose "create plans only"; no implementation has started.
- not started: execution of Prompts 13–16 (dynamic platform config → multi-project workspace → custom node palette → skills + final audit).
- exact next action: when the user approves/continues, read memory, then execute prompts/13-platform-configuration.md first (types/stacks/libraries tables + migration 006, multi-type project creation, global Settings UI, FEAT-008).
- files currently being modified: none (plans + memory only).
- known blockers: none.
- constraints that must not be violated: React + FSD frontend, Node.js + SQLite backend, English-only docs, no manual Mermaid, DB is source of truth, no external SaaS, additive-only migrations (destructive changes need APR), memory updates after every unit of work, no optional work without approval.
- user requests that must be preserved: remove plan 13; add new plans for complex multi-project functionality (configurable project types/stacks/libs, multi-type projects, connected workspaces, cross-project workflow calls, customizable node palette/categories, Skills section, per-project docs); clarifying answers in DEC-016; create plans only (no implementation yet).
- pending approvals: approval to begin executing the new required scope (Prompts 13–16).

## Required Checkpoint Fields

When writing a checkpoint, include:

- completed work
- partially completed work
- not started work
- exact next action
- files currently being modified
- known blockers
- constraints that must not be violated
- user requests that must be preserved
- pending approvals