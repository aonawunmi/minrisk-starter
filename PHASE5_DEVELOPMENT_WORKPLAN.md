# MinRisk Phase 5 Development Workplan
## ISO 31000 Enhancement Recommendations

**Document Version:** 1.0
**Date:** October 30, 2025
**Based on:** ISO 31000 Assessment Results
**Current System Version:** 4.0

---

## Executive Summary

This workplan addresses the 6 enhancement recommendations identified in the comprehensive ISO 31000 assessment. These enhancements will elevate MinRisk from "Production Ready" to "ISO 31000 Certified - Advanced Maturity" status.

**Current State:** Advanced ERM Implementation (100% lifecycle coverage)
**Target State:** ISO 31000 Certified with Advanced Maturity Features
**Timeline:** 18-24 weeks (4.5-6 months)
**Total Estimated Effort:** 520-640 development hours

---

## Enhancement Recommendations Summary

| # | Feature | Priority | Effort | Business Value | ISO 31000 Impact |
|---|---------|----------|--------|----------------|------------------|
| 1 | Risk Appetite Framework | HIGH | 80-100h | Critical | High |
| 2 | Key Risk Indicators (KRIs) | HIGH | 120-150h | Critical | High |
| 3 | Compliance Mapping | MEDIUM | 100-120h | High | Medium |
| 4 | Scenario Analysis | MEDIUM | 80-100h | High | Medium |
| 5 | Stress Testing | MEDIUM | 80-100h | Medium | Medium |
| 6 | Risk Transfer Mechanisms | LOW | 60-80h | Medium | Low |

---

## Phase 5A: Risk Appetite Framework (Priority 1)

### Business Justification
**Current Gap:** Basic configurable thresholds without formal risk appetite statement
**ISO 31000 Requirement:** Organizations must establish risk appetite and tolerance levels
**Business Impact:** Enables board-level risk governance and strategic alignment

### Feature Specifications

#### 1. Risk Appetite Statement
- **Purpose:** Define organization's willingness to take risk
- **Components:**
  - Overall risk appetite (conservative, moderate, aggressive)
  - Category-specific appetite levels
  - Risk tolerance thresholds by division
  - Board-approved documentation
  - Periodic review cycle

#### 2. Risk Appetite Dashboard
- **Visual Elements:**
  - Gauge charts for current vs. appetite
  - Heat zones (green = within appetite, amber = near limit, red = exceeded)
  - Trend analysis (appetite utilization over time)
  - Drill-down by division, category, period

- **KPIs:**
  - Risks within appetite (%)
  - Risks exceeding appetite (count)
  - Average risk score vs. appetite threshold
  - Appetite utilization by category

#### 3. Appetite Threshold Management
- **Admin Configuration:**
  - Set appetite thresholds per category (1-30 scale)
  - Define tolerance ranges (±2 points)
  - Configure alert triggers
  - Version control for threshold changes

- **Risk Scoring Integration:**
  - Automatic flagging when risk exceeds appetite
  - Color-coding in Risk Register
  - Mandatory justification for over-appetite risks

### Database Schema Changes

```sql
-- Risk Appetite Configuration Table
CREATE TABLE risk_appetite_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  category VARCHAR(50) NOT NULL,
  appetite_threshold INTEGER NOT NULL CHECK (appetite_threshold BETWEEN 1 AND 30),
  tolerance_min INTEGER NOT NULL,
  tolerance_max INTEGER NOT NULL,
  rationale TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, category, effective_from)
);

-- Risk Appetite Exceptions (for over-appetite risks)
CREATE TABLE risk_appetite_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  justification TEXT NOT NULL,
  mitigation_plan TEXT NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  review_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, expired
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Appetite History (for audit trail)
CREATE TABLE risk_appetite_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  snapshot_date DATE NOT NULL,
  total_risks INTEGER NOT NULL,
  risks_within_appetite INTEGER NOT NULL,
  risks_over_appetite INTEGER NOT NULL,
  avg_risk_score DECIMAL(5,2),
  appetite_utilization DECIMAL(5,2), -- percentage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, snapshot_date)
);
```

### Component Architecture

