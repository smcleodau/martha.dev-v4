/**
 * Epic Selector Component
 * Allows users to link stories/tasks to epics
 */

import { useState, useEffect } from 'react';
import { hierarchicalIssuesApi, type Issue } from '../../../api/tracker';

interface EpicSelectorProps {
  issue: Issue;
  worktreeId: string;
  boardId: string;
  onUpdate?: () => void;
}

export function EpicSelector({ issue, worktreeId, boardId, onUpdate }: EpicSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [epics, setEpics] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEpic, setSelectedEpic] = useState<Issue | null>(null);

  // Epics cannot belong to other epics
  const isDisabled = issue.type === 'epic';

  useEffect(() => {
    loadEpics();
  }, [worktreeId, boardId]);

  const loadEpics = async () => {
    setIsLoading(true);
    try {
      const fetchedEpics = await hierarchicalIssuesApi.list(worktreeId, boardId, {
        type: 'epic'
      });
      setEpics(fetchedEpics);

      // Find the currently selected epic
      if (issue.epic_id) {
        const currentEpic = fetchedEpics.find(e => e.id === issue.epic_id);
        setSelectedEpic(currentEpic || null);
      }
    } catch (error) {
      console.error('Failed to load epics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEpic = async (epicId: string | null) => {
    setIsUpdating(true);
    try {
      await hierarchicalIssuesApi.update(worktreeId, boardId, issue.id, {
        epic_id: epicId
      });

      // Update local state
      if (epicId) {
        const epic = epics.find(e => e.id === epicId);
        setSelectedEpic(epic || null);
      } else {
        setSelectedEpic(null);
      }

      setIsOpen(false);
      if (onUpdate) {
        onUpdate();
      } else {
        // Fallback to page reload if no callback provided
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update epic:', error);
      alert('Failed to update epic');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
        Epic
      </label>

      <div className="relative">
        <button
          onClick={() => !isDisabled && setIsOpen(!isOpen)}
          disabled={isDisabled || isUpdating || isLoading}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral bg-white text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
        >
          <div className="flex-1 min-w-0">
            {isDisabled ? (
              <span style={{ color: '#A39686' }} className="text-sm italic">
                Epics cannot belong to other epics
              </span>
            ) : selectedEpic ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{
                    backgroundColor: '#F3F1F7',
                    color: '#8B7AA8',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: '#D4CEE0'
                  }}
                >
                  {selectedEpic.id}
                </span>
                <span className="text-sm font-medium truncate" style={{ color: '#2F241B' }}>
                  {selectedEpic.title}
                </span>
              </div>
            ) : (
              <span style={{ color: '#A39686' }}>No epic selected</span>
            )}
          </div>
          {!isDisabled && (
            <svg
              className="w-4 h-4 transition-transform flex-shrink-0 ml-2"
              style={{
                color: '#6B5D52',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {isOpen && !isDisabled && (
          <div
            className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border overflow-hidden max-h-80 overflow-y-auto"
            style={{ borderColor: '#E8E0D5' }}
          >
            {/* Clear option */}
            <button
              onClick={() => handleUpdateEpic(null)}
              disabled={isUpdating}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 sticky top-0 bg-white z-10"
              style={{
                color: '#A39686',
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: '#F5F1ED'
              }}
            >
              No epic
            </button>

            {/* Epic list */}
            {isLoading ? (
              <div className="px-4 py-8 text-center">
                <span className="text-sm" style={{ color: '#A39686' }}>
                  Loading epics...
                </span>
              </div>
            ) : epics.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="text-sm" style={{ color: '#A39686' }}>
                  No epics found in this board
                </span>
              </div>
            ) : (
              epics.map((epic) => (
                <button
                  key={epic.id}
                  onClick={() => handleUpdateEpic(epic.id)}
                  disabled={isUpdating}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: issue.epic_id === epic.id ? '#F3F1F7' : 'white',
                    borderTopWidth: '1px',
                    borderTopStyle: 'solid',
                    borderTopColor: '#F5F1ED'
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5"
                      style={{
                        backgroundColor: issue.epic_id === epic.id ? '#8B7AA8' : '#F3F1F7',
                        color: issue.epic_id === epic.id ? 'white' : '#8B7AA8',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: issue.epic_id === epic.id ? '#8B7AA8' : '#D4CEE0'
                      }}
                    >
                      {epic.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: issue.epic_id === epic.id ? '#8B7AA8' : '#2F241B' }}
                      >
                        {epic.title}
                      </div>
                      {epic.description && (
                        <div
                          className="text-xs mt-1 line-clamp-2"
                          style={{ color: '#A39686' }}
                        >
                          {epic.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && !isDisabled && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
