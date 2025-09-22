import React, { useState } from 'react';
import { Button } from './ui/Button';

interface EnhancedTeamCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTeam: (teamData: {
    name: string;
    description: string;
    isPrivate: boolean;
    tags: string[];
    template?: string;
    maxMembers?: number;
  }) => Promise<void>;
}

export const EnhancedTeamCreationModal: React.FC<EnhancedTeamCreationModalProps> = ({
  isOpen,
  onClose,
  onCreateTeam
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
    tags: [] as string[],
    template: 'blank',
    maxMembers: 50
  });
  const [newTag, setNewTag] = useState('');
  const [creating, setCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    setCreating(true);
    try {
      await onCreateTeam({
        name: formData.name.trim(),
        description: formData.description.trim(),
        isPrivate: formData.isPrivate,
        tags: formData.tags,
        template: formData.template,
        maxMembers: formData.maxMembers
      });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        isPrivate: false,
        tags: [],
        template: 'blank',
        maxMembers: 50
      });
      setCurrentStep(1);
      onClose();
    } catch (error) {
      console.error('Failed to create team:', error);
    } finally {
      setCreating(false);
    }
  };

  const teamTemplates = [
    {
      id: 'blank',
      name: 'Blank Team',
      description: 'Start with a clean slate',
      icon: '📝'
    },
    {
      id: 'project',
      name: 'Project Team',
      description: 'Organized for project collaboration',
      icon: '🚀'
    },
    {
      id: 'study',
      name: 'Study Group',
      description: 'Perfect for academic collaboration',
      icon: '📚'
    },
    {
      id: 'research',
      name: 'Research Team',
      description: 'Designed for research projects',
      icon: '🔬'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New Team
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${
              currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${
              currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Basic Information</h4>
              <p className="text-gray-600 dark:text-gray-400">Let's start with the basics</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter team name..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your team's purpose and goals..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!formData.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Template & Settings */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Choose Template</h4>
              <p className="text-gray-600 dark:text-gray-400">Select a template to get started quickly</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {teamTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setFormData(prev => ({ ...prev, template: template.id }))}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    formData.template === template.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">{template.icon}</div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-1">{template.name}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                </button>
              ))}
            </div>

            {/* Privacy Settings */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Make this team private</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Private teams are only visible to members and require invitations to join
                  </p>
                </div>
              </label>
            </div>

            {/* Max Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Members
              </label>
              <select
                value={formData.maxMembers}
                onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 members</option>
                <option value={25}>25 members</option>
                <option value={50}>50 members</option>
                <option value={100}>100 members</option>
                <option value={-1}>Unlimited</option>
              </select>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Tags & Final Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tags & Review</h4>
              <p className="text-gray-600 dark:text-gray-400">Add tags and review your team settings</p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (Optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400 rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add tag (e.g., frontend, backend, design)..."
                />
                <Button
                  onClick={handleAddTag}
                  variant="outline"
                  size="sm"
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Review Summary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Review Team Settings</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Privacy:</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    formData.isPrivate 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
                      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  }`}>
                    {formData.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Template:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {teamTemplates.find(t => t.id === formData.template)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Max Members:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.maxMembers === -1 ? 'Unlimited' : formData.maxMembers}
                  </span>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 dark:text-gray-400">Tags:</span>
                    <div className="flex flex-wrap gap-1 max-w-48">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                disabled={creating}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.name.trim() || creating}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                {creating ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Creating...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Team
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};