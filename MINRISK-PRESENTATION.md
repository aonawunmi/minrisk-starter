---
marp: true
theme: default
paginate: true
backgroundColor: #fff
backgroundImage: url('https://marp.app/assets/hero-background.svg')
header: 'MinRisk - Enterprise Risk Management System'
footer: 'Version 2.4 | October 2025'
---

<!-- _class: lead -->

# MinRisk
## Enterprise Risk Management System

**Version 2.4 (Phase 2D)**
**Production Ready**

https://minrisk-starter.vercel.app

---

# Overview

## What is MinRisk?

A comprehensive, cloud-based risk management platform designed for modern enterprises.

**Key Features:**
- 🔐 Multi-user collaboration with role-based access
- 📊 Interactive risk register and heatmap
- 🛡️ Control effectiveness tracking
- 📈 Real-time risk analysis
- 🔍 Complete audit trail
- 🤖 AI-powered risk suggestions

---

# System Statistics

## Production Deployment

- ✅ **21 major features** deployed
- 🎯 **3 user roles** with granular permissions
- 📊 **5×5 or 6×6** configurable matrix
- 🔍 **8 filter options** in audit trail
- 📱 **4 main views** (Register, Heatmap, Archive, Audit)
- ✨ **100% audit logging** of all operations

---

# User Management

## Role-Based Access Control

### 🔍 View Only
- Read-only access to all data
- Filter and search capabilities
- Export to Excel

### ✏️ Edit
- All View Only permissions
- Create and edit risks
- Add controls
- Use AI Assistant

---

# User Management (Continued)

### 👑 Admin
- All Edit permissions
- User approval and management
- **Change user roles without deletion** ✨ NEW
- Configuration management
- Archive management
- Audit trail access
- Bulk operations

---

# Risk Management

## Comprehensive Risk Tracking

**Risk Attributes:**
- Risk code (auto-generated)
- Title and description
- Division, Department, Category
- Risk owner
- **Relevant period** (Q1 2025, FY2025, etc.) ✨
- Inherent likelihood and impact
- Status (Open, In Progress, Closed)
- Priority flag

---

# Risk Views

## Visual Risk Analysis

### Risk Register
- Sortable table with all details
- Multi-criteria filtering
- Export to Excel
- **Period-based filtering** ✨

### Heatmap
- 5×5 or 6×6 visual matrix
- Color-coded risk zones
- Inherent vs Residual view
- **Independent period filtering** ✨

---

# Control Management

## Risk Mitigation Framework

**Control Effectiveness Ratings (1-5):**
- Design quality
- Implementation effectiveness
- Monitoring rigor
- Overall effectiveness evaluation

**Features:**
- Multiple controls per risk
- Target Likelihood or Impact
- Automatic residual risk calculation

---

# Filtering & Search

## Powerful Data Discovery

### Risk Register Filters
- Division, Department, Category
- Owner and Status
- **Time Period (multi-select)** ✨ NEW
- Priority risks only
- Combine multiple filters

### Heatmap Filters
- Independent period filtering
- Status filtering
- Toggle Inherent/Residual views

---

# Data Import/Export

## Flexible Data Management

### Import
- Bulk import from Excel/CSV
- Template download
- Data validation
- Error reporting

### Export
- Risk Register to Excel
- Filtered risks export
- **Audit Trail to CSV** ✨ NEW
- Complete data preservation

---

# Archive Management

## Data Retention & Compliance

**Archive Features:**
- Soft-delete with archiving
- View archived risks
- Restore from archive
- Admin permanent deletion (with password)
- Bulk archive operations
- Automatic archiving when config changes

**Use Cases:**
- End of quarter cleanup
- User deletion preservation
- Configuration value removal

---

# Audit Trail

## Complete Compliance Tracking

**Automatic Logging:**
- All CRUD operations
- User approvals/rejections
- Role changes with old/new values ✨ NEW
- Archive operations
- Bulk deletions

**Every action is tracked with:**
- Timestamp
- User
- Action type
- Before/after values

---

# Audit Trail Features

## Advanced Analysis ✨ NEW (Phase 2B)

**8 Powerful Filters:**
- Action type
- Entity type
- User
- Risk code
- **Date range (start/end)** ✨
- Load limits (50/100/500/All)

**Export Capability:**
- **Export to CSV** ✨
- Complete audit history
- Compliance reporting

---

# User Experience

## Modern Interface

### Toast Notifications ✨ NEW (Phase 2C)
- Success messages on create/update
- Auto-dismiss after 3 seconds
- Green success indicators
- Real-time feedback

### Design Features
- Clean, modern UI (Tailwind CSS)
- Responsive design
- Sortable tables
- Multi-select dropdowns
- Color-coded risk levels
- Icon-based navigation

---

# Configuration

## System Customization

### Risk Matrix
- Choose 5×5 or 6×6 matrix
- Customize likelihood labels
- Customize impact labels
- Protected: Cannot change if risks use values

### Organization Setup
- Define Divisions
- Define Departments
- Define Risk Categories
- Protected: Cannot delete values in use

---

# AI Assistant

## Intelligent Risk Suggestions 🤖

**Capabilities:**
- AI-powered risk generation
- Context-aware suggestions
- Generate title, description, scores
- Uses Google Gemini AI

**Usage:**
- Describe your project/process
- Click "Generate Suggestions"
- Review AI-generated risks
- Edit and import to register

---

# Security & Compliance

## Enterprise-Grade Protection

**Security Features:**
- Supabase authentication
- Row-Level Security (RLS)
- Organization-level isolation
- Role-based access control
- Password validation for critical ops

