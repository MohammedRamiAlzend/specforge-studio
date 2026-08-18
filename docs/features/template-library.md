---
id: FEAT-021
title: Template Library System
type: feature-spec
phase: 21-template-library
status: proposed
owner: engineering
related:
  - FEAT-003 (Document Generation)
  - FEAT-001 (Visual Modeler)
  - WS-001 (Folder Structure)
  - WS-003 (Frontmatter Spec)
updated: 2026-08-18
---

# Template Library System — SpecForge Studio

## 1. Vision

Transform SpecForge Studio from a documentation generator into a **universal engineering template marketplace** where users can:
- Start projects from industry-standard templates (e-commerce, SaaS, mobile apps, APIs, etc.)
- Share and reuse their own project templates
- Access AI-optimized task packs for common scenarios
- Customize templates to match their organization's standards

## 2. Problem Statement

Currently:
- Users must build every project from scratch
- No standardization across similar project types
- Repetitive setup work for common patterns
- No way to leverage community knowledge
- Templates exist only as static markdown files in `/docs/workspace/templates/`

## 3. Solution Overview

A comprehensive Template Library system with three layers:

### Layer 1: Built-in Project Templates
Pre-configured templates for common project types:
- **E-commerce Platform** (already partially seeded)
- **SaaS Application**
- **Mobile App (iOS/Android)**
- **REST API Service**
- **Microservices Architecture**
- **Data Pipeline / ETL**
- **AI/ML Application**
- **Blockchain/DApp**
- **Enterprise Portal**
- **Content Management System**

### Layer 2: Template Components
Reusable building blocks that can be mixed-and-matched:
- Authentication flows (OAuth, JWT, Session-based)
- Payment processing (Stripe, PayPal, Crypto)
- Notification systems (Email, SMS, Push)
- Search implementations (Elasticsearch, Algolia)
- Caching strategies (Redis, CDN)
- Deployment patterns (Docker, Kubernetes, Serverless)

### Layer 3: Community Marketplace
Future phase allowing users to:
- Publish their templates
- Rate and review templates
- Fork and customize templates
- Earn recognition for popular templates

## 4. Technical Architecture

### 4.1 Database Schema Additions

```sql
-- Template categories (e.g., "E-commerce", "SaaS", "Mobile")
CREATE TABLE template_categories (
  id         TEXT PRIMARY KEY,              -- TCAT-0001
  key        TEXT NOT NULL UNIQUE,          -- ecommerce, saas, mobile
  label      TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon       TEXT,                          -- emoji or icon name
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Project templates (complete project blueprints)
CREATE TABLE project_templates (
  id              TEXT PRIMARY KEY,         -- TMPL-0001
  category_id     TEXT REFERENCES template_categories(id),
  key             TEXT NOT NULL UNIQUE,     -- ecommerce-basic, saas-mvp
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  readme_content  TEXT,                     -- Markdown description
  thumbnail       TEXT,                     -- URL or base64
  version         TEXT NOT NULL DEFAULT '1.0.0',
  
  -- Configuration
  default_modules JSON,                     -- Pre-defined modules
  default_entities JSON,                    -- Pre-defined entities
  default_workflows JSON,                   -- Pre-defined workflows
  default_tasks   JSON,                     -- Pre-defined task packs
  default_skills  JSON,                     -- Recommended team skills
  
  -- Metadata
  complexity      TEXT CHECK (complexity IN ('beginner','intermediate','advanced')),
  estimated_time  TEXT,                     -- e.g., "4-6 weeks"
  team_size       TEXT,                     -- e.g., "3-5 developers"
  tech_stack      JSON,                     -- Recommended technologies
  
  -- Stats
  usage_count     INTEGER NOT NULL DEFAULT 0,
  rating_avg      REAL DEFAULT 0,
  rating_count    INTEGER DEFAULT 0,
  
  -- Control
  is_builtin      INTEGER NOT NULL DEFAULT 0,
  is_featured     INTEGER NOT NULL DEFAULT 0,
  enabled         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Template components (reusable building blocks)
CREATE TABLE template_components (
  id              TEXT PRIMARY KEY,         -- TCMP-0001
  key             TEXT NOT NULL UNIQUE,     -- auth-oauth, payment-stripe
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  component_type  TEXT CHECK (component_type IN ('workflow','entity','api','task','skill')),
  
  -- Content
  workflow_graph  JSON,                     -- For workflow components
  entity_def      JSON,                     -- For entity components
  api_def         JSON,                     -- For API components
  task_def        JSON,                     -- For task components
  
  -- Dependencies
  requires        JSON,                     -- Other component keys required
  compatible_with JSON,                     -- Template categories
  
  -- Metadata
  tags            JSON,
  usage_count     INTEGER NOT NULL DEFAULT 0,
  enabled         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- User's saved template configurations
CREATE TABLE user_templates (
  id              TEXT PRIMARY KEY,         -- UTMPL-0001
  user_id         TEXT,                     -- Future: for multi-user
  project_id      TEXT REFERENCES projects(id),
  template_id     TEXT REFERENCES project_templates(id),
  name            TEXT NOT NULL,
  configuration   JSON NOT NULL,            -- Customizations applied
  created_from    TEXT,                     -- 'builtin' | 'community' | 'custom'
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_user_templates_project ON user_templates(project_id);
```

