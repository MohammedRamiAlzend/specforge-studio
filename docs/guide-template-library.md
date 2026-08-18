# Template Library User Guide — SpecForge Studio

## Quick Start

### Starting a New Project from Template

1. Click **"New Project"** in the dashboard
2. Select **"Start from Template"**
3. Browse the template gallery:
   - Filter by category (E-commerce, SaaS, Mobile, etc.)
   - Filter by complexity (Beginner, Intermediate, Advanced)
   - Search by keywords
4. Click on a template to preview:
   - Modules included
   - Data entities
   - Workflow diagrams
   - Task packs
   - Recommended skills
5. Click **"Use This Template"**
6. Optionally customize:
   - Payment provider selection
   - Authentication method
   - Deployment preferences
7. Your project is created with:
   - ✅ Pre-populated modules
   - ✅ Pre-defined entities with fields
   - ✅ Pre-built workflow diagrams
   - ✅ Pre-generated task packs
   - ✅ Recommended team skills
8. Start customizing immediately!

### Adding Components to Existing Project

1. Open your existing project
2. Navigate to **"Components Library"** (sidebar)
3. Search or browse for functionality:
   - Authentication (JWT, OAuth)
   - Payments (Stripe, PayPal)
   - Email (SendGrid, SES)
   - Search (Algolia, Elasticsearch)
   - Caching (Redis)
   - Deployment (Docker, Kubernetes)
4. Review component details:
   - What it adds (workflows, entities, APIs, tasks)
   - Dependencies required
   - Compatible project types
5. Click **"Add to Project"**
6. Review the integration plan
7. Confirm to integrate

### Exporting Your Project as Template

1. Complete your project design
2. Go to **Settings > Export as Template**
3. Wizard steps:
   - **Select Content**: Choose what to include
     - ☑ Modules
     - ☑ Entities
     - ☑ Workflows
     - ☑ Tasks
     - ☑ Skills
   - **Clean Data**: Remove project-specific information
     - Company names
     - Specific URLs
     - Credentials
   - **Add Documentation**: Write template description
   - **Categorize**: Select category and tags
4. System validates completeness
5. Save as personal template or share (future)

## Available Templates

### Phase 1 Templates (MVP)

#### 🛒 Basic E-commerce Store
- **Key**: `ecommerce-basic`
- **Complexity**: Intermediate
- **Time**: 6-8 weeks
- **Team**: 3-4 developers
- **Includes**:
  - Product catalog with categories
  - Shopping cart management
  - Multi-step checkout
  - Stripe payment integration
  - Order management
  - Inventory tracking

#### 💼 SaaS MVP
- **Key**: `saas-mvp`
- **Complexity**: Beginner
- **Time**: 4-6 weeks
- **Team**: 2-3 developers
- **Includes**:
  - Multi-tenant architecture
  - User authentication & authorization
  - Subscription billing
  - Dashboard & analytics
  - Role-based access control

#### 🔌 REST API Service
- **Key**: `rest-api`
- **Complexity**: Beginner
- **Time**: 2-3 weeks
- **Team**: 1-2 developers
- **Includes**:
  - CRUD operations
  - JWT authentication
  - API documentation
  - Rate limiting
  - Error handling

#### 📱 Mobile App (React Native)
- **Key**: `mobile-app`
- **Complexity**: Intermediate
- **Time**: 6-8 weeks
- **Team**: 2-3 developers
- **Includes**:
  - iOS & Android structure
  - Navigation setup
  - API integration
  - State management
  - Push notifications

#### 📝 Blog CMS
- **Key**: `blog-cms`
- **Complexity**: Beginner
- **Time**: 3-4 weeks
- **Team**: 1-2 developers
- **Includes**:
  - Content management
  - Rich text editor
  - Media library
  - SEO optimization
  - Comment system

### Phase 2 Templates (Advanced)

Coming soon:
- Microservices Platform
- AI Chatbot Application
- Multi-vendor Marketplace
- Social Network
- Digital Wallet (FinTech)

