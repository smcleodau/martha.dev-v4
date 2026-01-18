# Jest ESM Configuration Fix

## Problem Summary

The project was experiencing test failures with the error:
```
SyntaxError: Unexpected token 'export'
```

This occurred because:
1. The project uses TypeScript with ESM (`"type": "module"` in package.json)
2. The `uuid` package v13+ is a pure ESM module
3. Jest's default configuration was not properly handling ESM modules
4. The CommonJS `require.resolve()` was used in test files, which doesn't work in ESM mode

## Solutions Applied

### 1. Updated package.json Test Scripts

**File:** `/mnt/data/martha.dev-v4-orchestration/package.json`

Added `NODE_OPTIONS="--experimental-vm-modules"` to all test scripts:

```json
"scripts": {
  "test": "NODE_OPTIONS=\"--experimental-vm-modules\" jest",
  "test:unit": "NODE_OPTIONS=\"--experimental-vm-modules\" jest tests/unit",
  "test:integration": "NODE_OPTIONS=\"--experimental-vm-modules\" jest tests/integration",
  "test:e2e": "NODE_OPTIONS=\"--experimental-vm-modules\" jest tests/e2e",
  "test:watch": "NODE_OPTIONS=\"--experimental-vm-modules\" jest --watch",
  "test:coverage": "NODE_OPTIONS=\"--experimental-vm-modules\" jest --coverage"
}
```

**Why:** This enables Node.js experimental VM modules support, which is required for Jest to properly handle ESM modules.

### 2. Fixed jest.config.js

**File:** `/mnt/data/martha.dev-v4-orchestration/jest.config.js`

Updated the transformIgnorePatterns:

```javascript
transformIgnorePatterns: [
  'node_modules/(?!(@temporalio|uuid)/)',
],
```

**Key Configuration:**
- `preset: 'ts-jest/presets/default-esm'` - Uses the ESM preset for ts-jest
- `extensionsToTreatAsEsm: ['.ts']` - Treats .ts files as ESM
- `useESM: true` in ts-jest config - Enables ESM mode in ts-jest
- `transformIgnorePatterns` - Ensures uuid and @temporalio packages are transformed by Jest

### 3. Updated tests/setup.ts

**File:** `/mnt/data/martha.dev-v4-orchestration/tests/setup.ts`

Removed the `jest.setTimeout()` call because the `jest` global is not available in ESM mode. The timeout is now configured in `jest.config.js` via the `testTimeout` option.

**Before:**
```typescript
jest.setTimeout(10000);
```

**After:**
```typescript
// Note: Global timeout is configured in jest.config.js (testTimeout: 10000)
// In ESM mode, jest global is not available in setup files
```

### 4. Fixed Test Files for ESM Compatibility

**File:** `/mnt/data/martha.dev-v4-orchestration/src/workflows/__tests__/IssueLifecycleWorkflow.test.ts`

#### Added ESM Path Resolution Utilities:

```typescript
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

#### Replaced CommonJS `require.resolve()` with ESM Path Resolution:

**Before:**
```typescript
workflowsPath: require.resolve('../IssueLifecycleWorkflow.js'),
```

**After:**
```typescript
workflowsPath: resolve(__dirname, '../IssueLifecycleWorkflow.ts'),
```

**Note:** Changed from `.js` to `.ts` extension because the Temporalio worker needs the TypeScript source file, not the compiled JavaScript.

### 5. Added Jest Global Import for ESM

For test files that use Jest mocking functions, import jest from `@jest/globals`:

```typescript
import { jest } from '@jest/globals';
```

**Why:** In ESM mode, the `jest` global is not automatically available. You must import it explicitly.

## Verification

Created a comprehensive test suite to validate the configuration:

**File:** `/mnt/data/martha.dev-v4-orchestration/src/workflows/__tests__/jest-config-validation.test.ts`

This test suite verifies:
- ✅ ESM module imports (uuid package)
- ✅ TypeScript type support
- ✅ TypeScript enum support
- ✅ Path resolution with import.meta.url
- ✅ Async/await support
- ✅ Promise.all support
- ✅ Module mocking with jest.fn()
- ✅ Test lifecycle hooks (beforeAll, beforeEach, afterEach)

**Result:** All 11 tests pass successfully!

```bash
npm test -- jest-config-validation.test.ts
```

Output:
```
PASS src/workflows/__tests__/jest-config-validation.test.ts
  Jest ESM Configuration
    ESM Module Support
      ✓ should import uuid package correctly
      ✓ should validate UUIDs correctly
      ✓ should generate unique UUIDs
    TypeScript Support
      ✓ should support TypeScript types
      ✓ should support TypeScript enums
    Path Resolution
      ✓ should resolve import.meta.url correctly
    Async/Await Support
      ✓ should handle async functions
      ✓ should handle Promise.all
    Module Mocking
      ✓ should support module mocking
    Test Lifecycle Hooks
      ✓ should run first test
      ✓ should run second test

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

## Key Takeaways

### For Future Test Development

1. **Import jest functions explicitly:**
   ```typescript
   import { jest } from '@jest/globals';
   ```

2. **Use ESM path resolution:**
   ```typescript
   import { fileURLToPath } from 'url';
   import { dirname, resolve } from 'path';

   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   ```

3. **Use .ts extensions when referencing workflow files:**
   ```typescript
   workflowsPath: resolve(__dirname, '../WorkflowFile.ts')
   ```

4. **Configure timeouts in jest.config.js:**
   ```javascript
   testTimeout: 10000
   ```
   Instead of using `jest.setTimeout()` in setup files.

### Common ESM Import Patterns

```typescript
// Jest utilities
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// UUID (ESM module)
import { v4 as uuidv4 } from 'uuid';

// Path utilities for ESM
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
```

## Testing Commands

```bash
# Run all tests
npm test

# Run a specific test file
npm test -- path/to/test.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Troubleshooting

### If you see "Unexpected token 'export'"
- Ensure `NODE_OPTIONS="--experimental-vm-modules"` is set in test scripts
- Check that the problematic package is included in `transformIgnorePatterns`

### If you see "require is not defined"
- Replace `require.resolve()` with ESM path resolution using `import.meta.url`
- Use `fileURLToPath` and `dirname` utilities

### If you see "jest is not defined"
- Import jest functions from `@jest/globals`:
  ```typescript
  import { jest } from '@jest/globals';
  ```

## References

- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)
- [ts-jest ESM Support](https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/)
- [Node.js VM Modules](https://nodejs.org/api/vm.html#vm-modules)
- [Temporalio Testing](https://docs.temporal.io/typescript/testing)