### 4.2 Backend API Routes

```typescript
// Template Library Routes
GET    /api/templates/categories           // List template categories
GET    /api/templates/projects             // List project templates (with filters)
GET    /api/templates/projects/:key        // Get template details
POST   /api/templates/projects/:key/apply  // Apply template to project
GET    /api/templates/components           // List components
GET    /api/templates/components/:key      // Get component details
POST   /api/templates/components/:key/add  // Add component to project
POST   /api/templates/export               // Export current project as template
GET    /api/templates/user                 // List user's saved templates
DELETE /api/templates/user/:id             // Delete user template
```

### 4.3 Frontend Components (FSD)

```
frontend/src/
├── entities/
│   └── template/                  # Template types & hooks
│       ├── types.ts
│       ├── useTemplateList.ts
│       ├── useTemplateDetail.ts
│       └── useApplyTemplate.ts
├── features/
│   └── template-library/
│       ├── TemplateGallery.tsx    # Grid view of templates
│       ├── TemplateCard.tsx       # Individual template card
│       ├── TemplateDetail.tsx     # Full template preview
│       ├── TemplatePreview.tsx    # Interactive preview
│       ├── ApplyTemplateModal.tsx # Apply to project dialog
│       ├── ComponentPicker.tsx    # Add components picker
│       └── ExportTemplateWizard.tsx # Export project as template
├── pages/
│   └── TemplatesPage.tsx          # Main template library page
└── widgets/
    └── TemplateRecommendations.tsx # Smart suggestions
```

## 5. Template Data Structure

Each project template contains:

```json
{
  "id": "TMPL-0001",
  "key": "ecommerce-basic",
  "name": "Basic E-commerce Store",
  "description": "Complete online store with products, cart, checkout, and payments",
  "category": "ecommerce",
  "version": "1.0.0",
  
  "modules": [
    {
      "name": "Product Catalog",
      "description": "Product management with categories and inventory"
    },
    {
      "name": "Shopping Cart",
      "description": "Cart management with persistence"
    },
    {
      "name": "Checkout",
      "description": "Multi-step checkout process"
    },
    {
      "name": "Payment Integration",
      "description": "Stripe payment processing"
    }
  ],
  
  "entities": [
    {
      "name": "Product",
      "fields": [
        {"name": "id", "type": "uuid", "primaryKey": true},
        {"name": "name", "type": "string"},
        {"name": "price", "type": "decimal"},
        {"name": "inventory", "type": "integer"}
      ]
    },
    {
      "name": "Order",
      "fields": [...]
    }
  ],
  
  "workflows": [
    {
      "name": "Purchase Flow",
      "kind": "workflow",
      "nodes": [...],
      "edges": [...]
    }
  ],
  
  "tasks": [
    {
      "title": "Set up product database schema",
      "type": "backend",
      "priority": "high",
      "checklist": [...]
    }
  ],
  
  "skills": [
    {"name": "Node.js Backend", "level": "intermediate"},
    {"name": "React Frontend", "level": "intermediate"},
    {"name": "PostgreSQL", "level": "beginner"}
  ],
  
  "metadata": {
    "complexity": "intermediate",
    "estimatedTime": "6-8 weeks",
    "teamSize": "3-4 developers",
    "techStack": ["Node.js", "React", "PostgreSQL", "Stripe"]
  }
}
```

