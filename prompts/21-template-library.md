# Prompt 21 — Template Library Implementation

Read all memory files before doing anything.

This is Prompt 21: Template Library System.

## Objective

Transform SpecForge Studio from a documentation generator into a **universal engineering template marketplace** where users can:
- Start projects from industry-standard templates (e-commerce, SaaS, mobile apps, APIs, etc.)
- Share and reuse their own project templates
- Access AI-optimized task packs for common scenarios
- Customize templates to match their organization's standards

Currently, users must build every project from scratch with no standardization across similar project types. This prompt adds a comprehensive Template Library system with three layers:

1. **Built-in Project Templates** — Pre-configured templates for common project types (E-commerce, SaaS, Mobile Apps, REST APIs, CMS, etc.)
2. **Template Components** — Reusable building blocks (authentication, payments, email, search, caching, deployment)
3. **User Template Export** — Ability to export completed projects as reusable templates

## Context

- The existing system covers specification → diagrams → docs → roadmap → task packs → governance → execution delivery
- Templates currently exist only as static markdown files in `/docs/workspace/templates/`
- The skills module (`backend/src/modules/skills.ts`) is the canonical CRUD template to mirror
- Document generation (`backend/src/modules/docs-generator/workspace.ts`) uses `WORKSPACE_FILES` array with stable ordering
- Branch rule: this work is implemented on a dedicated branch and delivered as a pull request. The user has explicitly forbidden merging to main/master. Memory/STATE updates still happen normally.

## Constraints (must hold)

- Backend stays Node.js + SQLite; schema changes are **additive only** (new tables) via a new migration `011_template_library.sql`. No destructive changes.
- No external SaaS integrations. English-only output. Database stays the source of truth; Markdown is generated.
- Templates must not break existing project creation flows — they are an alternative path.
- When applying templates to existing projects, conflicts must be shown preview-style before application.
- Tests must follow the existing bun:test patterns (in-memory app via backend/tests/helpers.ts; frontend react-dom/server static rendering).
- Do not break the existing Acme / e-commerce seeds or the docs/example regeneration.

## Deliverables

Create or update:

- prompts/21-template-library.md (this file)
- prompts/README.md (prompt sequence 21 + note)
- backend/db/schema.sql — additive `template_categories`, `project_templates`, `template_components`, `user_templates` tables (canonical schema)
- backend/db/migrations/011_template_library.sql — the same additions
- backend/src/modules/templates.ts — template CRUD APIs (TMPL prefix for templates, TCAT for categories, TCMP for components, UTMPL for user templates)
- backend/src/modules/docs-generator/workspace.ts — extend to support template-based project initialization
- backend/src/app.ts — register templates module
- frontend entities: template (types, hooks for list/detail/apply/export)
- frontend features: template-library (TemplateGallery, TemplateCard, TemplateDetail, TemplatePreview, ApplyTemplateModal, ComponentPicker, ExportTemplateWizard)
- frontend pages: TemplatesPage (main library page)
- frontend widgets: TemplateRecommendations (smart suggestions on dashboard)
- backend tests: templates CRUD, apply template, component integration, export validation
- frontend tests: static render for template gallery, detail, apply modal
- docs: FEAT-021 feature doc (already exists) + guide-template-library.md (already exists) + id-convention prefixes (TMPL/TCAT/TCMP/UTMPL)
- seed data: 5 built-in project templates + 10 reusable components
- memory files (STATE, PROJECT_MEMORY, NEXT_ACTION, SESSION_LOG, DECISIONS, USER_REQUESTS)

## Requirements

1. **Database Schema**:
   - `template_categories` (TCAT-0001): id, key, label, description, icon, sort_order, enabled
   - `project_templates` (TMPL-0001): id, category_id (FK), key, name, description, readme_content, thumbnail, version, default_modules (JSON), default_entities (JSON), default_workflows (JSON), default_tasks (JSON), default_skills (JSON), complexity (beginner/intermediate/advanced), estimated_time, team_size, tech_stack (JSON), usage_count, rating_avg, rating_count, is_builtin, is_featured, enabled
   - `template_components` (TCMP-0001): id, key, name, description, component_type (workflow/entity/api/task/skill), workflow_graph (JSON), entity_def (JSON), api_def (JSON), task_def (JSON), requires (JSON), compatible_with (JSON), tags (JSON), usage_count, enabled
   - `user_templates` (UTMPL-0001): id, user_id, project_id (FK), template_id (FK), name, configuration (JSON), created_from (builtin/community/custom)
   - Indexes on project_id, category_id, key fields

