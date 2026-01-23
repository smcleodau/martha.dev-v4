/**
 * TrackerSidebar Component - Main navigation sidebar
 * Responsive: Desktop full width, Tablet icon-only, Mobile drawer
 */

import { useState } from 'react';
import { TrackerSidebarHeader } from './TrackerSidebarHeader';
import { TrackerNavigationSection } from './TrackerNavigationSection';
import { NavItem } from './NavItem';
import { TrackerSidebarFooter } from './TrackerSidebarFooter';
import { useIsTablet } from '../../../hooks/useMediaQuery';

interface TrackerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'desktop' | 'tablet' | 'mobile';
}

export function TrackerSidebar({ isOpen = true, onClose, variant = 'desktop' }: TrackerSidebarProps) {
  const [activeItem, setActiveItem] = useState('dashboard');
  const isTablet = useIsTablet();
  const isIconOnly = variant === 'tablet' || isTablet;

  // For mobile drawer: handle backdrop click
  const handleBackdropClick = () => {
    if (variant === 'mobile' && onClose) {
      onClose();
    }
  };

  // For mobile drawer: render with overlay
  if (variant === 'mobile') {
    return (
      <>
        {/* Backdrop overlay - only show when open */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
        )}

        {/* Drawer sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 flex flex-col h-full kanban-scrollbar-subtle transition-transform duration-300 ease-in-out md:hidden ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            width: '288px',
            backgroundColor: '#F5F1EC',
            borderRight: '1px solid #E8E0D5',
          }}
        >
          {/* Header with User Profile and Org Selector */}
          <TrackerSidebarHeader />

          {/* Scrollable Navigation Area */}
          <div className="flex-1 overflow-y-auto py-4">
            {/* PROJECTS Section */}
            <TrackerNavigationSection title="PROJECTS" defaultExpanded={true}>
              <NavItem
                label="Dashboard"
                icon="📊"
                active={activeItem === 'dashboard'}
                onClick={() => {
                  setActiveItem('dashboard');
                  onClose?.();
                }}
              />
            </TrackerNavigationSection>

            {/* PLANNING Section */}
            <TrackerNavigationSection title="PLANNING" defaultExpanded={true}>
              <NavItem
                label="Thought Bubbles"
                icon="💭"
                active={activeItem === 'thought-bubbles'}
                onClick={() => {
                  setActiveItem('thought-bubbles');
                  onClose?.();
                }}
              />
              <NavItem
                label="Roadmap"
                icon="🗺️"
                active={activeItem === 'roadmap'}
                onClick={() => {
                  setActiveItem('roadmap');
                  onClose?.();
                }}
              />
              <NavItem
                label="Initiatives"
                icon="🎯"
                active={activeItem === 'initiatives'}
                onClick={() => {
                  setActiveItem('initiatives');
                  onClose?.();
                }}
              />
              <NavItem
                label="Epics"
                icon="📖"
                active={activeItem === 'epics'}
                onClick={() => {
                  setActiveItem('epics');
                  onClose?.();
                }}
              />
              <NavItem
                label="Stories"
                icon="📝"
                active={activeItem === 'stories'}
                onClick={() => {
                  setActiveItem('stories');
                  onClose?.();
                }}
              />
            </TrackerNavigationSection>

            {/* EXECUTION Section */}
            <TrackerNavigationSection title="EXECUTION" defaultExpanded={true}>
              <NavItem
                label="Workflows"
                icon="⚡"
                active={activeItem === 'workflows'}
                onClick={() => {
                  setActiveItem('workflows');
                  onClose?.();
                }}
              />
              <NavItem
                label="Swarms"
                icon="🐝"
                active={activeItem === 'swarms'}
                onClick={() => {
                  setActiveItem('swarms');
                  onClose?.();
                }}
              />
            </TrackerNavigationSection>

            {/* GOVERNANCE Section */}
            <TrackerNavigationSection title="GOVERNANCE" defaultExpanded={false}>
              {/* Empty for now */}
              <div className="px-4 py-2 text-xs italic" style={{ color: '#A39686' }}>
                No items yet
              </div>
            </TrackerNavigationSection>

            {/* OPERATIONS Section */}
            <TrackerNavigationSection title="OPERATIONS" defaultExpanded={false}>
              {/* Empty for now */}
              <div className="px-4 py-2 text-xs italic" style={{ color: '#A39686' }}>
                No items yet
              </div>
            </TrackerNavigationSection>

            {/* DOCUMENTATION Section */}
            <TrackerNavigationSection title="DOCUMENTATION" defaultExpanded={false}>
              {/* Empty for now */}
              <div className="px-4 py-2 text-xs italic" style={{ color: '#A39686' }}>
                No items yet
              </div>
            </TrackerNavigationSection>
          </div>

          {/* Footer with Settings and Notifications */}
          <TrackerSidebarFooter />
        </div>
      </>
    );
  }

  // Desktop and Tablet variant - always visible
  return (
    <div
      className={`hidden md:flex flex-col h-full kanban-scrollbar-subtle ${
        isIconOnly ? 'lg:w-72' : ''
      }`}
      style={{
        width: isIconOnly ? '80px' : '288px',
        backgroundColor: '#F5F1EC',
        borderRight: '1px solid #E8E0D5',
      }}
    >
      {/* Header with User Profile and Org Selector */}
      {!isIconOnly && <TrackerSidebarHeader />}

      {/* Icon-only header for tablet */}
      {isIconOnly && (
        <div
          className="px-4 py-4 border-b flex justify-center"
          style={{ borderBottomColor: '#E8E0D5' }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: '#D97F6F' }}
          >
            M
          </div>
        </div>
      )}

      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* PROJECTS Section */}
        <TrackerNavigationSection
          title={isIconOnly ? '' : 'PROJECTS'}
          defaultExpanded={true}
        >
          <NavItem
            label={isIconOnly ? '' : 'Dashboard'}
            icon="📊"
            active={activeItem === 'dashboard'}
            onClick={() => setActiveItem('dashboard')}
            iconOnly={isIconOnly}
          />
        </TrackerNavigationSection>

        {/* PLANNING Section */}
        <TrackerNavigationSection
          title={isIconOnly ? '' : 'PLANNING'}
          defaultExpanded={true}
        >
          <NavItem
            label={isIconOnly ? '' : 'Thought Bubbles'}
            icon="💭"
            active={activeItem === 'thought-bubbles'}
            onClick={() => setActiveItem('thought-bubbles')}
            iconOnly={isIconOnly}
          />
          <NavItem
            label={isIconOnly ? '' : 'Roadmap'}
            icon="🗺️"
            active={activeItem === 'roadmap'}
            onClick={() => setActiveItem('roadmap')}
            iconOnly={isIconOnly}
          />
          <NavItem
            label={isIconOnly ? '' : 'Initiatives'}
            icon="🎯"
            active={activeItem === 'initiatives'}
            onClick={() => setActiveItem('initiatives')}
            iconOnly={isIconOnly}
          />
          <NavItem
            label={isIconOnly ? '' : 'Epics'}
            icon="📖"
            active={activeItem === 'epics'}
            onClick={() => setActiveItem('epics')}
            iconOnly={isIconOnly}
          />
          <NavItem
            label={isIconOnly ? '' : 'Stories'}
            icon="📝"
            active={activeItem === 'stories'}
            onClick={() => setActiveItem('stories')}
            iconOnly={isIconOnly}
          />
        </TrackerNavigationSection>

        {/* EXECUTION Section */}
        <TrackerNavigationSection
          title={isIconOnly ? '' : 'EXECUTION'}
          defaultExpanded={true}
        >
          <NavItem
            label={isIconOnly ? '' : 'Workflows'}
            icon="⚡"
            active={activeItem === 'workflows'}
            onClick={() => setActiveItem('workflows')}
            iconOnly={isIconOnly}
          />
          <NavItem
            label={isIconOnly ? '' : 'Swarms'}
            icon="🐝"
            active={activeItem === 'swarms'}
            onClick={() => setActiveItem('swarms')}
            iconOnly={isIconOnly}
          />
        </TrackerNavigationSection>

        {!isIconOnly && (
          <>
            {/* GOVERNANCE Section */}
            <TrackerNavigationSection title="GOVERNANCE" defaultExpanded={false}>
              {/* Empty for now */}
              <div className="px-4 py-2 text-xs italic" style={{ color: '#A39686' }}>
                No items yet
              </div>
            </TrackerNavigationSection>

            {/* OPERATIONS Section */}
            <TrackerNavigationSection title="OPERATIONS" defaultExpanded={false}>
              {/* Empty for now */}
              <div className="px-4 py-2 text-xs italic" style={{ color: '#A39686' }}>
                No items yet
              </div>
            </TrackerNavigationSection>

            {/* DOCUMENTATION Section */}
            <TrackerNavigationSection title="DOCUMENTATION" defaultExpanded={false}>
              {/* Empty for now */}
              <div className="px-4 py-2 text-xs italic" style={{ color: '#A39686' }}>
                No items yet
              </div>
            </TrackerNavigationSection>
          </>
        )}
      </div>

      {/* Footer with Settings and Notifications */}
      {!isIconOnly && <TrackerSidebarFooter />}

      {/* Icon-only footer for tablet */}
      {isIconOnly && (
        <div
          className="px-4 py-4 border-t flex flex-col gap-2 items-center"
          style={{ borderTopColor: '#E8E0D5' }}
        >
          <button
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-white"
            title="Settings"
          >
            <svg className="w-5 h-5" style={{ color: '#6B5D52' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
