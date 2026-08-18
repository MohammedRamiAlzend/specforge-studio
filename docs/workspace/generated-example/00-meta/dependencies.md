---
id: ART-0033
title: Project Dependencies
type: index
status: generated
project: PRJ-0001
updated: "2026-08-18"
---

# Project Dependencies

## Purpose

Explicit, declared links between projects in this workspace (Prompt 14). A dependency means this project relies on the target project — for workflow calls, shared data, deployment, or other reasons. Per-project exports stay isolated: this file lists the dependency metadata only, never the target project's artifacts.

## Outgoing Dependencies

No outgoing dependencies declared yet.

## Incoming Dependents

No projects declare a dependency on this project.

## Kinds

| Kind | Meaning |
| --- | --- |
| workflow_call | The project calls workflows of the target project (workflow_call nodes). |
| data | The project shares or consumes the target project's data model. |
| deploy | The project deploys to shared infrastructure with the target project. |
| other | Any other declared dependency. |