2. **Backend API Routes**:
   - `GET /api/templates/categories` — List template categories
   - `GET /api/templates/projects` — List project templates (with filters: category, complexity, search)
   - `GET /api/templates/projects/:key` — Get template details with full content
   - `POST /api/templates/projects/:key/apply` — Apply template to project ({ project_id, customizations })
   - `GET /api/templates/components` — List components (with filters: type, tags)
   - `GET /api/templates/components/:key` — Get component details
   - `POST /api/templates/components/:key/add` — Add component to project ({ project_id })
   - `POST /api/templates/export` — Export current project as template ({ project_id, name, description, category, includeModules, includeEntities, includeWorkflows, includeTasks, includeSkills })
   - `GET /api/templates/user` — List user's saved templates
   - `DELETE /api/templates/user/:id` — Delete user template

3. **Template Application Logic**:
   - Validate target project exists
   - Check for conflicts (duplicate entity names, workflow IDs, etc.)
   - Return preview of what will be added/modified/skipped
   - On confirm: create modules, entities, workflows, tasks, skills from template JSON
   - Log all actions to event_log
   - Update template usage_count on successful application

4. **Component Integration**:
   - Components can be added to existing projects
   - Resolve dependencies (e.g., payment-stripe requires auth-jwt)
   - Merge workflows into existing graphs (avoid ID collisions)
   - Add entities only if not already present
   - Generate related tasks
   - Return integration report

5. **Export as Template**:
   - Wizard-style: select content → clean data → add documentation → categorize
   - Remove project-specific data (company names, URLs, credentials)
   - Validate completeness (all workflows have start/end, all entities connected)
   - Save as user template (UTMPL prefix)
   - Optionally mark as shareable (future phase)

6. **Frontend UI**:
   - **TemplatesPage**: Main gallery with filters (category dropdown, complexity chips, search box)
   - **TemplateCard**: Card showing template name, description, complexity badge, module count, "Use Template" button
   - **TemplateDetail**: Full-screen preview with tabs (Overview, Modules, Entities, Workflows, Tasks, Skills)
   - **ApplyTemplateModal**: Dialog showing conflict preview + customization options + confirm button
   - **ComponentPicker**: Searchable picker modal for adding components to project
   - **ExportTemplateWizard**: Multi-step wizard (select content → clean data → document → save)
   - **TemplateRecommendations**: Widget on dashboard showing suggested templates based on project type

7. **Seed Data**:
   - 5 project templates:
     - TMPL-0001: ecommerce-basic (Basic E-commerce Store)
     - TMPL-0002: saas-mvp (SaaS MVP)
     - TMPL-0003: rest-api (REST API Service)
     - TMPL-0004: mobile-app (Mobile App with React Native)
     - TMPL-0005: blog-cms (Blog CMS)
   - 10 template components:
     - TCMP-0001: auth-jwt (JWT Authentication)
     - TCMP-0002: auth-oauth (OAuth 2.0 Login)
     - TCMP-0003: payment-stripe (Stripe Payments)
     - TCMP-0004: payment-paypal (PayPal Integration)
     - TCMP-0005: email-sendgrid (SendGrid Email)
     - TCMP-0006: sms-twilio (Twilio SMS)
     - TCMP-0007: search-algolia (Algolia Search)
     - TCMP-0008: cache-redis (Redis Caching)
     - TCMP-0009: deploy-docker (Docker Deployment)
     - TCMP-0010: ci-github (GitHub Actions CI)
   - 5 categories:
     - TCAT-0001: E-commerce
     - TCAT-0002: SaaS
     - TCAT-0003: API
     - TCAT-0004: Mobile
     - TCAT-0005: Content

8. **Tests**:
   - Backend: templates.test.ts — CRUD operations, apply template, component addition, export validation, conflict detection
   - Frontend: static render tests for TemplatesPage, TemplateDetail, ApplyTemplateModal
   - Integration: verify seeded templates can be applied to new projects
   - Full suite + typecheck + builds must pass

9. **Documentation Updates**:
   - Update `docs/ontology/id-convention.md` with TMPL/TCAT/TCMP/UTMPL prefixes
   - Link to existing `docs/features/template-library.md` (FEAT-021)
   - Link to existing `docs/guide-template-library.md`

## ID Strategy

- New prefixes:
  - TCAT (template categories)
  - TMPL (project templates)
  - TCMP (template components)
  - UTMPL (user templates)
- Added to `docs/ontology/id-convention.md`

## Definition of Done

Prompt 21 is complete only when:

- Template library works end-to-end: browse templates, view details, apply to projects, add components, export projects as templates
- All 5 project templates and 10 components are seeded and functional
- Frontend gallery, detail view, apply modal, and export wizard are fully functional
- Backend test suite passes (new template tests included)
- Frontend static-render tests pass for new pages/widgets
- Root typecheck clean, frontend + backend builds succeed
- Example regeneration still works (templates don't interfere with existing seeds)
- Memory updated; work delivered on a dedicated branch via pull request (NOT merged to main)
