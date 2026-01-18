#!/usr/bin/env tsx

/**
 * Test Documentation System
 *
 * Generates documentation and tests search functionality
 */

import { Pool } from 'pg';
import { appConfig } from '../src/config/index.js';
import { SchemaDocGenerator } from '../src/documentation/generators/SchemaDocGenerator.js';
import { ApiDocGenerator } from '../src/documentation/generators/ApiDocGenerator.js';
import { LinkingService } from '../src/documentation/services/LinkingService.js';
import logger from '../src/utils/logger.js';

async function main() {
  const pool = new Pool({
    connectionString: appConfig.databaseUrl,
  });

  try {
    logger.info('Starting documentation system test');

    // 1. Generate schema documentation
    logger.info('='.repeat(70));
    logger.info('Generating schema documentation');
    logger.info('='.repeat(70));

    const schemaGenerator = new SchemaDocGenerator(pool);
    const schemaPages = await schemaGenerator.generateAll('ts_martha');
    await schemaGenerator.saveDocPages(schemaPages);

    logger.info(`Generated ${schemaPages.length} schema documentation pages`);
    console.log('\nSchema pages created:');
    for (const page of schemaPages) {
      console.log(`  - ${page.page_id}: ${page.title}`);
    }

    // 2. Generate API documentation
    logger.info('\n' + '='.repeat(70));
    logger.info('Generating API documentation');
    logger.info('='.repeat(70));

    const sourceRoot = process.cwd();
    const apiGenerator = new ApiDocGenerator(pool, sourceRoot);
    const apiPages = await apiGenerator.generateWorkflowDocs();
    await apiGenerator.saveDocPages(apiPages);

    logger.info(`Generated ${apiPages.length} API documentation pages`);
    console.log('\nAPI pages created:');
    for (const page of apiPages) {
      console.log(`  - ${page.page_id}: ${page.title}`);
    }

    // 3. Auto-detect and create links
    logger.info('\n' + '='.repeat(70));
    logger.info('Auto-detecting links');
    logger.info('='.repeat(70));

    const linkingService = new LinkingService(pool);
    const linksCreated = await linkingService.detectAndCreateLinks();

    logger.info(`Created ${linksCreated} auto-detected links`);

    // 4. Validate links
    logger.info('\n' + '='.repeat(70));
    logger.info('Validating links');
    logger.info('='.repeat(70));

    const validationResults = await linkingService.validateLinks();
    const broken = validationResults.filter(v => v.isBroken);

    console.log(`\nLink validation:`);
    console.log(`  Total links: ${validationResults.length}`);
    console.log(`  Broken links: ${broken.length}`);

    if (broken.length > 0) {
      console.log('\nBroken links:');
      for (const link of broken.slice(0, 10)) {
        console.log(`  - ${link.sourcePageId} → ${link.targetReference}`);
        if (link.errorMessage) {
          console.log(`    Error: ${link.errorMessage}`);
        }
      }
    }

    // 5. Test search
    logger.info('\n' + '='.repeat(70));
    logger.info('Testing search functionality');
    logger.info('='.repeat(70));

    const searchQueries = ['telemetry', 'workflow', 'agent', 'exception'];

    for (const query of searchQueries) {
      const searchResult = await pool.query(
        `SELECT * FROM ts_martha.search_documentation($1, 5)`,
        [query]
      );

      console.log(`\nSearch results for "${query}" (${searchResult.rows.length} results):`);
      for (const result of searchResult.rows) {
        console.log(`  - ${result.page_id}: ${result.title} (rank: ${result.rank.toFixed(3)})`);
      }
    }

    // 6. Get statistics
    logger.info('\n' + '='.repeat(70));
    logger.info('Documentation statistics');
    logger.info('='.repeat(70));

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) AS total_pages,
        COUNT(*) FILTER (WHERE auto_generated = true) AS auto_generated,
        COUNT(*) FILTER (WHERE published = true) AS published,
        COUNT(DISTINCT category) AS categories,
        COUNT(DISTINCT page_type) AS page_types
      FROM ts_martha.documentation_pages
    `);

    const stats = statsResult.rows[0];
    console.log('\nDocumentation pages:');
    console.log(`  Total: ${stats.total_pages}`);
    console.log(`  Auto-generated: ${stats.auto_generated}`);
    console.log(`  Published: ${stats.published}`);
    console.log(`  Categories: ${stats.categories}`);
    console.log(`  Page types: ${stats.page_types}`);

    // 7. Sample page with links
    logger.info('\n' + '='.repeat(70));
    logger.info('Sample page with links');
    logger.info('='.repeat(70));

    if (schemaPages.length > 0) {
      const samplePageId = schemaPages[0].page_id;
      const pageResult = await pool.query(
        `SELECT * FROM ts_martha.get_documentation_page_with_links($1)`,
        [samplePageId]
      );

      if (pageResult.rows.length > 0) {
        const pageData = pageResult.rows[0];
        console.log(`\nPage: ${samplePageId}`);
        console.log(`Title: ${pageData.page.title}`);
        console.log(`Outgoing links: ${pageData.outgoing_links.length}`);
        console.log(`Incoming links: ${pageData.incoming_links.length}`);

        if (pageData.outgoing_links.length > 0) {
          console.log('\nSample outgoing links:');
          for (const link of pageData.outgoing_links.slice(0, 3)) {
            console.log(`  → ${link.target_reference} (${link.target_type})`);
          }
        }
      }
    }

    logger.info('\n' + '='.repeat(70));
    logger.info('✅ Documentation system test complete');
    logger.info('='.repeat(70));

    process.exit(0);
  } catch (error) {
    logger.error('Documentation test failed', { error });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
