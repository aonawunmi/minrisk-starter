import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Plus, AlertTriangle } from 'lucide-react';
import { generateRisks, RiskContext, GeneratedRisk } from '../lib/ai';
import { supabase } from '../lib/supabase';

interface AIRiskGeneratorProps {
  onRisksGenerated?: () => void;
}

export function AIRiskGenerator({ onRisksGenerated }: AIRiskGeneratorProps) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedRisks, setGeneratedRisks] = useState<GeneratedRisk[]>([]);
  const [selectedRisks, setSelectedRisks] = useState<Set<number>>(new Set());

  // Context form fields
  const [industry, setIndustry] = useState('');
  const [businessUnit, setBusinessUnit] = useState('');
  const [riskCategory, setRiskCategory] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [count, setCount] = useState(5);

  const handleGenerate = async () => {
    if (!industry.trim()) {
      alert('Please enter an industry to generate relevant risks.');
      return;
    }

    setIsLoading(true);
    setGeneratedRisks([]);
    setSelectedRisks(new Set());

    try {
      const context: RiskContext = {
        industry: industry.trim(),
        businessUnit: businessUnit.trim() || undefined,
        riskCategory: riskCategory || undefined,
        additionalContext: additionalContext.trim() || undefined,
      };

      const risks = await generateRisks(context, count);
      setGeneratedRisks(risks);
    } catch (error: any) {
      console.error('Risk generation failed:', error);
      alert(`Failed to generate risks: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRiskSelection = (index: number) => {
    const newSelected = new Set(selectedRisks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRisks(newSelected);
  };

  const handleSaveSelected = async () => {
    if (selectedRisks.size === 0) {
      alert('Please select at least one risk to save.');
      return;
    }

    if (!user?.id) {
      alert('You must be logged in to save risks.');
      return;
    }

    setIsLoading(true);

    // Retry logic for handling concurrent inserts
    const maxRetries = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      try {
        // Get organization ID and user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id, full_name')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) {
          throw new Error('No organization found for user');
        }

        // Get existing risks to generate unique codes (fresh query each attempt)
        const { data: existingRisks } = await supabase
          .from('risks')
          .select('risk_code')
          .eq('organization_id', profile.organization_id);

        const existingCodes = new Set(existingRisks?.map(r => r.risk_code) || []);

        // Find the highest AI risk number for sequential prefix
        const aiRiskNumbers = existingRisks
          ?.map(r => {
            const match = r.risk_code.match(/^AI-(\d+)/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter(n => n > 0) || [];

        let nextAiNumber = aiRiskNumbers.length > 0 ? Math.max(...aiRiskNumbers) + 1 : 1;

        // Generate a unique suffix to prevent collisions in concurrent operations
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0'); // 2-digit random
        const uniqueSuffix = `${timestamp}${random}`;

        // Map severity to likelihood/impact (1-5 scale)
        const severityMap: Record<string, { likelihood: number; impact: number }> = {
          'Critical': { likelihood: 5, impact: 5 },
          'High': { likelihood: 4, impact: 4 },
          'Medium': { likelihood: 3, impact: 3 },
          'Low': { likelihood: 2, impact: 2 },
          'Very Low': { likelihood: 1, impact: 1 },
        };

        // Prepare risks with unique codes
        const risksToSave = Array.from(selectedRisks).map((idx, index) => {
          const risk = generatedRisks[idx];

          // Generate truly unique risk code with timestamp and random suffix
          // Format: AI-XXX-YYYYYYZZ where XXX is sequential, YYYYYY is timestamp, ZZ is random
          const riskCode = `AI-${String(nextAiNumber + index).padStart(3, '0')}-${uniqueSuffix}`;
          existingCodes.add(riskCode);

          const scores = severityMap[risk.severity] || { likelihood: 3, impact: 3 };

          return {
            organization_id: profile.organization_id,
            user_id: user.id,
            risk_code: riskCode,
            risk_title: risk.title,
            risk_description: risk.description,
            division: 'Operations', // Default - user can edit later
            department: 'Risk Management', // Default - user can edit later
            category: risk.category,
            owner: profile.full_name || user.email || 'AI Generated',
            relevant_period: null,
            likelihood_inherent: scores.likelihood,
            impact_inherent: scores.impact,
            status: 'Open' as const,
          };
        });

        // Insert risks
        const { error, data: insertedData } = await supabase
          .from('risks')
          .insert(risksToSave)
          .select();

        if (error) {
          // If duplicate key error and we have retries left, try again
          if ((error.code === '23505' || error.message.includes('duplicate key')) && attempt < maxRetries - 1) {
            lastError = error;
            attempt++;
            console.log(`Duplicate key detected, retrying... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Brief delay before retry
            continue;
          }
          throw error;
        }

        // Success!
        alert(`Successfully saved ${risksToSave.length} risk(s)!`);
        setGeneratedRisks([]);
        setSelectedRisks(new Set());
        setIsOpen(false);

        if (onRisksGenerated) {
          onRisksGenerated();
        }

        setIsLoading(false);
        return; // Exit successfully
      } catch (error: any) {
        lastError = error;

        // If not a duplicate error or out of retries, break
        if (!(error.code === '23505' || error.message?.includes('duplicate key')) || attempt >= maxRetries - 1) {
          break;
        }

        attempt++;
      }
    }

    // If we got here, all retries failed
    setIsLoading(false);
    console.error('Failed to save risks after retries:', lastError);
    alert(`Failed to save risks: ${lastError?.message || 'Unknown error'}. Please try again.`);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-2">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Risk Generator</h3>
              <p className="text-sm text-gray-600">
                Generate context-specific risks using Claude AI
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isOpen ? 'Hide Generator' : 'Generate Risks'}
          </button>
        </div>
      </div>

      {/* Generator Form */}
      {isOpen && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-gray-900 mb-4">Risk Generation Context</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry / Sector *
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Banking, Insurance, Healthcare"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Unit / Department
              </label>
              <input
                type="text"
                value={businessUnit}
                onChange={(e) => setBusinessUnit(e.target.value)}
                placeholder="e.g., Trading Desk, IT Operations"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Category
              </label>
              <select
                value={riskCategory}
                onChange={(e) => setRiskCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              >
                <option value="">All Categories</option>
                <option value="Operational">Operational</option>
                <option value="Financial">Financial</option>
                <option value="Strategic">Strategic</option>
                <option value="Compliance">Compliance</option>
                <option value="Technology">Technology</option>
                <option value="Market">Market</option>
                <option value="Reputational">Reputational</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Risks
              </label>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
                min="1"
                max="10"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Context (Optional)
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Provide any additional context, specific concerns, or areas of focus..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !industry.trim()}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Risks
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Generated Risks */}
      {generatedRisks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">
              Generated Risks ({generatedRisks.length})
            </h4>
            <button
              onClick={handleSaveSelected}
              disabled={selectedRisks.size === 0 || isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Save Selected ({selectedRisks.size})
            </button>
          </div>

          <div className="space-y-3">
            {generatedRisks.map((risk, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedRisks.has(idx)
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                onClick={() => toggleRiskSelection(idx)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedRisks.has(idx)}
                    onChange={() => toggleRiskSelection(idx)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{risk.title}</h5>
                      <div className="flex gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded border ${getSeverityColor(
                            risk.severity
                          )}`}
                        >
                          {risk.severity}
                        </span>
                        <span className="text-xs px-2 py-1 rounded border bg-blue-100 text-blue-800 border-blue-300">
                          {risk.likelihood} Likelihood
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{risk.description}</p>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {risk.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
