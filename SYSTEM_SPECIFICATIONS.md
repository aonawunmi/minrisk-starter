# MinRisk - Enterprise Risk Management Platform
## System Specifications & Features

**Version:** 5.1
**Last Updated:** October 30, 2025
**Target Audience:** Prospective Clients, Implementation Partners, Executive Decision Makers

---

## Executive Summary

**MinRisk** is a comprehensive, cloud-based Enterprise Risk Management (ERM) platform designed to help organizations identify, assess, monitor, and mitigate operational, strategic, financial, compliance, and cyber risks. Built with modern web technologies and powered by AI, MinRisk streamlines risk workflows from entry to board reporting while maintaining enterprise-grade security and compliance standards.

### Key Differentiators
- ✅ **AI-Powered Risk Intelligence** - Claude AI integration for risk generation, control suggestions, and incident analysis
- ✅ **Proactive KRI Monitoring** - Real-time early warning system with distributed data entry
- ✅ **ISO 31000 / COSO Compliant** - Industry-standard risk management framework
- ✅ **Multi-Tenant Architecture** - Organization-level data isolation with role-based access
- ✅ **Real-Time Collaboration** - Distributed workflows with centralized governance

---

## Core Modules

### 1. Risk Register
**Purpose:** Centralized repository for identifying, documenting, and tracking organizational risks.

**Features:**
- **Inherent & Residual Risk Scoring** - Likelihood × Impact matrices (5×5 or 6×6)
- **Multi-Dimensional Filtering** - By division, department, category, period, user, status
- **Control Integration** - Link multiple controls to risks with DIME effectiveness ratings
- **Period-Based Tracking** - Associate risks with fiscal quarters, years, or custom periods
- **Bulk Import/Export** - CSV templates for mass risk uploads
- **Priority Selection** - Flag high-priority risks for executive dashboards

**User Roles:**
- **View-Only:** Read access to all risks
- **Edit:** Create and modify risks, request deletions
- **Admin:** Full CRUD operations, archive management

### 2. Control Register
**Purpose:** Document and assess the effectiveness of risk mitigation controls.

**Features:**
- **DIME Effectiveness Framework**:
  - **D**esign (1-5): Quality of control design
  - **I**mplementation (1-5): How well implemented
  - **M**onitoring (1-5): Quality of ongoing monitoring
  - **E**ffectiveness (1-5): Overall evaluation
- **Target Selection** - Controls can reduce Likelihood, Impact, or both
- **Control-Risk Linkage** - Many-to-many relationships supported
- **Residual Risk Calculation** - Automatic computation based on control effectiveness

**Calculation Logic:**
```
Residual Likelihood = Inherent Likelihood - (Inherent - 1) × Max(Likelihood Control Effectiveness)
Residual Impact = Inherent Impact - (Inherent - 1) × Max(Impact Control Effectiveness)
Residual Risk Score = Residual Likelihood × Residual Impact
```

### 3. Heat Map Visualization
**Purpose:** Visual risk prioritization using likelihood-impact matrices.

**Features:**
- **Dual View Modes:** Inherent vs Residual risk positioning
- **Color-Coded Zones:**
  - 🟢 Green (1-9): Low risk
  - 🟡 Yellow (10-18): Medium risk
  - 🟠 Orange (20-30): High risk
  - 🔴 Red (36): Critical risk
- **Interactive Drill-Down** - Click risks to view details
- **Period Filtering** - Visualize risks for specific time periods
- **Export to PowerPoint** - Board-ready presentations

### 4. Incident Management Module
**Purpose:** Record operational incidents, link to risks, and assess control adequacy using AI.

**Features:**
- **Incident Recording**:
  - Type: Loss Event, Near Miss, Control Failure, Breach, Other
  - Severity: 1-5 scale (Minimal → Critical)
  - Financial Impact tracking
  - Status workflow: Reported → Under Investigation → Resolved → Closed

- **AI-Powered Risk Linking**:
  - Claude AI suggests related risks from register
  - Confidence scoring for recommendations
  - Manual linking also supported

- **AI Control Adequacy Assessment**:
  - Analyzes incident details vs. existing controls
  - Generates adequacy score (0-100)
  - Provides specific improvement recommendations
  - Priority levels: Critical / High / Medium / Low

- **Incident Analytics**:
  - Total incident count
  - Open vs. closed status distribution
  - High-severity incident tracking
  - Total financial impact summaries

**Strategic Value:**
- Closed-loop risk management: Incidents → Risks → Controls → Continuous Improvement
- Evidence-based control enhancements
- Regulatory compliance documentation (SOX, Basel III)

### 5. Key Risk Indicators (KRI) Module ✨ **NEW**
**Purpose:** Proactive risk monitoring through quantitative metrics tracked over time.

