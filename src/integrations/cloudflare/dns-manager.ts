import { createLogger } from '../../utils/logger.js';
import { getCloudflareAPIClient, CloudflareAPIClient, CloudflareDNSRecord } from './api-client.js';

const logger = createLogger({ module: 'dns-manager' });

export interface DNSRecordConfig {
  hostname: string;
  tunnelId: string;
  proxied?: boolean;
  ttl?: number;
}

/**
 * DNS Manager
 *
 * Manages Cloudflare DNS records for tunnels
 */
export class DNSManager {
  private apiClient: CloudflareAPIClient;
  private domain: string;

  constructor(apiClient?: CloudflareAPIClient) {
    this.apiClient = apiClient || getCloudflareAPIClient();
    this.domain = process.env.CLOUDFLARE_DOMAIN || 'martha.arch.ie';

    logger.info('DNS manager initialized', { domain: this.domain });
  }

  /**
   * Generate tunnel CNAME target
   */
  private getTunnelCNAME(tunnelId: string): string {
    return `${tunnelId}.cfargotunnel.com`;
  }

  /**
   * Extract subdomain from hostname
   */
  private getSubdomain(hostname: string): string {
    // Remove domain suffix if present
    if (hostname.endsWith(`.${this.domain}`)) {
      return hostname.replace(`.${this.domain}`, '');
    }
    return hostname;
  }

  /**
   * Get full hostname with domain
   */
  private getFullHostname(subdomain: string): string {
    if (subdomain.includes('.')) {
      // Already includes domain
      return subdomain;
    }
    return `${subdomain}.${this.domain}`;
  }

  /**
   * Create DNS record for tunnel
   */
  async createDNSRecord(config: DNSRecordConfig): Promise<CloudflareDNSRecord> {
    try {
      const subdomain = this.getSubdomain(config.hostname);
      const fullHostname = this.getFullHostname(subdomain);
      const tunnelCNAME = this.getTunnelCNAME(config.tunnelId);

      logger.info('Creating DNS record for tunnel', {
        hostname: fullHostname,
        tunnel_id: config.tunnelId,
        target: tunnelCNAME
      });

      // Check if record already exists
      const existingRecord = await this.findDNSRecord(fullHostname);
      if (existingRecord) {
        logger.info('DNS record already exists', {
          record_id: existingRecord.id,
          hostname: fullHostname
        });
        return existingRecord;
      }

      // Create CNAME record pointing to tunnel
      const record = await this.apiClient.createDNSRecord({
        type: 'CNAME',
        name: subdomain,
        content: tunnelCNAME,
        proxied: config.proxied ?? true, // Proxied by default for HTTPS
        ttl: config.ttl ?? 1 // Auto TTL
      });

      logger.info('DNS record created successfully', {
        record_id: record.id,
        hostname: fullHostname,
        target: tunnelCNAME
      });

      return record;
    } catch (error) {
      logger.error('Failed to create DNS record', {
        hostname: config.hostname,
        tunnel_id: config.tunnelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Delete DNS record
   */
  async deleteDNSRecord(hostname: string): Promise<void> {
    try {
      const fullHostname = this.getFullHostname(this.getSubdomain(hostname));

      logger.info('Deleting DNS record', { hostname: fullHostname });

      // Find record
      const record = await this.findDNSRecord(fullHostname);
      if (!record) {
        logger.warn('DNS record not found', { hostname: fullHostname });
        return;
      }

      // Delete record
      await this.apiClient.deleteDNSRecord(record.id);

      logger.info('DNS record deleted successfully', {
        record_id: record.id,
        hostname: fullHostname
      });
    } catch (error) {
      logger.error('Failed to delete DNS record', {
        hostname,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find DNS record by hostname
   */
  async findDNSRecord(hostname: string): Promise<CloudflareDNSRecord | null> {
    try {
      const fullHostname = this.getFullHostname(this.getSubdomain(hostname));

      const records = await this.apiClient.listDNSRecords({
        name: fullHostname
      });

      return records.length > 0 ? records[0] : null;
    } catch (error) {
      logger.error('Failed to find DNS record', {
        hostname,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * List all DNS records
   */
  async listDNSRecords(filters?: { type?: string }): Promise<CloudflareDNSRecord[]> {
    try {
      return await this.apiClient.listDNSRecords(filters);
    } catch (error) {
      logger.error('Failed to list DNS records', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get DNS records for tunnel
   */
  async getTunnelDNSRecords(tunnelId: string): Promise<CloudflareDNSRecord[]> {
    try {
      const tunnelCNAME = this.getTunnelCNAME(tunnelId);

      // Get all CNAME records
      const records = await this.listDNSRecords({ type: 'CNAME' });

      // Filter for records pointing to this tunnel
      return records.filter(record => record.content === tunnelCNAME);
    } catch (error) {
      logger.error('Failed to get tunnel DNS records', {
        tunnel_id: tunnelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update DNS record (delete and recreate)
   */
  async updateDNSRecord(
    hostname: string,
    newConfig: DNSRecordConfig
  ): Promise<CloudflareDNSRecord> {
    try {
      logger.info('Updating DNS record', { hostname });

      // Delete existing record
      await this.deleteDNSRecord(hostname);

      // Create new record
      return await this.createDNSRecord(newConfig);
    } catch (error) {
      logger.error('Failed to update DNS record', {
        hostname,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Verify DNS record exists and points to correct tunnel
   */
  async verifyDNSRecord(hostname: string, tunnelId: string): Promise<boolean> {
    try {
      const record = await this.findDNSRecord(hostname);

      if (!record) {
        logger.warn('DNS record not found', { hostname });
        return false;
      }

      const expectedCNAME = this.getTunnelCNAME(tunnelId);

      if (record.content !== expectedCNAME) {
        logger.warn('DNS record points to wrong tunnel', {
          hostname,
          expected: expectedCNAME,
          actual: record.content
        });
        return false;
      }

      logger.debug('DNS record verified', {
        hostname,
        tunnel_id: tunnelId,
        record_id: record.id
      });

      return true;
    } catch (error) {
      logger.error('Failed to verify DNS record', {
        hostname,
        tunnel_id: tunnelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// Singleton instance
let dnsManager: DNSManager | null = null;

export function getDNSManager(): DNSManager {
  if (!dnsManager) {
    dnsManager = new DNSManager();
  }
  return dnsManager;
}
