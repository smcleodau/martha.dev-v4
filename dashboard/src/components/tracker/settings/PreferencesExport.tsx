/**
 * Preferences Export/Import Component
 * Allows users to export, import, and reset their tracker preferences
 */

import React, { useState, useRef } from 'react';
import { usePreferences } from '../../../contexts/PreferencesContext';

export function PreferencesExport() {
  const { exportPreferences, importPreferences, resetPreferences } = usePreferences();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show message temporarily
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Export preferences as JSON file
  const handleExport = () => {
    try {
      const json = exportPreferences();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `martha-tracker-preferences-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showMessage('success', 'Preferences exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      showMessage('error', 'Failed to export preferences');
    }
  };

  // Import preferences from JSON file
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const success = importPreferences(json);
        if (success) {
          showMessage('success', 'Preferences imported successfully. Refresh the page to see changes.');
        } else {
          showMessage('error', 'Invalid preferences file format');
        }
      } catch (error) {
        console.error('Import failed:', error);
        showMessage('error', 'Failed to import preferences');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset all preferences to defaults
  const handleReset = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all preferences to defaults? This action cannot be undone.'
      )
    ) {
      try {
        resetPreferences();
        showMessage('success', 'Preferences reset successfully. Refresh the page to see changes.');
      } catch (error) {
        console.error('Reset failed:', error);
        showMessage('error', 'Failed to reset preferences');
      }
    }
  };

  return (
    <div
      className="rounded-lg border p-6"
      style={{
        backgroundColor: 'white',
        borderColor: '#E8E0D5',
      }}
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: '#2F241B' }}>
        Preferences Management
      </h3>
      <p className="text-sm mb-6" style={{ color: '#6B5D52' }}>
        Export, import, or reset your tracker preferences including view modes, filters, and display settings.
      </p>

      {/* Message Banner */}
      {message && (
        <div
          className="mb-4 px-4 py-3 rounded-lg border"
          style={{
            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            borderColor: message.type === 'success' ? '#A7F3D0' : '#FECACA',
            color: message.type === 'success' ? '#059669' : '#DC2626',
          }}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Export Button */}
        <div className="flex items-start gap-3">
          <button
            onClick={handleExport}
            className="flex-shrink-0 px-4 py-2 rounded-lg border font-medium text-sm transition-colors"
            style={{
              backgroundColor: '#D97F6F',
              borderColor: '#D97F6F',
              color: 'white',
            }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export Preferences
            </div>
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1" style={{ color: '#2F241B' }}>
              Download your preferences
            </p>
            <p className="text-xs" style={{ color: '#A39686' }}>
              Save your current preferences as a JSON file for backup or sharing.
            </p>
          </div>
        </div>

        {/* Import Button */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 px-4 py-2 rounded-lg border font-medium text-sm transition-colors"
            style={{
              backgroundColor: 'white',
              borderColor: '#E8E0D5',
              color: '#2F241B',
            }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Import Preferences
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1" style={{ color: '#2F241B' }}>
              Upload preferences file
            </p>
            <p className="text-xs" style={{ color: '#A39686' }}>
              Restore preferences from a previously exported JSON file.
            </p>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex items-start gap-3 pt-3 border-t" style={{ borderTopColor: '#E8E0D5' }}>
          <button
            onClick={handleReset}
            className="flex-shrink-0 px-4 py-2 rounded-lg border font-medium text-sm transition-colors"
            style={{
              backgroundColor: 'white',
              borderColor: '#FCA5A5',
              color: '#DC2626',
            }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset to Defaults
            </div>
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1" style={{ color: '#2F241B' }}>
              Clear all preferences
            </p>
            <p className="text-xs" style={{ color: '#A39686' }}>
              Reset all tracker preferences to their default values. This cannot be undone.
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div
        className="mt-6 p-4 rounded-lg border"
        style={{
          backgroundColor: '#FDF9F5',
          borderColor: '#E8E0D5',
        }}
      >
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: '#D97F6F' }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-semibold mb-1" style={{ color: '#2F241B' }}>
              What's included in preferences?
            </h4>
            <ul className="text-xs space-y-1" style={{ color: '#6B5D52' }}>
              <li>View modes (Kanban, List, Timeline, Gantt) per board</li>
              <li>Timeline zoom level and swimlane grouping</li>
              <li>List view density, columns, and grouping</li>
              <li>Gantt view settings and resource panel state</li>
              <li>Global settings like sidebar collapse state</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Storage Info */}
      <div className="mt-4 text-xs" style={{ color: '#A39686' }}>
        Preferences are stored locally in your browser and are not synced across devices.
      </div>
    </div>
  );
}