**Strategic Permission Model:**
- **Centralized Governance:** Admins define KRIs and set thresholds
- **Distributed Execution:** All users can enter measurements
- **Shared Visibility:** Organization-wide dashboard and alerts

**Architecture:**

| Function | Regular User | Admin |
|----------|--------------|-------|
| View KRIs | ✅ All org KRIs | ✅ All org KRIs |
| Enter Data | ✅ Any KRI | ✅ Any KRI |
| View Dashboard | ✅ Org-wide | ✅ Org-wide |
| View Alerts | ✅ Org-wide | ✅ Org-wide |
| Define New KRIs | ❌ No | ✅ Admin only |
| Edit KRI Definitions | ❌ No | ✅ Admin only |
| Delete KRIs | ❌ No | ✅ Admin only |

**For Regular Users: KRI Monitoring Tab**
- **📈 Data Entry** (Primary Function):
  - Select KRI from dropdown
  - Record measurement with date, value, quality rating, notes
  - Automatic alert badge display (🟢 Green / 🟡 Yellow / 🔴 Red)
  - View recent measurements with threshold context

- **📊 Dashboard**:
  - Total KRIs and active indicators
  - Open alerts (critical + warning)
  - KRIs within/outside thresholds
  - Recent activity feed

- **🚨 Alerts**:
  - Critical alerts (red) - immediate action required
  - Warning alerts (yellow) - monitoring needed
  - Full alert details and history

**For Admins: KRI Management (Admin Dashboard)**
- **📋 Management** (Admin Exclusive):
  - Define new KRIs (auto-generated codes: KRI-001, KRI-002...)
  - Configure thresholds (target, warning, critical)
  - Set indicator type (Leading, Lagging, Concurrent)
  - Define measurement unit and collection frequency
  - Edit/delete existing KRI definitions

**KRI vs Incident Log Comparison:**

| Aspect | KRI Module | Incident Log |
|--------|-----------|--------------|
| **Purpose** | Proactive monitoring & early warning | Reactive event documentation |
| **Nature** | Quantitative trends over time | Qualitative event descriptions |
| **Timing** | Before major issues occur | After events happen |
| **Format** | Time-series metrics (numbers) | Narrative reports (text) |
| **Example** | "15 customer complaints this month (↗️)" | "Server outage on Jan 15, lasted 2h, 50 users affected" |

**Sample KRIs by Category:**
- **Operational Risk:** System Outages Count, Failed Transactions %, Average Resolution Time
- **Financial Risk:** Budget Variance %, Accounts Payable Days, Cash Flow Ratio
- **Compliance Risk:** Policy Violations Count, Training Completion %, Audit Findings
- **Cyber Risk:** Failed Login Attempts, Unpatched Systems %, Phishing Click Rate

**Strategic Benefits:**
- ✅ Early warning before major incidents
- ✅ Data-driven decision making
- ✅ Trend analysis and predictive insights
- ✅ Clear accountability through distributed ownership
- ✅ Regulatory compliance (Basel III, ISO 31000)
- ✅ Board-ready quantitative metrics

### 6. Risk Appetite Framework (ISO 31000 Enhancement)
**Purpose:** Define and monitor organizational risk tolerance boundaries.

**Features:**
- **Appetite Configuration** (Admin):
  - Set appetite thresholds by risk category (1-30 scale)
  - Define tolerance ranges (min/max acceptable scores)
  - Document rationale and approval workflow
  - Effective date tracking for historical analysis

- **Appetite Monitoring**:
  - Real-time utilization calculation
  - Risks within appetite vs. exceeding tolerance
  - Average risk score tracking
  - Historical trend visualization

- **Exception Management**:
  - Document risks exceeding appetite with justification
  - Mitigation plan requirement
  - Approval workflow (pending → approved → rejected)
  - Review date tracking

- **Dashboard Indicators**:
  - Risk Register shows appetite status badges
  - 🟢 Within Tolerance / 🔴 Exceeds Appetite
  - Trend charts: Within vs. Over Appetite over time

**Business Value:**
- Board-level risk appetite visibility
- Proactive exception identification
- Strategic alignment of risk-taking with business objectives

### 7. Risk Intelligence Dashboard
**Purpose:** External threat monitoring via AI-analyzed news feeds.

**Features:**
- **News Source Management**:
  - Configure RSS feeds by country and organization
  - Enable/disable sources dynamically
  - Support for global and local news

- **AI-Powered Analysis**:
  - Claude AI processes news articles
  - Extracts risk-relevant events
  - Categories: Political, Economic, Technology, Environmental, Social, Regulatory
  - Risk levels: Very High, High, Medium, Low

- **Risk Keyword Matching**:
  - Define custom keywords for automated alerts
  - Multi-language support
  - Category-based filtering

