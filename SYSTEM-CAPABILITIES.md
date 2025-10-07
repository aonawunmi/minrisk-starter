# MinRisk System Capabilities

**Last Updated:** October 7, 2025
**Version:** 2.4 (Phase 2D Complete)
**Production URL:** https://minrisk-starter.vercel.app

---

## 🔐 User Management & Authentication

### User Registration & Approval
- User registration with email/password via Supabase Auth
- Three-tier role system: **Admin**, **Edit**, **View Only**
- Admin approval workflow for new users
- Admin can approve/reject pending users with role assignment
- **Admin can change roles of approved users without deletion** ✨ NEW (Phase 2D)
- Soft delete users (archives their risks instead of hard delete)
- Multi-organization support (organization-level data isolation)

### User Roles Breakdown

#### 🔍 View Only
- View all risks in Risk Register
- View Heatmap
- View Control Register
- Filter and search data
- Export data to Excel

#### ✏️ Edit
- All View Only permissions
- Add new risks
- Edit existing risks
- Delete own risks (requires admin approval)
- Add and modify controls
- Use AI Assistant for risk suggestions
- Mark risks as priority

#### 👑 Admin
- All Edit permissions
- Access Configuration settings
- Approve/reject user accounts
- **Change user roles for approved users** ✨ NEW
- Delete any user's risks (with archiving)
- View and manage archived risks
- View complete audit trail
- Export audit trail to CSV
- Permanently delete archived data (with password validation)
- Bulk deletion operations
- Modify system configuration

---

## 📊 Risk Management

### Risk Creation & Editing
- Create risks with comprehensive fields:
  - Risk title and description
  - Division, department, category
  - Risk owner
  - **Relevant period** (e.g., Q1 2025, FY2025) ✨ NEW (Phase 2A)
  - Inherent likelihood and impact scores
  - Status: Open, In Progress, Closed
  - Priority flag
- Auto-generated risk codes (format: DIV-CAT-XXX)
- **Toast notifications on create/update** ✨ NEW (Phase 2C)
- Auto-dismiss success messages after 3 seconds

### Controls Management
- Add multiple controls per risk
- Control attributes:
  - Description
  - Target (Likelihood/Impact)
  - Design rating (1-5)
  - Implementation rating (1-5)
  - Monitoring rating (1-5)
  - Effectiveness evaluation (1-5)
- Automatic residual risk calculation
- Controls reduce inherent risk to residual risk

### Risk Views
- **Risk Register**: Sortable table with all risk details
- **Heatmap**: Visual 5×5 or 6×6 matrix showing risk distribution
- Color-coded risk zones:
  - Low = Green
  - Medium = Yellow
  - High = Orange
  - Critical = Red
- Toggle between Inherent and Residual risk views

---

## 🔍 Filtering & Search

### Risk Register Filters
- Filter by Division
- Filter by Department
- Filter by Category
- Filter by Owner
- Filter by Status
- **Filter by Time Period (multi-select)** ✨ NEW (Phase 2A)
- Filter by Priority risks only
- Combine multiple filters simultaneously

### Heatmap Filters
- **Independent period filtering (multi-select)** ✨ NEW (Phase 2A)
- Filter by status
- Toggle Inherent vs Residual view
- Period filtering works independently from Risk Register

---

## 📈 Risk Analysis

- Inherent risk scoring (before controls)
- Residual risk scoring (after controls)
- Automatic risk level calculation (Low/Medium/High/Critical)
- Control effectiveness visualization
- Risk distribution across matrix zones
- Risk comparison by time period

---

## 📥📤 Data Import/Export

### Import
- Bulk import risks from Excel/CSV
- Template download with correct format
- Data validation during import
- Error reporting for invalid data

### Export
- Export Risk Register to Excel
- Export filtered risks only
- **Export Audit Trail to CSV** ✨ NEW (Phase 2B)
- Includes all risk and control data
- CSV format with proper headers

---

## 🗄️ Archive Management

- Soft-delete risks to archive instead of permanent deletion
- View all archived risks
- Restore risks from archive
- **Admin can permanently delete from archive** (with password validation)
- Bulk archive operations
- Archive risks when config values are removed
- Archive reasons tracked for compliance

---

## ⚙️ Configuration

### Matrix Configuration
- Choose between 5×5 or 6×6 risk matrix
- Customize likelihood labels
- Customize impact labels
- Protected: Cannot change matrix size if risks use out-of-range values

### Organizational Configuration
- Define Divisions (e.g., Operations, IT, Finance)
- Define Departments (e.g., HR, Sales, Engineering)
- Define Risk Categories (e.g., Strategic, Operational, Financial)
- **Protected: Cannot delete config values currently in use**
- System warns admin before removing values

