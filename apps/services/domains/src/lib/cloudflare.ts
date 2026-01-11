const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

async function cfFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${CF_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = (await response.json()) as CloudflareResponse<T>;

  if (!data.success) {
    throw new Error(data.errors[0]?.message || 'Cloudflare API error');
  }

  return data.result;
}

export interface DomainAvailability {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: number;
}

export interface DomainInfo {
  id: string;
  name: string;
  status: string;
  expires_at: string;
  locked: boolean;
  auto_renew: boolean;
}

export interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  priority?: number;
}

export const cloudflare = {
  // Check domain availability
  async checkAvailability(domain: string): Promise<DomainAvailability> {
    const result = await cfFetch<{ available: boolean; premium: boolean }>(
      `/accounts/${CF_ACCOUNT_ID}/registrar/domains/${domain}/available`
    );

    return {
      domain,
      available: result.available,
      premium: result.premium,
    };
  },

  // Register domain
  async registerDomain(
    domain: string,
    registrantInfo: Record<string, unknown>
  ): Promise<DomainInfo> {
    return cfFetch<DomainInfo>(
      `/accounts/${CF_ACCOUNT_ID}/registrar/domains`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: domain,
          registrant: registrantInfo,
        }),
      }
    );
  },

  // Get domain info
  async getDomain(domain: string): Promise<DomainInfo> {
    return cfFetch<DomainInfo>(
      `/accounts/${CF_ACCOUNT_ID}/registrar/domains/${domain}`
    );
  },

  // List domains
  async listDomains(): Promise<DomainInfo[]> {
    return cfFetch<DomainInfo[]>(
      `/accounts/${CF_ACCOUNT_ID}/registrar/domains`
    );
  },

  // Get zone ID for domain
  async getZoneId(domain: string): Promise<string | null> {
    const zones = await cfFetch<Array<{ id: string; name: string }>>(
      `/zones?name=${domain}`
    );

    return zones[0]?.id || null;
  },

  // Create zone
  async createZone(domain: string): Promise<{ id: string }> {
    return cfFetch<{ id: string }>('/zones', {
      method: 'POST',
      body: JSON.stringify({
        name: domain,
        account: { id: CF_ACCOUNT_ID },
        type: 'full',
      }),
    });
  },

  // List DNS records
  async listDnsRecords(zoneId: string): Promise<DnsRecord[]> {
    return cfFetch<DnsRecord[]>(`/zones/${zoneId}/dns_records`);
  },

  // Create DNS record
  async createDnsRecord(
    zoneId: string,
    record: {
      type: string;
      name: string;
      content: string;
      ttl?: number;
      proxied?: boolean;
      priority?: number;
    }
  ): Promise<DnsRecord> {
    return cfFetch<DnsRecord>(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl || 1,
        proxied: record.proxied ?? true,
        priority: record.priority,
      }),
    });
  },

  // Update DNS record
  async updateDnsRecord(
    zoneId: string,
    recordId: string,
    record: {
      type?: string;
      name?: string;
      content?: string;
      ttl?: number;
      proxied?: boolean;
    }
  ): Promise<DnsRecord> {
    return cfFetch<DnsRecord>(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(record),
    });
  },

  // Delete DNS record
  async deleteDnsRecord(zoneId: string, recordId: string): Promise<void> {
    await cfFetch(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'DELETE',
    });
  },

  // Enable auto-renew
  async setAutoRenew(domain: string, enabled: boolean): Promise<void> {
    await cfFetch(`/accounts/${CF_ACCOUNT_ID}/registrar/domains/${domain}`, {
      method: 'PUT',
      body: JSON.stringify({ auto_renew: enabled }),
    });
  },
};