**New Components:**
- `RiskAppetiteConfig.tsx` - Admin configuration interface
- `RiskAppetiteDashboard.tsx` - Executive dashboard view
- `AppetiteGaugeChart.tsx` - Visual appetite vs. actual chart
- `AppetiteExceptionDialog.tsx` - Request exception for over-appetite risks
- `AppetiteHistoryChart.tsx` - Trend analysis visualization

**Updated Components:**
- `RiskRegister.tsx` - Add appetite indicator column
- `RiskDialog.tsx` - Show appetite threshold when creating/editing
- `AdminDashboard.tsx` - Add Risk Appetite tab
- `database.ts` - Add appetite CRUD functions

### Implementation Tasks

1. **Database Migration** (4-6 hours)
   - Create tables with RLS policies
   - Add indexes for performance
   - Create views for appetite analytics
   - Seed default appetite thresholds

2. **Backend Functions** (8-10 hours)
   - CRUD operations for appetite config
   - Appetite threshold calculation logic
   - Exception approval workflow
   - Historical snapshot generation

3. **Admin Configuration UI** (16-20 hours)
   - Appetite threshold configuration form
   - Category-specific settings
   - Approval workflow interface
   - Threshold history view

4. **Dashboard Development** (20-25 hours)
   - Gauge charts with D3.js/Recharts
   - KPI cards
   - Trend analysis charts
   - Drill-down functionality

5. **Risk Register Integration** (12-15 hours)
   - Add appetite indicator column
   - Color-coding logic
   - Exception request dialog
   - Appetite filter

6. **Testing & Documentation** (20-24 hours)
   - Unit tests for calculations
   - Integration tests for workflows
   - User acceptance testing
   - Help documentation

**Total Effort:** 80-100 hours
**Timeline:** 2-3 weeks

---

## Phase 5B: Key Risk Indicators (KRIs) Module (Priority 2)

### Business Justification
**Current Gap:** No leading indicators for risk trends
**ISO 31000 Requirement:** Continuous monitoring with early warning signals
**Business Impact:** Proactive risk management with trend prediction

### Feature Specifications

#### 1. KRI Definition & Management
- **KRI Structure:**
  - KRI Code (auto-generated: KRI-XXX)
  - KRI Name & Description
  - Linked Risk(s) (one-to-many)
  - Measurement Unit (%, amount, count, ratio)
  - Data Source (manual, automated, API)
  - Measurement Frequency (daily, weekly, monthly, quarterly)
  - Owner (user assignment)

#### 2. KRI Thresholds & Alerts
- **Threshold Configuration:**
  - Green Zone (acceptable range)
  - Amber Zone (warning threshold)
  - Red Zone (critical threshold)
  - Alert triggers at zone changes

- **Alert Mechanism:**
  - In-app notifications
  - Email alerts (if implemented)
  - Dashboard warnings
  - Audit trail logging

#### 3. KRI Data Collection
- **Manual Entry:**
  - Data entry form with validation
  - Historical data upload (CSV)
  - Bulk entry for multiple periods

- **Automated Collection (Future):**
  - API integrations
  - Database connectors
  - Scheduled data pulls

#### 4. KRI Analytics & Visualization
- **Charts:**
  - Time-series line charts
  - Threshold zone overlays
  - Moving averages
  - Forecasting trends

- **Reports:**
  - KRI scorecard (all KRIs summary)
  - Breached KRIs report
  - Trending KRIs (improving/deteriorating)
  - Risk-to-KRI linkage report

### Database Schema Changes

