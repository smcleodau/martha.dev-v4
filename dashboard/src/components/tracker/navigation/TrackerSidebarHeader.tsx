/**
 * TrackerSidebarHeader Component - User profile and organization selector
 */

import { useState } from 'react';
import { Avatar } from '../shared/Avatar';

export function TrackerSidebarHeader() {
  const [selectedOrg, setSelectedOrg] = useState('acme-corp');

  const organizations = [
    { id: 'acme-corp', name: 'Acme Corp' },
    { id: 'personal', name: 'Personal' },
  ];

  const currentUser = {
    name: 'Stuart Chen',
    email: 'stuart@acme.com',
  };

  return (
    <div className="px-4 py-6 border-b" style={{ borderColor: '#E8E0D5' }}>
      {/* User Profile */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={currentUser.name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#2F241B' }}>
            {currentUser.name}
          </p>
          <p className="text-xs truncate" style={{ color: '#A39686' }}>
            {currentUser.email}
          </p>
        </div>
      </div>

      {/* Organization Selector */}
      <div className="relative">
        <select
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          className="w-full appearance-none border rounded-lg pl-3 pr-10 py-2 text-sm font-medium focus:outline-none focus-coral cursor-pointer"
          style={{
            backgroundColor: '#FDFCFA',
            borderColor: '#E8E0D5',
            color: '#2F241B'
          }}
        >
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: '#6B5D52' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
