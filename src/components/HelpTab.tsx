// src/components/HelpTab.tsx
// Help and User Manual tab for Admin Dashboard
// Updated with VaR Analysis section

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
          <p>MinRisk User Manual - Version 4.1</p>
          <p>Last Updated: October 28, 2025</p>
          <p className="mt-2 text-xs">✨ Now with Incidents, Analytics, Intelligence Monitor & Enhanced AI</p>
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
    `,
  },
  {
    id: 'incidents-module',
    title: 'Incidents Module ✨ NEW',
    icon: '🚨',
    content: `
      <h3>About Incidents</h3>
      <p>Track operational incidents, link them to risks, and assess control adequacy using AI.</p>

      <h3>Recording an Incident</h3>
      <ol>
        <li>Navigate to <strong>Incidents</strong> tab</li>
        <li>Click <strong>"Report Incident"</strong> button</li>
        <li>Fill in incident details:
          <ul>
            <li><strong>Title & Description:</strong> What happened</li>
            <li><strong>Incident Date:</strong> When it occurred</li>
            <li><strong>Type:</strong> Loss Event, Near Miss, Control Failure, Breach, Other</li>
            <li><strong>Severity:</strong> 1-5 scale (1=Minimal, 5=Critical)</li>
            <li><strong>Financial Impact:</strong> Monetary loss amount</li>
            <li><strong>Status:</strong> Reported → Under Investigation → Resolved → Closed</li>
            <li><strong>Root Cause:</strong> Analysis of what caused it</li>
            <li><strong>Corrective Actions:</strong> Steps taken to prevent recurrence</li>
          </ul>
        </li>
        <li>Click <strong>"Save Incident"</strong></li>
      </ol>

      <h3>AI-Powered Risk Linking</h3>
      <ol>
        <li>Click <strong>"View Details"</strong> (eye icon) on any incident</li>
        <li>Go to <strong>"Risk Linking"</strong> tab</li>
        <li>Click <strong>"Suggest Risks with AI"</strong></li>
        <li>AI analyzes the incident and suggests related risks with confidence scores</li>
        <li>Click <strong>"Link"</strong> to connect incident to risk</li>
        <li>Or use search bar to manually link risks</li>
      </ol>

      <h3>AI Control Adequacy Assessment</h3>
      <ol>
        <li>After linking risks, go to <strong>"Control Assessment"</strong> tab</li>
        <li>Click <strong>"Assess Control Adequacy"</strong></li>
        <li>AI evaluates:
          <ul>
            <li><strong>Overall Adequacy Score:</strong> 0-100 (80+ = adequate)</li>
            <li><strong>Assessment Details:</strong> What's working, what's not</li>
            <li><strong>Recommendations:</strong> Specific improvements needed</li>
            <li><strong>Priority Level:</strong> Critical / High / Medium / Low</li>
          </ul>
        </li>
        <li>Use recommendations to improve controls in Risk Register</li>
      </ol>

      <h3>Incident Statistics</h3>
      <p>View real-time metrics at top of Incidents tab:</p>
      <ul>
        <li><strong>Total Incidents:</strong> Count of all incidents</li>
        <li><strong>Open:</strong> Reported or Under Investigation</li>
        <li><strong>High Severity:</strong> Incidents rated 4 or 5</li>
        <li><strong>Financial Impact:</strong> Total monetary losses</li>
      </ul>

      <h3>Filtering & Export</h3>
      <ul>
        <li>Search across all incident fields</li>
        <li>Filter by Status, Type, Severity</li>
        <li>Click <strong>"Export CSV"</strong> for reporting</li>
      </ul>
    `,
  },
  {
    id: 'analytics-dashboard',
    title: 'Analytics Dashboard ✨ NEW',
    icon: '📊',
    content: `
      <h3>About Analytics</h3>
      <p>Interactive visualizations and executive metrics for risk oversight and decision-making.</p>

      <h3>Accessing Analytics</h3>
      <p>Navigate to <strong>Analytics</strong> tab in main navigation.</p>

      <h3>Executive Metrics (Top Row)</h3>
      <p>10 real-time KPIs at a glance:</p>
      <ul>
        <li><strong>Total Risks:</strong> Count of all active risks</li>
        <li><strong>Critical Risks:</strong> Residual score ≥ 20</li>
        <li><strong>High Risks:</strong> Residual score 12-19</li>
        <li><strong>Avg Inherent/Residual Scores:</strong> Before/after controls</li>
        <li><strong>Control Effectiveness:</strong> % reduction from controls</li>
        <li><strong>Incident Metrics:</strong> Total, open, high severity, financial impact</li>
      </ul>

      <h3>Interactive Charts</h3>
      <p>All charts are clickable for drill-down analysis:</p>

      <h4>Risk Distribution by Severity:</h4>
      <ul>
        <li><strong>Click any bar</strong> → See all risks in that severity level</li>
        <li>Color-coded: Red (Severe), Orange (High), Yellow (Moderate), Green (Low/Minimal)</li>
        <li>Modal shows complete risk details with controls</li>
      </ul>

      <h4>Risk Distribution by Category:</h4>
      <ul>
        <li>Operational, Financial, Strategic, Compliance, etc.</li>
        <li>Click bars to filter and view risks by category</li>
      </ul>

      <h4>Risk Distribution by Division:</h4>
      <ul>
        <li>Compare risk profiles across business units</li>
        <li>Click to see division-specific risks</li>
      </ul>

      <h4>Risk Category Positioning Map:</h4>
      <ul>
        <li>Interactive heatmap-style grid</li>
        <li><strong>Click any cell</strong> → See count badge</li>
        <li><strong>Click count</strong> → View all risks in that cell</li>
        <li>Navigate back with breadcrumb trail</li>
        <li>Color-coded by severity for quick assessment</li>
      </ul>

      <h3>Trend Analysis</h3>
      <ul>
        <li>Period-over-period risk profile changes</li>
        <li>Track risk counts and scores over time</li>
        <li>Severity distribution trends</li>
      </ul>

      <h3>Control Effectiveness Analysis</h3>
      <ul>
        <li>DIME score distribution across all controls</li>
        <li>Low-performing controls table (scores < 2.0)</li>
        <li>Identify gaps and prioritize improvements</li>
      </ul>

      <h3>Period Filtering</h3>
      <ul>
        <li>Multi-select periods (Q1 2025, FY2025, etc.)</li>
        <li>All charts update automatically</li>
        <li>Historical data analysis</li>
      </ul>

      <h3>Use Cases</h3>
      <ul>
        <li><strong>Board Presentations:</strong> Show Risk Category Positioning Map</li>
        <li><strong>Executive Dashboards:</strong> Use Executive Metrics</li>
        <li><strong>Risk Committee:</strong> Review distribution charts</li>
        <li><strong>Audit Support:</strong> Control Effectiveness Analysis</li>
      </ul>
    `,
  },
  {
    id: 'ai-features',
    title: 'AI Features (Claude) ✨ ENHANCED',
    icon: '🤖',
    content: `
      <h3>Overview</h3>
      <p>MinRisk includes powerful AI features powered by <strong>Claude AI (Anthropic)</strong>:</p>
      <ol>
        <li><strong>AI Risk Generator</strong> - Generate context-specific risks</li>
        <li><strong>AI Chat Assistant</strong> - Conversational help and guidance</li>
        <li><strong>AI Control Suggester</strong> - Get control recommendations</li>
      </ol>

      <h3>1. AI Risk Generator</h3>
      <p><strong>Purpose:</strong> Quickly generate relevant risks based on your industry and business context.</p>

      <h4>How to Use:</h4>
      <ol>
        <li>Go to <strong>Risk Register</strong> tab</li>
        <li>Look for <strong>"AI Risk Generator"</strong> card at top</li>
        <li>Click <strong>"Generate Risks"</strong> button</li>
        <li>Fill in context:
          <ul>
            <li><strong>Industry/Sector</strong> (required): Banking, Insurance, Healthcare, etc.</li>
            <li><strong>Business Unit</strong> (optional): Trading Desk, IT Operations, etc.</li>
            <li><strong>Risk Category</strong> (optional): Focus on specific category</li>
            <li><strong>Number of Risks</strong>: 1-10 (default: 5)</li>
            <li><strong>Additional Context</strong>: Specific concerns or projects</li>
          </ul>
        </li>
        <li>Click <strong>"Generate Risks"</strong></li>
        <li>Review AI-generated risks (title, description, category, severity)</li>
        <li>Check boxes next to risks you want</li>
        <li>Click <strong>"Save Selected"</strong></li>
        <li>Risks added with codes AI-001, AI-002, etc.</li>
      </ol>

      <h4>Tips:</h4>
      <ul>
        <li><strong>Be specific:</strong> "Cloud SaaS platform for healthcare" vs "Software"</li>
        <li><strong>Mention technologies:</strong> AWS, Azure, specific tools</li>
        <li><strong>Note regulations:</strong> GDPR, HIPAA, SOX, etc.</li>
        <li><strong>Describe challenges:</strong> Recent incidents, concerns</li>
      </ul>

      <h3>2. AI Chat Assistant</h3>
      <p><strong>Purpose:</strong> Get conversational help with risk management tasks.</p>

      <h4>How to Use:</h4>
      <ol>
        <li>Look for <strong>floating chat icon</strong> (bottom-right corner)</li>
        <li>Click to open AI Chat Assistant</li>
        <li>Ask questions in natural language</li>
        <li>Get instant responses</li>
        <li>Continue conversation with follow-ups</li>
      </ol>

      <h4>What You Can Ask:</h4>
      <ul>
        <li><strong>Risk Analysis:</strong> "What are my highest severity risks?"</li>
        <li><strong>Control Recommendations:</strong> "Suggest controls for risk OPS-001"</li>
        <li><strong>Best Practices:</strong> "How should I structure my risk register?"</li>
        <li><strong>Incident Response:</strong> "Help me write root cause analysis"</li>
        <li><strong>Reporting:</strong> "How do I present risks to executives?"</li>
      </ul>

      <h4>Features:</h4>
      <ul>
        <li><strong>Context-aware:</strong> Understands your current view</li>
        <li><strong>Interactive:</strong> Ask follow-up questions</li>
        <li><strong>Actionable:</strong> Get specific recommendations</li>
      </ul>

      <h3>3. AI Control Suggester</h3>
      <p><strong>Purpose:</strong> Get AI recommendations for effective controls to mitigate risks.</p>

      <h4>How to Use:</h4>
      <ol>
        <li>Open a risk for editing in Risk Register</li>
        <li>Scroll to <strong>Controls</strong> section</li>
        <li>Click <strong>"✨ AI Control Suggester"</strong> button</li>
        <li>AI analyzes:
          <ul>
            <li>Risk title and description</li>
            <li>Risk category and severity</li>
            <li>Your existing controls</li>
            <li>Industry best practices</li>
          </ul>
        </li>
        <li>Review suggested controls:
          <ul>
            <li><strong>Description:</strong> What the control does</li>
            <li><strong>Target:</strong> Likelihood or Impact</li>
            <li><strong>Rationale:</strong> Why it's effective</li>
            <li><strong>Implementation Tips:</strong> How to implement</li>
          </ul>
        </li>
        <li>Click <strong>"Add Control"</strong> for each suggestion</li>
        <li>Adjust DIME scores based on your implementation</li>
      </ol>

      <h4>Control Ratings (DIME):</h4>
      <ul>
        <li><strong>Design (D):</strong> How well designed?</li>
        <li><strong>Implementation (I):</strong> How well implemented?</li>
        <li><strong>Monitoring (M):</strong> How well monitored?</li>
        <li><strong>Effectiveness (E):</strong> Overall evaluation?</li>
      </ul>
      <p>Rate each 1-5: 1=Not Effective, 2=Partially, 3=Moderately, 4=Substantially, 5=Fully</p>

      <h3>AI Model Used</h3>
      <ul>
        <li><strong>Claude 3.5 Sonnet:</strong> Advanced AI from Anthropic, optimized for complex reasoning</li>
        <li><strong>Risk Management Focused:</strong> Prompts specifically tuned for ERM and compliance</li>
        <li><strong>Reliable & Accurate:</strong> High-quality outputs with strong contextual understanding</li>
      </ul>

      <h3>Best Practices</h3>
      <ul>
        <li><strong>Review all suggestions:</strong> AI is a starting point, not final answer</li>
        <li><strong>Customize for your org:</strong> Adapt to your specific context</li>
        <li><strong>Be specific in prompts:</strong> More context = better results</li>
        <li><strong>Iterate:</strong> Rephrase if results aren't useful</li>
        <li><strong>Professional review:</strong> Have risk experts validate AI output</li>
      </ul>

      <p><strong>⚠️ Important:</strong> All AI suggestions should be reviewed by qualified risk management professionals before implementation.</p>
    `,
  },
  {
    id: 'intelligence-monitor',
    title: 'Risk Intelligence Monitor ✨ NEW',
    icon: '🎯',
    content: `
      <h3>About Intelligence Monitor</h3>
      <p>Automatically monitors external events and generates AI-powered risk intelligence alerts linked to your risk register.</p>

      <h3>Alert Treatment Workflow</h3>
      <p>Accepting an alert adds it to a <strong>Treatment Log</strong> where you can review and manually apply changes. This gives you control over when and how alerts affect your risk register.</p>

      <h4>Step 1: Review Alert</h4>
      <ol>
        <li>Go to <strong>Intelligence</strong> tab → <strong>Pending</strong> alerts</li>
        <li>Click <strong>"Review"</strong> on any alert</li>
        <li>You'll see:
          <ul>
            <li>Risk code and description</li>
            <li>Event details</li>
            <li>AI reasoning</li>
            <li>Suggested likelihood change</li>
          </ul>
        </li>
      </ol>

      <h4>Step 2: Accept or Reject</h4>
      <ul>
        <li><strong>Accept:</strong> Adds alert to treatment log for manual application</li>
        <li><strong>Reject:</strong> Dismisses the alert with a reason</li>
      </ul>

      <h4>Step 3: Apply Treatment (for accepted alerts)</h4>
      <ol>
        <li>Go to <strong>"Accepted"</strong> tab</li>
        <li>Review accepted alerts</li>
        <li>For each alert:
          <ul>
            <li>Review the suggested change</li>
            <li>Add treatment notes (optional but recommended)</li>
            <li>Click <strong>"Apply to Risk Register"</strong></li>
            <li>Risk likelihood is updated</li>
            <li>Alert marked as "Applied"</li>
          </ul>
        </li>
      </ol>

      <h3>Treatment Notes Best Practices</h3>
      <p>When applying an alert, document:</p>
      <ul>
        <li>Why you're accepting the suggested change</li>
        <li>Any additional analysis you did</li>
        <li>Related controls you're implementing</li>
        <li>Date you expect to see improvement</li>
      </ul>
      <p><strong>Example:</strong> "Accepted +1 likelihood increase for STR-CYB-001. Industry trend shows ransomware attacks increasing 40% in financial sector. Initiated emergency security audit and MFA rollout. Will reassess in 30 days after controls are active."</p>

      <h3>Bulk Delete Pending Alerts</h3>
      <p>Delete ALL pending alerts at once. Useful when:</p>
      <ul>
        <li>You have many outdated alerts</li>
        <li>Starting fresh after system changes</li>
        <li>Clearing test data</li>
      </ul>

      <h4>How to Use:</h4>
      <ol>
        <li>Go to <strong>Intelligence</strong> tab</li>
        <li>Check the pending alerts count</li>
        <li>Click <strong>"Delete All Pending"</strong> button (red, top right)</li>
        <li>Confirm deletion</li>
        <li>All pending alerts are permanently removed</li>
      </ol>
      <p><strong>⚠️ Warning:</strong> This cannot be undone! Accepted/rejected alerts are NOT deleted.</p>

      <h3>Risk Descriptions in Alerts</h3>
      <p>Alert cards and review dialogs now show:</p>
      <ul>
        <li>Risk Code (e.g., "STR-CYB-001")</li>
        <li>Risk Title (e.g., "Increased Cyber Threat Landscape")</li>
        <li>Risk Description (full risk details)</li>
      </ul>
      <p>This helps you understand the risk without switching screens for better context and faster decision-making.</p>

      <h3>Workflow Comparison</h3>
      <h4>Old Workflow (Automatic):</h4>
      <ol>
        <li>Alert Created</li>
        <li>Review Alert</li>
        <li>Accept (checkbox: "Apply to Risk")</li>
        <li>Risk Likelihood AUTOMATICALLY Updated ⚠️</li>
      </ol>

      <h4>New Workflow (Manual):</h4>
      <ol>
        <li>Alert Created</li>
        <li>Review Alert</li>
        <li>Accept → Goes to Treatment Log</li>
        <li>Review Treatment Log</li>
        <li>Add Treatment Notes</li>
        <li>MANUALLY Apply to Risk Register ✓</li>
        <li>Risk Likelihood Updated</li>
      </ol>

      <h3>Frequently Asked Questions</h3>
      <p><strong>Q: What happens to existing accepted alerts?</strong><br>
      A: They're grandfathered in. New accepted alerts will use the new workflow.</p>

      <p><strong>Q: Can I still auto-apply alerts?</strong><br>
      A: No, manual application is now required for all new alerts. This ensures proper documentation and review.</p>

      <p><strong>Q: Where do I see applied alerts?</strong><br>
      A: In the "Accepted" tab, alerts show:<br>
      ✓ Applied (green) - Already in risk register<br>
      Pending Application (yellow) - Need to apply</p>

      <p><strong>Q: Do I have to add treatment notes?</strong><br>
      A: No, treatment notes are optional but highly recommended for audit purposes.</p>

      <p><strong>Q: Can I bulk apply alerts?</strong><br>
      A: Not currently. Each alert must be individually reviewed and applied to ensure proper consideration.</p>

      <p><strong>Q: What if I accept an alert by mistake?</strong><br>
      A: Simply don't apply it from the treatment log. It won't affect your risk register until you manually apply it.</p>

      <p><strong>Q: Can I delete accepted alerts?</strong><br>
      A: No. Once accepted, alerts become part of your audit trail. You can only delete pending alerts.</p>

      <h3>Tips & Best Practices</h3>
      <ul>
        <li><strong>Review Daily:</strong> Check pending alerts daily to stay current</li>
        <li><strong>Use Treatment Notes:</strong> Always document your reasoning when applying alerts</li>
        <li><strong>Batch Review:</strong> Review multiple alerts, then apply them together during your weekly risk review</li>
        <li><strong>Monitor Trends:</strong> Look for patterns in alerts affecting the same risks</li>
        <li><strong>Cleanup Regularly:</strong> Use bulk delete to clear irrelevant pending alerts</li>
        <li><strong>Trust the AI... But Verify:</strong> AI suggestions are good starting points, but you make the final call</li>
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

      <h3>Changing User Roles</h3>
      <p>For approved users, you can change their role without deleting them:</p>
      <ol>
        <li>Find the approved user in the Users table</li>
        <li>Click the <strong>role dropdown</strong> in the Actions column</li>
        <li>Select the new role (View Only, Edit, or Admin)</li>
        <li>Role change is instant and logged to audit trail</li>
      </ol>
      <p><strong>Audit Trail:</strong> All role changes are logged with old role and new role for compliance.</p>

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
    id: 'var-analysis',
    title: 'VaR Analysis (Admin Only)',
    icon: '📊',
    content: `
      <h3>About VaR Analysis</h3>
      <p>Value at Risk (VaR) analysis uses the variance-covariance method to calculate portfolio risk metrics. This feature is available in the Admin dashboard under the "VaR Config" tab.</p>

      <h3>Setting Up VaR Scales</h3>
      <ol>
        <li>Go to <strong>Admin</strong> → <strong>VaR Config</strong></li>
        <li>Configure volatility thresholds (in %):</li>
        <ul>
          <li>Level 1-2 boundary (default: 5%)</li>
          <li>Level 2-3 boundary (default: 10%)</li>
          <li>Level 3-4 boundary (default: 15%)</li>
          <li>Level 4-5 boundary (default: 20%)</li>
          <li>Level 5-6 boundary (6×6 only, default: 25%)</li>
        </ul>
        <li>Configure portfolio value thresholds (in millions NGN):</li>
        <ul>
          <li>Level 1-2 boundary (default: ₦10M)</li>
          <li>Level 2-3 boundary (default: ₦50M)</li>
          <li>Level 3-4 boundary (default: ₦100M)</li>
          <li>Level 4-5 boundary (default: ₦500M)</li>
          <li>Level 5-6 boundary (6×6 only, default: ₦1B)</li>
        </ul>
        <li>Click <strong>"Save Configuration"</strong></li>
      </ol>

      <h3>Using VaR Sandbox</h3>
      <ol>
        <li>Download the Excel template from the VaR Sandbox tab</li>
        <li>Fill in three required sheets:
          <ul>
            <li><strong>Portfolio_Holdings:</strong> Your current positions (asset name, type, quantity, price)</li>
            <li><strong>Price_History:</strong> Historical prices (minimum 252 days for daily data)</li>
            <li><strong>Configuration:</strong> VaR parameters (confidence level, time horizon, frequency)</li>
          </ul>
        </li>
        <li>Upload the completed Excel file</li>
        <li>Configure parameters:
          <ul>
            <li>Confidence Level: 90%, 95%, 99%, or 99.9%</li>
            <li>Time Horizon: 1 day, 10 days, or 21 days</li>
            <li>Data Frequency: Detected automatically from file</li>
          </ul>
        </li>
        <li>Click <strong>"Calculate VaR"</strong></li>
      </ol>

      <h3>Understanding VaR Results</h3>
      <h4>Key Metrics:</h4>
      <ul>
        <li><strong>Portfolio VaR:</strong> Maximum expected loss at specified confidence level</li>
        <li><strong>Portfolio Volatility:</strong> Annualized volatility percentage</li>
        <li><strong>Diversification Benefit:</strong> Risk reduction from holding multiple assets</li>
        <li><strong>Likelihood Score:</strong> Mapped from portfolio volatility (1-5 or 1-6)</li>
        <li><strong>Impact Score:</strong> Mapped from portfolio value (1-5 or 1-6)</li>
      </ul>

      <h4>Asset Contributions:</h4>
      <ul>
        <li><strong>Standalone VaR:</strong> Risk if asset held in isolation</li>
        <li><strong>VaR Contribution:</strong> Asset's contribution to portfolio VaR</li>
        <li><strong>Diversification Benefit:</strong> Risk reduction from portfolio effect</li>
      </ul>

      <h4>Correlation Matrix:</h4>
      <p>Shows correlation coefficients between all assets:</p>
      <ul>
        <li><span style="color: red;">🔴 Red (&gt; 0.7):</span> Strong positive correlation</li>
        <li><span style="color: orange;">🟠 Orange (0.3 to 0.7):</span> Weak positive correlation</li>
        <li><span style="color: gray;">⚪ Gray (-0.3 to 0.3):</span> Neutral</li>
        <li><span style="color: blue;">🔵 Blue (-0.7 to -0.3):</span> Weak negative correlation</li>
        <li><span style="color: green;">🟢 Green (&lt; -0.7):</span> Strong negative correlation</li>
      </ul>

      <h3>Best Practices for VaR Analysis</h3>
      <ul>
        <li>Use at least 252 data points for daily data (1 trading year)</li>
        <li>Ensure price data is clean and complete (no missing values)</li>
        <li>Update VaR calculations regularly (monthly or quarterly)</li>
        <li>Review diversification benefits to optimize portfolio</li>
        <li>Compare standalone VaR vs contribution to identify concentration risk</li>
        <li>Customize thresholds to match your organization's risk appetite</li>
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
  {
    id: 'kri-module',
    title: 'Key Risk Indicators (KRI) Module ✨ NEW',
    icon: '📉',
    content: `
      <h3>Overview</h3>
      <p>The KRI Module enables <strong>proactive risk monitoring</strong> through quantitative metrics tracked over time. Unlike the Incident Log which records discrete events after they occur, KRIs provide early warning signals before risks materialize.</p>

      <h3>Strategic Permission Model</h3>
      <h4>🎯 Design Philosophy:</h4>
      <ul>
        <li><strong>Centralized Governance</strong> - Admins define WHAT gets measured</li>
        <li><strong>Distributed Execution</strong> - Users enter their own measurements</li>
        <li><strong>Shared Visibility</strong> - Everyone monitors organization-wide metrics</li>
      </ul>

      <h4>Who Can Do What:</h4>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-top: 10px;">
        <tr style="background: #f3f4f6;">
          <th>Function</th>
          <th>Regular User</th>
          <th>Admin</th>
        </tr>
        <tr>
          <td><strong>View KRIs</strong></td>
          <td>✅ All org KRIs</td>
          <td>✅ All org KRIs</td>
        </tr>
        <tr>
          <td><strong>Enter Data</strong></td>
          <td>✅ Any KRI</td>
          <td>✅ Any KRI</td>
        </tr>
        <tr>
          <td><strong>View Dashboard</strong></td>
          <td>✅ Org-wide</td>
          <td>✅ Org-wide</td>
        </tr>
        <tr>
          <td><strong>View Alerts</strong></td>
          <td>✅ Org-wide</td>
          <td>✅ Org-wide</td>
        </tr>
        <tr>
          <td><strong>Define New KRIs</strong></td>
          <td>❌ No</td>
          <td>✅ Admin only</td>
        </tr>
        <tr>
          <td><strong>Edit KRI Definitions</strong></td>
          <td>❌ No</td>
          <td>✅ Admin only</td>
        </tr>
        <tr>
          <td><strong>Delete KRIs</strong></td>
          <td>❌ No</td>
          <td>✅ Admin only</td>
        </tr>
      </table>

      <h3>For Regular Users: KRI Monitoring Tab</h3>
      <p>Access from main navigation: <strong>📉 KRI Monitoring</strong></p>

      <h4>📈 Data Entry (Primary Tab)</h4>
      <ol>
        <li>Select a KRI from the dropdown (e.g., "Customer Complaints Count")</li>
        <li>Click <strong>"Add Measurement"</strong> button</li>
        <li>Fill in measurement details:
          <ul>
            <li><strong>Measurement Date</strong> - When the data was recorded</li>
            <li><strong>Measurement Value</strong> - The actual number (e.g., 8 complaints)</li>
            <li><strong>Data Quality</strong> - Verified, Estimated, or Provisional</li>
            <li><strong>Notes</strong> - Optional context (e.g., "Holiday season spike")</li>
          </ul>
        </li>
        <li>Click <strong>"Save Measurement"</strong></li>
        <li>View recent measurements with automatic alert badges:
          <ul>
            <li><span style="color: green;">🟢 GREEN</span> - Within target range</li>
            <li><span style="color: #eab308;">🟡 YELLOW</span> - Warning threshold breached</li>
            <li><span style="color: red;">🔴 RED</span> - Critical threshold breached</li>
          </ul>
        </li>
      </ol>

      <h4>📊 Dashboard Tab</h4>
      <p>View organization-wide KRI performance:</p>
      <ul>
        <li><strong>Total KRIs</strong> - Number of active indicators</li>
        <li><strong>Open Alerts</strong> - Threshold breaches requiring attention</li>
        <li><strong>Within Thresholds</strong> - KRIs performing as expected</li>
        <li><strong>At Risk</strong> - KRIs approaching thresholds</li>
        <li><strong>Recent Activity</strong> - Latest measurements and changes</li>
      </ul>

      <h4>🚨 My Alerts Tab</h4>
      <p>View KRIs that have breached thresholds:</p>
      <ul>
        <li><strong>Critical Alerts (Red)</strong> - Immediate attention required</li>
        <li><strong>Warning Alerts (Yellow)</strong> - Monitoring needed</li>
        <li>Details include measured value, threshold breached, and date</li>
      </ul>

      <h3>For Admins: KRI Management (Admin Dashboard)</h3>
      <p>Access: <strong>Admin Dashboard → KRI Module</strong></p>

      <h4>📋 Management Tab (Admin Exclusive)</h4>
      <p><strong>Creating a New KRI:</strong></p>
      <ol>
        <li>Click <strong>"Add KRI"</strong> button</li>
        <li>Fill in KRI definition form:
          <ul>
            <li><strong>KRI Code</strong> - Auto-generated (KRI-001, KRI-002, etc.)</li>
            <li><strong>KRI Name</strong> - Descriptive title (e.g., "Customer Complaints Count")</li>
            <li><strong>Description</strong> - What this KRI measures and why</li>
            <li><strong>Risk Category</strong> - Operational, Financial, Compliance, etc.</li>
            <li><strong>Indicator Type</strong> - Leading, Lagging, or Concurrent</li>
            <li><strong>Measurement Unit</strong> - count, %, days, dollars, etc.</li>
            <li><strong>Collection Frequency</strong> - Daily, Weekly, Monthly, Quarterly, Annually</li>
            <li><strong>Target Value</strong> - Ideal measurement (e.g., 0 complaints)</li>
            <li><strong>Lower Threshold</strong> - Warning level (e.g., 10 complaints)</li>
            <li><strong>Upper Threshold</strong> - Critical level (e.g., 15 complaints)</li>
            <li><strong>Threshold Direction</strong>:
              <ul>
                <li><strong>Above</strong> - Higher values are bad (e.g., complaints, errors)</li>
                <li><strong>Below</strong> - Lower values are bad (e.g., uptime %, customer satisfaction)</li>
                <li><strong>Between</strong> - Values outside range are bad (e.g., inventory levels)</li>
              </ul>
            </li>
          </ul>
        </li>
        <li>Click <strong>"Create"</strong></li>
      </ol>

      <p><strong>Editing/Deleting KRIs:</strong></p>
      <ul>
        <li>Click pencil icon to edit existing KRI definitions</li>
        <li>Click trash icon to delete (with confirmation)</li>
        <li>Changes affect all future measurements</li>
      </ul>

      <h4>📈 Data Entry, 📊 Dashboard, 🚨 Alerts Tabs</h4>
      <p>Admins have access to the same tabs as regular users, with organization-wide visibility.</p>

      <h3>KRI vs Incident Log - Understanding the Difference</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-top: 10px;">
        <tr style="background: #f3f4f6;">
          <th>Aspect</th>
          <th>KRI Module</th>
          <th>Incident Log</th>
        </tr>
        <tr>
          <td><strong>Purpose</strong></td>
          <td>Proactive monitoring & early warning</td>
          <td>Reactive event documentation</td>
        </tr>
        <tr>
          <td><strong>Nature</strong></td>
          <td>Quantitative trends over time</td>
          <td>Qualitative event descriptions</td>
        </tr>
        <tr>
          <td><strong>Timing</strong></td>
          <td>Before major issues occur</td>
          <td>After events happen</td>
        </tr>
        <tr>
          <td><strong>Format</strong></td>
          <td>Time-series metrics (numbers)</td>
          <td>Narrative reports (text)</td>
        </tr>
        <tr>
          <td><strong>Example</strong></td>
          <td>"15 customer complaints this month" (trending up ⚠️)</td>
          <td>"Server outage on Jan 15, lasted 2 hours, affected 50 users"</td>
        </tr>
      </table>

      <h4>How They Work Together:</h4>
      <ul>
        <li><strong>KRIs show patterns:</strong> "Complaint count increasing: 5 → 8 → 12 → 15 per month"</li>
        <li><strong>Incidents show details:</strong> Individual complaint records with root causes</li>
        <li><strong>KRIs can be derived from incidents:</strong> "Count of critical incidents per month" (KRI) = counting incident log entries</li>
        <li><strong>Strategic value:</strong> KRIs predict, Incidents explain</li>
      </ul>

      <h3>Real-World Example Workflow</h3>
      <h4>Step 1: Admin Defines KRI (One-Time Setup)</h4>
      <p>Admin creates: "System Outages Count"</p>
      <ul>
        <li>Unit: count</li>
        <li>Frequency: Monthly</li>
        <li>Warning Threshold: 3 outages/month</li>
        <li>Critical Threshold: 5 outages/month</li>
        <li>Direction: Above (higher is bad)</li>
      </ul>

      <h4>Step 2: Users Enter Measurements (Ongoing)</h4>
      <p>IT Manager records monthly:</p>
      <ul>
        <li>January: 1 outage → 🟢 Green</li>
        <li>February: 2 outages → 🟢 Green</li>
        <li>March: 4 outages → 🟡 Yellow (Warning!)</li>
        <li>April: 6 outages → 🔴 Red (Critical!)</li>
      </ul>

      <h4>Step 3: Dashboard Shows Trend</h4>
      <p>Everyone sees: "System Outages Count trending upward from 1 to 6 over 4 months"</p>

      <h4>Step 4: Management Takes Action</h4>
      <ul>
        <li>Investigate root causes (check Incident Log for outage details)</li>
        <li>Implement controls (infrastructure upgrades, monitoring tools)</li>
        <li>Monitor subsequent months to verify improvement</li>
      </ul>

      <h3>Best Practices</h3>
      <ul>
        <li><strong>Start small:</strong> Define 5-10 critical KRIs, not 50</li>
        <li><strong>Align with strategy:</strong> KRIs should reflect organizational priorities</li>
        <li><strong>Set realistic thresholds:</strong> Based on historical data and industry benchmarks</li>
        <li><strong>Regular updates:</strong> Enter data consistently per defined frequency</li>
        <li><strong>Review alerts promptly:</strong> Red alerts require immediate investigation</li>
        <li><strong>Document context:</strong> Use Notes field to explain unusual readings</li>
        <li><strong>Link to risks:</strong> KRIs should map to risks in your Risk Register</li>
        <li><strong>Periodic review:</strong> Admins should review and adjust thresholds quarterly</li>
      </ul>

      <h3>Sample KRIs by Category</h3>
      <h4>Operational Risk:</h4>
      <ul>
        <li>System Outages Count (monthly)</li>
        <li>Failed Transactions % (daily)</li>
        <li>Average Resolution Time (days)</li>
      </ul>

      <h4>Financial Risk:</h4>
      <ul>
        <li>Budget Variance % (monthly)</li>
        <li>Accounts Payable Days (weekly)</li>
        <li>Cash Flow Ratio (monthly)</li>
      </ul>

      <h4>Compliance Risk:</h4>
      <ul>
        <li>Policy Violations Count (monthly)</li>
        <li>Training Completion % (quarterly)</li>
        <li>Audit Findings Count (annually)</li>
      </ul>

      <h4>Cyber Risk:</h4>
      <ul>
        <li>Failed Login Attempts Count (daily)</li>
        <li>Unpatched Systems % (monthly)</li>
        <li>Phishing Simulation Click Rate % (quarterly)</li>
      </ul>

      <h3>Strategic Benefits</h3>
      <ul>
        <li><strong>Early Warning:</strong> Detect deteriorating conditions before major incidents</li>
        <li><strong>Data-Driven Decisions:</strong> Objective metrics for resource allocation</li>
        <li><strong>Trend Analysis:</strong> Identify patterns and predict future risks</li>
        <li><strong>Accountability:</strong> Clear ownership through distributed data entry</li>
        <li><strong>Regulatory Compliance:</strong> Demonstrate proactive risk monitoring (Basel III, ISO 31000)</li>
        <li><strong>Board Reporting:</strong> Quantitative risk metrics for executive dashboards</li>
      </ul>
    `,
  },
];