## 6. User Journey

### 6.1 Starting a New Project from Template

1. User clicks "New Project" → "Start from Template"
2. Browse template gallery (filter by category, complexity, tech stack)
3. Preview template details (modules, entities, workflows, tasks)
4. Click "Use This Template"
5. Customize template options (optional):
   - Select payment provider (Stripe/PayPal/Crypto)
   - Choose authentication method
   - Select deployment target
6. System creates project with:
   - Pre-populated modules
   - Pre-defined entities with fields
   - Pre-built workflow diagrams
   - Pre-generated task packs
   - Recommended team skills
7. User starts customizing immediately

### 6.2 Adding Components to Existing Project

1. User opens existing project
2. Goes to "Components Library"
3. Searches for needed functionality (e.g., "authentication")
4. Reviews component details and dependencies
5. Clicks "Add to Project"
6. System integrates component:
   - Adds workflow nodes
   - Creates entities
   - Generates API endpoints
   - Adds related tasks
7. User reviews and adjusts integrations

### 6.3 Exporting Project as Template

1. User completes a project
2. Clicks "Export as Template"
3. Wizard guides through:
   - Selecting what to include (modules, entities, workflows, tasks)
   - Removing sensitive/project-specific data
   - Adding documentation
   - Choosing category and tags
4. System validates template completeness
5. Template saved for personal reuse (or shared with community in future)

## 7. Initial Template Catalog

### Phase 1: Built-in Templates (MVP)

| ID | Key | Name | Category | Complexity | Description |
|----|-----|------|----------|------------|-------------|
| TMPL-0001 | ecommerce-basic | Basic E-commerce | E-commerce | Intermediate | Online store with cart & payments |
| TMPL-0002 | saas-mvp | SaaS MVP | SaaS | Beginner | Multi-tenant SaaS starter |
| TMPL-0003 | rest-api | REST API Service | API | Beginner | CRUD API with auth |
| TMPL-0004 | mobile-app | Mobile App | Mobile | Intermediate | React Native app structure |
| TMPL-0005 | blog-cms | Blog CMS | Content | Beginner | Content management system |

### Phase 2: Advanced Templates

| ID | Key | Name | Category | Complexity |
|----|-----|------|----------|------------|
| TMPL-0006 | microservices | Microservices Platform | Enterprise | Advanced |
| TMPL-0007 | ai-chatbot | AI Chatbot Application | AI/ML | Intermediate |
| TMPL-0008 | marketplace | Multi-vendor Marketplace | E-commerce | Advanced |
| TMPL-0009 | social-network | Social Network | Social | Advanced |
| TMPL-0010 | fintech-wallet | Digital Wallet | FinTech | Advanced |

### Phase 3: Template Components

| ID | Key | Name | Type | Compatible With |
|----|-----|------|------|-----------------|
| TCMP-0001 | auth-jwt | JWT Authentication | workflow | All |
| TCMP-0002 | auth-oauth | OAuth 2.0 Login | workflow | Web, Mobile |
| TCMP-0003 | payment-stripe | Stripe Payments | workflow | E-commerce, SaaS |
| TCMP-0004 | email-sendgrid | SendGrid Email | api | All |
| TCMP-0005 | search-algolia | Algolia Search | integration | E-commerce, Content |
| TCMP-0006 | cache-redis | Redis Caching | infrastructure | All |
| TCMP-0007 | deploy-docker | Docker Deployment | infrastructure | All |
| TCMP-0008 | ci-github | GitHub Actions CI | workflow | All |

