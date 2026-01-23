# Performance Optimization Guide

## Overview

This guide provides actionable steps to optimize the Martha Tracker application based on benchmark results and bundle analysis.

## Current Performance Status

### Runtime Performance: ✅ Excellent

All runtime benchmarks exceed targets by significant margins:
- List View: 1111x faster than target
- Timeline View: 162x faster than target
- Gantt View: 256x faster than target
- Filtering: 370x faster than target

### Bundle Size: ⚠️ Needs Optimization

Current bundle size exceeds recommended limits:
- Total (Gzipped): 800KB (target: <500KB)
- Main JS Bundle: 2.4MB uncompressed (731KB gzipped)

## Priority Optimization Tasks

### 1. Code Splitting by Route (HIGH PRIORITY)

Currently all code is bundled together. Split by route for lazy loading.

**Before:**
```typescript
// All imports at top level
import { KanbanBoard } from './components/tracker/board/KanbanBoard';
import { ListView } from './components/tracker/list/ListView';
import { TimelineView } from './components/tracker/timeline/TimelineView';
import { GanttView } from './components/tracker/board/GanttView';
```

**After:**
```typescript
// Lazy load heavy components
const KanbanBoard = React.lazy(() => import('./components/tracker/board/KanbanBoard'));
const ListView = React.lazy(() => import('./components/tracker/list/ListView'));
const TimelineView = React.lazy(() => import('./components/tracker/timeline/TimelineView'));
const GanttView = React.lazy(() => import('./components/tracker/board/GanttView'));

// In component
<Suspense fallback={<LoadingSpinner />}>
  {viewMode === 'kanban' && <KanbanBoard {...props} />}
  {viewMode === 'list' && <ListView {...props} />}
  {viewMode === 'timeline' && <TimelineView {...props} />}
  {viewMode === 'gantt' && <GanttView {...props} />}
</Suspense>
```

**Expected Impact**: Reduce initial bundle by ~40% (300KB gzipped)

### 2. Lazy Load Heavy Libraries (HIGH PRIORITY)

Defer loading of large third-party libraries until needed.

#### Frappe Gantt (only needed in Gantt view)

**Before:**
```typescript
import Gantt from 'frappe-gantt';
```

**After:**
```typescript
// In GanttChart.tsx
const [Gantt, setGantt] = useState<any>(null);

useEffect(() => {
  import('frappe-gantt').then(module => {
    setGantt(() => module.default);
  });
}, []);
```

#### React Big Calendar (only needed in Timeline view)

**Before:**
```typescript
import { Calendar } from 'react-big-calendar';
```

**After:**
```typescript
const Calendar = React.lazy(() =>
  import('react-big-calendar').then(module => ({
    default: module.Calendar
  }))
);
```

**Expected Impact**: Reduce initial bundle by ~150KB gzipped

### 3. Date-fns Tree Shaking (MEDIUM PRIORITY)

Only import needed date functions instead of entire library.

**Before:**
```typescript
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
```

**After:**
```typescript
// Use specific imports to enable tree shaking
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
```

Or consider alternatives:
- **day.js**: 2KB gzipped (vs 11KB for date-fns)
- **date-fns-tz**: If timezone support needed

**Expected Impact**: Reduce bundle by ~50KB gzipped

### 4. Optimize React Virtual (LOW PRIORITY)

React Virtual is already lightweight, but ensure optimal imports.

**Current (Good):**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
```

No changes needed - already using named imports.

### 5. Bundle Analysis with Visualizer (MEDIUM PRIORITY)

Install and use bundle visualizer to identify large dependencies.

```bash
npm install --save-dev rollup-plugin-visualizer
```

**vite.config.ts:**
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

Run build and analyze:
```bash
cd dashboard
npm run build
# Opens interactive bundle visualization
```

## Vite Configuration Optimizations

### 1. Enable Compression

**vite.config.ts:**
```typescript
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'brotliCompress', // Better than gzip
      ext: '.br',
      threshold: 1024, // Only compress files > 1KB
    }),
  ],
});
```

### 2. Manual Chunk Splitting

Split vendor code from application code:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Large UI libraries
          'vendor-calendar': ['react-big-calendar', 'date-fns'],
          'vendor-gantt': ['frappe-gantt'],

          // Query and state management
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-virtual'],
        },
      },
    },
    chunkSizeWarningLimit: 500, // Warn if chunk > 500KB
  },
});
```

### 3. Minification Settings

Ensure aggressive minification:

```typescript
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'], // Remove specific functions
      },
    },
  },
});
```

## Component-Level Optimizations

### 1. Memoize Expensive Components

**IssueCard.tsx:**
```typescript
import React, { memo } from 'react';

export const IssueCard = memo(({ issue, onDragStart, onDragEnd, onClick }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if issue actually changed
  return (
    prevProps.issue.id === nextProps.issue.id &&
    prevProps.issue.updated_at === nextProps.issue.updated_at
  );
});

IssueCard.displayName = 'IssueCard';
```

