import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateControlMeasures, RiskContext } from '../lib/ai';

interface AIControlSuggesterProps {
  riskTitle: string;
  riskDescription: string;
  category?: string;
  onControlsGenerated?: (controls: string[]) => void;
}

export function AIControlSuggester({
  riskTitle,
  riskDescription,
  category,
  onControlsGenerated
}: AIControlSuggesterProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedControls, setGeneratedControls] = useState<string[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedControls([]);

    try {
      const context: RiskContext = {
        riskCategory: category,
      };

      const controls = await generateControlMeasures(
        riskTitle,
        riskDescription,
        context
      );

      setGeneratedControls(controls);

      if (onControlsGenerated) {
        onControlsGenerated(controls);
      }
    } catch (error: any) {
      console.error('Control generation failed:', error);
      alert(`Failed to generate control measures: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Control Measures...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate AI Control Measures
          </>
        )}
      </button>

      {generatedControls.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
          <h5 className="font-medium text-gray-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI-Generated Control Measures:
          </h5>
          <ul className="space-y-2 text-sm">
            {generatedControls.map((control, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="font-medium text-purple-600">{idx + 1}.</span>
                <span className="text-gray-700">{control}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            Review these suggestions and add them to your control measures as needed.
          </p>
        </div>
      )}
    </div>
  );
}
