/**
 * Live Indicator Component - Shows real-time connection status with pulsing animation
 */

export function LiveIndicator() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
      style={{
        backgroundColor: 'white',
        borderColor: '#E8E0D5'
      }}
    >
      <div className="relative flex items-center">
        <div
          className="w-2 h-2 rounded-full animate-pulse-live"
          style={{ backgroundColor: '#D97F6F' }}
        />
      </div>
      <span
        className="text-xs font-medium"
        style={{ color: '#6B5D52' }}
      >
        Live
      </span>
    </div>
  );
}