---

## 🔍 Audit Trail

### Automatic Tracking
- Logs ALL system operations automatically
- Tracks: Create, Update, Delete, Archive, Restore operations
- Logs user approvals/rejections
- Logs bulk deletions
- **Logs role changes with old and new roles** ✨ NEW (Phase 2D)
- Records timestamp, user, action, entity

### Audit Trail Features
- View complete audit history
- **Filter by Action type** ✨ NEW (Phase 2B)
- **Filter by Entity type** ✨ NEW (Phase 2B)
- **Filter by User** ✨ NEW (Phase 2B)
- **Filter by Risk code** ✨ NEW (Phase 2B)
- **Date range filtering (start and end date)** ✨ NEW (Phase 2B)
- **Search by risk code** ✨ NEW (Phase 2B)
- **Export audit trail to CSV** ✨ NEW (Phase 2B)
- Enhanced 8-filter UI in 2-row grid
- Load limit controls (50/100/500/All)

---

## ✅ User Experience

### Notifications
- **Toast notifications on risk create/update** ✨ NEW (Phase 2C)
- Auto-dismiss after 3 seconds
- Green success messages with checkmark
- Error messages for failed operations

### Help & Documentation
- Built-in Help tab with complete user guide
- Instructions for all features
- Role-based documentation
- Updated with all Phase 2 features
- Context-sensitive help sections

---

## 🎨 Interface Features

- Clean, modern UI with Tailwind CSS
- Responsive design (works on desktop/tablet)
- Sortable tables
- Multi-select dropdowns
- Color-coded risk levels
- Icon-based navigation
- Modal dialogs for risk editing
- Fixed-position toast notifications

---

## 🤖 AI Assistant (Experimental)

- AI-powered risk suggestion
- Generates risk title, description, likelihood, impact
- Uses Gemini AI
- Available to Edit and Admin users
- Context-aware suggestions based on project description

---

## 🔒 Security & Data Protection

- Row-Level Security (RLS) in Supabase
- Organization-level data isolation
- Role-based access control (RBAC)
- Admin-only operations protected
- Secure authentication via Supabase
- Password validation for critical operations
- Audit trail for compliance

---

## 📱 Deployment & Infrastructure

- **Frontend:** React + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL)
- **Hosting:** Vercel (automatic deployments)
- **Production URL:** https://minrisk-starter.vercel.app
- **Development environment:** Localhost support
- **Version control:** GitHub
- **CI/CD:** Automatic deployment on git push

---

## 📊 Summary Statistics

- **21 major features** deployed to production
- **3 user roles** with granular permissions
- **5×5 or 6×6** configurable risk matrix
- **8 filter options** in audit trail
- **4 main views:** Risk Register, Heatmap, Archive, Audit Trail
- **Complete audit logging** of all operations
- **Multi-select filtering** on periods and categories
- **Soft delete** with archive functionality

---

## 🚀 Feature History

### Phase 1 (Complete)
- Core risk management
- User authentication and roles
- Configuration protection
- Audit trail system
- Archive management

### Phase 2A (Complete)
- Time period tracking
- Period selector in risk forms
- Period column in Risk Register
- Multi-select period filters
- Independent period filtering in Heatmap

### Phase 2B (Complete)
- Audit trail CSV export
- Date range filtering
- User-specific filtering
- Risk code search
- Enhanced 8-filter UI

### Phase 2C (Complete)
- Toast notification system
- Success messages on create/update
- Auto-dismiss notifications
- Green success indicators

### Phase 2D (Complete) ✨ LATEST
- Admin can change user roles
- Role dropdown for approved users
- Role change audit logging
- No need to delete users to change roles

---

## 🔮 Planned Features (Phase 3)

### Optional Enhancements
1. **Transfer Risks to Another User**
   - When deleting a user, transfer their risks instead of archiving
   - Useful when user leaves organization
   - Prevents need to archive all their work

2. **Migration Tool for Remapping Risk Scores**
   - Bulk-remap risk scores when changing matrix size
   - Preview changes before applying
   - Log all changes in audit trail

---

## 📝 Version Notes

**Current Version:** 2.4
**Last Major Update:** October 7, 2025
**Status:** All Phase 2 features complete and in production
**Known Issues:** None

**Maintenance:**
- Regular security updates
- Database backups via Supabase
- Monitoring via Vercel analytics
- Audit trail for compliance tracking

---

**For technical documentation, see:**
- `README.md` - Setup instructions
- `TODO.md` - Implementation tracking
- `DATABASE_SETUP.md` - Database configuration
- `AUTH_SETUP.md` - Authentication setup
- In-app Help tab - User documentation