```sql
-- Key Risk Indicators Table
CREATE TABLE key_risk_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  kri_code VARCHAR(20) UNIQUE NOT NULL,
  kri_name VARCHAR(200) NOT NULL,
  description TEXT,
  measurement_unit VARCHAR(50) NOT NULL, -- percentage, amount, count, ratio
  data_source VARCHAR(50) NOT NULL, -- manual, automated, api
  frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly, quarterly
  owner_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, archived
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KRI Thresholds Table
CREATE TABLE kri_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kri_id UUID NOT NULL REFERENCES key_risk_indicators(id),
  threshold_type VARCHAR(20) NOT NULL, -- green, amber, red
  min_value DECIMAL(15,2),
  max_value DECIMAL(15,2),
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KRI Data Points Table
CREATE TABLE kri_data_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kri_id UUID NOT NULL REFERENCES key_risk_indicators(id),
  measurement_date DATE NOT NULL,
  value DECIMAL(15,2) NOT NULL,
  threshold_status VARCHAR(20) NOT NULL, -- green, amber, red
  notes TEXT,
  entered_by UUID NOT NULL REFERENCES auth.users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kri_id, measurement_date)
);

-- KRI-Risk Linkage Table
CREATE TABLE kri_risk_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kri_id UUID NOT NULL REFERENCES key_risk_indicators(id),
  risk_id UUID NOT NULL REFERENCES risks(id),
  relationship_type VARCHAR(50), -- leading_indicator, monitoring, correlation
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kri_id, risk_id)
);

-- KRI Alerts Table
CREATE TABLE kri_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kri_id UUID NOT NULL REFERENCES key_risk_indicators(id),
  data_point_id UUID NOT NULL REFERENCES kri_data_points(id),
  alert_type VARCHAR(20) NOT NULL, -- threshold_breach, trend_warning
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  message TEXT NOT NULL,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Component Architecture

**New Components:**
- `KRIManagement.tsx` - Main KRI management interface
- `KRIForm.tsx` - Create/edit KRI dialog
- `KRIDataEntry.tsx` - Manual data entry form
- `KRIScorecard.tsx` - Overview dashboard
- `KRIChart.tsx` - Time-series visualization
- `KRIThresholdConfig.tsx` - Threshold configuration
- `KRIAlerts.tsx` - Alert management panel
- `KRIRiskLinkage.tsx` - Link KRIs to risks

**Updated Components:**
- `RiskDetailDialog.tsx` - Show linked KRIs
- `Dashboard.tsx` - Add KRI summary section
- `Navigation.tsx` - Add KRI menu item

### Implementation Tasks

1. **Database Migration** (6-8 hours)
   - Create 5 new tables with relationships
   - Add RLS policies
   - Create indexes and views
   - Migration scripts

2. **Backend Functions** (16-20 hours)
   - KRI CRUD operations
   - Threshold evaluation logic
   - Alert generation system
   - Data point calculations (moving avg, trends)

3. **KRI Management UI** (24-30 hours)
   - KRI list/grid with filters
   - Create/edit form with validation
   - Threshold configuration interface
   - Risk linkage selector

4. **Data Entry Interface** (16-20 hours)
   - Manual data entry form
   - CSV bulk upload
   - Historical data import
   - Data validation

5. **KRI Dashboard & Charts** (28-36 hours)
   - Scorecard with all KRIs
   - Time-series charts (Recharts)
   - Threshold zone visualization
   - Trend indicators
   - Alert panel

6. **Alert System** (12-16 hours)
   - Threshold breach detection
   - Alert generation logic
   - Notification display
   - Acknowledgment workflow

7. **Testing & Documentation** (18-20 hours)
   - Unit tests for calculations
   - Integration tests
   - UAT scenarios
   - Help documentation

**Total Effort:** 120-150 hours
**Timeline:** 3-4 weeks

---

## Phase 5C: Compliance Mapping Module (Priority 3)

### Business Justification
**Current Gap:** Manual compliance tracking without risk mapping
**ISO 31000 Requirement:** Link risk management to regulatory requirements
**Business Impact:** Demonstrate compliance coverage and identify gaps

### Feature Specifications

#### 1. Compliance Framework Library
- **Pre-loaded Frameworks:**
  - ISO 31000:2018 (Risk Management)
  - ISO 27001 (Information Security)
  - SOX (Sarbanes-Oxley)
  - Basel III/IV (Financial Institutions)
  - COSO ERM Framework
  - GDPR (Data Protection)
  - PCI DSS (Payment Card Industry)
  - Custom frameworks (org-specific)

#### 2. Compliance Requirements Management
- **Requirement Structure:**
  - Framework name
  - Section/Clause number
  - Requirement description
  - Applicability (yes/no/partial)
  - Compliance status (compliant, partial, non-compliant, N/A)
  - Evidence documents
  - Responsible owner

#### 3. Risk-to-Compliance Mapping
- **Mapping Features:**
  - Link risks to compliance requirements
  - Many-to-many relationships
  - Coverage analysis (which requirements are covered by risks)
  - Gap analysis (uncovered requirements)
  - Heatmap of compliance coverage

#### 4. Compliance Dashboard
- **Visual Elements:**
  - Compliance status by framework
  - Requirement coverage percentage
  - Gap analysis charts
  - Risk-compliance matrix
  - Evidence repository

### Database Schema Changes

```sql
-- Compliance Frameworks Table
CREATE TABLE compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  framework_code VARCHAR(50) NOT NULL,
  framework_name VARCHAR(200) NOT NULL,
  version VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, framework_code)
);