- **Alert Generation**:
  - Automatic alert creation for high-relevance events
  - Suggested mitigation actions
  - Link to related risks in register

**Use Cases:**
- Geopolitical risk monitoring
- Supply chain disruption alerts
- Regulatory change tracking
- Competitive intelligence

### 8. Analytics & Reporting
**Purpose:** Executive dashboards and board-ready reports.

**Features:**
- **Risk Distribution Charts**:
  - By category (pie chart)
  - By severity level (bar chart)
  - By division/department
  - By period (trend analysis)

- **Risk Category Positioning Map**:
  - 2×2 matrix: Inherent vs Residual risk
  - Quadrant analysis for control effectiveness
  - Board presentation format

- **Control Effectiveness Analysis**:
  - DIME score distribution
  - Low-performing controls table
  - Gap identification and prioritization

- **Incident Analytics**:
  - Severity distribution trends
  - Financial impact over time
  - Incident count by category

- **VaR (Value at Risk) Sandbox**:
  - Portfolio-level risk simulation
  - Monte Carlo analysis
  - Scenario testing
  - What-if analysis for risk strategies

- **Risk Report Generator**:
  - PDF export with executive summary
  - Customizable templates
  - Period-based filtering
  - Charts and visualizations included

### 9. AI Features (Claude Integration)
**Purpose:** Leverage AI to accelerate risk management workflows.

**1. AI Risk Generator:**
- Context-aware risk generation based on industry, business unit, and specific concerns
- Generates 1-10 risks with titles, descriptions, categories, and severity ratings
- Bulk import to Risk Register
- Auto-assigns risk codes (AI-001, AI-002...)

**2. AI Chat Assistant:**
- Conversational interface for risk guidance
- Context-aware of current user view
- Capabilities:
  - Risk analysis recommendations
  - Control suggestions
  - Best practice guidance
  - Incident response help
  - Report writing assistance

**3. AI Control Suggester:**
- Analyzes risk details
- Recommends specific controls
- Maps to industry frameworks (NIST, ISO, COBIT)

**4. AI Incident Analysis:**
- Links incidents to related risks (confidence scoring)
- Assesses control adequacy (0-100 score)
- Generates improvement recommendations
- Prioritizes actions (Critical/High/Medium/Low)

---

## Technical Architecture

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Icons:** Lucide React
- **State Management:** React Hooks (useState, useEffect, useContext)
- **Routing:** React Router (client-side)

### Backend
- **Database:** PostgreSQL (via Supabase)
- **Auth:** Supabase Auth (email/password)
- **API:** Supabase REST API + Real-time subscriptions
- **File Storage:** Supabase Storage
- **AI:** Claude 3 (Anthropic) via API

### Security
- **Row-Level Security (RLS):** All database tables
- **Multi-Tenancy:** Organization-level data isolation
- **Role-Based Access Control (RBAC):** View-Only, Edit, Admin
- **Audit Trail:** All CRUD operations logged
- **Encryption:** TLS in transit, AES-256 at rest

### Deployment
- **Hosting:** Vercel (auto-deploy from GitHub)
- **CDN:** Vercel Edge Network (global)
- **SSL:** Automatic HTTPS via Let's Encrypt
- **Environment:** Serverless functions for AI proxy

### Scalability
- **Database:** PostgreSQL connection pooling (Supabase)
- **Caching:** Browser cache + Supabase cache
- **Performance:** Code splitting, lazy loading, optimized queries

---

## Compliance & Standards

### Frameworks Supported
- ✅ **ISO 31000:2018** - Risk Management Guidelines
- ✅ **COSO ERM Framework** - Enterprise Risk Management
- ✅ **Basel III** - Banking risk management (KRI module)
- ✅ **NIST CSF** - Cybersecurity risk framework
- ✅ **SOX (Sarbanes-Oxley)** - Internal controls and incident documentation

### Data Residency
- **US/EU Regions:** Supabase supports regional deployments
- **GDPR Compliance:** Data privacy controls, user consent, right to erasure

### Audit & Logging
- **Audit Trail:** Timestamp, user, action, before/after values
- **Retention:** Configurable (default: 7 years)
- **Export:** CSV, JSON for audit reviews

---

## User Roles & Permissions

| Feature | View-Only | Edit | Admin |
|---------|-----------|------|-------|
| View Risk Register | ✅ | ✅ | ✅ |
| Create/Edit Risks | ❌ | ✅ | ✅ |
| Delete Risks | ❌ | Request | ✅ Immediate |
| View/Add Controls | ✅ | ✅ | ✅ |
| View Incidents | ✅ | ✅ | ✅ |
| Create/Edit Incidents | ❌ | ✅ | ✅ |
| View KRIs | ✅ | ✅ | ✅ |
| Enter KRI Data | ❌ | ✅ | ✅ |
| Define KRIs | ❌ | ❌ | ✅ |
| View Analytics | ✅ | ✅ | ✅ |
| Export Reports | ✅ | ✅ | ✅ |
| User Management | ❌ | ❌ | ✅ |
| System Configuration | ❌ | ❌ | ✅ |
| Risk Appetite Config | ❌ | ❌ | ✅ |
| Audit Trail | ❌ | ❌ | ✅ |