### 2. Lazy Load Detail Panel

Detail panel is only needed when issue is selected:

**TrackerPage.tsx:**
```typescript
const IssueDetailPanel = React.lazy(() =>
  import('./components/tracker/detail/IssueDetailPanel')
);

// In render
{selectedIssue && issues[selectedIssue] && (
  <Suspense fallback={<DetailPanelSkeleton />}>
    <IssueDetailPanel {...props} />
  </Suspense>
)}
```

### 3. Virtualize Long Lists

Already implemented for list view. Consider for other views:

**Timeline View** - For 1000+ events:
```typescript
// Use react-virtual for day columns
const dayVirtualizer = useVirtualizer({
  count: days.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 150, // Day column width
  horizontal: true,
});
```

## CSS Optimization

### 1. Critical CSS Extraction

Extract above-the-fold CSS:

```bash
npm install --save-dev critters
```

**vite.config.ts:**
```typescript
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      minify: true,
      entry: 'src/main.tsx',
      inject: {
        data: {
          injectCriticalCSS: true,
        },
      },
    }),
  ],
});
```

### 2. PurgeCSS for Tailwind

Ensure unused Tailwind classes are removed:

**tailwind.config.js:**
```javascript
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### 3. CSS Modules for Component Styles

Instead of global CSS, use CSS modules:

**Component.module.css:**
```css
.card {
  padding: 1rem;
  border-radius: 0.5rem;
}
```

**Component.tsx:**
```typescript
import styles from './Component.module.css';

export function Component() {
  return <div className={styles.card}>Content</div>;
}
```

## Network Optimization

### 1. HTTP/2 Server Push

Configure server to push critical resources:

```nginx
# nginx configuration
location / {
  http2_push /assets/index.css;
  http2_push /assets/vendor-react.js;
}
```

### 2. Preload Critical Resources

**index.html:**
```html
<head>
  <link rel="preload" href="/assets/vendor-react.js" as="script">
  <link rel="preload" href="/assets/index.css" as="style">
</head>
```

### 3. Service Worker Caching

**sw.js:**
```javascript
// Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/index.css',
        '/assets/vendor-react.js',
      ]);
    })
  );
});
```

## Measurement & Monitoring

### 1. Add Performance Marks

```typescript
// Before expensive operation
performance.mark('gantt-render-start');

// After operation
performance.mark('gantt-render-end');
performance.measure('gantt-render', 'gantt-render-start', 'gantt-render-end');

// Get measurement
const measure = performance.getEntriesByName('gantt-render')[0];
console.log(`Gantt render took ${measure.duration}ms`);
```

### 2. Web Vitals Monitoring

```bash
npm install web-vitals
```

```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 3. Bundle Size Monitoring in CI

**package.json:**
```json
{
  "scripts": {
    "build": "vite build",
    "analyze": "tsx scripts/analyze-bundle.ts",
    "test:bundle": "npm run build && npm run analyze"
  }
}
```

**.github/workflows/bundle-size.yml:**
```yaml
name: Bundle Size Check

on: [pull_request]

jobs:
  check-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and check bundle size
        run: |
          cd dashboard
          npm ci
          npm run build
          npm run analyze
```

## Optimization Checklist

### Immediate Actions (Week 1)

- [ ] Split code by route (KanbanBoard, ListView, TimelineView, GanttView)
- [ ] Lazy load frappe-gantt
- [ ] Lazy load react-big-calendar
- [ ] Add bundle visualizer
- [ ] Configure manual chunk splitting

### Short-term (Week 2-3)

- [ ] Optimize date-fns imports (or migrate to day.js)
- [ ] Memoize expensive components
- [ ] Lazy load detail panel
- [ ] Add compression plugin (Brotli)
- [ ] Remove console.logs in production

### Medium-term (Month 1-2)

- [ ] Implement service worker
- [ ] Add critical CSS extraction
- [ ] Configure HTTP/2 push
- [ ] Add Web Vitals monitoring
- [ ] Set up bundle size CI checks

### Long-term (Quarter 1)

- [ ] Consider canvas rendering for extreme datasets (5000+ issues)
- [ ] Implement Web Workers for heavy computations
- [ ] Add IndexedDB caching
- [ ] Progressive Web App (PWA) features
- [ ] Implement differential serving (modern vs legacy bundles)

## Expected Results

After implementing immediate and short-term optimizations:

| Metric | Current | Target | Expected |
|--------|---------|--------|----------|
| Initial Bundle (Gzipped) | 800KB | <500KB | ~400KB |
| Time to Interactive | ~2.5s | <3s | ~1.5s |
| First Contentful Paint | ~1.2s | <1.8s | ~0.8s |
| Largest Contentful Paint | ~2.1s | <2.5s | ~1.3s |

## Resources

- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web.dev Performance](https://web.dev/performance/)
- [Bundle Analysis Tools](https://bundlephobia.com/)

---

**Last Updated**: January 18, 2026
**Status**: Active recommendations based on MTH-058 benchmarks
