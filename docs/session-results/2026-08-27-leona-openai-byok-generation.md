# Leona OpenAI BYOK Generation — 2026-08-27

## Result

Implemented the first real Leona Agent generation path for user-owned OpenAI provider connections. The flow is project-scoped, draft-first, schema-validated, and does not write project changes automatically.

## Backend

The Leona module now decrypts the stored AES-256-GCM provider key only during the generation operation, verifies project membership through the canonical project-access helper, builds a sanitized context snapshot from the project, and calls the official OpenAI API host over HTTPS. The first adapter accepts OpenAI connections only and rejects non-OpenAI hosts to avoid arbitrary endpoint and SSRF behavior.

The generation request is `POST /leona/generate` with a project ID, optional connection ID, and optional user instruction. The backend persists a `leona_generation_runs` record with status, provider/model, token usage, structured draft, and safe error code. Raw keys, secrets, and decrypted credential values are not returned or logged.

The response schema contains a summary, assumptions, warnings, proposed requirements, workflows, entities, API endpoints, roadmap tasks, and Markdown files. Generated Markdown paths are restricted to safe relative `.md` paths, and the system prompt explicitly forbids shell commands, executable code, and silent project mutation.

## Frontend

The Leona overlay now receives the active project ID, detects the user’s active BYOK connection, accepts an optional instruction, enables the generation button only when a project and active connection exist, displays loading and error states, and shows a review-ready draft summary with artifact counts and warnings.

## Verification

Typecheck passed. The production frontend build passed. Focused Leona, dashboard, execution, and activity tests passed with 19 tests and 73 assertions. The production build reports the existing large JavaScript chunk advisory.

## Limitation

A real provider request was not executed in this session because no user API key was supplied. The secure connection and generation route are ready for a controlled BYOK test, but the project materialization/approval endpoint, managed-provider routing, and quota accounting remain separate next steps.

## Test procedure

Configure `LEONA_CREDENTIAL_KEY` in the backend environment, save an OpenAI key through `Dashboard → Settings → Providers`, open a project with BMC/Presentation/Markdown context, open the Leona Agent overlay, enter an optional instruction, and select `Generate project draft`. Review the returned draft; it will not modify the project automatically.