**Compliance:**
- Complete audit trail
- Data archiving
- Configurable retention
- Export capabilities

---

# Technical Stack

## Modern Architecture

**Frontend:**
- React + TypeScript
- Vite build system
- Tailwind CSS

**Backend:**
- Supabase (PostgreSQL)
- Row-Level Security
- Real-time capabilities

**Deployment:**
- Vercel hosting
- Automatic CI/CD
- GitHub version control

---

# Feature Timeline

## Development Phases

### Phase 1 ✅ Complete
- Core risk management
- User authentication
- Configuration protection
- Audit trail foundation

### Phase 2A ✅ Complete
- **Time period tracking**
- Period selectors and filters
- Multi-select period filtering

---

# Feature Timeline (Continued)

### Phase 2B ✅ Complete
- **Audit trail CSV export**
- Date range filtering
- User-specific filtering
- 8-filter enhanced UI

### Phase 2C ✅ Complete
- **Toast notification system**
- Success/error messages
- Auto-dismiss notifications

### Phase 2D ✅ Complete (Latest)
- **Admin role change capability**
- No need to delete users
- Full audit logging

---

# Planned Features

## Phase 3 (Future)

### Transfer Risks Between Users
- When deleting users
- Transfer instead of archive
- Maintain ownership history

### Risk Score Migration Tool
- Bulk remap when changing matrix size
- Preview before applying
- Full audit logging

---

# Use Cases

## Who Benefits from MinRisk?

**Enterprise Risk Management:**
- Compliance officers
- Risk managers
- Internal audit teams

**Operational Risk:**
- Department managers
- Project managers
- Operations teams

**Strategic Risk:**
- Executive leadership
- Board of directors
- Strategy teams

---

# Benefits

## Why Choose MinRisk?

✅ **Comprehensive** - All risk management needs in one platform
✅ **User-Friendly** - Intuitive interface, minimal training
✅ **Flexible** - Configurable to your organization
✅ **Secure** - Enterprise-grade security and compliance
✅ **Modern** - Cloud-based, mobile-responsive
✅ **Auditable** - Complete history of all changes
✅ **Collaborative** - Multi-user with role-based access

---

# Implementation

## Getting Started

1. **Setup** (< 1 hour)
   - Configure organization structure
   - Set up divisions, departments, categories
   - Create user accounts

2. **Training** (2-4 hours)
   - Role-based training sessions
   - Hands-on practice
   - Reference documentation

3. **Go Live**
   - Import existing risks (optional)
   - Start tracking new risks
   - Monitor and report

---

# Support & Documentation

## Resources Available

**In-App Help:**
- Complete user guide
- Context-sensitive help
- Role-based documentation

**Technical Documentation:**
- System capabilities (SYSTEM-CAPABILITIES.md)
- Setup guides
- Database schema
- API documentation

**Support:**
- Built-in audit trail for troubleshooting
- Export capabilities for data analysis

---

# Success Metrics

## Measuring Impact

**Risk Coverage:**
- Number of risks identified
- Controls implemented
- Residual risk reduction

**Compliance:**
- Audit trail completeness
- User adoption rate
- Archive retention compliance

**Efficiency:**
- Time to create/update risks
- Report generation speed
- User satisfaction scores

---

# Pricing & Deployment

## Flexible Options

**Deployment:**
- ✅ Cloud-hosted (Vercel + Supabase)
- ✅ Automatic updates
- ✅ 99.9% uptime SLA

**Scalability:**
- Unlimited risks
- Unlimited users (role-based)
- Unlimited organizations
- Configurable retention periods

**Contact:**
- Demo available: https://minrisk-starter.vercel.app
- Documentation: GitHub repository

---

# Roadmap

## Future Enhancements

**Q1 2026:**
- Email notifications
- Advanced analytics dashboard
- Trend analysis across periods

**Q2 2026:**
- Risk appetite/tolerance settings
- Risk comparison reports
- Mobile app (iOS/Android)

**Q3 2026:**
- API integrations
- Third-party tool connectors
- Advanced reporting engine

---

<!-- _class: lead -->

# Thank You

## Questions?

**MinRisk - Enterprise Risk Management**
Version 2.4 | Production Ready

https://minrisk-starter.vercel.app

*Secure • Scalable • Simple*

---

# Appendix: Technical Details

## System Requirements

**Minimum Requirements:**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Screen resolution: 1280x720 or higher

**Recommended:**
- Desktop/laptop for admin functions
- Tablet support for viewing
- Latest browser versions

---

# Appendix: Security

## Data Protection

**Encryption:**
- HTTPS/TLS for all connections
- Database encryption at rest
- Secure password hashing

**Access Control:**
- Organization-level isolation
- Row-Level Security (RLS)
- Role-based permissions
- Session management

**Audit:**
- Complete activity logging
- Immutable audit trail
- Export for compliance

---

# Appendix: Compliance

## Regulatory Support

**Features Supporting Compliance:**
- Complete audit trail
- Data archiving
- Role-based access control
- Configurable retention periods
- Export capabilities for reporting

**Applicable Frameworks:**
- ISO 31000 (Risk Management)
- COSO ERM
- SOX compliance support
- GDPR data handling

---

# Appendix: Contact

## Get in Touch

**Production URL:**
https://minrisk-starter.vercel.app

**Documentation:**
- GitHub: aonawunmi/minrisk-starter
- Technical Docs: Repository README
- System Capabilities: SYSTEM-CAPABILITIES.md

**Version:** 2.4
**Last Updated:** October 7, 2025
**Status:** Production Ready
