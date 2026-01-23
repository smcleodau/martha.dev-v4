#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getTemporalClient } from '../../src/temporal/client.js';

(async () => {
  try {
    const client = await getTemporalClient();
    console.log('SUCCESS');
    process.exit(0);
  } catch (error: any) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
})();
