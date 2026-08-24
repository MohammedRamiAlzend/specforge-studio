---
id: FEAT-015
title: Skills-to-Task Matching
type: guide
phase: opt-004-skill-matching
status: implemented
owner: engineering
related:
  - FEAT-010
  - FEAT-013
  - ONT-001
updated: 2026-08-24
---

# Skills-to-Task Matching — SpecForge Studio

## 1. Goal

Projects record required skills (`SKL`, Prompt 16) and generate task packs
(`TASK`, Prompts 11/20). OPT-004 closes the loop between the two: a
deterministic matcher ranks every project skill against every task in the same
project so that executing agents can pick up work that fits their specialty,
and planners can see which required skills currently have no open matched work.

The feature is **derived data only** — nothing is persisted, no schema changes,
and no engine module is touched.

## 2. Matching Algorithm

Pure keyword-overlap scoring between a skill's searchable vocabulary and a
task's text fields.

Skill vocabulary (deduplicated tokens):

* `name` (e.g. "React", "Backend architecture")
* tech `tag` for tech skills (e.g. "frontend", "payments")
* `description`

Task haystack fields with weights per term hit:

| Field                          | Weight per hit |
| ------------------------------ | -------------- |
| `title`                        | +3             |
| `objective`                    | +2             |
| `context` / `constraints` / DoD | +1            |
| task `type` equals a skill term | +3 flat       |

Tokenization lowercases and splits on non-alphanumeric characters, drops
tokens shorter than 3 characters and a small English stopword list.
A skill qualifies as a match when its score reaches the threshold (`3`).
Reasons are human-readable strings (e.g. `title mentions "react"`).

## 3. API

### GET /skill-matches?project=PRJ-0001

Returns `{ data: SkillMatchReport }`:

```jsonc
{
  "project_id": "PRJ-0001",
  "task_count": 12,
  "skill_count": 5,
  "matches": [
    {
      "task_id": "TASK-0007",
      "title": "Build checkout screen",
      "status": "open",
      "priority": "high",
      "type": "frontend",
      "skills": [
        {
          "skill_id": "SKL-0004",
          "name": "React",
          "kind": "tech",
          "tag": "frontend",
          "score": 9,
          "reasons": ["title mentions \"react\""]
        }
      ]
    }
  ],
  "unmatched_tasks": ["TASK-0031"],
  "coverage_gaps": [
    { "skill_id": "SKL-0009", "name": "Payments", "kind": "tech", "open_matches": 0, "total_matches": 0 }
  ]
}
```

Semantics:

* `matches` — tasks with at least one qualifying skill; skills sorted by score
  descending then skill id.
* `unmatched_tasks` — task ids whose best skill score is below threshold.
* `coverage_gaps` — every skill annotated with `open_matches` / `total_matches`
  counts, sorted with zero-open skills first. Done/cancelled tasks count toward
  totals but never toward open matches.
* Unknown projects return `404 NOT_FOUND`. The report is deterministic:
  identical inputs always produce an identical response.

## 4. UI

`TasksPage` renders a new `SkillMatchPanel` card above the board/table views:

* one row per matched task with ranked skill chips (score badge, reasons on
  hover, top four shown);
* an amber "Coverage gaps" strip listing skills with no open matched work;
* a counter for tasks that match no recorded skill;
* loading spinner, error retry, and empty states consistent with other cards.

## 5. Definition of Done

* [x] Deterministic scoring implemented as a pure exported function.
* [x] GET /skill-matches endpoint with validation and 404 handling.
* [x] SkillMatchPanel integrated on TasksPage (FSD widget slice).
* [x] Backend tests (5) covering ranking, gaps, done-task semantics,
      determinism, and unknown-project errors.
* [x] Frontend tests (4) covering helpers and static render shells.
* [x] Smoke checks extended (block 22).
* [x] No engine modules modified; zero new runtime dependencies.