-- Compliance Requirements Table
CREATE TABLE compliance_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework_id UUID NOT NULL REFERENCES compliance_frameworks(id),
  requirement_code VARCHAR(100) NOT NULL,
  section_number VARCHAR(50),
  requirement_text TEXT NOT NULL,
  applicability VARCHAR(20) DEFAULT 'yes', -- yes, no, partial
  compliance_status VARCHAR(30) DEFAULT 'not_assessed',
    -- compliant, partial_compliant, non_compliant, not_applicable, not_assessed
  owner_id UUID REFERENCES auth.users(id),
  evidence TEXT,
  last_assessment_date DATE,
  next_assessment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk-Compliance Mapping Table
CREATE TABLE risk_compliance_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id),
  requirement_id UUID NOT NULL REFERENCES compliance_requirements(id),
  coverage_level VARCHAR(20) NOT NULL, -- full, partial, minimal
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(risk_id, requirement_id)
);

-- Compliance Evidence Table
CREATE TABLE compliance_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_id UUID NOT NULL REFERENCES compliance_requirements(id),
  evidence_type VARCHAR(50) NOT NULL, -- document, audit_report, screenshot, policy
  evidence_name VARCHAR(200) NOT NULL,
  evidence_url TEXT,
  upload_date DATE NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Component Architecture

**New Components:**
- `ComplianceFrameworks.tsx` - Framework library management
- `ComplianceRequirements.tsx` - Requirements list/grid
- `ComplianceMappingMatrix.tsx` - Risk-to-requirement mapping interface
- `ComplianceDashboard.tsx` - Executive compliance view
- `ComplianceGapAnalysis.tsx` - Gap analysis report
- `ComplianceEvidence.tsx` - Evidence repository

**Updated Components:**
- `RiskDetailDialog.tsx` - Show linked compliance requirements
- `Navigation.tsx` - Add Compliance menu item

### Implementation Tasks

1. **Database Migration** (5-7 hours)
   - Create 4 new tables
   - Seed pre-loaded frameworks (ISO, SOX, Basel, etc.)
   - Add RLS policies

2. **Framework & Requirements UI** (20-24 hours)
   - Framework library view
   - Requirements list with filters
   - Add/edit requirement forms
   - Status tracking

3. **Mapping Interface** (24-30 hours)
   - Risk-compliance matrix view
   - Drag-and-drop mapping
   - Coverage level selector
   - Batch mapping tools

4. **Compliance Dashboard** (20-25 hours)
   - Framework status cards
   - Coverage charts (pie, bar)
   - Gap analysis visualization
   - Trend analysis

5. **Evidence Management** (12-15 hours)
   - Evidence upload interface
   - Document repository
   - Link evidence to requirements

6. **Reports & Analytics** (14-18 hours)
   - Compliance status reports
   - Gap analysis report
   - Coverage matrix export (Excel)

7. **Testing & Documentation** (15-20 hours)
   - UAT scenarios
   - Help documentation
   - Compliance report templates

**Total Effort:** 100-120 hours
**Timeline:** 2.5-3 weeks

---

## Phase 5D: Scenario Analysis Module (Priority 4)

### Business Justification
**Current Gap:** VaR for financial risks only, no strategic scenario modeling
**ISO 31000 Requirement:** What-if analysis for decision support
**Business Impact:** Test resilience under different scenarios

### Feature Specifications

#### 1. Scenario Definition
- **Scenario Types:**
  - Economic (recession, inflation, currency fluctuation)
  - Operational (supply chain disruption, cyber attack)
  - Strategic (market change, regulatory change)
  - Natural disasters (pandemic, earthquake, flood)
  - Custom scenarios