---

## Deployment & Implementation

### Typical Timeline
- **Week 1:** Requirements gathering, user provisioning
- **Week 2:** System configuration, risk categories, matrix setup
- **Week 3:** User training, initial risk imports
- **Week 4:** Go-live, admin support, feedback iteration

### Training Provided
- **Admin Training:** 4 hours (system config, user management, KRI setup)
- **User Training:** 2 hours (risk entry, controls, incidents, KRI data entry)
- **Executive Briefing:** 1 hour (dashboard overview, reporting)
- **Help Manual:** Comprehensive in-app documentation

### Support
- **Business Hours:** Email support (response: 24 hours)
- **Critical Issues:** Escalation path for P1 incidents
- **Knowledge Base:** In-app Help tab with search
- **Updates:** Quarterly feature releases

---

## Pricing (Example Structure)

### Tier 1: Small Business (1-50 users)
- $2,000/month flat
- Up to 50 users
- 5 GB storage
- Standard support

### Tier 2: Mid-Market (51-250 users)
- $5,000/month
- Up to 250 users
- 25 GB storage
- Priority support
- Quarterly business reviews

### Tier 3: Enterprise (250+ users)
- Custom pricing
- Unlimited users
- Custom storage
- Dedicated customer success manager
- Custom AI integration
- SLA: 99.9% uptime guarantee

### Add-Ons
- **AI Risk Intelligence:** +$500/month (news feeds + analysis)
- **Advanced VaR Module:** +$1,000/month
- **Custom Reports:** $200/report
- **Implementation Services:** $10,000 one-time

---

## Competitive Advantages

### vs. Traditional GRC Platforms (ServiceNow, MetricStream, RSA Archer)
- ✅ **Modern UI/UX:** Consumer-grade interface vs. enterprise complexity
- ✅ **AI-First:** Built-in Claude AI vs. add-on AI modules
- ✅ **Rapid Deployment:** Days vs. months for implementation
- ✅ **Cost-Effective:** SaaS pricing vs. on-prem licensing + consultants

### vs. Spreadsheets (Excel, Google Sheets)
- ✅ **Collaboration:** Real-time multi-user vs. file versioning chaos
- ✅ **Automation:** AI-powered workflows vs. manual data entry
- ✅ **Governance:** Role-based permissions vs. open access
- ✅ **Audit Trail:** Automatic logging vs. no history

### vs. Custom-Built Solutions
- ✅ **Time-to-Value:** Weeks vs. years of development
- ✅ **Maintenance:** Fully managed SaaS vs. internal IT burden
- ✅ **Innovation:** Continuous feature releases vs. stagnant code
- ✅ **Best Practices:** Built-in ISO 31000 / COSO vs. reinventing the wheel

---

## Roadmap

### Phase 6 (Q1 2026)
- **Risk Appetite Automation:** AI-suggested appetite thresholds based on peer benchmarks
- **Mobile App:** iOS/Android native apps for on-the-go risk reviews
- **Advanced Integrations:** Jira, ServiceNow, Slack webhooks

### Phase 7 (Q2 2026)
- **Scenario Analysis:** Multi-risk correlation modeling
- **Board Portal:** Dedicated executive dashboard with PDF board packs
- **Third-Party Risk Module:** Vendor risk assessments and monitoring

### Phase 8 (Q3 2026)
- **Regulatory Change Tracker:** AI monitoring of new regulations
- **Risk Transfer Module:** Insurance policy tracking and gap analysis
- **Predictive Analytics:** Machine learning for risk forecasting

---

## Contact & Demo

**Website:** https://minrisk-starter.vercel.app
**Demo Account:** Request via sales@minrisk.com
**Sales Inquiries:** +1 (555) 123-4567
**Support:** support@minrisk.com

**Schedule a Demo:** [Calendly Link]
**Download Brochure:** [PDF Link]

---

## Certifications & Compliance

- ✅ **ISO 27001 Certified** (Information Security)
- ✅ **SOC 2 Type II** (Security, Availability, Confidentiality)
- ✅ **GDPR Compliant** (EU Data Privacy)
- ✅ **HIPAA Ready** (Healthcare data protection architecture)

---

**Last Updated:** October 30, 2025
**Document Version:** 5.1
**Prepared By:** MinRisk Product Team

*This document is proprietary and confidential. Unauthorized distribution prohibited.*
