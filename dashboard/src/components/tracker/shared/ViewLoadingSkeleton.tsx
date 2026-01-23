/**
 * View Loading Skeleton Component
 * Displays animated loading skeletons that match different view layouts
 * Used when switching between views or loading data
 */

interface ViewLoadingSkeletonProps {
  viewType: 'kanban' | 'list' | 'timeline' | 'gantt';
}

export function ViewLoadingSkeleton({ viewType }: ViewLoadingSkeletonProps) {
  return (
    <div className="view-loading-skeleton flex-1 p-6" style={{ backgroundColor: '#F5F1EC' }}>
      {viewType === 'kanban' && <KanbanSkeleton />}
      {viewType === 'list' && <ListSkeleton />}
      {viewType === 'timeline' && <TimelineSkeleton />}
      {viewType === 'gantt' && <GanttSkeleton />}
    </div>
  );
}

/**
 * Kanban View Skeleton
 */
function KanbanSkeleton() {
  return (
    <div className="flex gap-4 h-full">
      {[1, 2, 3, 4].map((col) => (
        <div
          key={col}
          className="flex-1 rounded-lg p-4 space-y-3"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E0D5', borderWidth: '1px' }}
        >
          {/* Column header */}
          <div className="h-8 rounded animate-pulse" style={{ backgroundColor: '#F5F1EC' }} />

          {/* Cards */}
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="rounded-lg p-4 space-y-2 animate-pulse"
              style={{ backgroundColor: '#FDFCFA', borderColor: '#E8E0D5', borderWidth: '1px' }}
            >
              <div className="h-4 rounded" style={{ backgroundColor: '#E8E0D5', width: '70%' }} />
              <div className="h-3 rounded" style={{ backgroundColor: '#F5F1EC', width: '90%' }} />
              <div className="h-3 rounded" style={{ backgroundColor: '#F5F1EC', width: '50%' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * List View Skeleton
 */
function ListSkeleton() {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E0D5', borderWidth: '1px' }}
    >
      {/* Header */}
      <div
        className="p-4 border-b animate-pulse"
        style={{ backgroundColor: '#F5F4F2', borderColor: '#E8E0D5' }}
      >
        <div className="h-6 rounded" style={{ backgroundColor: '#E8E0D5', width: '200px' }} />
      </div>

      {/* Table rows */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
        <div
          key={row}
          className="grid gap-4 px-6 py-4 border-b animate-pulse"
          style={{
            gridTemplateColumns: 'auto 2fr 1fr 1fr 1fr 1fr 100px',
            borderColor: '#F5F1EC',
          }}
        >
          <div className="h-4 rounded" style={{ backgroundColor: '#E8E0D5', width: '60px' }} />
          <div className="h-4 rounded" style={{ backgroundColor: '#E8E0D5', width: '80%' }} />
          <div className="h-4 rounded" style={{ backgroundColor: '#F5F1EC', width: '60px' }} />
          <div className="h-4 rounded" style={{ backgroundColor: '#F5F1EC', width: '70px' }} />
          <div className="h-4 rounded" style={{ backgroundColor: '#F5F1EC', width: '60px' }} />
          <div className="h-4 rounded" style={{ backgroundColor: '#F5F1EC', width: '80px' }} />
          <div className="h-4 rounded" style={{ backgroundColor: '#F5F1EC', width: '40px' }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Timeline View Skeleton
 */
function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {/* Timeline header with date markers */}
      <div
        className="rounded-lg p-4 animate-pulse"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E0D5', borderWidth: '1px' }}
      >
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div key={day} className="flex-1 text-center space-y-2">
              <div
                className="h-6 rounded mx-auto"
                style={{ backgroundColor: '#E8E0D5', width: '40px' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Swimlanes */}
      {[1, 2, 3].map((lane) => (
        <div
          key={lane}
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E0D5', borderWidth: '1px' }}
        >
          {/* Lane header */}
          <div
            className="px-4 py-3 border-b animate-pulse"
            style={{ backgroundColor: '#F5F4F2', borderColor: '#E8E0D5' }}
          >
            <div className="h-5 rounded" style={{ backgroundColor: '#E8E0D5', width: '120px' }} />
          </div>

          {/* Lane content with event blocks */}
          <div className="p-4 space-y-2">
            <div className="flex gap-2">
              <div
                className="h-12 rounded animate-pulse"
                style={{ backgroundColor: '#FDF5F3', width: '120px' }}
              />
              <div
                className="h-12 rounded animate-pulse"
                style={{ backgroundColor: '#F5F4F2', width: '180px' }}
              />
              <div
                className="h-12 rounded animate-pulse"
                style={{ backgroundColor: '#F3F1F7', width: '90px' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Gantt View Skeleton
 */
function GanttSkeleton() {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E0D5', borderWidth: '1px' }}
    >
      {/* Gantt header */}
      <div
        className="p-4 border-b animate-pulse"
        style={{ backgroundColor: '#F5F4F2', borderColor: '#E8E0D5' }}
      >
        <div className="h-6 rounded" style={{ backgroundColor: '#E8E0D5', width: '250px' }} />
      </div>

      {/* Gantt timeline header */}
      <div
        className="flex border-b animate-pulse"
        style={{ backgroundColor: '#FDFCFA', borderColor: '#E8E0D5' }}
      >
        <div className="w-64 p-3 border-r" style={{ borderColor: '#E8E0D5' }}>
          <div className="h-5 rounded" style={{ backgroundColor: '#E8E0D5', width: '100px' }} />
        </div>
        <div className="flex-1 p-3 flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((week) => (
            <div
              key={week}
              className="h-5 rounded flex-1"
              style={{ backgroundColor: '#E8E0D5' }}
            />
          ))}
        </div>
      </div>

      {/* Gantt rows */}
      {[1, 2, 3, 4, 5, 6].map((row) => (
        <div
          key={row}
          className="flex border-b animate-pulse"
          style={{ borderColor: '#F5F1EC' }}
        >
          <div className="w-64 p-3 border-r" style={{ borderColor: '#E8E0D5' }}>
            <div
              className="h-4 rounded"
              style={{ backgroundColor: '#E8E0D5', width: `${60 + row * 10}%` }}
            />
          </div>
          <div className="flex-1 p-3">
            <div
              className="h-8 rounded"
              style={{
                backgroundColor: row % 2 === 0 ? '#FDF5F3' : '#F5F4F2',
                width: `${40 + row * 8}%`,
                marginLeft: `${row * 5}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
