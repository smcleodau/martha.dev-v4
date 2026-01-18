/**
 * API Documentation Generator
 *
 * Auto-generates documentation from TypeScript source files
 * Parses workflows, activities, and API endpoints
 * Generates DocuFlow-style API reference pages
 */

import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import logger from '../../utils/logger.js';

export interface ApiDocPage {
  page_id: string;
  page_type: 'api' | 'workflow' | 'activity';
  title: string;
  subtitle: string;
  content: string; // Markdown
  summary: string;
  auto_generated: boolean;
  source_file: string;
  source_type: 'typescript';
  generation_method: 'ApiDocGenerator';
  category: 'api' | 'workflows' | 'activities';
  tags: string[];
  published: boolean;
  version: string;
}

export interface WorkflowInfo {
  name: string;
  description: string;
  filePath: string;
  signals: SignalInfo[];
  queries: QueryInfo[];
  parameters: ParameterInfo[];
}

export interface SignalInfo {
  name: string;
  parameters: ParameterInfo[];
  description: string;
}

export interface QueryInfo {
  name: string;
  returnType: string;
  description: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

export class ApiDocGenerator {
  constructor(private db: Pool, private sourceRoot: string) {}

  /**
   * Generate documentation for all workflows
   */
  async generateWorkflowDocs(): Promise<ApiDocPage[]> {
    logger.info('Generating workflow documentation');

    const workflowsDir = path.join(this.sourceRoot, 'src', 'workflows');
    const files = await fs.readdir(workflowsDir);
    const workflowFiles = files.filter(
      f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.includes('__tests__')
    );

    const docs: ApiDocPage[] = [];

    for (const file of workflowFiles) {
      const filePath = path.join(workflowsDir, file);
      const doc = await this.generateWorkflowDoc(filePath);
      if (doc) docs.push(doc);
    }

    logger.info('Workflow documentation generated', { count: docs.length });
    return docs;
  }

  /**
   * Generate documentation for a single workflow
   */
  async generateWorkflowDoc(filePath: string): Promise<ApiDocPage | null> {
    logger.debug('Generating workflow documentation', { filePath });

    const content = await fs.readFile(filePath, 'utf-8');
    const workflow = this.parseWorkflow(content, filePath);

    if (!workflow) {
      logger.warn('Could not parse workflow', { filePath });
      return null;
    }

    const markdown = this.generateWorkflowMarkdown(workflow);
    const relativeFilePath = path.relative(this.sourceRoot, filePath);

    return {
      page_id: `api:${workflow.name}`,
      page_type: 'workflow',
      title: workflow.name,
      subtitle: workflow.description,
      content: markdown,
      summary: workflow.description,
      auto_generated: true,
      source_file: relativeFilePath,
      source_type: 'typescript',
      generation_method: 'ApiDocGenerator',
      category: 'workflows',
      tags: ['workflow', 'temporal', 'api', ...this.extractWorkflowTags(workflow.name)],
      published: true,
      version: '1.0.0',
    };
  }

  /**
   * Parse workflow from TypeScript source
   */
  private parseWorkflow(content: string, filePath: string): WorkflowInfo | null {
    // Extract workflow name from export
    const workflowNameMatch = content.match(/export\s+(?:async\s+)?function\s+(\w+Workflow)/);
    if (!workflowNameMatch) return null;

    const name = workflowNameMatch[1];

    // Extract JSDoc description
    const descMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\n/);
    const description = descMatch ? descMatch[1].trim() : `Temporal workflow: ${name}`;

    // Extract signals
    const signals = this.extractSignals(content);

    // Extract queries
    const queries = this.extractQueries(content);

    // Extract parameters from function signature
    const parameters = this.extractParameters(content, name);

    return {
      name,
      description,
      filePath,
      signals,
      queries,
      parameters,
    };
  }

  /**
   * Extract signal definitions
   */
  private extractSignals(content: string): SignalInfo[] {
    const signals: SignalInfo[] = [];

    // Match: setSignalHandlers({ signalName: (args) => { ... } })
    const signalPattern = /(\w+):\s*\(([^)]*)\)\s*=>\s*\{/g;
    let match;

    while ((match = signalPattern.exec(content)) !== null) {
      const signalName = match[1];

      // Skip common non-signal handlers
      if (['then', 'catch', 'finally', 'map', 'filter'].includes(signalName)) {
        continue;
      }

      const paramsStr = match[2];
      const parameters = this.parseParameterList(paramsStr);

      signals.push({
        name: signalName,
        parameters,
        description: `Signal handler for ${signalName}`,
      });
    }

    return signals;
  }

