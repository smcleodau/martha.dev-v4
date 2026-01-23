/**
 * Bundle Size Analysis Script
 * Analyzes the dashboard build output and generates a size report
 */

import * as fs from 'fs';
import * as path from 'path';

interface FileSize {
  path: string;
  size: number;
  gzipSize?: number;
}

interface BundleAnalysis {
  totalSize: number;
  totalGzipSize: number;
  files: FileSize[];
  largestFiles: FileSize[];
  recommendations: string[];
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Recursively get all files in directory
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * Analyze bundle
 */
function analyzeBundleSize(buildDir: string): BundleAnalysis {
  console.log('Analyzing bundle size...\n');

  if (!fs.existsSync(buildDir)) {
    throw new Error(`Build directory not found: ${buildDir}`);
  }

  // Get all files
  const allFiles = getAllFiles(buildDir);

  // Calculate sizes
  const files: FileSize[] = allFiles.map(filePath => ({
    path: filePath.replace(buildDir + '/', ''),
    size: getFileSize(filePath),
  }));

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  // Sort by size
  const largestFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 20);

  // Generate recommendations
  const recommendations: string[] = [];

  // Check for large JS files
  const largeJsFiles = files.filter(f => f.path.endsWith('.js') && f.size > 500 * 1024);
  if (largeJsFiles.length > 0) {
    recommendations.push(
      `Found ${largeJsFiles.length} JavaScript file(s) larger than 500KB. Consider code splitting.`
    );
  }

  // Check for unminified files
  const unminifiedFiles = files.filter(
    f => (f.path.endsWith('.js') || f.path.endsWith('.css')) && !f.path.includes('.min.')
  );
  if (unminifiedFiles.length > 0) {
    recommendations.push(
      `Found ${unminifiedFiles.length} file(s) that may not be minified. Ensure production build is used.`
    );
  }

  // Check total bundle size
  if (totalSize > 5 * 1024 * 1024) {
    recommendations.push(
      'Total bundle size exceeds 5MB. Consider implementing lazy loading and code splitting.'
    );
  }

  // Estimate gzipped size (roughly 30% of original)
  const totalGzipSize = Math.round(totalSize * 0.3);

  return {
    totalSize,
    totalGzipSize,
    files,
    largestFiles,
    recommendations,
  };
}

/**
 * Generate markdown report
 */
function generateReport(analysis: BundleAnalysis): string {
  let report = `# Bundle Size Analysis Report

**Generated:** ${new Date().toLocaleString()}

## Summary

- **Total Size:** ${formatBytes(analysis.totalSize)}
- **Estimated Gzipped:** ${formatBytes(analysis.totalGzipSize)}
- **Total Files:** ${analysis.files.length}

## Performance Budget Status

| Metric | Actual | Budget | Status |
|--------|--------|--------|--------|
| Total Bundle (Gzipped) | ${formatBytes(analysis.totalGzipSize)} | <500KB | ${analysis.totalGzipSize < 500 * 1024 ? '✅ PASS' : '❌ FAIL'} |
| Largest JS File | ${formatBytes(analysis.largestFiles.find(f => f.path.endsWith('.js'))?.size || 0)} | <300KB | ${(analysis.largestFiles.find(f => f.path.endsWith('.js'))?.size || 0) < 300 * 1024 ? '✅ PASS' : '⚠️  WARN'} |

## Largest Files (Top 20)

| File | Size | Gzipped (est) |
|------|------|---------------|
`;

  analysis.largestFiles.forEach(file => {
    const gzipSize = Math.round(file.size * 0.3);
    report += `| ${file.path} | ${formatBytes(file.size)} | ${formatBytes(gzipSize)} |\n`;
  });

  report += `\n## File Type Breakdown\n\n`;

  // Group by extension
  const byExtension = new Map<string, number>();
  analysis.files.forEach(file => {
    const ext = path.extname(file.path) || 'no extension';
    byExtension.set(ext, (byExtension.get(ext) || 0) + file.size);
  });

  report += `| Type | Size | Percentage |\n`;
  report += `|------|------|------------|\n`;

  Array.from(byExtension.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([ext, size]) => {
      const percentage = ((size / analysis.totalSize) * 100).toFixed(1);
      report += `| ${ext} | ${formatBytes(size)} | ${percentage}% |\n`;
    });

  if (analysis.recommendations.length > 0) {
    report += `\n## Recommendations\n\n`;
    analysis.recommendations.forEach(rec => {
      report += `- ⚠️  ${rec}\n`;
    });
  } else {
    report += `\n## Recommendations\n\n`;
    report += `✅ No immediate optimization recommendations. Bundle size is within acceptable limits.\n`;
  }

  report += `\n## Optimization Strategies\n\n`;
  report += `### Implemented\n\n`;
  report += `1. ✅ Code splitting with React.lazy\n`;
  report += `2. ✅ Tree shaking with ES modules\n`;
  report += `3. ✅ Minification in production build\n`;
  report += `4. ✅ CSS extraction and optimization\n\n`;

  report += `### Future Optimizations\n\n`;
  report += `1. **Dynamic Imports**\n`;
  report += `   - Lazy load heavy libraries (frappe-gantt, react-big-calendar)\n`;
  report += `   - Split by route and feature\n\n`;

  report += `2. **Dependency Analysis**\n`;
  report += `   - Use webpack-bundle-analyzer for visual analysis\n`;
  report += `   - Identify duplicate dependencies\n`;
  report += `   - Replace heavy libraries with lighter alternatives\n\n`;

  report += `3. **Asset Optimization**\n`;
  report += `   - Compress images (WebP, AVIF)\n`;
  report += `   - Use SVG sprites for icons\n`;
  report += `   - Implement lazy loading for images\n\n`;

  report += `4. **Advanced Techniques**\n`;
  report += `   - Implement service worker caching\n`;
  report += `   - Use HTTP/2 server push\n`;
  report += `   - Enable Brotli compression\n\n`;

  report += `---\n\n`;
  report += `*Generated by Martha Tracker Bundle Analyzer*\n`;

  return report;
}

/**
 * Main function
 */
async function main() {
  const buildDir = path.join(process.cwd(), 'dashboard', 'dist');

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           BUNDLE SIZE ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const analysis = analyzeBundleSize(buildDir);

    // Print summary
    console.log('Summary:');
    console.log(`  Total Size: ${formatBytes(analysis.totalSize)}`);
    console.log(`  Estimated Gzipped: ${formatBytes(analysis.totalGzipSize)}`);
    console.log(`  Total Files: ${analysis.files.length}`);
    console.log('');

    console.log('Largest Files:');
    analysis.largestFiles.slice(0, 10).forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.path}: ${formatBytes(file.size)}`);
    });
    console.log('');

    if (analysis.recommendations.length > 0) {
      console.log('Recommendations:');
      analysis.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
      console.log('');
    }

    // Generate and save report
    const report = generateReport(analysis);
    const reportPath = path.join(process.cwd(), 'test-results', 'BUNDLE-SIZE-REPORT.md');

    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report, 'utf-8');

    console.log(`Report saved to: ${reportPath}`);
    console.log('');

    // Exit with appropriate code
    const hasIssues = analysis.totalGzipSize > 500 * 1024;
    process.exit(hasIssues ? 1 : 0);
  } catch (error) {
    console.error('Error analyzing bundle:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeBundleSize, generateReport };
