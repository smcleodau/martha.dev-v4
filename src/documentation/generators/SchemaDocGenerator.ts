/**
 * Schema Documentation Generator
 *
 * Auto-generates documentation from SQL migration files
 * Parses CREATE TABLE, CREATE INDEX, CREATE FUNCTION statements
 * and generates DocuFlow-style documentation pages
 */

import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import logger from '../../utils/logger.js';

export interface SchemaDocPage {
  page_id: string;
  page_type: 'schema';
  title: string;
  subtitle: string;
  content: string; // Markdown
  summary: string;
  auto_generated: boolean;
  source_file: string;
  source_type: 'sql';
  generation_method: 'SchemaDocGenerator';
  category: 'database';
  tags: string[];
  published: boolean;
  version: string;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  comments?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  description?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type: string; // 'btree', 'gin', 'gist', etc.
}

export class SchemaDocGenerator {
  constructor(private db: Pool) {}

  /**
   * Generate documentation for all tables in schema
   */
  async generateAll(schema: string = 'ts_martha'): Promise<SchemaDocPage[]> {
    logger.info('Generating schema documentation', { schema });

    const tables = await this.getTables(schema);
    const docs: SchemaDocPage[] = [];

    for (const tableName of tables) {
      const doc = await this.generateTableDoc(schema, tableName);
      docs.push(doc);
    }

    logger.info('Schema documentation generated', { count: docs.length });
    return docs;
  }

  /**
   * Generate documentation for a single table
   */
  async generateTableDoc(schema: string, tableName: string): Promise<SchemaDocPage> {
    logger.debug('Generating table documentation', { schema, tableName });

    const tableSchema = await this.getTableSchema(schema, tableName);
    const markdown = this.generateMarkdown(tableSchema);

    return {
      page_id: `schema:${tableName}`,
      page_type: 'schema',
      title: this.formatTableName(tableName),
      subtitle: `Database table: ${schema}.${tableName}`,
      content: markdown,
      summary: tableSchema.comments || `Database table for ${this.formatTableName(tableName)}`,
      auto_generated: true,
      source_file: `schema:${schema}.${tableName}`,
      source_type: 'sql',
      generation_method: 'SchemaDocGenerator',
      category: 'database',
      tags: this.extractTags(tableName),
      published: true,
      version: '1.0.0',
    };
  }