#### 2. Scenario Parameters
- **Input Variables:**
  - Risk likelihood multipliers (e.g., +50% for cyber risk)
  - Risk impact multipliers
  - Control effectiveness changes
  - External event triggers

#### 3. Scenario Simulation
- **Calculation Engine:**
  - Recalculate all risks under scenario assumptions
  - Generate new heatmap
  - Show before/after comparison
  - Calculate aggregate risk exposure change

#### 4. Scenario Reports
- **Outputs:**
  - Risk landscape change visualization
  - Top 10 affected risks
  - Required control enhancements
  - Residual risk comparison

### Database Schema Changes

```sql
-- Scenarios Table
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  scenario_code VARCHAR(50) UNIQUE NOT NULL,
  scenario_name VARCHAR(200) NOT NULL,
  scenario_type VARCHAR(50) NOT NULL,
  description TEXT,
  assumptions TEXT,
  status VARCHAR(20) DEFAULT 'draft', -- draft, approved, archived
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenario Parameters Table
CREATE TABLE scenario_parameters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id),
  risk_category VARCHAR(50),
  likelihood_multiplier DECIMAL(5,2) DEFAULT 1.0,
  impact_multiplier DECIMAL(5,2) DEFAULT 1.0,
  control_effectiveness_change INTEGER DEFAULT 0, -- +/- adjustment
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenario Results Table
CREATE TABLE scenario_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id),
  risk_id UUID NOT NULL REFERENCES risks(id),
  baseline_likelihood INTEGER NOT NULL,
  baseline_impact INTEGER NOT NULL,
  baseline_score INTEGER NOT NULL,
  scenario_likelihood INTEGER NOT NULL,
  scenario_impact INTEGER NOT NULL,
  scenario_score INTEGER NOT NULL,
  change_magnitude INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scenario_id, risk_id)
);
```

### Implementation Tasks

1. **Database Migration** (4-5 hours)
2. **Scenario Definition UI** (12-15 hours)
3. **Parameter Configuration** (14-18 hours)
4. **Simulation Engine** (20-25 hours)
5. **Results Visualization** (16-20 hours)
6. **Testing & Documentation** (14-17 hours)

**Total Effort:** 80-100 hours
**Timeline:** 2-3 weeks

---

## Phase 5E: Stress Testing Module (Priority 5)

### Business Justification
**Current Gap:** Basic VaR calculations without extreme scenario testing
**ISO 31000 Requirement:** Test resilience under stress conditions
**Business Impact:** Understand vulnerability to extreme events

### Feature Specifications

#### 1. Stress Test Scenarios
- **Market Stress:**
  - Equity crash (-30%, -50%, -70%)
  - Interest rate shock (+200 bps, +400 bps)
  - Currency volatility (±20%, ±40%)

- **Operational Stress:**
  - Major cyber breach
  - Key person loss
  - Supply chain failure

#### 2. Stress Test Execution
- **VaR Portfolio:**
  - Apply stress multipliers to volatility
  - Recalculate VaR under stress
  - Show impact on risk scores

- **Operational Risks:**
  - Apply likelihood/impact multipliers
  - Show cascade effects
  - Test control failure scenarios

#### 3. Stress Test Reports
- **Outputs:**
  - VaR under stress vs. normal
  - Breaking points identification
  - Required capital/reserves
  - Mitigation recommendations

### Database Schema Changes

