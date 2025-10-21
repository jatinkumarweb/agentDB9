'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain, Zap, Eye, CheckCircle } from 'lucide-react';

interface ReActStep {
  thought?: string;
  action?: string;
  actionInput?: any;
  observation?: string;
  answer?: string;
  milestoneId?: string;
}

interface ChainOfThoughtDisplayProps {
  steps: ReActStep[];
  toolsUsed?: string[];
  className?: string;
}

export default function ChainOfThoughtDisplay({
  steps,
  toolsUsed = [],
  className = ''
}: ChainOfThoughtDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className={`mt-2 ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        <Brain className="w-3.5 h-3.5" />
        <span>
          {isExpanded ? 'Hide' : 'Show'} Chain of Thought ({steps.length} step{steps.length !== 1 ? 's' : ''})
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 space-y-2 border-l-2 border-blue-300 pl-3">
          {steps.map((step, index) => (
            <div key={index} className="space-y-1">
              {/* Thought */}
              {step.thought && (
                <div className="flex items-start space-x-2">
                  <Brain className="w-3.5 h-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-purple-700">Thought:</div>
                    <div className="text-xs text-gray-700 mt-0.5">{step.thought}</div>
                  </div>
                </div>
              )}

              {/* Action */}
              {step.action && (
                <div className="flex items-start space-x-2">
                  <Zap className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-blue-700">Action:</div>
                    <div className="text-xs text-gray-700 mt-0.5">
                      <code className="bg-blue-50 px-1 py-0.5 rounded">{step.action}</code>
                      {step.actionInput && (
                        <div className="mt-1 text-xs text-gray-600">
                          Input: <code className="bg-gray-50 px-1 py-0.5 rounded text-xs">
                            {typeof step.actionInput === 'string' 
                              ? step.actionInput 
                              : JSON.stringify(step.actionInput, null, 2)}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Observation */}
              {step.observation && (
                <div className="flex items-start space-x-2">
                  <Eye className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-green-700">Observation:</div>
                    <div className="text-xs text-gray-700 mt-0.5 max-h-32 overflow-y-auto">
                      {step.observation.length > 200 
                        ? `${step.observation.substring(0, 200)}...` 
                        : step.observation}
                    </div>
                  </div>
                </div>
              )}

              {/* Answer (final step) */}
              {step.answer && (
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-green-700">Answer:</div>
                    <div className="text-xs text-gray-700 mt-0.5">{step.answer}</div>
                  </div>
                </div>
              )}

              {/* Separator between steps */}
              {index < steps.length - 1 && (
                <div className="border-t border-gray-200 my-2"></div>
              )}
            </div>
          ))}

          {/* Tools Used Summary */}
          {toolsUsed.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-1">Tools Used:</div>
              <div className="flex flex-wrap gap-1">
                {toolsUsed.map((tool, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
