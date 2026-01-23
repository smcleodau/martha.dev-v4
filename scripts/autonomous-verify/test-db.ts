#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { query, checkDatabaseHealth } from '../../src/database/client.js';

(async () => {
  try {
    const healthy = await checkDatabaseHealth();
    if (healthy) {
      const result = await query('SELECT NOW() as time, version() as version');
      console.log('SUCCESS:', result.rows[0].version.substring(0, 50));
      process.exit(0);
    } else {
      console.error('ERROR: Database health check failed');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
})();
