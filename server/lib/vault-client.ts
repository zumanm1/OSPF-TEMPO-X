/**
 * Vault Client for OSPF-TEMPO-X
 * Fetches secrets from HashiCorp Vault using AppRole authentication
 */

import https from 'https';
import http from 'http';

interface VaultConfig {
  address: string;
  roleId?: string;
  secretId?: string;
  token?: string;
}

class VaultClient {
  private address: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private roleId?: string;
  private secretId?: string;

  constructor(config: VaultConfig) {
    this.address = config.address || 'http://localhost:9121';
    this.roleId = config.roleId;
    this.secretId = config.secretId;
    this.token = config.token || null;
  }

  private async request<T>(method: string, path: string, body?: Record<string, any>): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.address);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
      };

      if (this.token) {
        options.headers!['X-Vault-Token'] = this.token;
      }

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data ? JSON.parse(data) : {} as T);
            } else {
              const error = data ? JSON.parse(data) : { errors: ['Unknown error'] };
              reject(new Error(`Vault error: ${error.errors?.join(', ') || 'Unknown'}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse Vault response: ${data}`));
          }
        });
      });

      req.on('error', (e) => reject(new Error(`Vault connection error: ${e.message}`)));
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  async authenticate(): Promise<void> {
    if (!this.roleId || !this.secretId) throw new Error('AppRole credentials not configured');

    const response = await this.request<{ auth: { client_token: string; lease_duration: number } }>(
      'POST',
      '/v1/auth/approle/login',
      { role_id: this.roleId, secret_id: this.secretId }
    );

    this.token = response.auth.client_token;
    this.tokenExpiry = Date.now() + response.auth.lease_duration * 1000 * 0.75;
    console.log('[Vault] Authenticated successfully');
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.token || Date.now() > this.tokenExpiry) {
      await this.authenticate();
    }
  }

  async getSecret(path: string): Promise<Record<string, string>> {
    await this.ensureAuthenticated();
    const response = await this.request<{ data: { data: Record<string, string> } }>(
      'GET',
      `/v1/ospf-tempo-x/data/${path}`
    );
    return response.data.data;
  }

  async getConfig(): Promise<{
    jwt_secret: string;
    jwt_expires_in: string;
    environment: string;
  }> {
    const secret = await this.getSecret('config');
    return {
      jwt_secret: secret.jwt_secret,
      jwt_expires_in: secret.jwt_expires_in || '7d',
      environment: secret.environment || 'production',
    };
  }

  async isAvailable(): Promise<boolean> {
    try { await this.request('GET', '/v1/sys/health'); return true; } catch { return false; }
  }
}

let vaultClient: VaultClient | null = null;

export function initVaultClient(): VaultClient {
  if (!vaultClient) {
    vaultClient = new VaultClient({
      address: process.env.VAULT_ADDR || 'http://localhost:9121',
      roleId: process.env.VAULT_ROLE_ID,
      secretId: process.env.VAULT_SECRET_ID,
      token: process.env.VAULT_TOKEN,
    });
  }
  return vaultClient;
}

export { VaultClient };
