/**
 * Actions Cell - Actions menu for issue operations
 */

import { useState } from 'react';
import { type Issue } from '../../../../api/tracker';

interface ActionsCellProps {
  issue: Issue;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
}

export function ActionsCell({ issue, onEdit, onDelete }: ActionsCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!onDelete) return;

    if (window.confirm(`Are you sure you want to delete ${issue.id}?`)) {
      setIsDeleting(true);
      try {
        await onDelete();
      } catch (error) {
        console.error('Failed to delete issue:', error);
      } finally {
        setIsDeleting(false);
        setIsOpen(false);
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 rounded hover:bg-gray-100 transition-colors"
        style={{ color: '#6B5D52' }}
        disabled={isDeleting}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {/* Dropdown Menu */}
          <div
            className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg z-20 dropdown-enter"
            style={{
              backgroundColor: '#FFFFFF',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: '#E8E0D5',
            }}
          >
            <div className="py-1">
              {onEdit && (
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  style={{ color: '#2F241B' }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                  </svg>
                  Edit Issue
                </button>
              )}

              <a
                href={`#/tracker?issue=${issue.id}`}
                className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
                style={{ color: '#2F241B' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd"/>
                </svg>
                Copy Link
              </a>

              {onDelete && (
                <>
                  <div
                    className="my-1"
                    style={{
                      borderTopWidth: '1px',
                      borderTopStyle: 'solid',
                      borderTopColor: '#F5F1EC',
                    }}
                  />
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-red-50 flex items-center gap-2 transition-colors"
                    style={{ color: '#C0392B' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    {isDeleting ? 'Deleting...' : 'Delete Issue'}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