```sql
-- Stress Tests Table
CREATE TABLE stress_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  test_code VARCHAR(50) UNIQUE NOT NULL,
  test_name VARCHAR(200) NOT NULL,
  test_type VARCHAR(50) NOT NULL, -- market, operational, combined
  severity VARCHAR(20) NOT NULL, -- mild, moderate, severe, extreme
  description TEXT,
  assumptions TEXT,
  run_date TIMESTAMPTZ DEFAULT NOW(),
  run_by UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'completed'
);

-- Stress Test Results Table
CREATE TABLE stress_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stress_test_id UUID NOT NULL REFERENCES stress_tests(id),
  metric_name VARCHAR(100) NOT NULL,
  baseline_value DECIMAL(15,2) NOT NULL,
  stressed_value DECIMAL(15,2) NOT NULL,
  change_percentage DECIMAL(10,2),
  breach_threshold BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Implementation Tasks

1. **Database Migration** (3-4 hours)
2. **Stress Scenario Library** (10-12 hours)
3. **Stress Test Engine** (24-30 hours)
4. **Results Dashboard** (14-18 hours)
5. **Breach Analysis** (12-15 hours)
6. **Testing & Documentation** (17-21 hours)

**Total Effort:** 80-100 hours
**Timeline:** 2-3 weeks

---

## Phase 5F: Risk Transfer Mechanisms (Priority 6)

### Business Justification
**Current Gap:** No formalized insurance/transfer tracking
**ISO 31000 Requirement:** Document risk treatment strategies including transfer
**Business Impact:** Optimize insurance coverage and identify gaps

### Feature Specifications

#### 1. Insurance Policy Management
- **Policy Details:**
  - Policy number, insurer, type
  - Coverage limits
  - Deductibles
  - Premium costs
  - Renewal dates

#### 2. Risk-Insurance Mapping
- **Coverage Analysis:**
  - Link risks to insurance policies
  - Calculate coverage adequacy
  - Identify coverage gaps
  - Over-insurance detection

#### 3. Insurance Dashboard
- **Visual Elements:**
  - Coverage summary by risk category
  - Premium vs. risk exposure
  - Renewal calendar
  - Gap analysis

### Database Schema Changes

```sql
-- Insurance Policies Table
CREATE TABLE insurance_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  policy_number VARCHAR(100) UNIQUE NOT NULL,
  insurer_name VARCHAR(200) NOT NULL,
  policy_type VARCHAR(100) NOT NULL,
  coverage_limit DECIMAL(15,2) NOT NULL,
  deductible DECIMAL(15,2),
  annual_premium DECIMAL(15,2),
  effective_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  renewal_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk-Insurance Mapping Table
CREATE TABLE risk_insurance_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id),
  policy_id UUID NOT NULL REFERENCES insurance_policies(id),
  coverage_percentage DECIMAL(5,2), -- what % of risk is covered
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(risk_id, policy_id)
);
```

### Implementation Tasks

1. **Database Migration** (3-4 hours)
2. **Policy Management UI** (14-18 hours)
3. **Risk-Insurance Mapping** (12-15 hours)
4. **Coverage Analytics** (14-18 hours)
5. **Gap Analysis Dashboard** (12-15 hours)
6. **Testing & Documentation** (10-14 hours)

**Total Effort:** 60-80 hours
**Timeline:** 1.5-2 weeks

---

## Implementation Roadmap

### Phased Approach (Recommended)

```
Phase 5A: Risk Appetite Framework (Weeks 1-3)
├─ Database setup
├─ Admin configuration
└─ Dashboard & integration

Phase 5B: KRI Module (Weeks 4-7)
├─ Database & backend
├─ KRI management UI
└─ Analytics & alerts

Phase 5C: Compliance Mapping (Weeks 8-11)
├─ Framework library
├─ Mapping interface
└─ Dashboard & reports

Phase 5D: Scenario Analysis (Weeks 12-14)
├─ Scenario engine
└─ Simulation & reports

Phase 5E: Stress Testing (Weeks 15-17)
├─ Stress scenarios
└─ Testing engine

