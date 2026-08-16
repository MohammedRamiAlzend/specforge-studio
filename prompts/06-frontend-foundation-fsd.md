# Prompt 06 — Frontend Foundation with FSD

Read all memory files before doing anything.

This is Prompt 06: Frontend Foundation with Feature-Sliced Design.

## Objective

Create the frontend foundation using React, TypeScript, Vite, and Feature-Sliced Design.

## Technology Constraints

- React
- TypeScript strict mode
- Vite
- Feature-Sliced Design
- Zustand for local state
- TanStack Query for server state
- Tailwind CSS or CSS Modules, choose one and record the decision

## Required FSD Layers

Create the following structure:

- frontend/src/app
- frontend/src/pages
- frontend/src/widgets
- frontend/src/features
- frontend/src/entities
- frontend/src/shared

## FSD Rules

- shared must contain reusable UI, API client, lib, and config
- shared must not contain business logic
- entities must contain domain models and basic entity UI
- features must contain user interactions and use cases
- widgets must compose features and entities into reusable blocks
- pages must compose widgets and features
- app must contain providers, router, global styles, and bootstrap

## Deliverables

Create or update:

- frontend/package.json
- frontend/tsconfig.json
- frontend/vite.config.ts
- frontend/src/app/
- frontend/src/pages/
- frontend/src/widgets/
- frontend/src/features/
- frontend/src/entities/
- frontend/src/shared/
- frontend/README.md

## Required Initial Pages

Create these pages:

- Dashboard
- Project Details
- Workflows
- Data Model
- Architecture
- Docs Export
- Tasks
- Settings

## Required Core Capabilities

Implement:
- routing
- layout shell
- API client
- basic server-state fetching
- empty states
- loading states
- error states
- simple dashboard showing project summary

## Memory Update

After finishing:
- update memory files
- set next prompt to Prompt 07

## Definition of Done

Prompt 06 is complete only when:
- FSD structure is correctly implemented
- app runs locally
- routing works
- API client is ready
- memory is updated
- next action points to Prompt 07