  /**
   * Get all tables in schema
   */
  private async getTables(schema: string): Promise<string[]> {
    const result = await this.db.query(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `,
      [schema]
    );

    return result.rows.map(row => row.table_name);
  }

  /**
   * Get detailed schema information for a table
   */
  private async getTableSchema(schema: string, tableName: string): Promise<TableSchema> {
    // Get columns
    const columnsResult = await this.db.query(
      `
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `,
      [schema, tableName]
    );

    const columns: ColumnInfo[] = columnsResult.rows.map(row => ({
      name: row.column_name,
      type: this.formatDataType(row.data_type, row.character_maximum_length),
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
    }));

    // Get indexes
    const indexesResult = await this.db.query(
      `
      SELECT
        i.indexname,
        i.indexdef
      FROM pg_indexes i
      WHERE i.schemaname = $1 AND i.tablename = $2
    `,
      [schema, tableName]
    );

    const indexes: IndexInfo[] = indexesResult.rows.map(row => this.parseIndexDef(row.indexdef));

    // Get table comment
    const commentResult = await this.db.query(
      `
      SELECT obj_description($1::regclass, 'pg_class') AS comment
    `,
      [`${schema}.${tableName}`]
    );

    return {
      tableName,
      columns,
      indexes,
      comments: commentResult.rows[0]?.comment,
    };
  }

  /**
   * Generate Markdown documentation from table schema
   */
  private generateMarkdown(schema: TableSchema): string {
    const sections: string[] = [];

    // Header
    sections.push(`# ${this.formatTableName(schema.tableName)}\n`);

    // Description
    if (schema.comments) {
      sections.push(`${schema.comments}\n`);
    }

    // Table name
    sections.push(`**Table:** \`ts_martha.${schema.tableName}\`\n`);

    // Columns section
    sections.push('## Columns\n');
    sections.push('| Column | Type | Nullable | Default | Description |');
    sections.push('|--------|------|----------|---------|-------------|');

    for (const col of schema.columns) {
      const nullable = col.nullable ? '✓' : '✗';
      const defaultVal = col.defaultValue ? `\`${col.defaultValue}\`` : '-';
      const desc = col.description || '-';
      sections.push(`| \`${col.name}\` | ${col.type} | ${nullable} | ${defaultVal} | ${desc} |`);
    }

    sections.push('');

    // Indexes section
    if (schema.indexes.length > 0) {
      sections.push('## Indexes\n');
      for (const idx of schema.indexes) {
        const unique = idx.unique ? ' (UNIQUE)' : '';
        sections.push(`- **${idx.name}**${unique}: ${idx.columns.join(', ')} (${idx.type})`);
      }
      sections.push('');
    }

    // Usage examples
    sections.push('## Usage Examples\n');
    sections.push('### Insert Data\n');
    sections.push('```sql');
    sections.push(`INSERT INTO ts_martha.${schema.tableName} (`);

    const insertColumns = schema.columns
      .filter(col => !col.defaultValue || col.defaultValue === 'NOW()')
      .slice(0, 3)
      .map(col => col.name);

    sections.push(`  ${insertColumns.join(', ')}`);
    sections.push(') VALUES (');
    sections.push(`  ${insertColumns.map(() => '?').join(', ')}`);
    sections.push(');');
    sections.push('```\n');

    // Query examples
    sections.push('### Query Data\n');
    sections.push('```sql');
    sections.push(`SELECT * FROM ts_martha.${schema.tableName}`);

    const firstTimestampCol = schema.columns.find(col => col.type.includes('timestamp'));
    if (firstTimestampCol) {
      sections.push(`WHERE ${firstTimestampCol.name} > NOW() - INTERVAL '1 day'`);
    }

    sections.push(`LIMIT 10;`);
    sections.push('```\n');

    // Related tables
    sections.push('## Related\n');
    sections.push(`- [Database Schema Overview](schema:overview)`);

    // Extract related table names from foreign key column names
    const relatedTables = new Set<string>();
    for (const col of schema.columns) {
      if (col.name.endsWith('_id') && col.name !== 'id') {
        const tableName = col.name.replace(/_id$/, '') + 's';
        relatedTables.add(tableName);
      }
    }

    for (const related of relatedTables) {
      sections.push(`- [${this.formatTableName(related)}](schema:${related})`);
    }

    return sections.join('\n');
  }

  /**
   * Parse index definition
   */
  private parseIndexDef(indexdef: string): IndexInfo {
    const match = indexdef.match(/CREATE (UNIQUE )?INDEX (\w+) ON .* USING (\w+) \((.*)\)/i);

    if (!match) {
      return {
        name: 'unknown',
        columns: [],
        unique: false,
        type: 'btree',
      };
    }

    return {
      name: match[2],
      columns: match[4].split(',').map(c => c.trim()),
      unique: !!match[1],
      type: match[3].toLowerCase(),
    };
  }

  /**
   * Format data type for display
   */
  private formatDataType(dataType: string, maxLength?: number): string {
    if (dataType === 'character varying' && maxLength) {
      return `VARCHAR(${maxLength})`;
    }
    if (dataType === 'timestamp with time zone') {
      return 'TIMESTAMPTZ';
    }
    return dataType.toUpperCase();
  }

  /**
   * Format table name for display (remove underscores, capitalize)
   */
  private formatTableName(tableName: string): string {
    return tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Extract tags from table name
   */
  private extractTags(tableName: string): string[] {
    const tags: string[] = ['database', 'schema'];

    if (tableName.includes('telemetry')) tags.push('telemetry', 'phase-2');
    if (tableName.includes('agent')) tags.push('agent', 'performance', 'phase-3');
    if (tableName.includes('exception')) tags.push('exception', 'alerts', 'phase-4');
    if (tableName.includes('model') || tableName.includes('learning')) {
      tags.push('ml', 'learning', 'phase-5');
    }
    if (tableName.includes('documentation')) tags.push('documentation', 'phase-6');

    return tags;
  }

  /**
   * Save documentation pages to database
   */
  async saveDocPages(pages: SchemaDocPage[]): Promise<void> {
    logger.info('Saving documentation pages to database', { count: pages.length });

    for (const page of pages) {
      await this.db.query(
        `
        INSERT INTO ts_martha.documentation_pages (
          page_id, page_type, title, subtitle, content, summary,
          auto_generated, source_file, source_type, generation_method,
          category, tags, published, version
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        ON CONFLICT (page_id) DO UPDATE SET
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          content = EXCLUDED.content,
          summary = EXCLUDED.summary,
          source_file = EXCLUDED.source_file,
          tags = EXCLUDED.tags,
          updated_at = NOW()
      `,
        [
          page.page_id,
          page.page_type,
          page.title,
          page.subtitle,
          page.content,
          page.summary,
          page.auto_generated,
          page.source_file,
          page.source_type,
          page.generation_method,
          page.category,
          page.tags,
          page.published,
          page.version,
        ]
      );
    }

    logger.info('Documentation pages saved');
  }
}
