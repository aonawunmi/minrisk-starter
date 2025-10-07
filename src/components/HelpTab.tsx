// src/components/HelpTab.tsx
// Help and User Manual tab for Admin Dashboard

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, ChevronRight, ChevronDown } from 'lucide-react';

export default function HelpTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(sections.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const filterContent = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                User Manual & Help
              </CardTitle>
              <CardDescription>
                Complete guide to using MinRisk effectively
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-sm text-blue-600 hover:underline"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-blue-600 hover:underline"
              >
                Collapse All
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search manual... (e.g., 'delete risk', 'archive', 'permissions')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Manual Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const matchesSearch = !searchQuery || filterContent(section.title + ' ' + section.content);

          if (!matchesSearch) return null;

          return (
            <Card key={section.id}>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {section.icon}
                    {section.title}
                  </CardTitle>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Version Info */}
      <Card>
        <CardContent className="pt-6 text-center text-sm text-gray-500">
          <p>MinRisk User Manual - Version 1.0</p>
          <p>Last Updated: January 2025</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Manual content sections
const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    content: `
      <h3>First Time Login</h3>
      <ol>
        <li><strong>Access the Application</strong> - Navigate to your MinRisk URL</li>
        <li><strong>Sign Up</strong> - Click "Sign up", enter email and password</li>
        <li><strong>Wait for Admin Approval</strong> - Your account starts with "Pending" status</li>
        <li><strong>Log In</strong> - Once approved, sign in with your credentials</li>
      </ol>

      <h3>User Roles</h3>
      <ul>
        <li><strong>🔍 View Only</strong> - Can view all data, cannot make changes</li>
        <li><strong>✏️ Edit</strong> - Can add and edit risks, request deletions</li>
        <li><strong>👑 Admin</strong> - Full system access including configuration and user management</li>
      </ul>
    `,
  },
  {
    id: 'risk-register',
    title: 'Risk Register',
    icon: '📋',
    content: `
      <h3>Adding a New Risk</h3>
      <ol>
        <li>Click <strong>"Add Risk"</strong> button</li>
        <li>Fill in required fields:
          <ul>
            <li><strong>Risk Code</strong> - Unique identifier (e.g., "R001")</li>
            <li><strong>Risk Title</strong> - Short description (max 120 chars)</li>
            <li><strong>Division, Department, Category</strong> - Select from dropdowns</li>
            <li><strong>Relevant Period</strong> - Time period for this risk (e.g., "Q1 2025", "FY2025")</li>
            <li><strong>Likelihood & Impact</strong> - Rate 1-5 or 1-6</li>
          </ul>
        </li>
        <li>Add controls if needed (click "Add Control")</li>
        <li>Click <strong>"Add Risk"</strong></li>
      </ol>

      <h3>Editing Risks</h3>
      <p>Click the pencil icon in the Actions column, modify fields, and save.</p>

      <h3>Save Confirmation</h3>
      <p>When you create or update a risk, you'll see a green confirmation message in the bottom-right corner:</p>
      <ul>
        <li><strong>✓ Risk [code] created successfully!</strong> - Appears when new risk is added</li>
        <li><strong>✓ Risk [code] updated successfully!</strong> - Appears when risk is edited</li>
      </ul>
      <p>The notification automatically disappears after 3 seconds. All changes are also logged in the Audit Trail.</p>

      <h3>Deleting Risks</h3>
      <ul>
        <li><strong>Edit users:</strong> Click trash icon → Request sent to admin for approval</li>
        <li><strong>Admin users:</strong> Click trash icon → Risk archived immediately</li>
      </ul>

      <h3>Filtering & Searching</h3>
      <p>Use the filter bar to narrow down risks by:</p>
      <ul>
        <li>Search text (searches all fields)</li>
        <li>Division (multi-select)</li>
        <li>Department (multi-select)</li>
        <li>Period (multi-select) - Filter by time period (e.g., Q1 2025, FY2025)</li>
        <li>Category</li>
        <li>Status</li>
        <li>User (admin only, multi-select)</li>
      </ul>

      <h3>Priority Selection</h3>
      <p>Check boxes next to risks to mark them as priority. Priority risks appear in:</p>
      <ul>
        <li>Heatmap view</li>
        <li>Control Register view</li>
      </ul>
      <p><strong>Note:</strong> Priority selection does NOT filter the Risk Register itself.</p>
    `,
  },
  {
    id: 'heatmap',
    title: 'Heatmap',
    icon: '🎯',
    content: `
      <h3>Understanding the Heatmap</h3>
      <p>Visual representation of risks plotted by Likelihood vs Impact.</p>

      <h4>Color Zones:</h4>
      <ul>
        <li><span style="color: green;">🟢 Green</span> - Low risk (1-6 or 1-9)</li>
        <li><span style="color: #eab308;">🟡 Yellow</span> - Medium risk (8-12 or 12-18)</li>
        <li><span style="color: orange;">🟠 Orange</span> - High risk (15-20 or 20-30)</li>
        <li><span style="color: red;">🔴 Red</span> - Very High risk (25 or 36)</li>
      </ul>

      <h4>View Options:</h4>
      <ul>
        <li><strong>Inherent Risk:</strong> Before controls are applied</li>
        <li><strong>Residual Risk:</strong> After controls are applied</li>
      </ul>

      <h4>Period Filtering:</h4>
      <p>Use the "Filter by Period" dropdown to view risks for specific time periods:</p>
      <ul>
        <li>Select one or multiple periods (e.g., Q1 2025, Q2 2025, FY2025)</li>
        <li>Leave empty to show all periods</li>
        <li>Selected periods are displayed in the header</li>
      </ul>

      <p>Hover over circles to see risk details. Click to navigate to that risk.</p>
    `,
  },
  {
    id: 'controls',
    title: 'Control Register',
    icon: '🛡️',
    content: `
      <h3>About Controls</h3>
      <p>Controls are measures taken to reduce risk likelihood or impact.</p>

      <h4>Control Effectiveness Ratings (1-5):</h4>
      <ul>
        <li><strong>Design:</strong> How well designed is the control?</li>
        <li><strong>Implementation:</strong> How well implemented?</li>
        <li><strong>Monitoring:</strong> How well monitored?</li>
        <li><strong>Effectiveness:</strong> Overall evaluation</li>
      </ul>

      <h4>Adding Controls:</h4>
      <ol>
        <li>When adding/editing a risk, click "Add Control"</li>
        <li>Enter control description</li>
        <li>Select target: <strong>Likelihood</strong> or <strong>Impact</strong></li>
        <li>Rate all four effectiveness dimensions</li>
      </ol>

      <h4>How Controls Reduce Risk:</h4>
      <p>Control effectiveness is averaged (Design + Implementation + Monitoring + Effectiveness) ÷ 4</p>
      <p>This average reduces the target score (Likelihood or Impact) by half the effectiveness value.</p>
    `,
  },
  {
    id: 'ai-assistant',
    title: 'AI Assistant',
    icon: '🤖',
    content: `
      <h3>Generating Risk Suggestions</h3>
      <ol>
        <li>Navigate to <strong>AI Assistant</strong> tab</li>
        <li>Describe your project/process:
          <ul>
            <li>Type of business/project</li>
            <li>Key activities</li>
            <li>Technologies used</li>
            <li>Stakeholders</li>
          </ul>
        </li>
        <li>Click <strong>"Generate Risk Suggestions"</strong></li>
        <li>Review AI-generated risks</li>
        <li>Select risks you want to add (checkboxes)</li>
        <li>Fill in Category and Division for each</li>
        <li>Click <strong>"Add Selected to Register"</strong></li>
        <li>Edit risks to add risk codes, scores, and controls</li>
      </ol>

      <h4>Tips for Better Results:</h4>
      <ul>
        <li>Be specific and detailed</li>
        <li>Include industry and regulatory context</li>
        <li>Mention specific concerns (security, compliance, etc.)</li>
        <li>Try rephrasing if results aren't useful</li>
      </ul>
    `,
  },
  {
    id: 'configuration',
    title: 'Configuration (Admin Only)',
    icon: '⚙️',
    content: `
      <h3>Accessing Configuration</h3>
      <p>Click <strong>"Configure"</strong> button (top right). Admin only.</p>

      <h3>Risk Matrix Setup</h3>
      <ul>
        <li><strong>5×5 Matrix:</strong> Scores from 1-25</li>
        <li><strong>6×6 Matrix:</strong> Scores from 1-36</li>
      </ul>
      <p><strong>⚠️ Warning:</strong> Changing from 6×6 to 5×5 is blocked if any risks use level 6.</p>

      <h3>Label Customization</h3>
      <p>Customize Likelihood and Impact labels to match your organization's terminology.</p>

      <h3>Prepopulated Lists</h3>
      <p>Enter comma-separated values for:</p>
      <ul>
        <li><strong>Divisions:</strong> Business units</li>
        <li><strong>Departments:</strong> Teams/departments</li>
        <li><strong>Categories:</strong> Risk categories</li>
      </ul>

      <h3>Removing Config Values (Coming Soon)</h3>
      <p>Protection will be added to prevent deleting values that are in use by existing risks.</p>
    `,
  },
  {
    id: 'admin-users',
    title: 'User Management (Admin)',
    icon: '👥',
    content: `
      <h3>Approving New Users</h3>
      <ol>
        <li>Go to <strong>Admin</strong> tab → <strong>Users</strong></li>
        <li>Pending users show yellow status</li>
        <li>Select role from dropdown: View Only, Edit, or Admin</li>
        <li>Dropdown selection approves the user</li>
        <li>Or click <strong>X</strong> to reject</li>
      </ol>

      <h4>Role Descriptions:</h4>
      <ul>
        <li><strong>View Only:</strong> Read-only access</li>
        <li><strong>Edit:</strong> Can add/edit risks, request deletions</li>
        <li><strong>Admin:</strong> Full access including config and user management</li>
      </ul>

      <h3>Deleting Users</h3>
      <p>Click the X button next to approved/rejected users.</p>
      <p><strong>⚠️ Warning:</strong> This deletes the user and ALL their risks and controls.</p>
      <p><strong>Coming Soon:</strong> Enhanced deletion with transfer/archive options.</p>
    `,
  },
  {
    id: 'archive',
    title: 'Archive Management (Admin)',
    icon: '📦',
    content: `
      <h3>About Archives</h3>
      <p>Archived risks are preserved for audit purposes. They include:</p>
      <ul>
        <li>Risks from deleted users</li>
        <li>Risks using removed config values</li>
        <li>Manually archived risks</li>
        <li>Risks from approved deletion requests</li>
      </ul>

      <h3>Viewing Archives</h3>
      <ol>
        <li>Go to <strong>Admin</strong> → <strong>Archive</strong></li>
        <li>Browse archived risks table</li>
        <li>Click <strong>eye icon</strong> to view details</li>
      </ol>

      <h3>Permanently Deleting</h3>
      <p><strong>⚠️ Cannot be undone!</strong></p>
      <ol>
        <li>Click <strong>trash icon</strong> for archived risk</li>
        <li>Warning dialog appears</li>
        <li><strong>Enter your password</strong> to confirm</li>
        <li>Click <strong>"Permanently Delete"</strong></li>
      </ol>

      <h4>When to Permanently Delete:</h4>
      <ul>
        <li>Retention period expired</li>
        <li>Confirmed no longer needed</li>
        <li>System cleanup</li>
      </ul>

      <p><strong>Best Practice:</strong> Keep archives for audit trail unless specific reason to delete.</p>
    `,
  },
  {
    id: 'bulk-deletion',
    title: 'Bulk Deletion (Admin)',
    icon: '🗑️',
    content: `
      <h3>About Bulk Deletion</h3>
      <p>Delete multiple risks at once - either archive them (safe) or permanently delete them.</p>

      <h3>How to Use Bulk Deletion</h3>
      <ol>
        <li>Go to <strong>Admin</strong> → <strong>Bulk Deletion</strong></li>
        <li>Use filters to find risks to delete:
          <ul>
            <li>Search text (searches all fields)</li>
            <li>Division, Department, Category</li>
            <li>Status, User</li>
          </ul>
        </li>
        <li>Select risks using checkboxes</li>
        <li>Click <strong>"Delete Selected Risks"</strong> button</li>
        <li>Choose deletion type:
          <ul>
            <li><strong>Archive (Recommended):</strong> Safe option, risks can be viewed later</li>
            <li><strong>Permanent Delete:</strong> ⚠️ Cannot be undone!</li>
          </ul>
        </li>
      </ol>

      <h3>Archive Option</h3>
      <ul>
        <li>Risks moved to archive table</li>
        <li>Can be viewed in Archive tab</li>
        <li>Optional reason field for documentation</li>
        <li>All controls preserved</li>
      </ul>

      <h3>Permanent Delete Option</h3>
      <p><strong>⚠️ WARNING:</strong> This action cannot be undone!</p>
      <ul>
        <li>Risks deleted from database completely</li>
        <li>All controls deleted as well</li>
        <li>Type <strong>DELETE</strong> (in capitals) to confirm</li>
        <li>Progress bar shows deletion status</li>
      </ul>

      <h4>When to Use Each Option:</h4>
      <ul>
        <li><strong>Archive:</strong> End of quarter cleanup, outdated risks, general maintenance</li>
        <li><strong>Permanent:</strong> Test data, duplicates, data that must be removed for compliance</li>
      </ul>

      <p><strong>Best Practice:</strong> Always use Archive unless you have a specific reason for permanent deletion.</p>
    `,
  },
  {
    id: 'audit-trail',
    title: 'Audit Trail (Admin)',
    icon: '📜',
    content: `
      <h3>About Audit Trail</h3>
      <p>Complete log of all system actions and changes, including:</p>
      <ul>
        <li>Risk/control creation, updates, deletion</li>
        <li>User approvals and rejections</li>
        <li>Bulk deletion operations</li>
        <li>Archive operations</li>
        <li>Permanent deletions</li>
      </ul>

      <h3>Viewing Audit Trail</h3>
      <ol>
        <li>Go to <strong>Admin</strong> → <strong>Audit Trail</strong></li>
        <li>Use filters (8 total filters in 2 rows):
          <ul>
            <li><strong>Search:</strong> Search by user email, risk code, or action</li>
            <li><strong>Risk Code:</strong> Filter by specific risk code</li>
            <li><strong>User:</strong> Filter by specific user email</li>
            <li><strong>Action Type:</strong> create, update, delete, archive, etc.</li>
            <li><strong>Entity Type:</strong> risk, control, user</li>
            <li><strong>Start Date:</strong> Show entries from this date onwards</li>
            <li><strong>End Date:</strong> Show entries up to this date</li>
            <li><strong>Load Limit:</strong> 50, 100, 200, or 500 entries</li>
          </ul>
        </li>
        <li>Click <strong>eye icon</strong> to view entry details</li>
        <li>Click <strong>"Export CSV"</strong> button to download filtered results</li>
      </ol>

      <h3>Exporting Audit Trail</h3>
      <p>Export your filtered audit trail data to CSV for reporting:</p>
      <ul>
        <li>Apply filters to narrow down the data you want</li>
        <li>Click <strong>"Export CSV"</strong> button in the header</li>
        <li>File downloads with name format: <code>audit-trail-YYYY-MM-DD.csv</code></li>
        <li>CSV includes: Timestamp, Action, Entity Type, Entity Code, User Email, Details</li>
      </ul>

      <h3>Entry Details</h3>
      <p>Details are shown in formatted cards for easy reading:</p>
      <ul>
        <li><strong>For risks:</strong> Shows all risk fields in organized layout</li>
        <li><strong>For controls:</strong> Shows control details and effectiveness ratings</li>
        <li><strong>For updates:</strong> Side-by-side comparison of before/after values</li>
        <li><strong>For user actions:</strong> Shows user details and role changes</li>
      </ul>

      <h3>Use Cases</h3>
      <ul>
        <li>Compliance reporting</li>
        <li>Security investigations</li>
        <li>Understanding change history</li>
        <li>Training and process improvement</li>
        <li>Tracking who deleted/archived risks</li>
      </ul>
    `,
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    icon: '💡',
    content: `
      <h3>Risk Management</h3>
      <ul>
        <li><strong>Consistent Codes:</strong> Use a naming convention (R001, R002, etc.)</li>
        <li><strong>Regular Updates:</strong> Review risks quarterly minimum</li>
        <li><strong>Honest Ratings:</strong> Be realistic in control effectiveness scores</li>
        <li><strong>Priority Focus:</strong> Use priority selection for executive reporting</li>
      </ul>

      <h3>Configuration</h3>
      <ul>
        <li><strong>Plan Changes:</strong> Understand impact before modifying</li>
        <li><strong>Consistent Categories:</strong> Align with industry standards</li>
        <li><strong>Matrix Size:</strong> Start with 5×5, only change if necessary</li>
      </ul>

      <h3>Admin Operations</h3>
      <ul>
        <li><strong>User Approval:</strong> Verify identity, start with View Only</li>
        <li><strong>Archive Management:</strong> Keep for compliance period</li>
        <li><strong>Audit Trail:</strong> Review regularly for security</li>
      </ul>

      <h3>Data Quality</h3>
      <ul>
        <li><strong>Complete Information:</strong> Fill all fields thoroughly</li>
        <li><strong>Regular Cleanup:</strong> Close outdated risks</li>
        <li><strong>Training:</strong> Train all users on proper usage</li>
      </ul>
    `,
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: '🔧',
    content: `
      <h3>Login Issues</h3>
      <p><strong>Can't log in after signup:</strong><br>
      Wait for admin approval. Contact admin if pending too long.</p>

      <p><strong>Forgot password:</strong><br>
      Use "Forgot password?" link on login screen.</p>

      <h3>Permission Issues</h3>
      <p><strong>Can't add/edit risks:</strong><br>
      Your role is View Only. Request admin to upgrade.</p>

      <p><strong>Can't access configuration:</strong><br>
      Only admins can access configuration.</p>

      <h3>Data Issues</h3>
      <p><strong>Risk code already exists:</strong><br>
      Risk codes must be unique per user. Try different code.</p>

      <p><strong>Can't delete risk:</strong><br>
      Edit users must request deletion (admin approval required).</p>

      <p><strong>Can't change from 6×6 to 5×5:</strong><br>
      Archive or modify risks that use level 6 first.</p>

      <h3>Getting Support</h3>
      <ul>
        <li>Contact your administrator for account issues</li>
        <li>Refer to this manual for usage questions</li>
        <li>Report bugs through your organization's process</li>
      </ul>
    `,
  },
];