## 8. Integration Points

### 8.1 Visual Modeler Integration
- Templates pre-populate the modeler canvas
- Components add nodes to existing graphs
- Template workflows appear in diagram previews

### 8.2 Document Generator Integration
- Templates provide initial content for generated docs
- Component documentation auto-included
- Template-specific sections in README

### 8.3 Task System Integration
- Templates generate initial task packs
- Component tasks added to existing backlogs
- Checklist items pre-populated

### 8.4 Skills System Integration
- Templates recommend team skills
- Component skill requirements added
- Gap analysis vs current team

## 9. Benefits

### For Users
- **Save Time**: Start with 80% complete instead of 0%
- **Best Practices**: Learn from industry-standard patterns
- **Consistency**: Standardize across projects
- **Learning**: Understand complete system architectures
- **Confidence**: Know nothing important is missed

### For SpecForge Studio
- **Differentiation**: Unique value proposition
- **Stickiness**: Users return for new templates
- **Community**: Future marketplace creates network effects
- **Monetization**: Premium templates (future)
- **Standards**: Become the de facto template format

## 10. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Database schema migrations
- [ ] Basic CRUD APIs for templates
- [ ] Seed 5 built-in project templates
- [ ] Simple template gallery UI

### Phase 2: Apply & Integrate (Weeks 3-4)
- [ ] Template application logic
- [ ] Integration with Visual Modeler
- [ ] Integration with Document Generator
- [ ] Integration with Task System
- [ ] Template preview functionality

### Phase 3: Components System (Weeks 5-6)
- [ ] Component database & APIs
- [ ] Component picker UI
- [ ] Dependency resolution
- [ ] 10+ reusable components
- [ ] Component-to-project integration

### Phase 4: Polish & Export (Weeks 7-8)
- [ ] Export project as template
- [ ] Template validation
- [ ] User template management
- [ ] Search & filtering
- [ ] Template recommendations

### Phase 5: Community (Future)
- [ ] Template sharing
- [ ] Rating & reviews
- [ ] Template marketplace
- [ ] Creator profiles
- [ ] Monetization hooks

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Template adoption rate | >60% new projects | Analytics |
| Time to first diagram | <5 minutes | User testing |
| Template satisfaction | >4.5/5 stars | Surveys |
| Projects from templates | >70% total | Database query |
| Component reuse | >3 components/project | Analytics |

## 12. Open Questions

1. Should templates be versioned? How to handle updates?
2. How to handle template conflicts when applying to existing projects?
3. Should there be template validation rules?
4. How to support template localization (different languages)?
5. What licensing for community templates?
6. How to prevent template sprawl (too many similar templates)?

## 13. Definition of Done

- [ ] Database schema implemented
- [ ] 5+ built-in project templates seeded
- [ ] 10+ reusable components available
- [ ] Template gallery UI functional
- [ ] Template application works end-to-end
- [ ] Integration with Visual Modeler complete
- [ ] Integration with Document Generator complete
- [ ] Export to template feature working
- [ ] Documentation updated
- [ ] Memory files updated
- [ ] Next prompt identified

## 14. Related Documents

- `docs/features/document-generation.md` - Document generation system
- `docs/features/visual-modeler.md` - Visual modeling canvas
- `docs/workspace/templates/README.md` - Current template files
- `docs/workspace/folder-structure.md` - Workspace structure
- `prompts/09-document-generation.md` - Original document gen spec

---

*This feature transforms SpecForge Studio from a tool into a platform, creating network effects and establishing it as the industry standard for engineering planning.*
