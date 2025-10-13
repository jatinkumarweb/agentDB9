'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { fetchWithAuth } from '@/utils/fetch-with-auth';
import toast from 'react-hot-toast';

interface MemoryCreatorProps {
  agentId: string;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  onMemoryCreated?: () => void;
}

export default function MemoryCreator({ 
  agentId, 
  isOpen: externalIsOpen, 
  onClose: externalOnClose,
  onSuccess,
  onMemoryCreated 
}: MemoryCreatorProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: 'lesson',
    content: '',
    importance: 0.5,
    tags: '',
  });

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnClose ? (value: boolean) => {
    if (!value) externalOnClose();
  } : setInternalIsOpen;

  const categories = [
    { value: 'interaction', label: 'Interaction' },
    { value: 'lesson', label: 'Lesson' },
    { value: 'challenge', label: 'Challenge' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'context', label: 'Context' },
    { value: 'decision', label: 'Decision' },
    { value: 'error', label: 'Error' },
    { value: 'success', label: 'Success' },
    { value: 'preference', label: 'Preference' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await fetchWithAuth(`/api/memory/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ltm',
          category: formData.category,
          content: formData.content,
          importance: formData.importance,
          tags: tagsArray,
          metadata: {
            source: 'manual',
            createdAt: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Memory created successfully');
        setIsOpen(false);
        setFormData({
          category: 'lesson',
          content: '',
          importance: 0.5,
          tags: '',
        });
        
        // Call all success callbacks
        if (onSuccess) onSuccess();
        if (onMemoryCreated) onMemoryCreated();
      } else {
        throw new Error(data.error || 'Failed to create memory');
      }
    } catch (err: any) {
      console.error('Failed to create memory:', err);
      setError(err.message || 'Failed to create memory');
      toast.error(err.message || 'Failed to create memory');
    } finally {
      setIsLoading(false);
    }
  };

  // If external control is not provided and modal is closed, show button
  if (externalIsOpen === undefined && !internalIsOpen) {
    return (
      <button
        onClick={() => setInternalIsOpen(true)}
        className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Memory
      </button>
    );
  }

  // Don't render modal if externally controlled and closed
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Create Memory Entry</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what the agent should remember..."
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Importance ({(formData.importance * 100).toFixed(0)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.importance}
              onChange={(e) => setFormData({ ...formData, importance: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (Optional)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="react, hooks, best-practice (comma-separated)"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
