/**
 * Documentation Linking Service
 *
 * Auto-detects references in documentation content and creates bidirectional links
 * Patterns detected:
 * - Epic references: EPIC-1.1, EPIC-2.3
 * - Task references: TASK-1.1.1, TASK-2.2.3
 * - Schema references: schema:table_name
 * - API references: api:WorkflowName
 * - File references: file:src/path/to/file.ts, src/path/to/file.ts:123
 */

import { Pool } from 'pg';
import logger from '../../utils/logger.js';

export interface DetectedLink {
  sourcePageId: string;
  targetReference: string;
  targetType: 'epic' | 'task' | 'schema' | 'api' | 'file' | 'external';
  targetPageId?: string;
  linkContext: string;
  autoDetected: boolean;
}

export interface LinkValidationResult {
  linkId: number;
  sourcePageId: string;
  targetReference: string;
  isBroken: boolean;
  errorMessage?: string;
}

export class LinkingService {
  private linkPatterns = {
    epic: /\b(EPIC-\d+(?:\.\d+)?)\b/g,
    task: /\b(TASK-\d+\.\d+(?:\.\d+)?)\b/g,
    schema: /\[([\w\s]+)\]\(schema:([\w_]+)\)/g,
    api: /\[([\w\s]+)\]\(api:([\w]+)\)/g,
    fileWithLine: /\b((?:src|migrations)\/[\w\/\.-]+\.(?:ts|sql|js))(?::(\d+))?\b/g,
    fileLink: /\[([^\]]+)\]\(file:([\w\/\.-]+)\)/g,
  };

  constructor(private db: Pool) {}

  /**
   * Auto-detect links in all documentation pages and create them
   */
  async detectAndCreateLinks(): Promise<number> {
    logger.info('Auto-detecting links in documentation');

    const pages = await this.getAllPages();
    let totalLinksCreated = 0;

    for (const page of pages) {
      const links = this.detectLinks(page.page_id, page.content);
      await this.createLinks(links);
      totalLinksCreated += links.length;
    }

    logger.info('Link detection complete', { totalLinksCreated });
    return totalLinksCreated;
  }

  /**
   * Detect links in a single documentation page
   */
  detectLinks(sourcePageId: string, content: string): DetectedLink[] {
    const links: DetectedLink[] = [];

    // Epic references
    const epicMatches = [...content.matchAll(this.linkPatterns.epic)];
    for (const match of epicMatches) {
      links.push({
        sourcePageId,
        targetReference: match[1],
        targetType: 'epic',
        linkContext: this.extractContext(content, match.index!),
        autoDetected: true,
      });
    }

    // Task references
    const taskMatches = [...content.matchAll(this.linkPatterns.task)];
    for (const match of taskMatches) {
      links.push({
        sourcePageId,
        targetReference: match[1],
        targetType: 'task',
        linkContext: this.extractContext(content, match.index!),
        autoDetected: true,
      });
    }

    // Schema references (markdown links)
    const schemaMatches = [...content.matchAll(this.linkPatterns.schema)];
    for (const match of schemaMatches) {
      const targetPageId = `schema:${match[2]}`;
      links.push({
        sourcePageId,
        targetReference: match[2],
        targetType: 'schema',
        targetPageId,
        linkContext: this.extractContext(content, match.index!),
        autoDetected: true,
      });
    }

    // API references (markdown links)
    const apiMatches = [...content.matchAll(this.linkPatterns.api)];
    for (const match of apiMatches) {
      const targetPageId = `api:${match[2]}`;
      links.push({
        sourcePageId,
        targetReference: match[2],
        targetType: 'api',
        targetPageId,
        linkContext: this.extractContext(content, match.index!),
        autoDetected: true,
      });
    }

    // File references (plain text)
    const fileMatches = [...content.matchAll(this.linkPatterns.fileWithLine)];
    for (const match of fileMatches) {
      const filePath = match[1];
      const lineNum = match[2];
      const targetRef = lineNum ? `${filePath}:${lineNum}` : filePath;

      links.push({
        sourcePageId,
        targetReference: targetRef,
        targetType: 'file',
        linkContext: this.extractContext(content, match.index!),
        autoDetected: true,
      });
    }

    // File references (markdown links)
    const fileLinkMatches = [...content.matchAll(this.linkPatterns.fileLink)];
    for (const match of fileLinkMatches) {
      links.push({
        sourcePageId,
        targetReference: match[2],
        targetType: 'file',
        linkContext: this.extractContext(content, match.index!),
        autoDetected: true,
      });
    }

    return links;
  }

  /**
   * Create links in database
   */
  private async createLinks(links: DetectedLink[]): Promise<void> {
    for (const link of links) {
      await this.db.query(
        `
        INSERT INTO ts_martha.documentation_links (
          source_page_id,
          target_reference,
          target_type,
          target_page_id,
          link_context,
          auto_detected,
          validated
        ) VALUES ($1, $2, $3, $4, $5, $6, false)
        ON CONFLICT (source_page_id, target_reference) DO NOTHING
      `,
        [
          link.sourcePageId,
          link.targetReference,
          link.targetType,
          link.targetPageId,
          link.linkContext,
          link.autoDetected,
        ]
      );
    }
  }

  /**
   * Validate all links and mark broken ones
   */
  async validateLinks(): Promise<LinkValidationResult[]> {
    logger.info('Validating documentation links');

    const result = await this.db.query(`
      SELECT * FROM ts_martha.validate_documentation_links()
    `);

    const validationResults: LinkValidationResult[] = result.rows;

    // Update broken link status
    for (const validation of validationResults) {
      await this.db.query(
        `
        UPDATE ts_martha.documentation_links
        SET
          is_broken = $1,
          validated = true,
          validated_at = NOW()
        WHERE id = $2
      `,
        [validation.isBroken, validation.linkId]
      );
    }

    const brokenCount = validationResults.filter(v => v.isBroken).length;
    logger.info('Link validation complete', {
      total: validationResults.length,
      broken: brokenCount,
    });

    return validationResults;
  }

  /**
   * Get incoming links for a page (backlinks)
   */
  async getIncomingLinks(pageId: string): Promise<Array<{ sourcePageId: string; sourceTitle: string }>> {
    const result = await this.db.query(
      `
      SELECT
        dl.source_page_id,
        dp.title AS source_title
      FROM ts_martha.documentation_links dl
      JOIN ts_martha.documentation_pages dp ON dl.source_page_id = dp.page_id
      WHERE dl.target_page_id = $1
    `,
      [pageId]
    );

    return result.rows;
  }

  /**
   * Get outgoing links from a page
   */
  async getOutgoingLinks(
    pageId: string
  ): Promise<Array<{ targetReference: string; targetType: string; isBroken: boolean }>> {
    const result = await this.db.query(
      `
      SELECT
        target_reference,
        target_type,
        is_broken
      FROM ts_martha.documentation_links
      WHERE source_page_id = $1
    `,
      [pageId]
    );

    return result.rows;
  }

  /**
   * Get all broken links
   */
  async getBrokenLinks(): Promise<LinkValidationResult[]> {
    const result = await this.db.query(`
      SELECT
        id AS link_id,
        source_page_id,
        target_reference,
        is_broken,
        'Link target not found' AS error_message
      FROM ts_martha.documentation_links
      WHERE is_broken = true
    `);

    return result.rows;
  }

  /**
   * Extract context around a match (50 chars before/after)
   */
  private extractContext(content: string, matchIndex: number, contextLength: number = 50): string {
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(content.length, matchIndex + contextLength);
    const context = content.substring(start, end);

    return start > 0 ? '...' + context : context + (end < content.length ? '...' : '');
  }

  /**
   * Get all published documentation pages
   */
  private async getAllPages(): Promise<Array<{ page_id: string; content: string }>> {
    const result = await this.db.query(`
      SELECT page_id, content
      FROM ts_martha.documentation_pages
      WHERE published = true
    `);

    return result.rows;
  }

  /**
   * Create bidirectional link between two pages
   */
  async createBidirectionalLink(
    sourcePageId: string,
    targetPageId: string,
    linkType: 'related' | 'parent' | 'child' | 'references'
  ): Promise<void> {
    // Create forward link
    await this.db.query(
      `
      INSERT INTO ts_martha.documentation_links (
        source_page_id,
        target_reference,
        target_type,
        target_page_id,
        link_context,
        auto_detected
      ) VALUES ($1, $2, 'api', $3, $4, false)
      ON CONFLICT DO NOTHING
    `,
      [sourcePageId, targetPageId, targetPageId, `Bidirectional link: ${linkType}`]
    );

    // Create backward link
    await this.db.query(
      `
      INSERT INTO ts_martha.documentation_links (
        source_page_id,
        target_reference,
        target_type,
        target_page_id,
        link_context,
        auto_detected
      ) VALUES ($1, $2, 'api', $3, $4, false)
      ON CONFLICT DO NOTHING
    `,
      [targetPageId, sourcePageId, sourcePageId, `Bidirectional link: ${linkType}`]
    );

    logger.debug('Created bidirectional link', { sourcePageId, targetPageId, linkType });
  }

  /**
   * Generate link graph for visualization
   */
  async getLinkGraph(): Promise<{ nodes: any[]; edges: any[] }> {
    // Get all pages as nodes
    const nodesResult = await this.db.query(`
      SELECT page_id, title, page_type, category
      FROM ts_martha.documentation_pages
      WHERE published = true
    `);

    // Get all links as edges
    const edgesResult = await this.db.query(`
      SELECT
        source_page_id,
        target_page_id,
        target_type,
        is_broken
      FROM ts_martha.documentation_links
      WHERE target_page_id IS NOT NULL
    `);

    const nodes = nodesResult.rows.map(row => ({
      id: row.page_id,
      label: row.title,
      type: row.page_type,
      category: row.category,
    }));

    const edges = edgesResult.rows.map(row => ({
      from: row.source_page_id,
      to: row.target_page_id,
      type: row.target_type,
      broken: row.is_broken,
    }));

    return { nodes, edges };
  }
}
