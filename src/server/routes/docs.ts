import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ module: 'docs' });

export async function docsRoutes(fastify: FastifyInstance) {
  const docsPath = join(__dirname, '../../../../docs');
  const trackerDocsPath = join(docsPath, 'tracker');
  const apiDocsPath = join(docsPath, 'api');

  // Get list of available docs
  fastify.get('/api/v1/docs', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const files = await fs.readdir(docsPath);
      const docs = files
        .filter(f => f.endsWith('.md'))
        .map(f => ({
          id: f.replace('.md', '').toLowerCase(),
          filename: f,
          path: `/api/v1/docs/${f.replace('.md', '')}`,
        }));

      return reply.send({ docs });
    } catch (error) {
      logger.error('Failed to list docs', { error });
      return reply.code(500).send({ error: 'Failed to list documentation files' });
    }
  });

  // Get specific doc content
  fastify.get('/api/v1/docs/:docId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { docId } = request.params as { docId: string };

    try {
      // Handle tracker documentation
      if (docId.startsWith('tracker-')) {
        const trackerDocName = docId.replace('tracker-', '');
        const trackerFilePath = join(trackerDocsPath, `${trackerDocName}.md`);

        try {
          await fs.access(trackerFilePath);
          const content = await fs.readFile(trackerFilePath, 'utf-8');

          return reply.send({
            id: docId,
            filename: `${trackerDocName}.md`,
            content,
          });
        } catch {
          return reply.code(404).send({ error: 'Tracker documentation file not found' });
        }
      }

      // Convert docId to filename (handle both lowercase and uppercase)
      const files = await fs.readdir(docsPath);
      const matchingFile = files.find(f =>
        f.toLowerCase() === `${docId.toLowerCase()}.md`
      );

      if (!matchingFile) {
        return reply.code(404).send({ error: 'Documentation file not found' });
      }

      const content = await fs.readFile(join(docsPath, matchingFile), 'utf-8');

      return reply.send({
        id: docId,
        filename: matchingFile,
        content,
      });
    } catch (error) {
      logger.error('Failed to read doc', { error, docId });
      return reply.code(500).send({ error: 'Failed to read documentation file' });
    }
  });

  // Serve OpenAPI specification
  fastify.get('/api/v1/docs/tracker-openapi', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const yamlPath = join(apiDocsPath, 'tracker-openapi.yaml');
      const yaml = await fs.readFile(yamlPath, 'utf-8');

      return reply
        .type('application/x-yaml')
        .send(yaml);
    } catch (error) {
      logger.error('Failed to read OpenAPI spec', { error });
      return reply.code(500).send({ error: 'Failed to read OpenAPI specification' });
    }
  });
}
