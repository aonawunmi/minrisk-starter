# MinRisk User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Risk Register](#risk-register)
4. [Heatmap](#heatmap)
5. [Control Register](#control-register)
6. [Historical Risk Management](#historical-risk-management) ✨ NEW
7. [AI Assistant](#ai-assistant)
8. [Configuration](#configuration)
9. [Admin Dashboard](#admin-dashboard)
10. [Archive Management](#archive-management)
11. [Audit Trail](#audit-trail)
12. [Best Practices](#best-practices)

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

## AI Assistant

### Overview
Generate risk suggestions using AI based on your project or process description.

### How to Use

1. **Navigate to AI Assistant tab**
2. **Describe your project/process** in the text box
   - Be specific about:
     - Type of business/project
     - Key activities
     - Technologies used
     - Stakeholders involved

3. **Click "Generate Risk Suggestions"**
4. **Review AI-generated risks**:
   - Each suggestion includes:
     - Risk Title
     - Risk Description

5. **Select risks to add**:
   - Check boxes for risks you want to keep
   - For each selected risk, fill in:
     - Category
     - Division

6. **Click "Add Selected to Register"**
7. **Edit the risks** in Risk Register to:
   - Assign risk code
   - Set likelihood and impact
   - Add controls
   - Assign owner

### Tips for Better AI Results

- **Be detailed**: "Implementing cloud-based CRM for sales team" vs "New system"
- **Include context**: Industry, size, regulatory requirements
- **Specify concerns**: Security, compliance, performance issues
- **Rephrase if needed**: Try different descriptions for better results

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

**Version**: 3.0
**Last Updated**: October 2025
**For**: MinRisk Application

---

## What's New in Version 3.0

### Phase 3B - Period Management (October 2025)
- ✨ **Historical Risk Management**: New History tab for viewing past risk snapshots
- ✨ **Copy to New Period**: Quickly copy risks from previous periods
- ✨ **Smart Duplicate Handling**: Auto-generates unique codes when copying
- ✨ **Tab-Based Filtering**: Cleaner UX with filters in each tab
- ✨ **Heatmap Search**: Search risks directly in heatmap view
- ✨ **Period Display**: See period when editing risks
- ✨ **Organization Config**: Fixed RLS so all users see same dropdowns

### Previous Updates
- **Phase 2D**: Admin role management improvements
- **Phase 2C**: Toast notification system
- **Phase 2B**: Enhanced audit trail with CSV export
- **Phase 2A**: Time period tracking and filtering
- **Phase 1**: Core risk management system

---

*This manual covers the current implementation.*