## Available Components

### Authentication
- **JWT Auth** (`auth-jwt`) - Token-based authentication
- **OAuth 2.0** (`auth-oauth`) - Social login (Google, Facebook, GitHub)
- **Session-based** (`auth-session`) - Traditional session management

### Payments
- **Stripe** (`payment-stripe`) - Credit card processing
- **PayPal** (`payment-paypal`) - PayPal integration
- **Crypto** (`payment-crypto`) - Cryptocurrency payments

### Communications
- **SendGrid Email** (`email-sendgrid`) - Transactional emails
- **Twilio SMS** (`sms-twilio`) - SMS notifications
- **Push Notifications** (`push-firebase`) - Mobile push

### Infrastructure
- **Redis Cache** (`cache-redis`) - Caching layer
- **Docker Deploy** (`deploy-docker`) - Container deployment
- **GitHub Actions CI** (`ci-github`) - Continuous integration

### Search & Analytics
- **Algolia Search** (`search-algolia`) - Full-text search
- **Elasticsearch** (`search-elasticsearch`) - Advanced search
- **Analytics** (`analytics-ga4`) - Google Analytics integration

## Best Practices

### When to Use Templates

✅ **Good use cases:**
- Starting a common project type
- Learning best practices
- Ensuring nothing is missed
- Standardizing across teams
- Rapid prototyping

❌ **When not to use:**
- Highly unique/innovative systems
- Projects with very specific requirements
- When you need full control from start

### Customization Tips

1. **Review before applying**: Always preview what the template includes
2. **Remove unused parts**: Delete modules/entities you don't need
3. **Adapt workflows**: Modify diagrams to match your processes
4. **Update tasks**: Customize task checklists for your team
5. **Adjust skills**: Match recommended skills to your team's capabilities

### Component Integration

1. **Check dependencies**: Some components require others
2. **Plan order**: Add foundational components first (auth, then payments, etc.)
3. **Test integration**: Verify components work together
4. **Document changes**: Note any customizations made

## Troubleshooting

### Template Not Applying Correctly

**Problem**: Some elements missing after applying template

**Solutions**:
1. Check browser console for errors
2. Verify project doesn't have conflicting entities
3. Try applying to a new test project first
4. Report issue with template name and project ID

### Component Conflicts

**Problem**: Component says it conflicts with existing elements

**Solutions**:
1. Review what already exists in your project
2. Remove or rename conflicting elements
3. Choose alternative component
4. Contact support if conflict seems incorrect

### Export Fails Validation

**Problem**: Can't export project as template

**Common causes**:
- Missing required documentation
- Incomplete workflows
- Orphaned entities (no relationships)
- Invalid entity configurations

**Solutions**:
1. Review validation errors shown
2. Complete all required sections
3. Ensure all workflows have start/end nodes
4. Connect all entities with relationships

## FAQ

**Q: Can I modify a template before applying it?**
A: Currently no, but you can apply then customize. Future versions will support template customization before application.

**Q: What happens if I apply a template to an existing project?**
A: You'll see a preview of what will be added/modified. You can choose to merge or skip conflicting elements.

**Q: Are templates updated automatically?**
A: No, templates are applied once at creation. You can manually add newer components though.

**Q: Can I share my custom templates with my team?**
A: Currently templates are personal. Team sharing is planned for a future release.

**Q: How do I request a new template?**
A: Submit a feature request via GitHub Issues with:
- Template name and description
- Typical use case
- Key modules/entities/workflows needed
- Estimated complexity

## Video Tutorials

Coming soon:
- [ ] Getting Started with Templates (5 min)
- [ ] Building an E-commerce Store (15 min)
- [ ] Creating a SaaS MVP (20 min)
- [ ] Adding Components to Existing Projects (10 min)
- [ ] Exporting Your First Template (8 min)

## Support

- **Documentation**: `/docs/features/template-library.md`
- **API Reference**: Backend routes documentation
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions for ideas and questions

---

*Last updated: 2026-08-18*
*Version: 1.0.0*