  /**
   * Extract query definitions
   */
  private extractQueries(content: string): QueryInfo[] {
    const queries: QueryInfo[] = [];

    // Match: setQueryHandlers({ queryName: () => returnValue })
    const queryPattern = /(\w+):\s*\(\)\s*=>\s*(?:\{|[\w.]+)/g;
    let match;

    while ((match = queryPattern.exec(content)) !== null) {
      const queryName = match[1];

      // Try to infer return type from the code
      const returnType = 'unknown'; // Could be enhanced with AST parsing

      queries.push({
        name: queryName,
        returnType,
        description: `Query handler for ${queryName}`,
      });
    }

    return queries;
  }

  /**
   * Extract function parameters
   */
  private extractParameters(content: string, functionName: string): ParameterInfo[] {
    const funcPattern = new RegExp(`function\\s+${functionName}\\s*\\(([^)]*)\\)`, 's');
    const match = content.match(funcPattern);

    if (!match) return [];

    return this.parseParameterList(match[1]);
  }

  /**
   * Parse parameter list string
   */
  private parseParameterList(paramsStr: string): ParameterInfo[] {
    if (!paramsStr.trim()) return [];

    const params = paramsStr.split(',').map(p => p.trim());
    const paramInfos: ParameterInfo[] = [];

    for (const param of params) {
      const typeMatch = param.match(/(\w+)\??\s*:\s*([^=]+)(?:=.*)?/);
      if (typeMatch) {
        paramInfos.push({
          name: typeMatch[1],
          type: typeMatch[2].trim(),
          optional: param.includes('?') || param.includes('='),
        });
      }
    }

    return paramInfos;
  }

  /**
   * Generate Markdown documentation for workflow
   */
  private generateWorkflowMarkdown(workflow: WorkflowInfo): string {
    const sections: string[] = [];

    // Header
    sections.push(`# ${workflow.name}\n`);
    sections.push(`${workflow.description}\n`);

    // Source file
    sections.push(`**Source:** \`${workflow.filePath}\`\n`);

    // Parameters
    if (workflow.parameters.length > 0) {
      sections.push('## Parameters\n');
      sections.push('| Name | Type | Optional | Description |');
      sections.push('|------|------|----------|-------------|');

      for (const param of workflow.parameters) {
        const optional = param.optional ? '✓' : '✗';
        const desc = param.description || '-';
        sections.push(`| \`${param.name}\` | \`${param.type}\` | ${optional} | ${desc} |`);
      }

      sections.push('');
    }

    // Signals
    if (workflow.signals.length > 0) {
      sections.push('## Signals\n');
      sections.push('Signals allow external events to communicate with the workflow:\n');

      for (const signal of workflow.signals) {
        sections.push(`### ${signal.name}\n`);
        sections.push(`${signal.description}\n`);

        if (signal.parameters.length > 0) {
          sections.push('**Parameters:**\n');
          for (const param of signal.parameters) {
            sections.push(`- \`${param.name}\`: ${param.type}`);
          }
          sections.push('');
        }
      }
    }

    // Queries
    if (workflow.queries.length > 0) {
      sections.push('## Queries\n');
      sections.push('Queries allow reading workflow state without side effects:\n');

      for (const query of workflow.queries) {
        sections.push(`### ${query.name}\n`);
        sections.push(`${query.description}\n`);
        sections.push(`**Returns:** \`${query.returnType}\`\n`);
      }
    }

    // Usage example
    sections.push('## Usage Example\n');
    sections.push('```typescript');
    sections.push('import { WorkflowClient } from "@temporalio/client";\n');
    sections.push('const client = new WorkflowClient();');
    sections.push(`const handle = await client.start(${workflow.name}, {`);
    sections.push('  taskQueue: "martha-tasks",');
    sections.push('  workflowId: "unique-workflow-id",');

    if (workflow.parameters.length > 0) {
      sections.push('  args: [');
      sections.push('    {');
      for (const param of workflow.parameters.slice(0, 3)) {
        const example = this.getExampleValue(param.type);
        sections.push(`      ${param.name}: ${example},`);
      }
      sections.push('    }');
      sections.push('  ],');
    }

    sections.push('});');

    // Signal example
    if (workflow.signals.length > 0) {
      const firstSignal = workflow.signals[0];
      sections.push('');
      sections.push(`// Send signal to workflow`);
      sections.push(`await handle.signal(${workflow.name}.signals.${firstSignal.name}, args);`);
    }

    // Query example
    if (workflow.queries.length > 0) {
      const firstQuery = workflow.queries[0];
      sections.push('');
      sections.push(`// Query workflow state`);
      sections.push(`const result = await handle.query(${workflow.name}.queries.${firstQuery.name});`);
    }

    sections.push('```\n');

    // Related documentation
    sections.push('## Related\n');
    sections.push('- [Temporal Workflows Overview](api:workflows)');
    sections.push('- [Workflow Testing Guide](guide:workflow-testing)');

    return sections.join('\n');
  }

  /**
   * Get example value for a type
   */
  private getExampleValue(type: string): string {
    if (type.includes('string')) return '"example"';
    if (type.includes('number')) return '42';
    if (type.includes('boolean')) return 'true';
    if (type.includes('[]')) return '[]';
    return '{}';
  }

  /**
   * Extract tags from workflow name
   */
  private extractWorkflowTags(name: string): string[] {
    const tags: string[] = [];

    if (name.toLowerCase().includes('issue')) tags.push('issue', 'lifecycle');
    if (name.toLowerCase().includes('batch')) tags.push('batch', 'coordination');
    if (name.toLowerCase().includes('coordinator')) tags.push('coordinator', 'orchestration');

    return tags;
  }

  /**
   * Save documentation pages to database
   */
  async saveDocPages(pages: ApiDocPage[]): Promise<void> {
    logger.info('Saving API documentation pages to database', { count: pages.length });

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

    logger.info('API documentation pages saved');
  }
}
