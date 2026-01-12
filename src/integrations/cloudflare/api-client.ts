import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ module: 'cloudflare-api' });

export interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
  accountId?: string;
  domain: string;
}

export interface CloudflareTunnel {
  id: string;
  name: string;
  account_tag: string;
  created_at: string;
  connections: Array<{
    id: string;
    client_id: string;
    client_version: string;
    origin_ip: string;
  }>;
}

export interface CloudflareDNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
  zone_id: string;
  zone_name: string;
  created_on: string;
  modified_on: string;
}

export interface CreateTunnelRequest {
  name: string;
  tunnel_secret: string;
}

export interface CreateDNSRecordRequest {
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
}

/**
 * Cloudflare API Client
 *
 * Provides typed interface to Cloudflare API for tunnel and DNS management
 */
export class CloudflareAPIClient {
  private client: AxiosInstance;
  private config: CloudflareConfig;
  private accountId?: string;

  constructor(config: CloudflareConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    logger.info('Cloudflare API client initialized', {
      zone_id: config.zoneId,
      domain: config.domain
    });
  }

  /**
   * Get account ID from zone details
   */
  async getAccountId(): Promise<string> {
    if (this.accountId) {
      return this.accountId;
    }

    try {
      const response = await this.client.get(`/zones/${this.config.zoneId}`);

      if (!response.data.success || !response.data.result) {
        throw new Error('Failed to get zone details');
      }

      this.accountId = response.data.result.account.id;
      logger.info('Retrieved account ID', { account_id: this.accountId });

      return this.accountId;
    } catch (error) {
      logger.error('Failed to get account ID', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a new Cloudflare tunnel
   */
  async createTunnel(request: CreateTunnelRequest): Promise<CloudflareTunnel> {
    try {
      const accountId = await this.getAccountId();

      logger.info('Creating Cloudflare tunnel', { name: request.name });

      const response = await this.client.post(
        `/accounts/${accountId}/cfd_tunnel`,
        request
      );

      if (!response.data.success || !response.data.result) {
        throw new Error(`Failed to create tunnel: ${JSON.stringify(response.data.errors)}`);
      }

      const tunnel = response.data.result;

      logger.info('Tunnel created successfully', {
        tunnel_id: tunnel.id,
        name: tunnel.name
      });

      return tunnel;
    } catch (error) {
      logger.error('Failed to create tunnel', {
        name: request.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get tunnel details
   */
  async getTunnel(tunnelId: string): Promise<CloudflareTunnel> {
    try {
      const accountId = await this.getAccountId();

      const response = await this.client.get(
        `/accounts/${accountId}/cfd_tunnel/${tunnelId}`
      );

      if (!response.data.success || !response.data.result) {
        throw new Error('Tunnel not found');
      }

      return response.data.result;
    } catch (error) {
      logger.error('Failed to get tunnel', {
        tunnel_id: tunnelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Delete a tunnel
   */
  async deleteTunnel(tunnelId: string): Promise<void> {
    try {
      const accountId = await this.getAccountId();

      logger.info('Deleting tunnel', { tunnel_id: tunnelId });

      const response = await this.client.delete(
        `/accounts/${accountId}/cfd_tunnel/${tunnelId}`
      );

      if (!response.data.success) {
        throw new Error(`Failed to delete tunnel: ${JSON.stringify(response.data.errors)}`);
      }

      logger.info('Tunnel deleted successfully', { tunnel_id: tunnelId });
    } catch (error) {
      logger.error('Failed to delete tunnel', {
        tunnel_id: tunnelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * List all tunnels
   */
  async listTunnels(): Promise<CloudflareTunnel[]> {
    try {
      const accountId = await this.getAccountId();

      const response = await this.client.get(
        `/accounts/${accountId}/cfd_tunnel`
      );

      if (!response.data.success) {
        throw new Error('Failed to list tunnels');
      }

      return response.data.result || [];
    } catch (error) {
      logger.error('Failed to list tunnels', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get tunnel connections (active instances)
   */
  async getTunnelConnections(tunnelId: string): Promise<any[]> {
    try {
      const accountId = await this.getAccountId();

      const response = await this.client.get(
        `/accounts/${accountId}/cfd_tunnel/${tunnelId}/connections`
      );

      if (!response.data.success) {
        return [];
      }

      return response.data.result || [];
    } catch (error) {
      logger.warn('Failed to get tunnel connections', {
        tunnel_id: tunnelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Create DNS record
   */
  async createDNSRecord(request: CreateDNSRecordRequest): Promise<CloudflareDNSRecord> {
    try {
      logger.info('Creating DNS record', {
        type: request.type,
        name: request.name,
        content: request.content
      });

      const response = await this.client.post(
        `/zones/${this.config.zoneId}/dns_records`,
        {
          ...request,
          proxied: request.proxied ?? true,
          ttl: request.ttl ?? 1 // Auto TTL
        }
      );

      if (!response.data.success || !response.data.result) {
        throw new Error(`Failed to create DNS record: ${JSON.stringify(response.data.errors)}`);
      }

      const record = response.data.result;

      logger.info('DNS record created successfully', {
        record_id: record.id,
        name: record.name,
        type: record.type
      });

      return record;
    } catch (error) {
      logger.error('Failed to create DNS record', {
        name: request.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Delete DNS record
   */
  async deleteDNSRecord(recordId: string): Promise<void> {
    try {
      logger.info('Deleting DNS record', { record_id: recordId });

      const response = await this.client.delete(
        `/zones/${this.config.zoneId}/dns_records/${recordId}`
      );

      if (!response.data.success) {
        throw new Error(`Failed to delete DNS record: ${JSON.stringify(response.data.errors)}`);
      }

      logger.info('DNS record deleted successfully', { record_id: recordId });
    } catch (error) {
      logger.error('Failed to delete DNS record', {
        record_id: recordId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * List DNS records
   */
  async listDNSRecords(filters?: { type?: string; name?: string }): Promise<CloudflareDNSRecord[]> {
    try {
      const params: any = {};
      if (filters?.type) params.type = filters.type;
      if (filters?.name) params.name = filters.name;

      const response = await this.client.get(
        `/zones/${this.config.zoneId}/dns_records`,
        { params }
      );

      if (!response.data.success) {
        throw new Error('Failed to list DNS records');
      }

      return response.data.result || [];
    } catch (error) {
      logger.error('Failed to list DNS records', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find DNS record by hostname
   */
  async findDNSRecordByName(name: string): Promise<CloudflareDNSRecord | null> {
    try {
      const records = await this.listDNSRecords({ name });
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      logger.error('Failed to find DNS record', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
}

// Singleton instance
let apiClient: CloudflareAPIClient | null = null;

export function getCloudflareAPIClient(): CloudflareAPIClient {
  if (!apiClient) {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const domain = process.env.CLOUDFLARE_DOMAIN || 'martha.arch.ie';

    if (!apiToken || !zoneId) {
      throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID environment variables required');
    }

    apiClient = new CloudflareAPIClient({
      apiToken,
      zoneId,
      domain
    });
  }

  return apiClient;
}