Phase 5F: Risk Transfer (Weeks 18-20)
├─ Policy management
└─ Coverage analysis
```

### Alternative: Parallel Development

If multiple developers are available, implement phases 5A-5C in parallel (Weeks 1-11), then phases 5D-5F in parallel (Weeks 12-20).

---

## Resource Requirements

### Development Team
- **Senior Full-Stack Developer:** 1 FTE (all phases)
- **Frontend Developer:** 0.5 FTE (UI-heavy phases 5B, 5C)
- **QA Engineer:** 0.25 FTE (testing all phases)
- **Business Analyst:** 0.25 FTE (requirements validation)

### Infrastructure
- No additional infrastructure required
- Existing Supabase database can handle additional tables
- Vercel deployment unchanged

---

## Testing Strategy

### Unit Testing
- Backend calculation logic
- Threshold evaluations
- Alert generation
- Data validation

### Integration Testing
- Cross-module interactions (KRIs linked to risks)
- Database transactions
- Audit trail logging

### User Acceptance Testing
- Admin configuration workflows
- Data entry flows
- Dashboard usability
- Report generation

### Performance Testing
- Large dataset handling (1000+ risks, 500+ KRIs)
- Dashboard load times
- Query optimization

---

## Success Criteria

### Phase 5A: Risk Appetite
- ✅ Admin can configure appetite thresholds
- ✅ Dashboard shows appetite vs. actual
- ✅ Over-appetite risks flagged automatically
- ✅ Exception workflow functional

### Phase 5B: KRI Module
- ✅ KRI creation and management
- ✅ Data entry with threshold alerts
- ✅ KRI-risk linkage functional
- ✅ Scorecard with trend analysis

### Phase 5C: Compliance
- ✅ Pre-loaded frameworks available
- ✅ Risk-compliance mapping complete
- ✅ Gap analysis report generated
- ✅ Evidence repository functional

### Phase 5D: Scenario Analysis
- ✅ Scenario definition and simulation
- ✅ Before/after comparison charts
- ✅ Top affected risks identified

### Phase 5E: Stress Testing
- ✅ Stress scenarios executable
- ✅ VaR recalculated under stress
- ✅ Breach analysis report

### Phase 5F: Risk Transfer
- ✅ Insurance policy tracking
- ✅ Coverage gap analysis
- ✅ Risk-insurance mapping

---

## Risk Management for Implementation

### Implementation Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Scope creep | Medium | High | Fixed scope per phase, formal change control |
| Resource availability | Medium | Medium | Buffer time in estimates, backup resources |
| Technical complexity | Low | Medium | Proof-of-concept for complex features |
| User adoption | Medium | High | Training materials, phased rollout |
| Data migration issues | Low | High | Thorough testing, rollback plans |

---

## Cost-Benefit Analysis

### Development Costs
- **Development Effort:** 520-640 hours @ $100-150/hour = $52,000-96,000
- **QA & Testing:** 80-100 hours @ $75-100/hour = $6,000-10,000
- **Project Management:** 40-50 hours @ $125-175/hour = $5,000-8,750
- **Total Estimated Cost:** $63,000-114,750

### Expected Benefits
- **ISO 31000 Certification:** Market differentiation, higher client trust
- **Regulatory Compliance:** Reduced compliance costs, audit readiness
- **Risk Management Maturity:** Proactive risk management, reduced incidents
- **Competitive Advantage:** Advanced features vs. competitors
- **Revenue Potential:** Higher pricing tier, enterprise clients

**ROI Timeline:** 12-18 months for mid-market clients

---

## Dependencies

### Technical Dependencies
- Existing database schema (v4.0)
- Current authentication system
- Supabase RLS policies
- React 18 + TypeScript stack

### Business Dependencies
- User feedback on priorities
- Budget approval
- Resource allocation
- Training schedule

---

## Next Steps

1. **Review & Approval:** (Week 0)
   - Review this workplan with stakeholders
   - Prioritize phases based on business needs
   - Approve budget and timeline

2. **Kickoff:** (Week 1)
   - Assemble development team
   - Set up project tracking (Jira/GitHub Projects)
   - Finalize technical designs

3. **Development:** (Weeks 2-20)
   - Execute phased implementation
   - Weekly progress reviews
   - Continuous integration/deployment

4. **Deployment:** (Week 21)
   - Production rollout
   - User training
   - Documentation finalization

5. **ISO 31000 Certification:** (Week 22+)
   - External audit preparation
   - Certification assessment
   - Continuous improvement

---

## Appendix A: Alternative Prioritization

If business priorities differ, consider these alternative sequences:

**Option 1: Compliance-First**
- Phase 5C (Compliance) → Phase 5A (Appetite) → Phase 5B (KRI)
- Best for: Organizations under regulatory pressure

**Option 2: Quick Wins**
- Phase 5A (Appetite) → Phase 5F (Insurance) → Phase 5D (Scenarios)
- Best for: Organizations needing fast ROI

**Option 3: Analytics-First**
- Phase 5B (KRI) → Phase 5D (Scenarios) → Phase 5E (Stress Testing)
- Best for: Organizations with mature risk culture

---

**Document Version:** 1.0
**Last Updated:** October 30, 2025
**Status:** Draft - Pending Approval
**Next Review Date:** November 15, 2025
