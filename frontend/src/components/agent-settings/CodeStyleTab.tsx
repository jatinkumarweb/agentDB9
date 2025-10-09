'use client';

import { Code2, AlignLeft } from 'lucide-react';

interface CodeStyleTabProps {
  codeStyle?: {
    indentSize?: number;
    indentType?: 'spaces' | 'tabs';
    lineLength?: number;
    semicolons?: boolean;
    quotes?: 'single' | 'double';
    trailingCommas?: boolean;
    bracketSpacing?: boolean;
    arrowParens?: 'always' | 'avoid';
  };
  onChange: (codeStyle: any) => void;
}

export default function CodeStyleTab({ codeStyle = {}, onChange }: CodeStyleTabProps) {
  const defaultStyle = {
    indentSize: 2,
    indentType: 'spaces' as const,
    lineLength: 80,
    semicolons: true,
    quotes: 'single' as const,
    trailingCommas: true,
    bracketSpacing: true,
    arrowParens: 'always' as const,
    ...codeStyle,
  };

  const handleChange = (field: string, value: any) => {
    onChange({
      ...defaultStyle,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Code Style Preferences</h3>
        <p className="text-sm text-gray-500 mb-6">
          Configure how the agent formats and styles generated code.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Indent Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Indentation Type
          </label>
          <select
            value={defaultStyle.indentType}
            onChange={(e) => handleChange('indentType', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="spaces">Spaces</option>
            <option value="tabs">Tabs</option>
          </select>
        </div>

        {/* Indent Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Indent Size
          </label>
          <input
            type="number"
            value={defaultStyle.indentSize}
            onChange={(e) => handleChange('indentSize', parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="2"
            max="8"
          />
        </div>

        {/* Line Length */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Line Length
          </label>
          <input
            type="number"
            value={defaultStyle.lineLength}
            onChange={(e) => handleChange('lineLength', parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="60"
            max="120"
          />
        </div>

        {/* Quote Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quote Style
          </label>
          <select
            value={defaultStyle.quotes}
            onChange={(e) => handleChange('quotes', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="single">Single Quotes (&apos;)</option>
            <option value="double">Double Quotes (&quot;)</option>
          </select>
        </div>

        {/* Arrow Parens */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arrow Function Parentheses
          </label>
          <select
            value={defaultStyle.arrowParens}
            onChange={(e) => handleChange('arrowParens', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="always">Always (x) =&gt; x</option>
            <option value="avoid">Avoid x =&gt; x</option>
          </select>
        </div>
      </div>

      {/* Boolean Options */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900">Additional Options</h4>
        
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={defaultStyle.semicolons}
            onChange={(e) => handleChange('semicolons', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Use Semicolons</span>
            <p className="text-xs text-gray-500">Add semicolons at the end of statements</p>
          </div>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={defaultStyle.trailingCommas}
            onChange={(e) => handleChange('trailingCommas', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Trailing Commas</span>
            <p className="text-xs text-gray-500">Add trailing commas in multi-line structures</p>
          </div>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={defaultStyle.bracketSpacing}
            onChange={(e) => handleChange('bracketSpacing', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Bracket Spacing</span>
            <p className="text-xs text-gray-500">Add spaces inside object brackets: {'{ x }'} vs {'{x}'}</p>
          </div>
        </label>
      </div>

      {/* Preview */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Preview</h4>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          <pre>{`const example = ${defaultStyle.bracketSpacing ? '{ ' : '{'}name${defaultStyle.quotes === 'single' ? "'" : '"'}John${defaultStyle.quotes === 'single' ? "'" : '"'}${defaultStyle.trailingCommas ? ',' : ''} ${defaultStyle.bracketSpacing ? '}' : '}'}${defaultStyle.semicolons ? ';' : ''}

const arrow = ${defaultStyle.arrowParens === 'always' ? '(x)' : 'x'} => ${defaultStyle.bracketSpacing ? '{ ' : '{'}
${' '.repeat(defaultStyle.indentSize)}return x * 2${defaultStyle.semicolons ? ';' : ''}
${defaultStyle.bracketSpacing ? '}' : '}'}${defaultStyle.semicolons ? ';' : ''}`}</pre>
        </div>
      </div>
    </div>
  );
}
