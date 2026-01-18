/**
 * Documentation API Routes
 *
 * Endpoints for searching, retrieving, and managing auto-generated documentation
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import logger from '../../utils/logger.js';
import { SchemaDocGenerator } from '../../documentation/generators/SchemaDocGenerator.js';
import { ApiDocGenerator } from '../../documentation/generators/ApiDocGenerator.js';
import { LinkingService } from '../../documentation/services/LinkingService.js';

export function createDocumentationRoutes(db: Pool): Router {
  const router = Router();

  /**
   * GET /api/docs/search
   * Search documentation with full-text and fuzzy matching
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const { q, category, page_type, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }

      const result = await db.query(
        `SELECT * FROM ts_martha.search_documentation($1, $2, $3, $4)`,
        [q, parseInt(limit as string, 10), category || null, page_type || null]
      );

      res.json({
        query: q,
        results: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error('Documentation search failed', { error });
      res.status(500).json({ error: 'Search failed' });
    }
  });

  /**
   * GET /api/docs/:pageId
   * Get a specific documentation page with links
   */
  router.get('/:pageId', async (req: Request, res: Response) => {
    try {
      const { pageId } = req.params;

      const result = await db.query(
        `SELECT * FROM ts_martha.get_documentation_page_with_links($1)`,
        [pageId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Documentation page not found' });
      }

      // Record view activity
      await db.query(
        `
        INSERT INTO ts_martha.documentation_activity (page_id, activity_type, user_type, context)
        VALUES ($1, 'viewed', 'system', $2)
      `,
        [pageId, JSON.stringify({ source: 'api' })]
      );

      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Failed to retrieve documentation page', { error, pageId: req.params.pageId });
      res.status(500).json({ error: 'Failed to retrieve page' });
    }
  });

  /**
   * GET /api/docs/category/:category
   * Get all pages in a category
   */
  router.get('/category/:category', async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const { limit = 50 } = req.query;

      const result = await db.query(
        `
        SELECT page_id, title, subtitle, summary, page_type, tags, created_at, updated_at
        FROM ts_martha.documentation_pages
        WHERE category = $1 AND published = true
        ORDER BY title
        LIMIT $2
      `,
        [category, parseInt(limit as string, 10)]
      );

      res.json({
        category,
        pages: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error('Failed to retrieve category pages', { error, category: req.params.category });
      res.status(500).json({ error: 'Failed to retrieve pages' });
    }
  });

  /**
   * GET /api/docs/popular
   * Get popular documentation pages
   */
  router.get('/popular', async (req: Request, res: Response) => {
    try {
      const { days = 7, limit = 10 } = req.query;

      const result = await db.query(
        `SELECT * FROM ts_martha.get_popular_documentation_pages($1, $2)`,
        [parseInt(days as string, 10), parseInt(limit as string, 10)]
      );

      res.json({
        pages: result.rows,
        period_days: days,
      });
    } catch (error) {
      logger.error('Failed to retrieve popular pages', { error });
      res.status(500).json({ error: 'Failed to retrieve popular pages' });
    }
  });

  /**
   * POST /api/docs/generate/schema
   * Trigger schema documentation generation
   */
  router.post('/generate/schema', async (req: Request, res: Response) => {
    try {
      logger.info('Triggering schema documentation generation');

      const generator = new SchemaDocGenerator(db);
      const pages = await generator.generateAll('ts_martha');
      await generator.saveDocPages(pages);

      // Auto-link
      const linkingService = new LinkingService(db);
      const linksCreated = await linkingService.detectAndCreateLinks();

      res.json({
        success: true,
        pages_generated: pages.length,
        links_created: linksCreated,
      });
    } catch (error) {
      logger.error('Schema documentation generation failed', { error });
      res.status(500).json({ error: 'Generation failed' });
    }
  });

  /**
   * POST /api/docs/generate/api
   * Trigger API documentation generation
   */
  router.post('/generate/api', async (req: Request, res: Response) => {
    try {
      logger.info('Triggering API documentation generation');

      const sourceRoot = process.cwd();
      const generator = new ApiDocGenerator(db, sourceRoot);
      const pages = await generator.generateWorkflowDocs();
      await generator.saveDocPages(pages);

      // Auto-link
      const linkingService = new LinkingService(db);
      const linksCreated = await linkingService.detectAndCreateLinks();

      res.json({
        success: true,
        pages_generated: pages.length,
        links_created: linksCreated,
      });
    } catch (error) {
      logger.error('API documentation generation failed', { error });
      res.status(500).json({ error: 'Generation failed' });
    }
  });

  /**
   * POST /api/docs/validate-links
   * Validate all links and report broken ones
   */
  router.post('/validate-links', async (req: Request, res: Response) => {
    try {
      logger.info('Validating documentation links');

      const linkingService = new LinkingService(db);
      const validationResults = await linkingService.validateLinks();

      const broken = validationResults.filter(v => v.isBroken);

      res.json({
        total_links: validationResults.length,
        broken_links: broken.length,
        broken_details: broken,
      });
    } catch (error) {
      logger.error('Link validation failed', { error });
      res.status(500).json({ error: 'Validation failed' });
    }
  });

  /**
   * GET /api/docs/graph
   * Get link graph for visualization
   */
  router.get('/graph', async (req: Request, res: Response) => {
    try {
      const linkingService = new LinkingService(db);
      const graph = await linkingService.getLinkGraph();

      res.json(graph);
    } catch (error) {
      logger.error('Failed to generate link graph', { error });
      res.status(500).json({ error: 'Failed to generate graph' });
    }
  });

  /**
   * GET /api/docs/stats
   * Get documentation statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const statsResult = await db.query(`
        SELECT
          COUNT(*) AS total_pages,
          COUNT(*) FILTER (WHERE auto_generated = true) AS auto_generated,
          COUNT(*) FILTER (WHERE published = true) AS published,
          COUNT(DISTINCT category) AS categories,
          COUNT(DISTINCT page_type) AS page_types
        FROM ts_martha.documentation_pages
      `);

      const linksResult = await db.query(`
        SELECT
          COUNT(*) AS total_links,
          COUNT(*) FILTER (WHERE is_broken = true) AS broken_links,
          COUNT(DISTINCT target_type) AS link_types
        FROM ts_martha.documentation_links
      `);

      res.json({
        pages: statsResult.rows[0],
        links: linksResult.rows[0],
      });
    } catch (error) {
      logger.error('Failed to retrieve documentation stats', { error });
      res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  });

  return router;
}
