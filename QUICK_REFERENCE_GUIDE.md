# MinRisk System - Quick Reference Guide

## System Overview
- **Version:** 4.0 (Phase 3 Complete)
- **Status:** Production-Ready
- **URL:** https://minrisk-starter.vercel.app
- **Type:** Enterprise Risk Management (ERM) Platform
- **Deployment:** Vercel (Serverless)
- **Database:** Supabase (PostgreSQL)

---

## 6 Main Risk Management Features

### 1. Risk Register (CRUD)
- Auto-generated risk codes (DIV-CAT-XXX)
- Inherent & Residual risk scoring
- Multi-select filtering (Division, Department, Category, Period, Status)
- Search across all fields
- Soft-delete with archive

### 2. Control Management (DIME Framework)
- Design, Implementation, Monitoring, Evaluation ratings
- Multi-control per risk
- Automatic residual risk calculation
- Control effectiveness tracking
- Enhancement plan persistence

### 3. Heatmap Visualization
- 5×5 or 6×6 configurable matrix
- Inherent vs Residual views
- Color-coded risk zones
- Interactive drill-down
- Period-based filtering

### 4. Incidents Module
- Auto-generated incident codes
- Loss Event, Near Miss, Control Failure, Breach types
- Financial impact tracking
- AI-powered risk linking (with confidence scores)
- AI control adequacy assessment
- Enhancement plans for improvements

### 5. VaR Analysis (Quantitative)
- Variance-Covariance method
- Excel template download
- Portfolio volatility → Likelihood score
- Portfolio value → Impact score
- Diversification benefit calculation
- Asset contribution analysis

### 6. Intelligence System (News Scanning)
- 9+ RSS feeds (Nigeria + Global)
- AI analysis of events for risk relevance
- Risk intelligence alerts
- Alert management workflow
- External event tracking

---

## 3 User Roles

| Role | Permissions |
|------|------------|
| **View Only** | Read all risks, export data, filter/search |
| **Edit** | Create/edit risks, add controls, create incidents, use AI |
| **Admin** | Manage users, configure system, delete/archive, view audit trail |

---

## Core Modules & File Locations

### Risk Management
- Risk Register: `src/components/RiskReportTab.tsx`
- Controls: Built into risk modal
- Heatmap: D3.js visualization in App.tsx

### Incidents
- Log: `src/components/incidents/IncidentLogTab.tsx`
- Form: `src/components/incidents/IncidentForm.tsx`
- Details: `src/components/incidents/IncidentDetailDialog.tsx`
- Enhancement Plans: `src/components/incidents/EnhancementPlanHistory.tsx`

### AI Features
- Risk Generator: `src/components/AIRiskGenerator.tsx`
- Chat Assistant: `src/components/AIChatAssistant.tsx`
- Control Suggester: `src/components/AIControlSuggester.tsx`

### VaR Analysis
- Sandbox: `src/components/VarSandboxTab.tsx`
- Upload: `src/components/VarFileUpload.tsx`
- Results: `src/components/VarResultsDisplay.tsx`
- Configuration: `src/components/VarScaleConfig.tsx`
- Calculations: `src/lib/varCalculations.ts`

### Intelligence
- Dashboard: `src/components/intelligence/IntelligenceDashboard.tsx`
- Alerts: `src/components/intelligence/AlertReviewDialog.tsx`
- News Scanner: `src/services/newsScanner.ts`

### Admin & Governance
- User Management: `src/components/AdminDashboard.tsx`
- Audit Trail: `src/components/AuditTrail.tsx`
- Archive: `src/components/ArchiveManagement.tsx`
- Bulk Operations: `src/components/BulkDeletionDialog.tsx`

### Analytics
- Dashboard: `src/components/AnalyticsDashboard.tsx` (1007 lines)
- Executive KPIs, visualizations, drill-down

---

## Database Tables (Supabase)

### Core Risk Management
- `risks` - Risk register entries
- `controls` - Control details
- `app_configs` - Configuration per organization
- `user_profiles` - User metadata + organization_id
- `audit_log` - Complete operation history
- `risk_history` - Historical snapshots

### Incidents & Enhancements
- `incidents` - Incident log
- `control_enhancement_plans` - Saved assessments

### Intelligence
- `external_events` - News/events from RSS
- `risk_intelligence_alerts` - Event-to-risk alerts
- `news_sources` - Custom sources
- `risk_keywords` - Custom keywords

### VaR
- `var_scale_configs` - Volatility/value thresholds

---

## Key Capabilities for ISO 31000

| ISO 31000 Element | MinRisk Implementation |
|---|---|
| **Governance** | 3-tier RBAC, audit trail, approval workflows |
| **Risk Identification** | Manual entry, AI generation, events, incidents |
| **Risk Analysis** | Qualitative (likelihood/impact), Quantitative (VaR) |
| **Risk Treatment** | DIME controls, 5 dimensions of control effectiveness |
| **Risk Monitoring** | Incident tracking, intelligence alerts, status updates |
| **Risk Reporting** | Audit trail, exports, analytics dashboard |
| **Compliance** | Complete traceability, soft deletes, archive |

---

## Quick Feature Matrix

| Feature | Capability | Status |
|---|---|---|
| Risk Register | Full CRUD with filters | ✅ Complete |
| Heatmap | 5×5 or 6×6 with drill-down | ✅ Complete |
| Controls (DIME) | 4-dimension effectiveness scoring | ✅ Complete |
| Incidents | AI-linked with financial tracking | ✅ Complete |
| VaR Analysis | Variance-covariance with diversification | ✅ Complete |
| Intelligence | 9+ RSS feeds with AI analysis | ✅ Complete |
| Analytics | 10 KPIs with visualizations | ✅ Complete |
| Governance | 3 roles + multi-tenant | ✅ Complete |
| Audit Trail | 8-filter UI, CSV export | ✅ Complete |
| User Management | Registration → Approval → Role assignment | ✅ Complete |

---

## Tech Stack Summary

- **Frontend:** React 18.3 + TypeScript + Vite
- **UI:** shadcn/ui (Radix UI components) + Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** Google Gemini API + Claude (Anthropic)
- **Deployment:** Vercel
- **Database:** PostgreSQL with RLS
- **Architecture:** Multi-tenant with organization isolation

---

## Architecture Highlights

1. **Multi-Tenancy:** Organization-level isolation using RLS
2. **Security:** Row-Level Security at database level
3. **Audit:** Complete operation tracking with user attribution
4. **Integration:** RSS feeds, AI services, Excel import/export
5. **Scalability:** Serverless functions on Vercel
6. **Reliability:** Automatic backups, SLA 99.95%

---

## Assessment Result

**Overall Status: PRODUCTION READY - Advanced ERM Implementation**

- Covers all ISO 31000 lifecycle stages
- Strong governance framework
- Complete audit and compliance
- Both qualitative and quantitative analysis
- Incident management with AI
- Intelligence gathering
- Multi-organization support

---

## Key Documents

Generated in this session:
- `MINRISK_ISO_31000_ASSESSMENT.md` (1311 lines) - Comprehensive assessment
- This quick reference guide

Existing documentation:
- `SYSTEM-CAPABILITIES.md` - Feature list
- `USER-MANUAL.md` - Complete user guide
- `ERM-IMPLEMENTATION-PROGRESS.md` - Implementation status
- `INTELLIGENCE-SYSTEM-STATUS.md` - News scanning system
- `UPGRADES-IMPLEMENTATION-SUMMARY.md` - Recent upgrades

---

**Assessment Date:** October 30, 2025
**System Version:** 4.0
**Production URL:** https://minrisk-starter.vercel.app
