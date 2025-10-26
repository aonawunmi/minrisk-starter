# MinRisk User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Risk Register](#risk-register)
4. [Heatmap](#heatmap)
5. [Control Register](#control-register)
6. [Historical Risk Management](#historical-risk-management)
7. [Incidents Module](#incidents-module) ✨ NEW
8. [Interactive Analytics Dashboard](#interactive-analytics-dashboard) ✨ NEW
9. [AI Features](#ai-features) ✨ ENHANCED
   - [AI Risk Generator](#ai-risk-generator)
   - [AI Chat Assistant](#ai-chat-assistant)
   - [AI Control Suggester](#ai-control-suggester)
10. [Configuration](#configuration)
11. [Admin Dashboard](#admin-dashboard)
12. [Archive Management](#archive-management)
13. [Audit Trail](#audit-trail)
14. [Best Practices](#best-practices)

---

## Getting Started

### First Time Login

1. **Access the Application**
   - Navigate to your MinRisk URL
   - You'll see the login screen

2. **Sign Up**
   - Click "Sign up"
   - Enter your email and password
   - Click "Sign up"
   - Your account will be created with **Pending** status

3. **Wait for Admin Approval**
   - An administrator must approve your account
   - You'll receive an email notification once approved
   - Your account will be assigned a role: **View Only**, **Edit**, or **Admin**

4. **Log In**
   - Enter your approved email and password
   - Click "Sign in"
   - You'll be directed to the Risk Register

---

## User Roles & Permissions

### 🔍 View Only
**Can:**
- View all risks in Risk Register
- View Heatmap
- View Control Register
- Filter and search data
- Export data

**Cannot:**
- Add, edit, or delete risks
- Modify controls
- Access configuration
- Access admin dashboard

---

### ✏️ Edit
**Can:**
- Everything View Only can do
- **Plus:**
- Add new risks
- Edit existing risks
- Delete own risks (requires admin approval)
- Add and modify controls
- Use AI Assistant to generate risk suggestions
- Mark risks as priority

**Cannot:**
- Delete other users' risks
- Access configuration
- Access admin dashboard
- Approve user accounts

---

### 👑 Admin
**Can:**
- Everything Edit can do
- **Plus:**
- Access Configuration settings
- Approve/reject user accounts
- Delete any user's risks (with archiving)
- View and manage archived risks
- View complete audit trail
- Permanently delete archived data (with password)
- Transfer risks between users
- Modify system configuration

---

## Risk Register

### Overview
The Risk Register is your main workspace for managing risks. It displays all risks in a table format with key information.

### Columns Explained

| Column | Description |
|--------|-------------|
| **S/N** | Sequential number (changes with sorting/filtering) |
| **Priority** | Checkbox to mark risk for heatmap/control register view |
| **Risk Code** | Unique identifier for the risk |
| **Risk Title** | Short descriptive title |
| **Division** | Business division/unit |
| **Department** | Specific department |
| **Category** | Risk category (Operational, Financial, etc.) |
| **Owner** | Person responsible for the risk |
| **Period** | Time period for the risk (Q1 2025, FY2025, etc.) ✨ NEW |
| **LxI(Inh)** | Likelihood × Impact (Inherent) - score before controls |
| **LxI(Res)** | Likelihood × Impact (Residual) - score after controls |
| **Status** | Open, In Progress, or Closed |
| **User Email** | Email of user who created risk (Admin view only) |
| **Actions** | Edit/Delete buttons (if you have permission) |

### Adding a New Risk

1. **Click "Add Risk" button** (top right)
2. **Fill in Risk Details**:
   - **Risk Code**: Unique identifier (e.g., "R001")
   - **Risk Title**: Short descriptive title (max 120 chars)
   - **Risk Description**: Detailed description
   - **Division**: Select from dropdown
   - **Department**: Select from dropdown
   - **Category**: Select from dropdown
   - **Owner**: Person responsible
   - **Likelihood (Inherent)**: 1-5 or 1-6 (before controls)
   - **Impact (Inherent)**: 1-5 or 1-6 (before controls)
   - **Status**: Open, In Progress, or Closed

3. **Add Controls** (Optional):
   - Click "Add Control"
   - Enter control description
   - Select target: Likelihood or Impact
   - Rate effectiveness (1-5 for each):
     - **Design**: How well designed is the control?
     - **Implementation**: How well implemented?
     - **Monitoring**: How well monitored?
     - **Effectiveness**: Overall effectiveness evaluation

4. **Click "Add Risk"**

### Editing a Risk

1. Click the **pencil icon** in the Actions column
2. Modify any fields
3. Add, edit, or remove controls
4. Click "Save Changes"

### Deleting a Risk

**For Edit Users:**
- Click the **trash icon**
- Your deletion request will be sent to admin for approval
- You'll receive notification when approved/rejected

**For Admin Users:**
- Click the **trash icon**
- The risk will be archived automatically
- You can permanently delete from Archive Management later

### Filtering Risks ✨ IMPROVED

**Tab-Based Filtering**: Each tab now has its own filter section for better organization.

In the Risk Register tab:

1. **Search Bar**: Type to search across all fields ✨ NEW
2. **Division Filter**: Multi-select divisions
3. **Department Filter**: Multi-select departments
4. **Category**: Select single category or "All"
5. **Period Filter**: Multi-select time periods (Q1 2025, FY2025, etc.) ✨ NEW
6. **Status**: Select single status or "All"
7. **Priority Toggle**: Show only priority-marked risks
8. **User Filter** (Admin only): Multi-select users

### Priority Selection

Use priority checkboxes to focus on specific risks:

1. **Check boxes** next to risks you want to focus on
2. **Select All**: Check box in header to select all visible risks
3. Priority-selected risks appear in:
   - **Heatmap tab**: Only selected risks plotted
   - **Control Register tab**: Only controls from selected risks

**Note**: Priority selection does NOT filter the Risk Register view itself.

### Sorting

Click any column header to sort:
- First click: Ascending order
- Second click: Descending order
- Sorting is indicated by an arrow icon

---

## Heatmap

### Overview
Visual representation of risks plotted by Likelihood vs Impact.

### Understanding the Heatmap

**Axes:**
- **Y-axis**: Likelihood (1-5 or 1-6)
- **X-axis**: Impact (1-5 or 1-6)

**Color Zones:**
- 🟢 **Green**: Low risk (1-6)
- 🟡 **Yellow**: Medium risk (8-12)
- 🟠 **Orange**: High risk (15-20)
- 🔴 **Red**: Very High risk (25-36)

**Risk Circles:**
- Hover over a circle to see risk details
- Circle shows risk code
- Position represents likelihood and impact

### Viewing Options

**Inherent Risk Heatmap:**
- Shows risks BEFORE controls are applied
- Uses Likelihood (Inherent) × Impact (Inherent)

**Residual Risk Heatmap:**
- Shows risks AFTER controls are applied
- Uses calculated residual scores based on control effectiveness

**Priority Filter:**
- By default shows ALL risks
- If you've selected priority risks, only those appear

### Heatmap Filtering ✨ IMPROVED

**Tab-Based Filters**: Heatmap now has its own filter section

1. **Search Bar**: Search for specific risks ✨ NEW
2. **Period Filter**: Multi-select time periods to view historical heatmaps ✨ NEW
3. **Status Filter**: Filter by Open, In Progress, or Closed
4. **Priority Toggle**: Show only priority-marked risks

**Note**: Period filtering in heatmap works independently from Risk Register filters.

---

## Control Register

### Overview
Lists all controls across risks with their effectiveness ratings.

### Columns

| Column | Description |
|--------|-------------|
| **Risk Code** | Associated risk identifier |
| **Control Description** | What the control does |
| **Target** | Likelihood or Impact |
| **Design** | Design effectiveness (1-5) |
| **Implementation** | Implementation quality (1-5) |
| **Monitoring** | Monitoring effectiveness (1-5) |
| **Effectiveness** | Overall evaluation (1-5) |

### Using the Control Register

1. **View all controls** or only controls from priority-selected risks
2. **Export** control data for reporting
3. **Identify gaps**: Look for low-scoring controls
4. **Track improvements**: Monitor control effectiveness over time

---

## Historical Risk Management

✨ **NEW in Version 3.0**

### Overview
Track and analyze how your risk landscape changes over time. View historical snapshots of risks by period and copy past risks to new periods.

### History Tab

Navigate to the **History** tab to access historical risk data.

#### Viewing Historical Risks

1. **Select a Period** from the dropdown:
   - Q1 2025, Q2 2025, Q3 2025, Q4 2025
   - FY2025, FY2026
   - Or any custom period you've used

2. **View Period Statistics**:
   - Total risks in that period
   - Risk distribution (Open/In Progress/Closed)
   - Average inherent risk score
   - Average residual risk score

3. **Browse Historical Risks**:
   - See complete risk details from that period
   - View associated controls
   - Compare risk scores over time

#### Viewing Risk Details

1. Click the **eye icon** next to any historical risk
2. A modal opens showing:
   - Complete risk information
   - **Period indicator** showing which quarter/year ✨ NEW
   - All controls with their effectiveness ratings
   - Inherent and residual scores
3. **Read-only view**: Historical risks cannot be edited directly

#### Copy to New Period ✨ NEW

**Purpose**: Quickly bring forward risks from a previous period to your current active register.

**How it works**:

1. **Select source period** with historical risks
2. Click **"Copy to New Period"** button
3. **Select target period** from dropdown
4. **Review and confirm**
5. System automatically:
   - Copies all risks from selected period
   - Includes all controls
   - **Generates unique risk codes** if duplicates exist
   - Adds risks to your active Risk Register

**Example Use Cases**:
- **Quarterly rollover**: Copy Q1 risks to Q2 for ongoing tracking
- **Annual planning**: Copy FY2025 risks to FY2026 as baseline
- **Risk templates**: Use past periods as templates for new projects

**Smart Duplicate Handling**:
- If a risk code already exists (e.g., "OPS-001")
- System automatically appends number (e.g., "OPS-001-1", "OPS-001-2")
- No manual intervention needed

**Best Practices**:
1. Review copied risks and update as needed
2. Adjust likelihood/impact for current period
3. Update control effectiveness ratings
4. Close risks that are no longer relevant

### Period-Based Heatmap Analysis

View how your risk heatmap looked in previous periods:

1. Navigate to **Heatmap** tab
2. Use **Period Filter** to select historical periods
3. **Multi-select** to compare multiple periods
4. Toggle between Inherent/Residual views
5. See risk distribution as it was in that period

**Use Cases**:
- Track risk reduction over time
- Compare quarterly risk landscapes
- Report on year-over-year improvements
- Demonstrate control effectiveness

### Period Display in Risk Editing ✨ NEW

When editing a risk from the Risk Register:
- Modal now shows **Period** field prominently
- Helps you understand which quarter/year you're viewing
- Especially useful when viewing historical heatmaps

---

## Incidents Module

✨ **NEW in Version 4.0** - Enterprise Risk Management Enhancement

### Overview
The Incidents Module provides comprehensive operational incident tracking and management, with intelligent AI-powered risk linking and control adequacy assessment.

### Accessing the Incidents Module

Navigate to the **Incidents** tab in the main navigation bar.

### Key Features

- **Comprehensive incident logging** with financial impact tracking
- **AI-powered risk linking** - Automatically suggest related risks
- **Control adequacy assessment** - AI evaluates if existing controls are sufficient
- **Statistics dashboard** - Real-time incident metrics
- **Search and filtering** - Find incidents quickly
- **CSV export** - Export incident data for reporting

---

### Recording an Incident

#### Step 1: Click "Report Incident" Button

Click the "+ Report Incident" button in the top right of the Incidents tab.

#### Step 2: Fill in Incident Details

**Basic Information:**
- **Title**: Short descriptive title (required)
- **Description**: Detailed description of what happened (required)
- **Incident Date**: When the incident occurred (required)
- **Reported By**: Your name (auto-filled)
- **Reporter Email**: Your email (auto-filled)

**Classification:**
- **Division**: Business division where incident occurred
- **Department**: Specific department
- **Incident Type**: Select from:
  - Loss Event
  - Near Miss
  - Control Failure
  - Breach
  - Other

**Severity & Impact:**
- **Severity**: 1-5 scale (1=Minimal, 5=Critical)
- **Financial Impact**: Monetary loss in your currency
- **Impact Description**: Describe the consequences

**Investigation:**
- **Status**: Current status
  - Reported (initial)
  - Under Investigation
  - Resolved
  - Closed
- **Root Cause**: Analysis of what caused the incident
- **Corrective Actions**: Steps taken to prevent recurrence

#### Step 3: Save the Incident

Click "Save Incident" to create the record.

---

### Viewing and Managing Incidents

#### Incident Statistics

At the top of the Incidents tab, you'll see key metrics:

| Metric | Description |
|--------|-------------|
| **Total Incidents** | Count of all incidents |
| **Open** | Incidents in Reported or Under Investigation status |
| **High Severity** | Incidents rated 4 or 5 |
| **Financial Impact** | Total monetary losses |

#### Incidents Table

The table displays all incidents with:
- S/N (sequential number)
- Title
- Date
- Type
- Severity (color-coded badge)
- Financial Impact
- Status (color-coded badge)
- Actions (View/Edit/Delete)

#### Filtering Incidents

Use the filter section to narrow down incidents:

1. **Search Bar**: Search across title, description, root cause, and actions
2. **Status Filter**: Filter by status (All, Reported, Under Investigation, Resolved, Closed)
3. **Type Filter**: Filter by incident type
4. **Severity Filter**: Filter by severity level (1-5)

---

### AI-Powered Risk Linking

✨ One of the most powerful features of the Incidents Module.

#### How It Works

When you view an incident detail:

1. Click the **"View Details"** button (eye icon) on any incident
2. Navigate to the **"Risk Linking"** tab in the dialog
3. Click **"Suggest Risks with AI"** button

**The AI analyzes:**
- Incident title and description
- Incident type and severity
- Impact description
- Root cause analysis
- Your existing risks in the Risk Register

**AI provides:**
- **Suggested risk links** with confidence scores (High/Medium/Low)
- **Rationale** explaining why each risk is relevant
- **One-click linking** to connect incident to risks

#### Linking Manually

You can also link risks manually:

1. In the Risk Linking tab, use the **search bar** to find risks
2. Click **"Link Risk"** next to the relevant risk
3. The risk is immediately linked

#### View Linked Risks

- See all linked risks in the Risk Linking tab
- Each linked risk shows: code, title, category, and inherent score
- **Unlink** by clicking the "Unlink" button

---

### AI Control Adequacy Assessment

✨ **Advanced Feature** - Evaluate if your controls are sufficient

#### How It Works

After linking an incident to risks:

1. In the incident detail dialog, navigate to **"Control Assessment"** tab
2. Click **"Assess Control Adequacy"** button

**The AI analyzes:**
- The incident details (what went wrong)
- All controls associated with the linked risks
- Control effectiveness ratings (DIME scores)
- Incident severity and financial impact

**AI provides:**
- **Overall Adequacy Score**: 0-100 scale
  - 80-100: Controls are adequate
  - 60-79: Controls need minor improvements
  - 40-59: Controls need significant improvements
  - 0-39: Controls are inadequate
- **Detailed Assessment**: Explanation of findings
- **Actionable Recommendations**: Specific improvements needed
- **Priority Level**: Critical / High / Medium / Low

#### Acting on Recommendations

Use the AI assessment to:
1. **Update control effectiveness ratings** in the Risk Register
2. **Add new controls** to address gaps
3. **Implement recommended actions**
4. **Track improvements** by re-assessing after changes

---

### Incident Analytics

View incident trends and patterns:

- **Incident timeline**: Visualize when incidents occur
- **Severity distribution**: See breakdown by severity
- **Type distribution**: Common incident types
- **Financial impact trends**: Track losses over time
- **Status workflow**: Monitor investigation progress

---

### Exporting Incident Data

Click the **"Export CSV"** button to export all visible incidents:

**Export includes:**
- All incident fields
- Linked risk codes
- Financial impact
- Status and dates
- Investigation details

Use exported data for:
- Board reporting
- Regulatory submissions
- Insurance claims
- Trend analysis
- External audits

---

### Best Practices for Incidents

**1. Report Promptly**
- Record incidents as soon as they're discovered
- Include all available information
- Update as investigation progresses

**2. Use AI Risk Linking**
- Always run AI suggestions for risk linking
- Review AI rationale carefully
- Link to multiple risks if applicable

**3. Assess Control Adequacy**
- Run assessment after linking risks
- Implement AI recommendations
- Re-assess after improvements

**4. Maintain Status Updates**
- Move status through workflow:
  - Reported → Under Investigation → Resolved → Closed
- Document progress in corrective actions

**5. Financial Impact**
- Be as accurate as possible with monetary losses
- Include indirect costs when significant
- Update if impact increases

**6. Root Cause Analysis**
- Go deep - find the true root cause
- Don't stop at symptoms
- Use "5 Whys" technique

---

## Interactive Analytics Dashboard

✨ **NEW in Version 4.0** - Executive-Level Insights

### Overview

The Analytics Dashboard provides interactive visualizations and executive metrics for risk oversight and decision-making.

### Accessing Analytics

Navigate to the **Analytics** tab in the main navigation bar.

---

### Dashboard Sections

#### 1. Executive Metrics (Top Row)

Real-time key performance indicators:

| Metric | Description |
|--------|-------------|
| **Total Risks** | Count of all active risks |
| **Critical Risks** | Risks with residual score ≥ 20 (Severe) |
| **High Risks** | Risks with residual score 12-19 (High) |
| **Avg Inherent Score** | Average risk level before controls |
| **Avg Residual Score** | Average risk level after controls |
| **Control Effectiveness** | Percentage reduction from controls |
| **Total Incidents** | All incidents recorded |
| **Open Incidents** | Incidents not yet closed |
| **High Severity Incidents** | Incidents rated 4 or 5 |
| **Financial Impact** | Total monetary losses |

#### 2. Risk Distribution by Severity

**Interactive bar chart** showing risk counts by severity level:

- **Severe** (score ≥ 20) - Red
- **High** (score 12-19) - Orange
- **Moderate** (score 6-11) - Yellow
- **Low** (score 3-5) - Light green
- **Minimal** (score < 3) - Dark green

**🔄 Interactive Features:**
- **Click any bar** to drill down and see all risks in that severity level
- **Modal dialog** opens showing complete risk details
- **View risk details** including controls, scores, and status
- **Close dialog** to return to dashboard

#### 3. Risk Distribution by Category

**Interactive bar chart** showing risk counts by category:

- Operational
- Financial
- Strategic
- Compliance
- Technology
- Market
- Reputational
- etc.

**🔄 Interactive Features:**
- **Click any bar** to see all risks in that category
- Filter by severity within category
- Export category-specific data

#### 4. Risk Distribution by Division

**Interactive bar chart** showing risk counts by business division:

**🔄 Interactive Features:**
- **Click any bar** to see all risks in that division
- Compare risk profiles across divisions
- Identify high-risk business units

#### 5. Risk Category Positioning Map

**Interactive heatmap-style grid** showing risks by category and severity:

**Severity Rows:**
- Severe (≥20)
- High (12-19)
- Moderate (6-11)
- Low (3-5)
- Minimal (<3)

**Category Columns:**
- All your risk categories

**🔄 Interactive Features:**
- **Click any cell** to see intermediate view showing risk count
- **Click count badge** to drill down to see all risks in that cell
- **Color-coded** by severity for quick assessment
- **Navigate back** using breadcrumb trail

**Use Cases:**
- **Executive reporting**: Present risk landscape visually
- **Board meetings**: Show risk concentrations
- **Strategic planning**: Identify which categories need attention
- **Compliance**: Demonstrate risk coverage

#### 6. Trend Analysis

Track how your risk profile changes over time:

**Period-over-Period Comparison:**
- Risk count by period
- Average scores by period
- Severity distribution changes
- New vs. closed risks

**Filters:**
- Select time periods to compare
- Filter by division or category
- View inherent vs. residual trends

#### 7. Control Effectiveness Analysis

Visual breakdown of control performance:

**DIME Score Distribution:**
- Design effectiveness
- Implementation quality
- Monitoring effectiveness
- Overall effectiveness evaluation

**Low-Performing Controls:**
- Table of controls with scores < 2.0
- Associated risks
- Target (Likelihood/Impact)
- Average DIME score

**Use this to:**
- Identify control gaps
- Prioritize control improvements
- Track control maturity over time

---

### Using Analytics for Decision-Making

#### For Executive Leadership

**Monthly Board Report:**
1. Show **Executive Metrics** - high-level KPIs
2. Present **Risk Category Positioning Map** - visual landscape
3. Highlight **Critical and High Risks** - drill down from charts
4. Review **Incident trends** - operational performance
5. Demonstrate **Control Effectiveness** - risk mitigation progress

#### For Risk Managers

**Weekly Review:**
1. Check **Severe and High Risk counts** - any increases?
2. Review **Distribution by Division** - which units need attention?
3. Analyze **Control Effectiveness** - which controls need improvement?
4. Monitor **Open Incidents** - investigation progress?

#### For Auditors

**Quarterly Audit:**
1. **Risk Category Positioning Map** - coverage across all categories?
2. **Control Effectiveness Analysis** - adequate control environment?
3. **Trend Analysis** - is risk profile improving?
4. **Incident patterns** - recurring issues?

---

### Period Filtering in Analytics

Use the **Period Filter** to analyze historical data:

1. **Select period(s)** from dropdown (Q1 2025, FY2025, etc.)
2. **Multi-select** to compare periods
3. All charts and metrics update automatically
4. **Export** period-specific data

---

## AI Features

✨ **ENHANCED in Version 4.0** - Powered by Claude AI & Gemini

MinRisk includes three powerful AI features to accelerate your risk management process:

1. **AI Risk Generator** - Generate context-specific risks
2. **AI Chat Assistant** - Conversational risk management help
3. **AI Control Suggester** - Get control recommendations

---

### AI Risk Generator

**Purpose**: Quickly generate relevant risks based on your industry and business context.

#### How to Use

1. **Navigate to Risk Register tab**
2. Look for the **"AI Risk Generator"** card at the top
3. Click **"Generate Risks"** button

#### Fill in Context

Provide context to help AI generate relevant risks:

**Required:**
- **Industry / Sector**: e.g., Banking, Insurance, Healthcare, Manufacturing

**Optional (improves quality):**
- **Business Unit / Department**: e.g., Trading Desk, IT Operations
- **Risk Category**: Focus on specific category (or leave as "All")
- **Number of Risks**: How many to generate (1-10, default: 5)
- **Additional Context**: Any specific concerns, projects, or focus areas

**Example Context:**
```
Industry: Banking
Business Unit: Digital Banking Platform
Risk Category: Technology
Additional Context: We're launching a new mobile banking app with
biometric authentication. Concerned about cybersecurity, data privacy,
and system availability.
```

#### Review AI-Generated Risks

AI generates risks with:
- **Risk Title**: Clear, concise title
- **Risk Description**: Detailed description of the risk scenario
- **Category**: Automatically assigned category
- **Severity**: Initial severity assessment (Critical/High/Medium/Low)
- **Likelihood**: Expected likelihood level

#### Select and Save Risks

1. **Review** each generated risk
2. **Check the box** next to risks you want to keep
3. **Click "Save Selected"** button
4. Risks are added to your Risk Register with:
   - Unique risk code (AI-001, AI-002, etc.)
   - Default values (you can edit later)
   - Status: Open

#### Edit After Saving

After saving AI-generated risks:
1. Find them in Risk Register (look for AI- prefix)
2. **Edit** to refine details
3. **Adjust** likelihood and impact
4. **Add controls** to mitigate the risk
5. **Assign owner** and set period

#### Best Practices

**Be Specific in Context:**
- ✅ "Cloud-based SaaS platform for healthcare providers, handling PHI data, integrating with EHR systems"
- ❌ "Software project"

**Use Additional Context:**
- Mention specific technologies
- Note regulatory requirements
- Highlight unique challenges
- Reference recent incidents or concerns

**Review Carefully:**
- AI suggestions are starting points
- Customize to your organization
- May need to split or combine risks
- Add organization-specific details

---

### AI Chat Assistant

**Purpose**: Get conversational help with risk management tasks and questions.

#### How to Use

1. **Navigate to any tab** in MinRisk
2. Look for the **floating chat icon** in the bottom right corner
3. Click to open the **AI Chat Assistant**

#### What You Can Ask

**Risk Analysis:**
- "Analyze the risks in my Financial category"
- "What are my highest severity risks?"
- "Compare inherent vs residual scores"

**Control Recommendations:**
- "Suggest controls for risk OPS-001"
- "How can I improve this control?"
- "What DIME score should I aim for?"

**Best Practices:**
- "How should I structure my risk register?"
- "What's a good risk naming convention?"
- "How often should I review risks?"

**Incident Response:**
- "Help me write a root cause analysis for this incident"
- "What corrective actions should I consider?"
- "Is this incident linked to any risks?"

**Reporting:**
- "How do I present risk data to executives?"
- "What metrics should I track?"
- "Help me create a board report"

#### Chat Features

**Context-Aware:**
- AI has access to your current view
- Can reference risks on screen
- Understands your filters and selections

**Interactive:**
- Ask follow-up questions
- Request clarification
- Iterate on suggestions

**Actionable:**
- Get specific recommendations
- Receive step-by-step guidance
- Copy suggested text

#### Example Conversations

**Example 1: Risk Analysis**
```
You: What are my top 3 risks by residual score?

AI: Based on your current Risk Register, your top 3 risks by
residual score are:

1. OPS-007: System Downtime (Score: 20)
   - Critical severity, needs immediate attention
   - Consider adding redundancy controls

2. FIN-003: Payment Processing Failure (Score: 16)
   - High severity, review transaction monitoring

3. TECH-011: Cybersecurity Breach (Score: 15)
   - High severity, assess firewall effectiveness

Would you like me to suggest controls for any of these?
```

**Example 2: Control Guidance**
```
You: How do I improve the DIME score for my access control?

AI: To improve DIME scores for access controls, focus on:

**Design (D):**
- Implement role-based access control (RBAC)
- Use principle of least privilege
- Document access policies clearly

**Implementation (I):**
- Ensure all systems enforce access rules
- Regular access reviews
- Automated provisioning/deprovisioning

**Monitoring (M):**
- Log all access attempts
- Alert on unusual access patterns
- Regular access reports to management

**Effectiveness (E):**
- Conduct access audits quarterly
- Test with penetration testing
- Review after any security incidents

Start with improving implementation and monitoring for
quick wins.
```

#### Tips for Best Results

**Be Specific:**
- Reference specific risk codes
- Mention exact concerns
- Provide context

**Use Natural Language:**
- Ask questions conversationally
- No need for special syntax
- Rephrase if unclear

**Iterate:**
- Ask follow-up questions
- Request more detail
- Explore alternatives

---

### AI Control Suggester

**Purpose**: Get AI recommendations for effective controls to mitigate specific risks.

#### How to Use

1. **Open a risk** for editing in the Risk Register
2. Scroll to the **Controls section**
3. Click the **"✨ AI Control Suggester"** button

#### What AI Analyzes

The AI examines:
- **Risk title and description**
- **Risk category** (Operational, Financial, etc.)
- **Likelihood and impact levels**
- **Your existing controls** (if any)
- **Industry best practices**

#### AI Recommendations

AI provides:

**Suggested Controls:**
- **Description**: What the control does
- **Target**: Whether it reduces Likelihood or Impact
- **Rationale**: Why this control is effective
- **Implementation Tips**: How to implement

**Example Output:**
```
Risk: Cybersecurity Breach (TECH-011)

Recommended Controls:

1. Multi-Factor Authentication (MFA)
   Target: Likelihood
   Rationale: Prevents unauthorized access even if passwords
   are compromised
   Implementation: Deploy MFA for all user accounts, starting
   with admin and privileged users

2. Security Information and Event Management (SIEM)
   Target: Impact
   Rationale: Enables rapid detection and response to reduce
   breach impact
   Implementation: Implement SIEM solution with 24/7 monitoring
   and automated alerting

3. Regular Vulnerability Scanning
   Target: Likelihood
   Rationale: Identifies and remediates vulnerabilities before
   exploitation
   Implementation: Weekly automated scans, monthly manual
   assessments, patch within 30 days
```

#### Adding Suggested Controls

1. **Review** each suggested control
2. **Click "Add Control"** button next to the suggestion
3. Control is automatically added with:
   - Description pre-filled
   - Target (Likelihood/Impact) set
   - Initial DIME scores (you should review and adjust)

4. **Adjust DIME scores** based on your actual implementation

#### Rating Controls (DIME Framework)

For each control, rate 1-5 on four dimensions:

**Design (D):**
- How well is the control designed?
- Does it address the root cause?
- Is it appropriate for the risk level?

**Implementation (I):**
- How well is it implemented?
- Is it fully operational?
- Are there gaps in coverage?

**Monitoring (M):**
- How well is it monitored?
- Are violations detected promptly?
- Is there regular oversight?

**Effectiveness Evaluation (E):**
- Overall effectiveness assessment
- Does it achieve intended results?
- Evidence of risk reduction?

**Rating Scale:**
- **5 - Fully Effective**: Control operates as designed, fully implemented
- **4 - Substantially Effective**: Minor gaps, mostly effective
- **3 - Moderately Effective**: Some gaps, partially effective
- **2 - Partially Effective**: Significant gaps, limited effectiveness
- **1 - Not Effective**: Control not working or not implemented

#### Control Effectiveness Calculation

**For each control:**
```
Average DIME = (D + I + M + E) / 4
```

**Impact on residual risk:**
```
If control targets Likelihood:
  Residual Likelihood = Inherent Likelihood - (Avg DIME / 2)

If control targets Impact:
  Residual Impact = Inherent Impact - (Avg DIME / 2)
```

**Multiple controls** compound the effect.

#### Best Practices for Controls

**1. Balance Likelihood and Impact Controls**
- Don't focus only on one dimension
- Some risks need both types
- Consider cost-benefit

**2. Be Honest in DIME Ratings**
- Accurate ratings drive better decisions
- Low scores highlight improvement areas
- Re-rate after enhancements

**3. Document Implementation**
- Note specific tools/processes used
- Document monitoring procedures
- Track effectiveness evidence

**4. Regular Review**
- Review DIME scores quarterly
- Update after control changes
- Re-run AI suggestions if risk changes

---

## Configuration

**⚠️ Admin Only**

### Overview
Customize your MinRisk instance for your organization's needs.

### Accessing Configuration

1. Click **"Configure"** button (top right)
2. Configuration dialog opens

### Risk Matrix Setup

**Choose matrix size:**
- **5×5 Matrix**: Scores from 1-25
- **6×6 Matrix**: Scores from 1-36

**⚠️ Important**:
- Changing from 6×6 to 5×5 is blocked if any risks use level 6
- You must archive or modify those risks first

### Label Customization

**Likelihood Labels**: Customize what each level means
- Examples: "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"

**Impact Labels**: Customize impact descriptions
- Examples: "Negligible", "Minor", "Moderate", "Major", "Severe"

### Prepopulated Lists

**Divisions**: Comma-separated list
- Example: "IT, Finance, Operations, HR, Legal"

**Departments**: Comma-separated list
- Example: "Software Dev, Infrastructure, Security, Help Desk"

**Categories**: Comma-separated list
- Example: "Operational, Financial, Strategic, Compliance, Reputational"

### Removing Config Values

**⚠️ Protection in Place (Coming Soon)**:
- If you try to remove a value that's in use by risks:
  - System shows warning: "X risks use this value"
  - Options:
    - **Archive & Remove**: Archives all affected risks, then removes value
    - **Cancel**: Keep the value

### Saving Configuration

1. Make your changes
2. Click **"Save Configuration"**
3. Changes apply immediately

**Note**: Configuration changes affect all users in your organization.

---

## Admin Dashboard

**👑 Admin Only**

### Accessing Admin Dashboard

1. Click **"Admin"** tab (top navigation)
2. Three sub-tabs appear: Users, Archive, Audit Trail

---

### Users Tab

#### User Management

**View All Users:**
- See all registered users
- Status: Pending, Approved, Rejected
- Role: Admin, Edit, View Only
- Risk/Control counts per user
- Creation date

#### Approving New Users

1. **Pending users** appear with yellow status
2. **Select role** from dropdown:
   - View Only
   - Edit
   - Admin
3. **Click the dropdown** to approve with selected role
4. **Or click X** to reject the user

**Best Practice**: Start new users with "View Only" and upgrade as needed.

#### Managing Existing Users

**Approved Users:**
- Show green ✓ Approved status
- Display current role
- Show risk and control counts
- **Delete option available** (X button)

**Deleting a User** (Enhanced - Coming Soon):
When you click delete, you'll have options:
1. **Transfer risks to another user**: Select a user from dropdown
2. **Archive all risks**: Risks moved to archive
3. **Cancel**: Don't delete

**Rejected Users:**
- Show red ✗ Rejected status
- Can be deleted permanently

#### Statistics

**Dashboard Cards:**
- **Total Users**: Count of all users
- **Total Risks**: Across all users
- **Total Controls**: All control measures
- **Avg per User**: Average risks per user

---

### Archive Tab

#### Overview
View and manage all archived risks and controls.

#### Why Risks Are Archived

Risks move to archive when:
- **User deleted**: User account was deleted
- **Config change**: Risk used removed division/department/category
- **Admin archived**: Manually archived by admin
- **User requested**: User requested deletion, admin approved

#### Viewing Archives

**Archive Statistics:**
- Total archived risks
- Count by archive reason
- Archive date ranges

**Archive Table:**
- Risk Code
- Risk Title
- Division
- Archived Date
- Archive Reason (color-coded)
- Actions

#### Viewing Archived Risk Details

1. Click **eye icon** for a risk
2. View complete details:
   - All risk fields
   - Associated controls
   - Archive metadata:
     - Reason for archiving
     - Who archived it
     - Archive notes
     - Original creation/update dates

#### Permanently Deleting from Archive

**⚠️ Permanent Deletion - Cannot Be Undone**

1. Click **trash icon** for archived risk
2. **Warning dialog** appears:
   - Shows risk code and title
   - Requires password confirmation
3. **Enter your password**
4. **Click "Permanently Delete"**
5. Risk and all controls are **permanently removed** from database

**When to Permanently Delete:**
- After retention period has expired
- Confirmed no longer needed for audit purposes
- System cleanup/maintenance

**Best Practice**: Keep archives for audit trail unless there's a specific reason to permanently delete.

---

### Audit Trail Tab

#### Overview
Complete log of all system actions and changes.

#### What's Logged

**Action Types:**
- **create**: New risk/control/user created
- **update**: Existing item modified
- **delete**: Item deleted
- **archive**: Item moved to archive
- **restore**: Item restored from archive (future)
- **config_change**: Configuration modified
- **user_approved**: User account approved
- **user_rejected**: User account rejected
- **user_deleted**: User account deleted
- **request_deletion**: Deletion requested
- **permanent_delete**: Permanent deletion from archive

**Logged Information:**
- Who performed the action
- When it was performed
- What type of entity (risk, control, user, config)
- Entity identifier (risk code, user email, etc.)
- Old values (before change)
- New values (after change)
- Additional metadata

#### Using Audit Trail

**Filter Options:**
1. **Search**: By user email, risk code, action, entity
2. **Action Type**: Filter by specific actions
3. **Entity Type**: Filter by risk, control, user, config
4. **Load Limit**: 50, 100, 200, or 500 most recent entries

**Statistics Cards:**
- Total entries shown
- Count by action type
- Creates, updates, deletes/archives

**Viewing Details:**
1. Click **eye icon** for entry
2. View complete details:
   - Full user information
   - Action metadata
   - Previous values (JSON)
   - New values (JSON)
   - Additional context
   - IP address (if available)

#### Audit Trail Best Practices

**Regular Reviews:**
- Weekly review of critical actions
- Monthly comprehensive review
- Investigate unusual patterns

**Use Cases:**
- Compliance reporting
- Security investigations
- Understanding change history
- Training and process improvement

---

## Best Practices

### Risk Management

1. **Consistent Risk Codes**
   - Use a naming convention: "R001", "R002", etc.
   - Or category-based: "FIN-001", "OPS-001"
   - Document your convention

2. **Regular Updates**
   - Review risks quarterly minimum
   - Update status as risks progress
   - Add new controls as they're implemented

3. **Control Effectiveness**
   - Be honest in control ratings
   - Document reasons for low scores
   - Track improvements over time

4. **Priority Focus**
   - Use priority selection for executive reporting
   - Focus on high-risk items first
   - Review priorities monthly

### Configuration Management

1. **Plan Before Changing**
   - Understand impact of configuration changes
   - Communicate changes to team
   - Archive or modify affected risks first

2. **Consistent Categories**
   - Align with industry standards
   - Keep categories broad enough to be useful
   - Avoid too many categories (max 10-12)

3. **Matrix Size**
   - Start with 5×5 (simpler)
   - Move to 6×6 only if needed for granularity
   - Don't change frequently

### Admin Operations

1. **User Approval**
   - Verify user identity before approving
   - Start with View Only for new users
   - Upgrade based on demonstrated need

2. **Archive Management**
   - Keep archives for compliance period
   - Don't permanently delete without reason
   - Document reason when deleting

3. **Audit Trail**
   - Review regularly for suspicious activity
   - Export for compliance reporting
   - Train team on proper usage

### Data Quality

1. **Complete Information**
   - Fill all required fields
   - Provide meaningful descriptions
   - Assign clear ownership

2. **Regular Cleanup**
   - Close risks that are no longer relevant
   - Archive outdated risks
   - Remove duplicate entries

3. **Training**
   - Train all users on proper usage
   - Document your organization's conventions
   - Regular refresher sessions

---

## Troubleshooting

### Login Issues

**Problem**: Can't log in after signup
- **Solution**: Wait for admin approval. Contact your admin if pending too long.

**Problem**: Forgot password
- **Solution**: Use "Forgot password?" link on login screen.

### Permission Issues

**Problem**: Can't add/edit risks
- **Solution**: Your role is View Only. Request admin to upgrade your role.

**Problem**: Can't access configuration
- **Solution**: Only admins can access configuration.

### Data Issues

**Problem**: Risk code already exists
- **Solution**: Risk codes must be unique per user. Try a different code.

**Problem**: Can't delete risk
- **Solution**: Edit users must request deletion (admin approval required).

**Problem**: Can't change matrix from 6×6 to 5×5
- **Solution**: Archive or modify risks that use level 6 first.

### Performance Issues

**Problem**: Application slow with many risks
- **Solution**: Use filters to reduce displayed data. Close old risks.

**Problem**: Heatmap not loading
- **Solution**: Reduce priority selection. Try refreshing the page.

---

## Keyboard Shortcuts

### General
- **Ctrl/Cmd + K**: Quick search (future feature)
- **Esc**: Close dialogs
- **Tab**: Navigate form fields
- **Enter**: Submit forms

### Navigation
- **1-5**: Switch between main tabs (future feature)

---

## Support

### Getting Help

**Contact Administrator**: For account and permission issues
**Documentation**: Refer to this manual
**Feedback**: Report issues via your organization's process

### Reporting Bugs

When reporting issues, include:
1. What you were trying to do
2. What happened instead
3. Your user role
4. Browser and version
5. Steps to reproduce

---

## Appendix

### Risk Score Calculation

**Inherent Risk Score:**
```
Score = Likelihood (Inherent) × Impact (Inherent)
```

**Residual Risk Score:**
```
Control Effectiveness = Average of (Design + Implementation + Monitoring + Effectiveness Evaluation) / 4

If Control targets Likelihood:
  Residual Likelihood = Inherent Likelihood - (Control Effectiveness / 2)

If Control targets Impact:
  Residual Impact = Inherent Impact - (Control Effectiveness / 2)

Residual Score = Residual Likelihood × Residual Impact
```

### Risk Matrix Reference

**5×5 Matrix:**
- Low: 1-6 (Green)
- Medium: 8-12 (Yellow)
- High: 15-20 (Orange)
- Very High: 25 (Red)

**6×6 Matrix:**
- Low: 1-9 (Green)
- Medium: 12-18 (Yellow)
- High: 20-30 (Orange)
- Very High: 36 (Red)

### Data Export Format

When exporting data (future feature):
- **CSV**: Comma-separated values
- **Excel**: .xlsx format
- **PDF**: For reporting

---

## Glossary

**Control**: A measure taken to reduce likelihood or impact of a risk

**Inherent Risk**: Risk level before any controls are applied

**Residual Risk**: Risk level after controls are applied

**Priority Risk**: Risk selected for focused attention in heatmap and control register

**Archive**: Storage for deleted or obsolete risks, kept for audit purposes

**Audit Trail**: Log of all actions taken in the system

**Risk Matrix**: Visual representation of likelihood vs impact

**Risk Score**: Numerical value of likelihood × impact

**RLS (Row Level Security)**: Database security ensuring users only see their organization's data

**Soft Delete**: Marking as deleted without permanent removal (vs hard delete)

---

**Version**: 4.0
**Last Updated**: October 26, 2025
**For**: MinRisk Application

---

## What's New in Version 4.0

### 🎯 Major Release - Enterprise Risk Management & AI Enhancement

Version 4.0 represents a significant evolution of MinRisk, adding comprehensive incident management, advanced analytics, and powerful AI capabilities.

---

### Phase 1 - Incidents Module ✨ NEW

**Comprehensive Incident Tracking & Management**

- ✨ **Full Incident Lifecycle Management**: Record, investigate, resolve, and close incidents
- ✨ **AI-Powered Risk Linking**: Automatically suggest which risks relate to each incident
- ✨ **Control Adequacy Assessment**: AI evaluates if your controls are sufficient after incidents
- ✨ **Financial Impact Tracking**: Monitor monetary losses from incidents
- ✨ **Incident Analytics**: Real-time statistics and trends
- ✨ **Root Cause Analysis**: Document investigation findings
- ✨ **Corrective Actions Tracking**: Record remediation steps
- ✨ **Advanced Search & Filtering**: Find incidents by status, type, severity
- ✨ **CSV Export**: Export incident data for reporting

**Database enhancements:**
- New `incidents` table with full audit trail
- Automatic incident count synchronization to risks
- Real-time risk-incident relationship tracking

---

### Phase 2 - AI Features ✨ ENHANCED

**Powered by Claude AI & Google Gemini**

#### 1. AI Risk Generator
- **Context-aware risk generation**: Provide industry and business context
- **Intelligent categorization**: Auto-assigns categories and severity
- **Batch generation**: Generate 1-10 risks at once
- **Sequential risk codes**: Automatically assigns AI-001, AI-002, etc.
- **One-click save**: Add generated risks directly to your register

#### 2. AI Chat Assistant
- **Conversational interface**: Ask questions in natural language
- **Context-aware**: Understands your current view and filters
- **Risk analysis**: Get insights about your risk profile
- **Control recommendations**: Ask for specific control guidance
- **Best practices**: Get advice on risk management processes
- **Reporting help**: Assistance with executive presentations

#### 3. AI Control Suggester
- **Risk-specific recommendations**: Tailored to each risk's profile
- **Likelihood & Impact targeting**: Controls for both dimensions
- **Implementation guidance**: Practical tips for deploying controls
- **DIME framework support**: Helps structure control assessments
- **Industry best practices**: Suggests proven control methodologies

---

### Interactive Analytics Dashboard ✨ NEW

**Executive-Level Risk Intelligence**

#### Visual Analytics
- ✨ **Executive Metrics**: 10 real-time KPIs at a glance
- ✨ **Risk Distribution by Severity**: Interactive bar chart with drill-down
- ✨ **Risk Distribution by Category**: Clickable chart by risk type
- ✨ **Risk Distribution by Division**: Business unit risk comparison
- ✨ **Risk Category Positioning Map**: Interactive heatmap-style grid
- ✨ **Trend Analysis**: Period-over-period risk profile changes
- ✨ **Control Effectiveness Analysis**: DIME score distribution and gaps

#### Interactive Features
- **Click any chart** to drill down to filtered risk details
- **View complete risk information** in modal dialogs
- **Navigate back** with intuitive breadcrumb trails
- **Period filtering** for historical analysis
- **Export capabilities** for reporting

#### Use Cases
- **Board presentations**: Visual risk landscape overview
- **Executive dashboards**: Real-time metrics and KPIs
- **Risk committee meetings**: Category and division analysis
- **Audit support**: Control effectiveness demonstration
- **Compliance reporting**: Risk coverage and trends

---

### Additional Enhancements

**User Experience:**
- 🎨 **Improved navigation**: Clearer tab structure
- 🎨 **Better filtering**: Tab-specific filter sections
- 🎨 **Enhanced modals**: Richer detail views
- 🎨 **Color-coded badges**: Instant severity recognition

**Performance:**
- ⚡ **Optimized queries**: Faster data loading
- ⚡ **Indexed searches**: Quicker filtering
- ⚡ **Reduced bundle size**: Faster initial load

**Security:**
- 🔒 **Enhanced RLS policies**: Stricter data isolation
- 🔒 **AI audit logging**: Track all AI operations
- 🔒 **Incident access control**: Role-based permissions

---

### Version History

**Version 4.0 (October 26, 2025)** - Current Release
- Incidents Module with AI-powered risk linking
- Interactive Analytics Dashboard
- AI Risk Generator, Chat Assistant, Control Suggester
- Production deployment ready

**Version 3.0 (October 2025)**
- Historical Risk Management with History tab
- Copy to New Period functionality
- Tab-based filtering improvements
- Period display in risk editing

**Version 2.0 (September 2025)**
- Time period tracking and filtering
- Enhanced audit trail with CSV export
- Toast notification system
- Admin role management improvements

**Version 1.0 (August 2025)**
- Core risk management system
- Risk Register with CRUD operations
- Heatmap visualizations
- Control Register with DIME framework
- User authentication and authorization
- Admin dashboard

---

*This manual covers the current implementation. For technical documentation, see IMPLEMENTATION-STATUS.md and ERM-IMPLEMENTATION-PROGRESS.md.*
