/**
 * Timeline Calendar Component
 * Wrapper around React Big Calendar with custom configuration
 */

import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { type Issue } from '../../../api/tracker';
import { TimelineEvent } from './TimelineEvent';
import { ZoomControls } from './ZoomControls';
import { useTimelinePreferences } from '../../../utils/preferenceHooks';
import './timeline.css';

// Configure date-fns localizer
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
});

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Issue;
}

interface TimelineCalendarProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  defaultView?: View;
  worktreeId: string;
  boardId: string;
  onSelectSlot?: (slotInfo: any) => void;
}

export function TimelineCalendar({
  events,
  onSelectEvent,
  defaultView = 'week',
  worktreeId,
  boardId,
  onSelectSlot,
}: TimelineCalendarProps) {
  // Use preferences hook for persisting zoom level
  const { view: savedViewPref, setView: saveView } = useTimelinePreferences(worktreeId, boardId);

  // Map preference view to calendar view
  const mapPrefToView = (pref: 'day' | 'week' | 'month'): View => {
    return pref as View;
  };

  const [view, setView] = useState<View>(mapPrefToView(savedViewPref));
  const [date, setDate] = useState(new Date());

  // Handle view change with preference persistence
  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
    // Save to preferences (day/week/month only)
    if (newView === 'day' || newView === 'week' || newView === 'month') {
      saveView(newView);
    }
  }, [saveView]);

  // Custom event renderer
  const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => {
    // Determine if event is single-day
    const isSingleDay = event.start.toDateString() === event.end.toDateString();
    return <TimelineEvent event={event} isSingleDay={isSingleDay} />;
  }, []);

  // Event style getter - applies type and priority colors
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const issue = event.resource;

    // Type colors (warm palette)
    const typeColors = {
      epic: '#8B7AA8',
      story: '#D97F6F',
      task: '#A39686',
      bug: '#C0392B',
    };

    // Priority border configuration
    const priorityBorder = {
      critical: { width: '4px', color: '#C0392B' },
      high: { width: '4px', color: '#E8A93A' },
      medium: { width: '4px', color: '#E0B666' },
      low: { width: '2px', color: '#D4CBBD' },
    };

    const bgColor = typeColors[issue.type];
    const border = priorityBorder[issue.priority];

    return {
      style: {
        backgroundColor: bgColor,
        color: 'white',
        borderLeft: `${border.width} solid ${border.color}`,
        borderRadius: '6px',
        border: 'none',
        padding: '6px 10px',
      },
    };
  }, []);

  // Day prop getter - highlights today
  const dayPropGetter = useCallback((date: Date) => {
    const isToday = new Date().toDateString() === date.toDateString();
    if (isToday) {
      return {
        className: 'rbc-today',
        style: {
          backgroundColor: '#FDF9F5',
        },
      };
    }
    return {};
  }, []);

  // Calendar formats
  const formats = useMemo(() => ({
    weekdayFormat: (date: Date) => format(date, 'EEE'),
    dayFormat: (date: Date) => format(date, 'd'),
    monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy'),
    dayHeaderFormat: (date: Date) => format(date, 'EEEE, MMMM d'),
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
  }), []);

  // Custom toolbar with zoom controls
  const CustomToolbar = useCallback((toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const toolbarDate = toolbar.date;
      switch (view) {
        case 'day':
          return format(toolbarDate, 'MMMM d, yyyy');
        case 'week':
          return format(toolbarDate, 'MMMM yyyy');
        case 'month':
          return format(toolbarDate, 'MMMM yyyy');
        default:
          return format(toolbarDate, 'MMMM yyyy');
      }
    };

    return (
      <div
        className="rbc-toolbar px-4 py-3 border-b"
        style={{
          backgroundColor: 'white',
          borderBottomColor: '#E8E0D5',
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
              style={{
                backgroundColor: 'white',
                borderColor: '#E8E0D5',
                color: '#2F241B',
              }}
            >
              Today
            </button>

            <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: '#E8E0D5' }}>
              <button
                onClick={goToBack}
                className="px-3 py-1.5 hover:bg-opacity-50 transition-colors"
                style={{ color: '#2F241B' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="px-3 py-1.5 border-l hover:bg-opacity-50 transition-colors"
                style={{ color: '#2F241B', borderLeftColor: '#E8E0D5' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <span className="text-lg font-semibold ml-2" style={{ color: '#2F241B' }}>
              {label()}
            </span>
          </div>

          {/* Right: Zoom Controls */}
          <ZoomControls
            currentView={view as 'day' | 'week' | 'month'}
            onViewChange={handleViewChange}
            worktreeId={worktreeId}
            boardId={boardId}
          />
        </div>
      </div>
    );
  }, [view, worktreeId, boardId]);

  return (
    <div style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        view={view}
        onView={handleViewChange}
        date={date}
        onNavigate={setDate}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        eventPropGetter={eventStyleGetter}
        dayPropGetter={dayPropGetter}
        formats={formats}
        components={{
          event: EventComponent,
          toolbar: CustomToolbar,
        }}
        views={['month', 'week', 'day']}
        defaultView={defaultView}
        popup
        selectable
        showMultiDayTimes
        step={60}
        timeslots={1}
        min={new Date(2024, 0, 1, 7, 0, 0)}
        max={new Date(2024, 0, 1, 19, 0, 0)}
      />
    </div>
  );
}

/**
 * Convert Issue to CalendarEvent
 * Returns null if issue has no date information
 */
export function convertIssueToEvent(issue: Issue): CalendarEvent | null {
  if (!issue.due_date) return null; // No date = no event

  const start = issue.start_date ? new Date(issue.start_date) : new Date(issue.due_date);
  const end = new Date(issue.due_date);

  return {
    id: issue.id,
    title: `${issue.id}: ${issue.title}`,
    start,
    end,
    resource: issue,
  };
}

/**
 * Convert multiple issues to calendar events
 * Filters out issues without dates
 */
export function convertIssuesToEvents(issues: Issue[]): CalendarEvent[] {
  return issues
    .map(convertIssueToEvent)
    .filter((event): event is CalendarEvent => event !== null);
}
